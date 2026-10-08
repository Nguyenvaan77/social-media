package service

import (
	"errors"
	"net/url"
	"strings"
	"unicode/utf8"

	"post/internal/model"
	"post/internal/repository"

	"gorm.io/gorm"
)

var (
	ErrInvalidInput = errors.New("invalid post input")
	ErrNotFound     = errors.New("post not found")
	ErrForbidden    = errors.New("only the author may change this post")
)

const (
	MaxTextLength = 5000
	MaxMediaURLs  = 10
	MaxURLLength  = 2048
)

type PostInput struct {
	Text      string   `json:"text"`
	MediaURLs []string `json:"media_urls"`
}

type PostUpdate struct {
	Text      *string   `json:"text"`
	MediaURLs *[]string `json:"media_urls"`
}

type PostService struct {
	r *repository.PostRepository
}

func NewPostService(postRepository *repository.PostRepository) *PostService {
	return &PostService{r: postRepository}
}

func validateContent(text string, mediaURLs []string) (string, []string, error) {
	text = strings.TrimSpace(text)
	if utf8.RuneCountInString(text) > MaxTextLength || len(mediaURLs) > MaxMediaURLs {
		return "", nil, ErrInvalidInput
	}
	urls := make([]string, 0, len(mediaURLs))
	for _, raw := range mediaURLs {
		value := strings.TrimSpace(raw)
		if value == "" || len(value) > MaxURLLength || strings.ContainsAny(value, " \t\r\n") {
			return "", nil, ErrInvalidInput
		}
		parsed, err := url.Parse(value)
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Hostname() == "" || parsed.User != nil {
			return "", nil, ErrInvalidInput
		}
		urls = append(urls, value)
	}
	if text == "" && len(urls) == 0 {
		return "", nil, ErrInvalidInput
	}
	return text, urls, nil
}

func (s *PostService) Create(authorID int, input PostInput) (*model.Post, error) {
	if authorID <= 0 {
		return nil, ErrInvalidInput
	}
	text, mediaURLs, err := validateContent(input.Text, input.MediaURLs)
	if err != nil {
		return nil, err
	}
	post := &model.Post{AuthorID: authorID, Text: text, MediaURLs: mediaURLs}
	if err := s.r.Create(post); err != nil {
		return nil, err
	}
	return post, nil
}

func (s *PostService) Get(id int) (*model.Post, error) {
	if id <= 0 {
		return nil, ErrInvalidInput
	}
	post, err := s.r.FindByID(id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return post, err
}

func (s *PostService) Update(id, authorID int, update PostUpdate) (*model.Post, error) {
	if update.Text == nil && update.MediaURLs == nil {
		return nil, ErrInvalidInput
	}
	post, err := s.Get(id)
	if err != nil {
		return nil, err
	}
	if post.AuthorID != authorID {
		return nil, ErrForbidden
	}
	text, mediaURLs := post.Text, post.MediaURLs
	if update.Text != nil {
		text = *update.Text
	}
	if update.MediaURLs != nil {
		mediaURLs = *update.MediaURLs
	}
	text, mediaURLs, err = validateContent(text, mediaURLs)
	if err != nil {
		return nil, err
	}
	fields := make(map[string]interface{})
	if update.Text != nil {
		fields["text"] = text
	}
	if update.MediaURLs != nil {
		fields["media_urls"] = mediaURLs
	}
	updated, err := s.r.UpdateOwned(id, authorID, fields)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return updated, err
}

func (s *PostService) Delete(id, authorID int) error {
	post, err := s.Get(id)
	if err != nil {
		return err
	}
	if post.AuthorID != authorID {
		return ErrForbidden
	}
	err = s.r.SoftDeleteOwned(id, authorID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	}
	return err
}

func (s *PostService) ListByAuthor(authorID, limit, offset int) ([]model.Post, error) {
	if authorID <= 0 || limit < 1 || limit > 100 || offset < 0 {
		return nil, ErrInvalidInput
	}
	return s.r.ListByAuthor(authorID, limit, offset)
}
