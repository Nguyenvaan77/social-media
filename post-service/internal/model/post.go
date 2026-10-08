package model

import (
	"time"

	"gorm.io/gorm"
)

type Post struct {
	ID        int            `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	AuthorID  int            `gorm:"column:author_id;index;not null" json:"author_id"`
	Text      string         `gorm:"column:text;type:text;not null" json:"text"`
	MediaURLs []string       `gorm:"column:media_urls;type:json;serializer:json;not null" json:"media_urls"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`
}
