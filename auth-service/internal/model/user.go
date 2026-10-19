package model

import "time"

// User stores credentials and account state owned by auth-service.
type User struct {
	ID              int        `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	Email           string     `gorm:"column:email;type:varchar(254);uniqueIndex;not null" json:"email"`
	FullName        string     `gorm:"column:full_name;type:varchar(50);not null;default:''" json:"full_name"`
	PasswordHash    string     `gorm:"column:password_hash;type:varchar(255);not null" json:"-"`
	Status          string     `gorm:"column:status;type:varchar(16);not null;default:active" json:"status"`
	EmailVerifiedAt *time.Time `gorm:"column:email_verified_at" json:"email_verified_at,omitempty"`
	LastLoginAt     *time.Time `gorm:"column:last_login_at" json:"last_login_at,omitempty"`
	CreatedAt       time.Time  `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time  `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	Roles           []Role     `gorm:"many2many:user_role;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"roles,omitempty"`
}
