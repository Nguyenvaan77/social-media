package service

import (
	"context"

	"auth/internal/model"

	"github.com/golang-jwt/jwt/v5"
)

type AuthService interface {
	Login(ctx context.Context, email, password string) (LoginResult, error)
	Logout(ctx context.Context, userID int, currentToken string) (bool, error)
	Refresh(ctx context.Context, userID int, currentSecret string) (LoginResult, error)
	Register(ctx context.Context, email, password, fullName string) (*model.User, error)
	ParseRefreshToken(raw string) (jwt.MapClaims, error)
}
