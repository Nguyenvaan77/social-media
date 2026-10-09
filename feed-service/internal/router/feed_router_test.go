package router_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"

	"feed/internal/client"
	"feed/internal/handler"
	"feed/internal/router"
	"feed/internal/service"

	"github.com/gin-gonic/gin"
)

func TestHomeFeedHTTP(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Author 4 is not followed, even though their post is the newest.
	postsByAuthor := map[int][]map[string]any{
		2: {
			post(201, 2, "2026-10-08T14:10:00Z"),
			post(202, 2, "2026-10-08T14:09:00Z"),
			post(203, 2, "2026-10-08T14:08:00Z"),
			post(204, 2, "2026-10-08T14:06:00Z"),
		},
		3: {
			post(301, 3, "2026-10-08T14:07:00Z"),
			post(302, 3, "2026-10-08T14:05:00Z"),
		},
		4: {post(401, 4, "2026-10-08T14:11:00Z")},
	}

	userServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/v1/users/1", "/api/v1/users/me":
			_ = json.NewEncoder(w).Encode(map[string]any{"user": map[string]any{"id": 1, "full_name": "Viewer", "status": "active", "created_at": "2026-10-08T14:00:00Z"}})
		case "/api/v1/users/1/following":
			offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			if limit == 0 {
				limit = 20
			}
			followed := []map[string]any{{"id": 2}, {"id": 3}}
			if offset > len(followed) {
				offset = len(followed)
			}
			end := offset + limit
			if end > len(followed) {
				end = len(followed)
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"data": followed[offset:end], "limit": limit, "offset": offset})
		default:
			http.NotFound(w, r)
		}
	}))
	defer userServer.Close()

	var failPosts atomic.Bool
	postServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if failPosts.Load() {
			http.Error(w, "unavailable", http.StatusServiceUnavailable)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		const prefix, suffix = "/api/v1/users/", "/posts"
		if !strings.HasPrefix(r.URL.Path, prefix) || !strings.HasSuffix(r.URL.Path, suffix) {
			http.NotFound(w, r)
			return
		}
		authorID, err := strconv.Atoi(strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, prefix), suffix))
		if err != nil {
			http.NotFound(w, r)
			return
		}
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		if limit == 0 {
			limit = 20
		}
		posts := postsByAuthor[authorID]
		if offset > len(posts) {
			offset = len(posts)
		}
		end := offset + limit
		if end > len(posts) {
			end = len(posts)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"data": posts[offset:end], "limit": limit, "offset": offset})
	}))
	defer postServer.Close()

	upstream, err := client.NewClient(userServer.URL, postServer.URL)
	if err != nil {
		t.Fatal(err)
	}
	r := router.SetupRouter(handler.NewFeedHandler(service.NewFeedService(upstream)))

	request := func(path, userID string, wantStatus int) feedResponse {
		t.Helper()
		req := httptest.NewRequest(http.MethodGet, path, nil)
		if userID != "" {
			req.Header.Set("X-User-ID", userID)
		}
		response := httptest.NewRecorder()
		r.ServeHTTP(response, req)
		if response.Code != wantStatus {
			t.Fatalf("GET %s: status %d, want %d; body: %s", path, response.Code, wantStatus, response.Body.String())
		}
		var body feedResponse
		if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
			t.Fatalf("GET %s: invalid JSON: %v", path, err)
		}
		return body
	}

	full := request("/home?limit=6", "1", http.StatusOK)
	if full.Limit != 6 || full.Offset != 0 {
		t.Fatalf("unexpected pagination: limit=%d offset=%d", full.Limit, full.Offset)
	}
	if got, want := postIDs(full.Data), []int{201, 202, 301, 203, 204, 302}; !reflect.DeepEqual(got, want) {
		t.Fatalf("feed order = %v, want %v", got, want)
	}
	for i, p := range full.Data {
		if p.AuthorID != 2 && p.AuthorID != 3 {
			t.Fatalf("post %d has unfollowed author %d", p.ID, p.AuthorID)
		}
		if i >= 2 && p.AuthorID == full.Data[i-1].AuthorID && p.AuthorID == full.Data[i-2].AuthorID {
			t.Fatalf("three consecutive posts from author %d", p.AuthorID)
		}
	}

	// The first page ends with two posts from author 2. The next page must
	// still start with author 3; offset cannot reset the author streak.
	first := request("/home?limit=2", "1", http.StatusOK)
	second := request("/api/v1/feed/home?limit=2&offset=2", "1", http.StatusOK)
	if got, want := postIDs(first.Data), []int{201, 202}; !reflect.DeepEqual(got, want) {
		t.Fatalf("first page = %v, want %v", got, want)
	}
	if got, want := postIDs(second.Data), []int{301, 203}; !reflect.DeepEqual(got, want) {
		t.Fatalf("second page = %v, want %v", got, want)
	}
	if second.Limit != 2 || second.Offset != 2 {
		t.Fatalf("unexpected second-page pagination: limit=%d offset=%d", second.Limit, second.Offset)
	}

	request("/home", "", http.StatusBadRequest)
	failPosts.Store(true)
	request("/home", "1", http.StatusBadGateway)
}

type feedResponse struct {
	Data []struct {
		ID       int `json:"id"`
		AuthorID int `json:"author_id"`
	} `json:"data"`
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

func post(id, authorID int, createdAt string) map[string]any {
	return map[string]any{
		"id": id, "author_id": authorID, "text": "post",
		"media_urls": []string{}, "created_at": createdAt, "updated_at": createdAt,
	}
}

func postIDs(posts []struct {
	ID       int `json:"id"`
	AuthorID int `json:"author_id"`
}) []int {
	ids := make([]int, 0, len(posts))
	for _, p := range posts {
		ids = append(ids, p.ID)
	}
	return ids
}
