package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

type LoginResult struct {
	AccessToken  string
	RefreshToken string
	UserID       int
	ExpiresIn    int
}

func (s *AuthService) Login(ctx context.Context, email, password string) (LoginResult, error) {
	user, err := s.authRepository.FindByEmail(ctx, strings.ToLower(strings.TrimSpace(email)))
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return LoginResult{}, ErrInvalidCredentials
	}
	if err != nil {
		return LoginResult{}, err
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)) != nil ||
		(user.Status != "enable" && user.Status != "active") {
		return LoginResult{}, ErrInvalidCredentials
	}

	accessToken, err := s.signAccessToken(user.ID, s.accessLifetime, s.accessKey)
	if err != nil {
		return LoginResult{}, fmt.Errorf("sign access token: %w", err)
	}
	refreshToken, err := s.signRefreshToken(ctx, user.ID, s.refreshLifetime, s.refreshKey)
	if err != nil {
		return LoginResult{}, fmt.Errorf("sign refresh token: %w", err)
	}
	return LoginResult{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		UserID:       user.ID,
		ExpiresIn:    int(s.accessLifetime.Seconds()),
	}, nil
}
