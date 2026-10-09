package main

import (
	"log"
	"os"

	"feed/internal/client"
	"feed/internal/handler"
	"feed/internal/router"
	"feed/internal/service"
)

func main() {
	userURL := os.Getenv("USER_SERVICE_URL")
	if userURL == "" {
		userURL = "http://localhost:8080"
	}
	postURL := os.Getenv("POST_SERVICE_URL")
	if postURL == "" {
		postURL = "http://localhost:8081"
	}
	upstream, err := client.NewClient(userURL, postURL)
	if err != nil {
		log.Fatal("configure upstream services: ", err)
	}
	feedService := service.NewFeedService(upstream)
	feedHandler := handler.NewFeedHandler(feedService)
	r := router.SetupRouter(feedHandler)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}
	log.Fatal(r.Run(":" + port))
}
