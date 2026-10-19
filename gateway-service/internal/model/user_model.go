package model

import "time"

type User struct {
	ID    int    `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	Email string `gorm:"column:email;type:varchar(254);uniqueIndex;not null" json:"email"`
	// Kept for compatibility with databases whose passwordhash column is NOT NULL.
	// No password is accepted or checked by this service.
	LegacyPasswordHash string    `gorm:"column:passwordhash;not null" json:"-"`
	FullName           string    `gorm:"column:fullname;type:varchar(50);not null" json:"full_name"`
	Status             string    `gorm:"column:status;not null;default:active" json:"status"`
	CreatedAt          time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt          time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}
