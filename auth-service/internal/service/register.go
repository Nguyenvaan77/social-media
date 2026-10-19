package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"auth/internal/enum"
	"auth/internal/model"
	"auth/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEmailAlreadyRegistered = errors.New("email already registered")
	ErrInvalidRegistration     = errors.New("invalid registration request")
)

// Register creates an auth account and assigns the user role atomically.
func (s *AuthService) Register(ctx context.Context, email, password, fullName string) (*model.User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || password == "" {
		return nil, ErrInvalidRegistration
	}

	exists, err := s.authRepository.EmailExists(ctx, email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrEmailAlreadyRegistered
	}
	fullName = strings.TrimSpace(fullName)
	if fullName == "" {
		fullName = strings.SplitN(email, "@", 2)[0]
	}
	if fullName == "" || utf8.RuneCountInString(fullName) > 50 {
		return nil, ErrInvalidRegistration
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash registration password: %w", err)
	}

	now := time.Now()
	user := model.User{
		Email:           email,
		FullName:        fullName,
		PasswordHash:    string(hash),
		Status:          enum.ENABLE.String(),
		EmailVerifiedAt: &now,
		LastLoginAt:     nil,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := s.authRepository.CreateWithRole(ctx, &user, enum.RoleUser); err != nil {
		if errors.Is(err, repository.ErrDuplicateEmail) {
			return nil, ErrEmailAlreadyRegistered
		}
		return nil, err
	}
	return &user, nil
}
