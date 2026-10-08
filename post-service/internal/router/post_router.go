package router

import (
	"post/internal/handler"

	"github.com/gin-gonic/gin"
)

func SetupRouter(postHandler *handler.PostHandler) *gin.Engine {
	r := gin.Default()
	api := r.Group("/api/v1")

	posts := api.Group("/posts")
	posts.POST("", postHandler.RequireUserID, postHandler.Create)
	posts.GET("/:id", postHandler.Get)
	posts.PATCH("/:id", postHandler.RequireUserID, postHandler.Update)
	posts.DELETE("/:id", postHandler.RequireUserID, postHandler.Delete)

	api.GET("/users/:user_id/posts", postHandler.ListByAuthor)
	return r
}
