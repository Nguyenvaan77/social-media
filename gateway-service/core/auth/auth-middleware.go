package auth

import (
	"fmt"
	"gateway/core/logging"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		start := time.Now()

		// 1. Lấy Authorization header
		authHeader := ctx.GetHeader("Authorization")

		// 2. Kiểm tra định dạng Bearer token
		parts := strings.Fields(authHeader)
		if len(parts) != 2 ||
			!strings.EqualFold(parts[0], "Bearer") {
			logging.AuthLog.Info(
				"Auth warning",
				"detail", "Missing Authorization header",
				"method", ctx.Request.Method,
				"path", ctx.Request.URL.Path,
				"entry_time", start,
			)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Missing or invalid Authorization header",
			})
			return
		}

		tokenString := parts[1]

		// 3. Lấy JWT secret từ environment variable
		secret := os.Getenv("JWT_SECRET")
		issuer := os.Getenv("JWT_ISSUER")
		audience := os.Getenv("JWT_AUDIENCE")
		fmt.Println(secret)
		if len(secret) < 32 {
			logging.AuthLog.Error(
				"Auth Error",
				"detail", "JWT configuration is missing or invalid",
				"method", ctx.Request.Method,
				"path", ctx.Request.URL.Path,
				"entry_time", start,
				"secret", secret,
			)
			ctx.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "Server chưa cấu hình JWT để tiến hành xác thực",
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
			logging.AuthLog.Info(
				"Auth Error",
				"detail", "Token is invalid",
				"method", ctx.Request.Method,
				"path", ctx.Request.URL.Path,
				"entry_time", start,
			)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			logging.AuthLog.Info(
				"Auth Error",
				"detail", "Không thể phân giải Claims",
				"method", ctx.Request.Method,
				"path", ctx.Request.URL.Path,
				"entry_time", start,
			)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Không thể phân giải claims",
			})
			return
		}
		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			logging.AuthLog.Info(
				"Auth Error",
				"detail", "claim [sub] không chưa user_id",
				"method", ctx.Request.Method,
				"path", ctx.Request.URL.Path,
				"entry_time", start,
			)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "claim [sub] có vấn đề",
			})
			return
		}

		// 5. Lưu claims đã xác thực vào Gin context
		ctx.Set("jwt_claims", claims)
		ctx.Set("user_id", userID)

		// 6. Cho phép request đi tiếp
		ctx.Next()
	}
}

func RequiredRefeshTokenMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		refreshToken := strings.TrimSpace(ctx.GetHeader("Refresh-token-X"))

		if refreshToken == "" {
			logging.AuthLog.Info(
				"Auth warning",
				"detail", "Missing Refresh-token-X header",
				"method", ctx.Request.Method,
				"path", ctx.Request.URL.Path,
			)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Missing Refresh-token-X header",
			})
			return
		}

		secret := os.Getenv("JWT_SECRET")
		issuer := strings.TrimSpace(os.Getenv("JWT_ISSUER"))
		audience := strings.TrimSpace(os.Getenv("JWT_AUDIENCE"))
		if len(secret) < 32 || issuer == "" || audience == "" {
			logging.AuthLog.Error(
				"Auth Error",
				"detail", "Refresh token JWT configuration is missing or invalid",
				"method", ctx.Request.Method,
				"path", ctx.Request.URL.Path,
			)
			ctx.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "rehresh tokenJWT configuration is missing or invalid",
			})
			return
		}

		token, err := jwt.Parse(
			refreshToken,
			func(token *jwt.Token) (any, error) {
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
			logging.AuthLog.Info(
				"Auth Error",
				"detail", "Refresh token is invalid or expired",
				"method", ctx.Request.Method,
				"path", ctx.Request.URL.Path,
			)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired refresh token",
			})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid refresh token claims",
			})
			return
		}
		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid refresh token subject",
			})
			return
		}

		ctx.Set("jwt_claims", claims)
		ctx.Set("user_id", userID)
		ctx.Next()
	}
}
