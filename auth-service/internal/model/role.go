package model

import "time"

type Role struct {
	ID          uint         `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	Name        string       `gorm:"column:name;type:varchar(64);uniqueIndex;not null" json:"name"`
	Description string       `gorm:"column:description;type:varchar(255)" json:"description"`
	CreatedAt   time.Time    `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time    `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	Users       []User       `gorm:"many2many:user_role;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"users,omitempty"`
	Permissions []Permission `gorm:"many2many:role_permission;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"permissions,omitempty"`
}
