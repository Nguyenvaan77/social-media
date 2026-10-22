package repository

import "media/internal/model"

type MediaRepository interface {
	CreateMany(records []model.Media) error
	FindByID(id string) (*model.Media, error)
	SoftDeleteOwned(id string, userID int) error
}
