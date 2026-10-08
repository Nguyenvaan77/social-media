package main

import (
	"log"
	"os"

	"user/internal/config"
	"user/internal/handler"
	"user/internal/model"
	"user/internal/repository"
	"user/internal/router"
	"user/internal/service"
)

func main() {
	db, err := config.ConnectDatabase()
	if err != nil {
		log.Fatal(err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.Follow{}); err != nil {
		log.Fatal("migrate database: ", err)
	}

	userRepository := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepository)
	userHandler := handler.NewUserHandler(userService)
	r := router.SetupRouter(userHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Fatal(r.Run(":" + port))
}
