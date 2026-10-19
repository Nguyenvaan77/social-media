package service

import (
	"context"
	"errors"
	"fmt"

	"auth/internal/repository"
)

func (s *AuthService) Refresh(ctx context.Context, userID int, currentSecret string) (LoginResult, error) {
	if userID <= 0 || currentSecret == "" {
		return LoginResult{}, ErrInvalidRefreshToken
	}

	accessToken, err := s.signAccessToken(userID, s.accessLifetime, s.accessKey)
	if err != nil {
		return LoginResult{}, fmt.Errorf("sign access token: %w", err)
	}
	refreshToken, newSecret, err := s.newRefreshToken(userID, s.refreshLifetime, s.refreshKey)
	if err != nil {
		return LoginResult{}, fmt.Errorf("sign refresh token: %w", err)
	}
	if err := s.authRepository.RotateRefreshToken(ctx, userID, currentSecret, newSecret); err != nil {
		if errors.Is(err, repository.ErrRefreshTokenMismatch) {
			return LoginResult{}, ErrInvalidRefreshToken
		}
		return LoginResult{}, fmt.Errorf("rotate refresh token: %w", err)
	}

	return LoginResult{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		UserID:       userID,
		ExpiresIn:    int(s.accessLifetime.Seconds()),
	}, nil
}
