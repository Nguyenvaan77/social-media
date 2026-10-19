package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"auth/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func (h *AuthHandler) RequireRefreshToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		raw := strings.TrimSpace(c.GetHeader("Refresh-token-X"))
		if raw == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing refresh token"})
			return
		}
		claims, err := h.authService.ParseRefreshToken(raw)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired refresh token"})
			return
		}
		c.Set("jwt_claims", claims)
		c.Next()
	}
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	value, exists := c.Get("jwt_claims")
	claims, ok := value.(jwt.MapClaims)
	if !exists || !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token claims"})
		return
	}
	secret, ok := claims["RefreshSecretToken"].(string)
	if !ok || secret == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token claims"})
		return
	}
	subject, ok := claims["sub"].(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token claims"})
		return
	}
	userID, err := strconv.Atoi(subject)
	if err != nil || userID <= 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token claims"})
		return
	}

	result, err := h.authService.Refresh(c.Request.Context(), userID, secret)
	switch {
	case errors.Is(err, service.ErrInvalidRefreshToken):
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired refresh token"})
	case err != nil:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "authentication unavailable"})
	default:
		c.JSON(http.StatusOK, gin.H{
			"access_token":  result.AccessToken,
			"refresh_token": result.RefreshToken,
			"user_id":       result.UserID,
			"token_type":    "Bearer",
			"expires_in":    result.ExpiresIn,
		})
	}
}
