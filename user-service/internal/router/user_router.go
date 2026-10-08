package router

import (
	"user/internal/handler"

	"github.com/gin-gonic/gin"
)

func SetupRouter(userHandler *handler.UserHandler) *gin.Engine {
	r := gin.Default()
	api := r.Group("/api/v1")

	users := api.Group("/users")
	users.POST("", userHandler.CreateUser)
	users.GET("/me", userHandler.RequireUserID, userHandler.GetMe)
	users.PATCH("/me", userHandler.RequireUserID, userHandler.UpdateMe)
	users.GET("/:id", userHandler.GetPublicProfile)
	users.POST("/:id/follow", userHandler.RequireUserID, userHandler.Follow)
	users.DELETE("/:id/follow", userHandler.RequireUserID, userHandler.Unfollow)
	users.GET("/:id/following", userHandler.ListFollowing)
	users.GET("/:id/followers", userHandler.ListFollowers)

	api.GET("/follows/status", userHandler.FollowStatus)
	return r
}
