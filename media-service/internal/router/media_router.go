package router

import (
	"media/internal/handler"

	"github.com/gin-gonic/gin"
)

func SetupRouter(mediaHandler *handler.MediaHandler) *gin.Engine {
	r := gin.Default()
	media := r.Group("/api/v1/media")
	media.POST("/upload", mediaHandler.RequireJWT, mediaHandler.Upload)
	media.GET("/:id", mediaHandler.Get)
	media.DELETE("/:id", mediaHandler.RequireJWT, mediaHandler.Delete)
	r.GET("/uploads/:key", mediaHandler.ServeFile)
	return r
}
