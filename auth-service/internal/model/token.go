package model

import "time"

// Token stores the single refresh token owned by a user.
type Token struct {
	ID           int       `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	CreatedAt    time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UserID       int       `gorm:"column:user_id;uniqueIndex;not null" json:"user_id"`
	User         User      `gorm:"foreignKey:UserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"user,omitempty"`
	RefreshToken string    `gorm:"column:refresh_token;type:varchar(512);uniqueIndex;not null" json:"refresh_token"`
}
