package main

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"media/internal/auth"
	"media/internal/config"
	"media/internal/handler"
	"media/internal/model"
	"media/internal/repository"
	"media/internal/router"
	"media/internal/service"
	"media/internal/storage"
)

func maxFileBytes() (int64, error) {
	raw := os.Getenv("MAX_FILE_SIZE_MB")
	if raw == "" {
		raw = "5"
	}
	megabytes, err := strconv.Atoi(raw)
	if err != nil || megabytes < 1 || megabytes > 20 {
		return 0, fmt.Errorf("MAX_FILE_SIZE_MB must be an integer from 1 to 20")
	}
	return int64(megabytes) << 20, nil
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	limit, err := maxFileBytes()
	if err != nil {
		log.Fatal(err)
	}
	verifier, err := auth.NewVerifier(os.Getenv("JWT_SECRET"), os.Getenv("JWT_ISSUER"), os.Getenv("JWT_AUDIENCE"))
	if err != nil {
		log.Fatal("configure JWT: ", err)
	}

	publicBaseURL := os.Getenv("PUBLIC_BASE_URL")
	if publicBaseURL == "" {
		publicBaseURL = "http://localhost:" + port
	}
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	fileStorage, err := storage.NewLocal(uploadDir, publicBaseURL)
	if err != nil {
		log.Fatal("configure storage: ", err)
	}

	db, err := config.ConnectDatabase()
	if err != nil {
		log.Fatal(err)
	}
	if err := db.AutoMigrate(&model.Media{}); err != nil {
		log.Fatal("migrate database: ", err)
	}
	mediaRepository := repository.NewMediaRepository(db)
	mediaService := service.NewMediaService(mediaRepository, fileStorage, limit)
	mediaHandler := handler.NewMediaHandler(mediaService, verifier, limit)
	r := router.SetupRouter(mediaHandler)
	log.Fatal(r.Run(":" + port))
}
