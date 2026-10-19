package handler

import (
	"errors"
	"net/http"

	"auth/internal/dto"
	"auth/internal/service"

	"github.com/gin-gonic/gin"
)

// Register handles account creation requests.
func (h *AuthHandler) Register(c *gin.Context) {
	var request dto.RegisterRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"msg": "invalid registration request"})
		return
	}

	user, err := h.authService.Register(c.Request.Context(), request.Email, request.Password, request.FullName)
	
	switch {
	case errors.Is(err, service.ErrEmailAlreadyRegistered):
		c.JSON(http.StatusBadRequest, gin.H{"msg": "email already registered"})
	case errors.Is(err, service.ErrInvalidRegistration):
		c.JSON(http.StatusBadRequest, gin.H{"msg": "invalid registration request"})
	case err != nil:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "registration unavailable"})
	default:
		c.JSON(http.StatusCreated, gin.H{"data": user})
	}
}
