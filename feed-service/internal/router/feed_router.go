package router

import (
	"feed/internal/handler"

	"github.com/gin-gonic/gin"
)

func SetupRouter(feedHandler *handler.FeedHandler) *gin.Engine {
	r := gin.Default()
	r.GET("/home", feedHandler.Home)
	r.GET("/api/v1/feed/home", feedHandler.Home)
	return r
}
