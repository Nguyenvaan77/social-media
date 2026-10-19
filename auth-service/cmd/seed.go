package main

import (
	"fmt"
	"os"

	"auth/internal/config"
	"auth/internal/seed"
)

// runSeed is called only by the `seed` command, never by the HTTP server startup.
func runSeed() error {
	db, err := config.ConnectDatabase()
	if err != nil {
		return fmt.Errorf("connect database: %w", err)
	}
	if err := config.MigrateDatabase(db); err != nil {
		return fmt.Errorf("migrate database: %w", err)
	}
	passwords := seed.Passwords{
		User:       os.Getenv("AUTH_SEED_USER_PASSWORD"),
		Admin:      os.Getenv("AUTH_SEED_ADMIN_PASSWORD"),
		AdminGroup: os.Getenv("AUTH_SEED_ADMIN_GROUP_PASSWORD"),
	}
	return seed.Seed(db, passwords)
}
