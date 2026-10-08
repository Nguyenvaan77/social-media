package repository

import (
	"encoding/json"
	"errors"
	"fmt"

	"post/internal/model"

	"gorm.io/gorm"
)

type PostRepository struct {
	db *gorm.DB
}

func NewPostRepository(db *gorm.DB) *PostRepository {
	return &PostRepository{db: db}
}

func (r *PostRepository) Create(post *model.Post) error {
	if post == nil {
		return errors.New("create post: post is nil")
	}
	if post.MediaURLs == nil {
		post.MediaURLs = []string{}
	}
	if err := r.db.Create(post).Error; err != nil {
		return fmt.Errorf("create post: %w", err)
	}
	return nil
}

func (r *PostRepository) FindByID(id int) (*model.Post, error) {
	var post model.Post
	if err := r.db.First(&post, id).Error; err != nil {
		return nil, fmt.Errorf("find post %d: %w", id, err)
	}
	return &post, nil
}

func (r *PostRepository) UpdateOwned(id, authorID int, updates map[string]interface{}) (*model.Post, error) {
	if len(updates) == 0 {
		return nil, errors.New("update post: no fields provided")
	}

	values := make(map[string]interface{}, len(updates))
	for field, value := range updates {
		switch field {
		case "text":
			text, ok := value.(string)
			if !ok {
				return nil, errors.New("update post: text must be a string")
			}
			values[field] = text
		case "media_urls":
			urls, ok := value.([]string)
			if !ok {
				return nil, errors.New("update post: media_urls must be a string array")
			}
			if urls == nil {
				urls = []string{}
			}
			encoded, err := json.Marshal(urls)
			if err != nil {
				return nil, fmt.Errorf("update post: encode media_urls: %w", err)
			}
			values[field] = string(encoded)
		default:
			return nil, fmt.Errorf("update post: unsupported field %q", field)
		}
	}

	result := r.db.Model(&model.Post{}).
		Where("id = ? AND author_id = ?", id, authorID).
		Updates(values)
	if result.Error != nil {
		return nil, fmt.Errorf("update post %d: %w", id, result.Error)
	}
	var post model.Post
	if err := r.db.Where("id = ? AND author_id = ?", id, authorID).First(&post).Error; err != nil {
		return nil, fmt.Errorf("load updated post %d: %w", id, err)
	}
	return &post, nil
}

func (r *PostRepository) SoftDeleteOwned(id, authorID int) error {
	result := r.db.Where("id = ? AND author_id = ?", id, authorID).Delete(&model.Post{})
	if result.Error != nil {
		return fmt.Errorf("delete post %d: %w", id, result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("delete post %d: %w", id, gorm.ErrRecordNotFound)
	}
	return nil
}

func (r *PostRepository) ListByAuthor(authorID, limit, offset int) ([]model.Post, error) {
	if limit <= 0 {
		limit = 20
	} else if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	var posts []model.Post
	if err := r.db.Where("author_id = ?", authorID).
		Order("created_at DESC, id DESC").
		Limit(limit).Offset(offset).
		Find(&posts).Error; err != nil {
		return nil, fmt.Errorf("list posts for author %d: %w", authorID, err)
	}
	return posts, nil
}
