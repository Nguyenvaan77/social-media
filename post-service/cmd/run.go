package main

import (
	"context"
	"log"
	"os"
	"time"

	"post/internal/config"
	"post/internal/handler"
	"post/internal/repository"
	"post/internal/router"
	"post/internal/service"
)

func main() {
	if err := config.LoadEnv(".env"); err != nil {
		log.Fatal("load .env: ", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, db, err := config.ConnectDatabase(ctx)
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(context.Background())

	posts := db.Collection("posts")
	if err := repository.EnsureIndexes(ctx, posts); err != nil {
		log.Fatal("create post indexes: ", err)
	}

	postRepository := repository.NewPostRepository(posts)
	postService := service.NewPostService(postRepository)
	postHandler := handler.NewPostHandler(postService)
	r := router.SetupRouter(postHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Fatal(r.Run(":" + port))
}
