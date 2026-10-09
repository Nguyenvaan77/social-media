package router

import (
	"github.com/gin-gonic/gin"
	"gateway/internal/user/forward"

)

type Forward struct {
	userForward *forward.UserForward
}

func NewForward(userForward * forward.UserForward) *Forward {
	return &Forward{userForward: userForward}
}

func SetupRouter(forward *Forward) *gin.Engine {

	r := gin.Default()
	api := r.Group("/api/v1")

	// User API
	users := api.Group("/users")
	// users.POST("", userHandler.CreateUser)
	users.GET("", forward.userForward.GetAllUsersForward)
	// users.GET("/me", userHandler.GetMe)
	// users.PATCH("/me", userHandler.UpdateMe)
	// users.GET("/:id", userHandler.GetPublicProfile)
	// users.POST("/:id/follow", userHandler.Follow)
	// users.DELETE("/:id/follow", userHandler.Unfollow)
	// users.GET("/:id/following", userHandler.ListFollowing)
	// users.GET("/:id/followers", userHandler.ListFollowers)
	// users.GET("/follows/status", userHandler.FollowStatus)

	//Post API


	return r
}
