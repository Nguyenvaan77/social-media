package handler

import (
	"errors"
	"net/http"

	"auth/internal/dto"
	"auth/internal/service"

	"github.com/gin-gonic/gin"
)

// Login handles authentication requests.
func (h *AuthHandler) Login(c *gin.Context) {
	var request dto.LoginRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	result, err := h.authService.Login(c.Request.Context(), request.Email, request.Password)
	switch {
	case errors.Is(err, service.ErrInvalidCredentials):
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
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
