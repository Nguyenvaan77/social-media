package service

import (
	"os"

	"media/internal/model"
)

type MediaService interface {
	Upload(userID int, files []UploadFile) ([]model.Media, error)
	Get(id string) (*model.Media, error)
	Delete(id string, userID int) error
	OpenFile(key string) (*os.File, error)
}
