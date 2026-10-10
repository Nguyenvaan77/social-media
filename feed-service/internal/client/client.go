package client

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"feed/internal/model"
)

var (
	ErrUnavailable  = errors.New("upstream service unavailable")
	ErrUserNotFound = errors.New("user not found")
)

const maxResponseBytes = 8 << 20

// Client reads the public user and post APIs used to assemble a home feed.
type Client struct {
	userBase *url.URL
	postBase *url.URL
	http     *http.Client
}

func NewClient(userBaseURL, postBaseURL string) (*Client, error) {
	userBase, err := parseBaseURL(userBaseURL)
	if err != nil {
		return nil, fmt.Errorf("user service URL: %w", err)
	}
	postBase, err := parseBaseURL(postBaseURL)
	if err != nil {
		return nil, fmt.Errorf("post service URL: %w", err)
	}

	return &Client{
		userBase: userBase,
		postBase: postBase,
		http: &http.Client{
			Timeout: 5 * time.Second,
			CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}, nil
}

func parseBaseURL(raw string) (*url.URL, error) {
	raw = strings.TrimSpace(raw)
	u, err := url.Parse(raw)
	if err != nil || u == nil ||
		!(strings.EqualFold(u.Scheme, "http") || strings.EqualFold(u.Scheme, "https")) ||
		u.Opaque != "" || u.Host == "" || u.Hostname() == "" ||
		u.User != nil || u.RawQuery != "" || u.ForceQuery ||
		strings.Contains(raw, "#") {
		return nil, errors.New("must be an HTTP(S) URL without credentials, query, or fragment")
	}
	u.Scheme = strings.ToLower(u.Scheme)
	return u, nil
}

func validatePage(id, limit, offset int) error {
	if id <= 0 || limit < 1 || limit > 100 || offset < 0 {
		return errors.New("ID must be positive, limit must be 1..100, and offset must be nonnegative")
	}
	return nil
}

func (c *Client) ListFollowing(ctx context.Context, userID, limit, offset int) ([]int, error) {
	if err := validatePage(userID, limit, offset); err != nil {
		return nil, err
	}
	endpoint, err := pageURL(c.userBase, userID, "following", limit, offset)
	if err != nil {
		return nil, fmt.Errorf("%w: build user service URL: %v", ErrUnavailable, err)
	}
	body, err := c.get(ctx, endpoint, true)
	if err != nil {
		return nil, err
	}

	var payload struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(body, &payload); err != nil || !isArray(payload.Data) {
		return nil, fmt.Errorf("%w: malformed following response", ErrUnavailable)
	}
	var users []struct {
		ID int `json:"id"`
	}
	if err := json.Unmarshal(payload.Data, &users); err != nil || len(users) > limit {
		return nil, fmt.Errorf("%w: malformed following data", ErrUnavailable)
	}
	ids := make([]int, 0, len(users))
	for _, user := range users {
		if user.ID <= 0 {
			return nil, fmt.Errorf("%w: invalid followed user ID", ErrUnavailable)
		}
		ids = append(ids, user.ID)
	}
	return ids, nil
}

func (c *Client) ListPosts(ctx context.Context, authorID, limit, offset int) ([]model.Post, error) {
	if err := validatePage(authorID, limit, offset); err != nil {
		return nil, err
	}
	endpoint, err := pageURL(c.postBase, authorID, "posts", limit, offset)
	if err != nil {
		return nil, fmt.Errorf("%w: build post service URL: %v", ErrUnavailable, err)
	}
	body, err := c.get(ctx, endpoint, false)
	if err != nil {
		return nil, err
	}

	var payload struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(body, &payload); err != nil || !isArray(payload.Data) {
		return nil, fmt.Errorf("%w: malformed posts response", ErrUnavailable)
	}
	var posts []model.Post
	if err := json.Unmarshal(payload.Data, &posts); err != nil || len(posts) > limit {
		return nil, fmt.Errorf("%w: malformed posts data", ErrUnavailable)
	}
	for _, post := range posts {
		if len(post.ID) != 24 || post.AuthorID != authorID || post.Metadata.CreatedAt.IsZero() ||
			post.Metadata.IsDelete || post.Metadata.IsHide || post.Metadata.IsBlock {
			return nil, fmt.Errorf("%w: invalid post metadata", ErrUnavailable)
		}
		if _, err := hex.DecodeString(post.ID); err != nil {
			return nil, fmt.Errorf("%w: invalid post ID", ErrUnavailable)
		}
	}
	return posts, nil
}

func pageURL(base *url.URL, id int, collection string, limit, offset int) (string, error) {
	endpoint, err := url.JoinPath(base.String(), "api", "v1", "users", strconv.Itoa(id), collection)
	if err != nil {
		return "", err
	}
	u, err := url.Parse(endpoint)
	if err != nil {
		return "", err
	}
	q := u.Query()
	q.Set("limit", strconv.Itoa(limit))
	q.Set("offset", strconv.Itoa(offset))
	u.RawQuery = q.Encode()
	return u.String(), nil
}

func (c *Client) get(ctx context.Context, endpoint string, userRequest bool) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("%w: construct upstream request: %v", ErrUnavailable, err)
	}
	req.Header.Set("Accept", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: upstream request: %v", ErrUnavailable, err)
	}
	defer resp.Body.Close()
	if userRequest && resp.StatusCode == http.StatusNotFound {
		return nil, ErrUserNotFound
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: upstream returned HTTP %d", ErrUnavailable, resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes+1))
	if err != nil || len(body) > maxResponseBytes {
		return nil, fmt.Errorf("%w: read upstream response", ErrUnavailable)
	}
	return body, nil
}

func isArray(raw json.RawMessage) bool {
	raw = bytes.TrimSpace(raw)
	return len(raw) > 0 && raw[0] == '['
}
