package service

import (
	"context"

	"post/internal/model"
)

type PostService interface {
	Create(ctx context.Context, authorID int, input PostInput) (*model.Post, error)
	Get(ctx context.Context, rawID string) (*model.Post, error)
	Update(ctx context.Context, rawID string, authorID int, update PostUpdate) (*model.Post, error)
	Delete(ctx context.Context, rawID string, authorID int) error
	ListByAuthor(ctx context.Context, authorID, limit, offset int) ([]model.Post, error)
}
