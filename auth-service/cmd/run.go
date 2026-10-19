package main

import (
	"log"
	"os"

	"auth/internal/config"
	"auth/internal/handler"
	"auth/internal/repository"
	"auth/internal/router"
	"auth/internal/service"
)

func main() {
	if err := config.LoadEnv("auth-service/.env", ".env", "../.env"); err != nil {
		log.Fatal("load .env: ", err)
	}
	// if len(os.Args) == 2 && os.Args[1] == "seed" {
	// 	if err := runSeed(); err != nil {
	// 		log.Fatal("seed auth data: ", err)
	// 	}
	// 	log.Println("auth seed completed")
	// 	return
	// }
	// if len(os.Args) != 1 {
	// 	log.Fatal("usage: auth-service [seed]")
	// }
	if err := runServer(); err != nil {
		log.Fatal(err)
	}
}

func runServer() error {
	db, err := config.ConnectDatabase()
	if err != nil {
		return err
	}
	// if err := config.MigrateDatabase(db); err != nil {
	// 	return err
	// }

	port := os.Getenv("PORT")
	if port == "" {
		port = "8085"
	}
	authRepository := repository.NewAuthRepository(db)
	authService, err := service.NewAuthService(authRepository)
	if err != nil {
		return err
	}
	authHandler := handler.NewAuthHandler(authService)
	return router.SetupRouter(authHandler).Run(":" + port)
}
