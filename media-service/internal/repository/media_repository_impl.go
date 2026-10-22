package repository

import (
	"fmt"

	"media/internal/model"

	"gorm.io/gorm"
)

type MediaRepositoryImpl struct {
	db *gorm.DB
}

var _ MediaRepository = (*MediaRepositoryImpl)(nil)

func NewMediaRepository(db *gorm.DB) *MediaRepositoryImpl {
	return &MediaRepositoryImpl{db: db}
}

func (r *MediaRepositoryImpl) CreateMany(records []model.Media) error {
	if len(records) == 0 {
		return nil
	}
	if err := r.db.Create(&records).Error; err != nil {
		return fmt.Errorf("create media records: %w", err)
	}
	return nil
}

func (r *MediaRepositoryImpl) FindByID(id string) (*model.Media, error) {
	var media model.Media
	if err := r.db.Where("id = ?", id).First(&media).Error; err != nil {
		return nil, fmt.Errorf("find media %s: %w", id, err)
	}
	return &media, nil
}

func (r *MediaRepositoryImpl) SoftDeleteOwned(id string, userID int) error {
	result := r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.Media{})
	if result.Error != nil {
		return fmt.Errorf("delete media %s: %w", id, result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("delete media %s: %w", id, gorm.ErrRecordNotFound)
	}
	return nil
}
