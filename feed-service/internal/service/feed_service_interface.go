package service

import (
	"context"

	"feed/internal/model"
)

type FeedService interface {
	Home(ctx context.Context, userID, limit, offset int) ([]model.Post, error)
}
