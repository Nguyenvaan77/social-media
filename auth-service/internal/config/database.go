package config

import (
	"errors"
	"fmt"
	"os"

	"auth/internal/model"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func ConnectDatabase() (*gorm.DB, error) {
	dsn := os.Getenv("DATABASE_DSN")
	if dsn == "" {
		return nil, errors.New("DATABASE_DSN is required")
	}
	return gorm.Open(mysql.Open(dsn), &gorm.Config{TranslateError: true})
}

func MigrateDatabase(db *gorm.DB) error {
	joinTables := []struct {
		owner any
		field string
		join  any
	}{
		{&model.User{}, "Roles", &model.UserRole{}},
		{&model.Role{}, "Users", &model.UserRole{}},
		{&model.Role{}, "Permissions", &model.RolePermission{}},
		{&model.Permission{}, "Roles", &model.RolePermission{}},
	}
	for _, table := range joinTables {
		if err := db.SetupJoinTable(table.owner, table.field, table.join); err != nil {
			return fmt.Errorf("configure %s join table: %w", table.field, err)
		}
	}

	if err := db.AutoMigrate(
		&model.User{},
		&model.Token{},
		&model.Role{},
		&model.Permission{},
		&model.UserRole{},
		&model.RolePermission{},
	); err != nil {
		return fmt.Errorf("migrate RBAC tables: %w", err)
	}
	return nil
}
