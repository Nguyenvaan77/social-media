package service

import (
	"context"
	"errors"
	"net/url"
	"strings"
	"unicode"
	"unicode/utf8"

	"post/internal/model"
	"post/internal/repository"

	"go.mongodb.org/mongo-driver/v2/bson"
)

var (
	ErrInvalidInput = errors.New("invalid post input")
	ErrNotFound     = errors.New("post not found")
	ErrForbidden    = errors.New("only the author may change this post")
	ErrConflict     = errors.New("post changed during update; retry the request")
)

const (
	MaxTextLength    = 5000
	MaxHashtags      = 30
	MaxHashtagLength = 50
	MaxURLLength     = 2048
)

// Only content is accepted from clients. Author, action, comment and metadata
// are assigned by the service and repository.
type PostInput struct {
	Content model.PostContent `json:"content"`
}

type PostMediaPatch struct {
	Image *string `json:"image"`
	Video *string `json:"video"`
}

type PostContentPatch struct {
	RawContent *string         `json:"raw_content"`
	Hastag     *[]string       `json:"hastag"`
	Media      *PostMediaPatch `json:"media"`
}

type PostUpdate struct {
	Content *PostContentPatch `json:"content"`
}

type PostService struct {
	r *repository.PostRepository
}

func NewPostService(postRepository *repository.PostRepository) *PostService {
	return &PostService{r: postRepository}
}

func validateMediaURL(raw string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", nil
	}
	if len(value) > MaxURLLength || strings.ContainsAny(value, " \t\r\n") {
		return "", ErrInvalidInput
	}
	parsed, err := url.Parse(value)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Hostname() == "" || parsed.User != nil {
		return "", ErrInvalidInput
	}
	return value, nil
}

func validateContent(content model.PostContent) (model.PostContent, error) {
	content.RawContent = strings.TrimSpace(content.RawContent)
	if utf8.RuneCountInString(content.RawContent) > MaxTextLength || len(content.Hastag) > MaxHashtags {
		return model.PostContent{}, ErrInvalidInput
	}

	hashtags := make([]string, 0, len(content.Hastag))
	seen := make(map[string]struct{}, len(content.Hastag))
	for _, raw := range content.Hastag {
		tag := strings.TrimSpace(raw)
		if tag == "" || utf8.RuneCountInString(tag) > MaxHashtagLength || strings.IndexFunc(tag, unicode.IsSpace) >= 0 {
			return model.PostContent{}, ErrInvalidInput
		}
		if _, exists := seen[tag]; exists {
			return model.PostContent{}, ErrInvalidInput
		}
		seen[tag] = struct{}{}
		hashtags = append(hashtags, tag)
	}
	content.Hastag = hashtags

	var err error
	content.Media.Image, err = validateMediaURL(content.Media.Image)
	if err != nil {
		return model.PostContent{}, err
	}
	content.Media.Video, err = validateMediaURL(content.Media.Video)
	if err != nil {
		return model.PostContent{}, err
	}
	if content.RawContent == "" && content.Media.Image == "" && content.Media.Video == "" {
		return model.PostContent{}, ErrInvalidInput
	}
	return content, nil
}

func parsePostID(raw string) (bson.ObjectID, error) {
	id, err := bson.ObjectIDFromHex(raw)
	if err != nil || id.IsZero() {
		return bson.ObjectID{}, ErrInvalidInput
	}
	return id, nil
}

func (s *PostService) Create(ctx context.Context, authorID int, input PostInput) (*model.Post, error) {
	if authorID <= 0 {
		return nil, ErrInvalidInput
	}
	content, err := validateContent(input.Content)
	if err != nil {
		return nil, err
	}
	post := &model.Post{Author: authorID, Content: content}
	if err := s.r.Create(ctx, post); err != nil {
		return nil, err
	}
	return post, nil
}

func (s *PostService) Get(ctx context.Context, rawID string) (*model.Post, error) {
	id, err := parsePostID(rawID)
	if err != nil {
		return nil, err
	}
	post, err := s.r.FindByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	return post, err
}

func (s *PostService) Update(ctx context.Context, rawID string, authorID int, update PostUpdate) (*model.Post, error) {
	if authorID <= 0 || update.Content == nil {
		return nil, ErrInvalidInput
	}
	patch := update.Content
	if patch.RawContent == nil && patch.Hastag == nil && (patch.Media == nil || (patch.Media.Image == nil && patch.Media.Video == nil)) {
		return nil, ErrInvalidInput
	}
	id, err := parsePostID(rawID)
	if err != nil {
		return nil, err
	}
	for attempt := 0; attempt < 5; attempt++ {
		post, err := s.r.FindByID(ctx, id)
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		if err != nil {
			return nil, err
		}
		if post.Author != authorID {
			return nil, ErrForbidden
		}

		content := post.Content
		if patch.RawContent != nil {
			content.RawContent = *patch.RawContent
		}
		if patch.Hastag != nil {
			content.Hastag = *patch.Hastag
		}
		if patch.Media != nil {
			if patch.Media.Image != nil {
				content.Media.Image = *patch.Media.Image
			}
			if patch.Media.Video != nil {
				content.Media.Video = *patch.Media.Video
			}
		}
		content, err = validateContent(content)
		if err != nil {
			return nil, err
		}

		fields := make(map[string]any, 4)
		if patch.RawContent != nil {
			fields["content.raw_content"] = content.RawContent
		}
		if patch.Hastag != nil {
			fields["content.hastag"] = content.Hastag
		}
		if patch.Media != nil {
			if patch.Media.Image != nil {
				fields["content.media.image"] = content.Media.Image
			}
			if patch.Media.Video != nil {
				fields["content.media.video"] = content.Media.Video
			}
		}

		updated, err := s.r.UpdateOwned(ctx, id, authorID, post.Content, fields)
		if errors.Is(err, repository.ErrConflict) {
			continue
		}
		return updated, err
	}
	post, err := s.r.FindByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if post.Author != authorID {
		return nil, ErrForbidden
	}
	return nil, ErrConflict
}

func (s *PostService) Delete(ctx context.Context, rawID string, authorID int) error {
	if authorID <= 0 {
		return ErrInvalidInput
	}
	id, err := parsePostID(rawID)
	if err != nil {
		return err
	}
	post, err := s.r.FindByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if post.Author != authorID {
		return ErrForbidden
	}
	if err := s.r.SoftDeleteOwned(ctx, id, authorID); errors.Is(err, repository.ErrNotFound) {
		return ErrNotFound
	} else {
		return err
	}
}

func (s *PostService) ListByAuthor(ctx context.Context, authorID, limit, offset int) ([]model.Post, error) {
	if authorID <= 0 || limit < 1 || limit > 100 || offset < 0 {
		return nil, ErrInvalidInput
	}
	return s.r.ListByAuthor(ctx, authorID, limit, offset)
}
