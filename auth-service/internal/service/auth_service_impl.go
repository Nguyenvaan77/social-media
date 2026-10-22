package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
	"unicode/utf8"

	"auth/internal/enum"
	"auth/internal/model"
	"auth/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrTokenInDatabase        = errors.New("Lỗi load Token database")
	ErrTokenIsNotFound        = errors.New("Refresh token không tồn tại trong danh sách token được lưu")
	ErrDeleteToken            = errors.New("Refresh token không tồn tại trong danh sách token được lưu")
	ErrInvalidCredentials     = errors.New("invalid credentials")
	ErrEmailAlreadyRegistered = errors.New("email already registered")
	ErrInvalidRegistration    = errors.New("invalid registration request")
)

type AuthServiceImpl struct {
	authRepository  repository.AuthRepository
	accessKey       []byte
	refreshKey      []byte
	issuer          string
	audience        string
	accessLifetime  time.Duration
	refreshLifetime time.Duration
}

type LoginResult struct {
	AccessToken  string
	RefreshToken string
	UserID       int
	ExpiresIn    int
}

func NewAuthService(r repository.AuthRepository) (*AuthServiceImpl, error) {
	accessSecret := os.Getenv("JWT_SECRET")
	if len(accessSecret) < 32 {
		return nil, errors.New("JWT_SECRET must be at least 32 characters")
	}
	refreshSecret := os.Getenv("JWT_SECRET")
	if len(refreshSecret) < 32 {
		return nil, errors.New("JWT_SECRET must be at least 32 characters")
	}
	issuer := strings.TrimSpace(os.Getenv("JWT_ISSUER"))
	if issuer == "" {
		return nil, errors.New("JWT_ISSUER is required")
	}
	audience := strings.TrimSpace(os.Getenv("JWT_AUDIENCE"))
	if audience == "" {
		return nil, errors.New("JWT_AUDIENCE is required")
	}
	accessLifetime, err := time.ParseDuration(os.Getenv("JWT_EXPIRATION"))
	if err != nil || accessLifetime < time.Second {
		return nil, errors.New("JWT_EXPIRATION must be a positive duration of at least one second")
	}
	refreshExpiration := os.Getenv("JWT_REFRESH_EXPIRATION")
	if refreshExpiration == "" {
		refreshExpiration = "168h"
	}
	refreshLifetime, err := time.ParseDuration(refreshExpiration)
	if err != nil || refreshLifetime <= accessLifetime {
		return nil, errors.New("JWT_REFRESH_EXPIRATION must be a duration longer than JWT_EXPIRATION")
	}

	return &AuthServiceImpl{
		authRepository:  r,
		accessKey:       []byte(accessSecret),
		refreshKey:      []byte(refreshSecret),
		issuer:          issuer,
		audience:        audience,
		accessLifetime:  accessLifetime,
		refreshLifetime: refreshLifetime,
	}, nil
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Lấy Authorization header
		authHeader := c.GetHeader("Authorization")

		// 2. Kiểm tra định dạng Bearer token
		parts := strings.Fields(authHeader)
		if len(parts) != 2 ||
			!strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Missing or invalid Authorization header",
			})
			return
		}

		tokenString := parts[1]

		// 3. Lấy JWT secret từ environment variable
		secret := os.Getenv("JWT_SECRET")
		issuer := strings.TrimSpace(os.Getenv("JWT_ISSUER"))
		audience := strings.TrimSpace(os.Getenv("JWT_AUDIENCE"))
		if len(secret) < 32 || issuer == "" || audience == "" {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "Server chưa cấu hình JWT Secret để tiến hành xác thực",
			})
			return
		}

		// 4. Xác thực chữ ký và claims
		token, err := jwt.Parse(
			tokenString,
			func(token *jwt.Token) (any, error) {
				// Chỉ chấp nhận thuật toán HS256
				if token.Method != jwt.SigningMethodHS256 {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(secret), nil
			},
			jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
			jwt.WithExpirationRequired(),
			jwt.WithIssuedAt(),
			jwt.WithIssuer(issuer),
			jwt.WithAudience(audience),
		)

		if err != nil || token == nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})
			return
		}

		// 5. Lưu claims đã xác thực vào Gin context
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || claims["token_use"] != "access" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}
		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}
		c.Set("jwt_claims", claims)
		c.Set("user_id", userID)

		// 6. Cho phép request đi tiếp
		c.Next()
	}
}

func (s *AuthServiceImpl) Login(ctx context.Context, email, password string) (LoginResult, error) {
	// user, err := s.authRepository.FindByEmail(ctx, strings.ToLower(strings.TrimSpace(email)))
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

func (s *AuthServiceImpl) Logout(ctx context.Context, userID int, currentToken string) (bool, error) {
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

	isLogout, err := s.authRepository.DeleteRefreshTokenByCurrentToken(ctx, userID, currentToken)

	if err != nil {
		return false, ErrDeleteToken
	}

	return isLogout, nil
}

func (s *AuthServiceImpl) Refresh(ctx context.Context, userID int, currentSecret string) (LoginResult, error) {
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

func (s *AuthServiceImpl) Register(ctx context.Context, email, password, fullName string) (*model.User, error) {
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
