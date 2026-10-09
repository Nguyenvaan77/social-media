package main

import (
	"log"
	"os"

	"gateway/core/router"
	"gateway/internal/user/forward"
)

func main() {
	userForward := forward.NewUserForward()
	forward := router.NewForward(userForward)
	r := router.SetupRouter(forward)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Fatal(r.Run(":" + port))
}
