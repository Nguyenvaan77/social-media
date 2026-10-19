package model

import "time"

// UserRole has a composite primary key so a user can receive a role only once.
type UserRole struct {
	UserID    int       `gorm:"column:user_id;primaryKey;index;not null"`
	RoleID    uint      `gorm:"column:role_id;primaryKey;index;not null"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`
	User      User      `gorm:"foreignKey:UserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	Role      Role      `gorm:"foreignKey:RoleID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

func (UserRole) TableName() string { return "user_role" }
