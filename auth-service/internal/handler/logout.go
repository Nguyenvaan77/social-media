package handler

import (
	"auth/internal/service"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func (h *AuthHandler) Logout(c *gin.Context) {
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

	isLogout, err := h.authService.Logout(c.Request.Context(), userID, secret)

	switch {

	case errors.Is(err, service.ErrTokenInDatabase):
		c.JSON(http.StatusInternalServerError, gin.H{"error": service.ErrTokenInDatabase.Error()})
	case errors.Is(err, service.ErrTokenIsNotFound):
		c.JSON(http.StatusInternalServerError, gin.H{"error": service.ErrTokenIsNotFound.Error()})
	case errors.Is(err, service.ErrDeleteToken):
		c.JSON(http.StatusInternalServerError, gin.H{"error": service.ErrDeleteToken.Error()})
	case err != nil:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi chương trình"})
	default:
		msg := ""

		if isLogout {
			msg = "Đăng xuất thành công"
		} else {
			msg = "Đăng xuất thất bại"
		}

		c.JSON(http.StatusOK, gin.H{
			"msg":  msg,
		})
	}
}