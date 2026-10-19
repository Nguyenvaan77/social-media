package router

import (
	"gateway/core/auth"
	"gateway/core/logging"
	"gateway/internal/forward"

	"github.com/gin-gonic/gin"
)

type Forward struct {
	userForward *forward.UserForward
	authForward *forward.AuthForward
}

func NewForward(userForward *forward.UserForward, authForward *forward.AuthForward) *Forward {
	return &Forward{userForward: userForward, authForward: authForward}
}

func SetupRouter(forward *Forward) *gin.Engine {

	r := gin.Default()
	r.Use(logging.RequestLoggingMiddleware())

	api := r.Group("/api/v1")

	public_api := api.Group("/")
	{
		auth_api := public_api.Group("/auth")
		{
			auth_api.POST("/login", forward.authForward.LoginForward)
			auth_api.POST("/register", forward.authForward.RegisterForward)
			auth_api.POST("/logout", auth.RequiredRefeshTokenMiddleware(), forward.authForward.RegisterForward)
			auth_api.POST("/refresh", auth.RequiredRefeshTokenMiddleware(), forward.authForward.RefreshToken)
		}
	}

	private_api := api.Group("/")
	private_api.Use(auth.AuthMiddleware())
	users_api := private_api.Group("/users")
	{
		users_api.GET("", forward.userForward.GetAllUsersForward)
	}

	return r
}
