package main

import (
	"log"
	"os"

	"gateway/cmd"
	"gateway/core/router"
	"gateway/internal/forward"
)

func main() {
	if err := cmd.LoadEnv("gateway-service/.env", ".env", "../.env", "../../.env"); err != nil {
		log.Fatal("load .env: ", err)
	}
	cmd.InitConfig()

	userForward := forward.NewUserForward()
	authForward := forward.NewAuthForward()
	forward := router.NewForward(userForward, authForward)
	r := router.SetupRouter(forward)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Fatal(r.Run(":" + port))
}
