package model

import "time"

// RolePermission has a composite primary key so a permission is assigned once per role.
type RolePermission struct {
	RoleID       uint       `gorm:"column:role_id;primaryKey;index;not null"`
	PermissionID uint       `gorm:"column:permission_id;primaryKey;index;not null"`
	CreatedAt    time.Time  `gorm:"column:created_at;autoCreateTime"`
	Role         Role       `gorm:"foreignKey:RoleID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	Permission   Permission `gorm:"foreignKey:PermissionID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

func (RolePermission) TableName() string { return "role_permission" }
