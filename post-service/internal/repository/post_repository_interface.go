package repository

import (
	"context"

	"post/internal/model"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type PostRepository interface {
	Create(ctx context.Context, post *model.Post) error
	FindByID(ctx context.Context, id bson.ObjectID) (*model.Post, error)
	UpdateOwned(ctx context.Context, id bson.ObjectID, authorID int, expected model.PostContent, fields map[string]any) (*model.Post, error)
	SoftDeleteOwned(ctx context.Context, id bson.ObjectID, authorID int) error
	ListByAuthor(ctx context.Context, authorID, limit, offset int) ([]model.Post, error)
}
