package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type accessTokenClaims struct {
	// TokenUse string `json:"token_use"`
	Authorities []string `json:"Authorities"`
	jwt.RegisteredClaims
}

type refreshTokenClaims struct {
	RefreshSecretToken string `json:"RefreshSecretToken"`
	jwt.RegisteredClaims
}

var ErrInvalidRefreshToken = errors.New("invalid refresh token")

func (s *AuthService) signAccessToken(userID int, lifetime time.Duration, key []byte) (string, error) {
	var tokenID [16]byte
	if _, err := rand.Read(tokenID[:]); err != nil {
		return "", err
	}

	authotities, err := s.getPermissionClaims(userID)

	if err != nil {
		return "", err
	}

	now := time.Now().UTC()
	claims := accessTokenClaims{
		Authorities: authotities,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			Audience:  jwt.ClaimStrings{s.audience},
			Subject:   strconv.Itoa(userID),
			ID:        hex.EncodeToString(tokenID[:]),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(lifetime)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(key)
}

func (s *AuthService) signRefreshToken(ctx context.Context, userID int, lifetime time.Duration, key []byte) (string, error) {
	token, secret, err := s.newRefreshToken(userID, lifetime, key)
	if err != nil {
		return "", err
	}
	if err := s.authRepository.ReplaceRefreshToken(ctx, userID, secret); err != nil {
		return "", err
	}
	return token, nil
}

func (s *AuthService) newRefreshToken(userID int, lifetime time.Duration, key []byte) (string, string, error) {
	var tokenID [16]byte
	if _, err := rand.Read(tokenID[:]); err != nil {
		return "", "", err
	}
	var secretBytes [32]byte
	if _, err := rand.Read(secretBytes[:]); err != nil {
		return "", "", err
	}
	secret := hex.EncodeToString(secretBytes[:])

	now := time.Now().UTC()
	claims := refreshTokenClaims{
		RefreshSecretToken: secret,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			Audience:  jwt.ClaimStrings{s.audience},
			Subject:   strconv.Itoa(userID),
			ID:        hex.EncodeToString(tokenID[:]),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(lifetime)),
		},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(key)
	return token, secret, err
}

func (s *AuthService) ParseRefreshToken(raw string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(raw,
		func(token *jwt.Token) (any, error) {
			if token.Method != jwt.SigningMethodHS256 {
				return nil, jwt.ErrSignatureInvalid
			}
			return s.refreshKey, nil
		},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
		jwt.WithIssuer(s.issuer),
		jwt.WithAudience(s.audience),
	)
	if err != nil || token == nil || !token.Valid {
		return nil, ErrInvalidRefreshToken
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, ErrInvalidRefreshToken
	}
	if secret, ok := claims["RefreshSecretToken"].(string); !ok || secret == "" {
		return nil, ErrInvalidRefreshToken
	}
	userID, ok := claims["sub"].(string)
	if !ok {
		return nil, ErrInvalidRefreshToken
	}
	parsedID, err := strconv.Atoi(userID)
	if err != nil || parsedID <= 0 {
		return nil, ErrInvalidRefreshToken
	}
	return claims, nil
}

func (s *AuthService) getPermissionClaims(userID int) ([]string, error) {
	permissions, err := s.authRepository.GetPermissionsByUserID(userID)
	if err != nil {
		return []string{}, err
	}

	authorities := []string{}
	for _, permission := range permissions {
		authorities = append(authorities, permission.Name)
	}

	return authorities, nil
}
