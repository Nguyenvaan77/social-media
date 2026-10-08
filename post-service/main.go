package main

import (
	"log"
	"os"

	"post/internal/config"
	"post/internal/handler"
	"post/internal/model"
	"post/internal/repository"
	"post/internal/router"
	"post/internal/service"
)

func main() {
	db, err := config.ConnectDatabase()
	if err != nil {
		log.Fatal(err)
	}
	if err := db.AutoMigrate(&model.Post{}); err != nil {
		log.Fatal("migrate database: ", err)
	}

	postRepository := repository.NewPostRepository(db)
	postService := service.NewPostService(postRepository)
	postHandler := handler.NewPostHandler(postService)
	r := router.SetupRouter(postHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	log.Fatal(r.Run(":" + port))
}
