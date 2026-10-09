package model

import (
	"time"

	"gorm.io/gorm"
)

type Media struct {
	ID         string         `gorm:"column:id;type:char(36);primaryKey" json:"id"`
	UserID     int            `gorm:"column:user_id;index;not null" json:"user_id"`
	StorageKey string         `gorm:"column:storage_key;type:varchar(255);uniqueIndex;not null" json:"-"`
	URL        string         `gorm:"column:url;type:text;not null" json:"url"`
	Filename   string         `gorm:"column:filename;type:varchar(255);not null" json:"filename"`
	Size       int64          `gorm:"column:size;not null" json:"size"`
	MIMEType   string         `gorm:"column:mime_type;type:varchar(32);not null" json:"mime_type"`
	CreatedAt  time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	DeletedAt  gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`
}
