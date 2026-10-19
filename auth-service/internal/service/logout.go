package service

import (
	"context"
	"errors"

	"gorm.io/gorm"
)

var (
	ErrTokenInDatabase = errors.New("Lỗi load Token database")
	ErrTokenIsNotFound = errors.New("Refresh token không tồn tại trong danh sách token được lưu")
	ErrDeleteToken = errors.New("Refresh token không tồn tại trong danh sách token được lưu")
)

func (s *AuthService) Logout(ctx context.Context, userID int, currentToken string) (bool, error) {
	token, err := s.authRepository.FindRefreshTokenByUserID(ctx, userID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return true, nil
		}

		return false, ErrTokenInDatabase
	}

	if token.RefreshToken != currentToken {
		return false, ErrTokenIsNotFound
	}

	isLogout, err := s.authRepository.DeleteRefreshTokenByCurrentToken(ctx,userID,currentToken)

	if err != nil {
		return false, ErrDeleteToken
	}

	return isLogout, nil
}
