package service

import (
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"auth/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type AuthService struct {
	authRepository *repository.AuthRepository
	accessKey      []byte
	refreshKey     []byte
	issuer         string
	audience       string
	accessLifetime time.Duration
	refreshLifetime time.Duration
}

func NewAuthService(r *repository.AuthRepository) (*AuthService, error) {
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

	return &AuthService{
		authRepository: r,
		accessKey:      []byte(accessSecret),
		refreshKey:     []byte(refreshSecret),
		issuer:         issuer,
		audience:       audience,
		accessLifetime: accessLifetime,
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
