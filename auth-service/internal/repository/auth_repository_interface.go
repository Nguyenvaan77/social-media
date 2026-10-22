package repository

import (
	"context"

	"auth/internal/enum"
	"auth/internal/model"
)

type AuthRepository interface {
	GetPermissionsByUserID(int) ([]model.Permission, error)
	FindByEmail(ctx context.Context, email string) (*model.User, error)
	EmailExists(context.Context, string) (bool, error)
	CreateWithRole(context.Context, *model.User, enum.Role) error
	FindRefreshTokenByEmail(ctx context.Context, email string) (*model.Token, error)
	FindRefreshTokenByUserID(ctx context.Context, userID int) (*model.Token, error)
	ReplaceRefreshToken(ctx context.Context, userID int, secret string) error
	RotateRefreshToken(ctx context.Context, userID int, currentSecret, newSecret string) error
	DeleteRefreshTokenByUserID(ctx context.Context, userID int) (bool, error)
	DeleteRefreshTokenByCurrentToken(ctx context.Context, userID int, currentToken string) (bool, error)
}
