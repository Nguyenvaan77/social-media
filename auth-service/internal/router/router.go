package router

import (
	"auth/internal/handler"

	"github.com/gin-gonic/gin"
)

// SetupRouter exposes the auth-service HTTP API.
func SetupRouter(authHandler *handler.AuthHandler) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.POST("/api/v1/auth/login", authHandler.Login)
	r.POST("/api/v1/auth/register", authHandler.Register)
	r.POST("/api/v1/auth/logout", authHandler.RequireRefreshToken(), authHandler.Logout)
	r.POST("/api/v1/auth/refresh", authHandler.RequireRefreshToken(), authHandler.Refresh)
	return r
}
