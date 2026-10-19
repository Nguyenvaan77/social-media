package config_test

import (
	"testing"

	"auth/internal/config"
	"auth/internal/enum"
	"auth/internal/model"
	"auth/internal/seed"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestRBACMigrationAndRoleSeed(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	sqlDB.SetMaxOpenConns(1)
	if err := db.Exec("PRAGMA foreign_keys = ON").Error; err != nil {
		t.Fatal(err)
	}

	if err := config.MigrateDatabase(db); err != nil {
		t.Fatal(err)
	}
	if err := config.MigrateDatabase(db); err != nil {
		t.Fatalf("repeat migration: %v", err)
	}
	for _, table := range []any{&model.User{}, &model.Role{}, &model.UserRole{}, &model.Permission{}, &model.RolePermission{}} {
		if !db.Migrator().HasTable(table) {
			t.Fatalf("missing table for %T", table)
		}
	}
	columns, err := db.Migrator().ColumnTypes("users")
	if err != nil {
		t.Fatal(err)
	}
	userColumns := make(map[string]bool, len(columns))
	for _, column := range columns {
		userColumns[column.Name()] = true
	}
	for _, name := range []string{"id", "email", "full_name", "password_hash", "status", "created_at", "updated_at"} {
		if !userColumns[name] {
			t.Errorf("users table is missing auth column %q", name)
		}
	}
	for _, name := range []string{"passwordhash", "fullname", "bio", "avatar", "avatar_url"} {
		if userColumns[name] {
			t.Errorf("users table contains profile or legacy column %q", name)
		}
	}
	for i := 0; i < 2; i++ {
		if err := seed.SeedRoles(db); err != nil {
			t.Fatal(err)
		}
	}
	var roles []model.Role
	if err := db.Order("name").Find(&roles).Error; err != nil {
		t.Fatal(err)
	}
	if len(roles) != 3 || roles[0].Name != enum.RoleAdmin.String() || roles[1].Name != enum.RoleGroupAdmin.String() || roles[2].Name != enum.RoleUser.String() {
		t.Fatalf("unexpected seeded roles: %#v", roles)
	}

	users := []model.User{
		{Email: "alice@example.test", FullName: "Alice", PasswordHash: "hash-alice", Status: "active"},
		{Email: "bob@example.test", FullName: "Bob", PasswordHash: "hash-bob", Status: "active"},
	}
	if err := db.Create(&users).Error; err != nil {
		t.Fatal(err)
	}
	for _, user := range users {
		if user.ID == 0 || user.CreatedAt.IsZero() || user.UpdatedAt.IsZero() {
			t.Errorf("auth user %q lacks ID or timestamps after insertion", user.Email)
		}
	}
	permission := model.Permission{Name: "group.manage", Description: "Manage a group"}
	if err := db.Create(&permission).Error; err != nil {
		t.Fatal(err)
	}
	var userRole, adminRole model.Role
	if err := db.Where("name = ?", enum.RoleUser.String()).First(&userRole).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Where("name = ?", enum.RoleAdmin.String()).First(&adminRole).Error; err != nil {
		t.Fatal(err)
	}
	assignments := []model.UserRole{
		{UserID: users[0].ID, RoleID: userRole.ID},
		{UserID: users[0].ID, RoleID: adminRole.ID},
		{UserID: users[1].ID, RoleID: userRole.ID},
	}
	if err := db.Create(&assignments).Error; err != nil {
		t.Fatal(err)
	}
	grants := []model.RolePermission{
		{RoleID: userRole.ID, PermissionID: permission.ID},
		{RoleID: adminRole.ID, PermissionID: permission.ID},
	}
	if err := db.Create(&grants).Error; err != nil {
		t.Fatal(err)
	}

	var alice model.User
	if err := db.Preload("Roles").First(&alice, users[0].ID).Error; err != nil {
		t.Fatal(err)
	}
	if alice.Email != users[0].Email || alice.FullName != users[0].FullName || alice.PasswordHash != users[0].PasswordHash || alice.Status != users[0].Status {
		t.Fatalf("auth credentials were not persisted for %q", users[0].Email)
	}
	if len(alice.Roles) != 2 {
		t.Fatalf("Alice has %d roles, want 2", len(alice.Roles))
	}
	if err := db.Preload("Users").First(&userRole, userRole.ID).Error; err != nil {
		t.Fatal(err)
	}
	if len(userRole.Users) != 2 {
		t.Fatalf("user role has %d users, want 2", len(userRole.Users))
	}
	if err := db.Preload("Permissions").First(&adminRole, adminRole.ID).Error; err != nil {
		t.Fatal(err)
	}
	if len(adminRole.Permissions) != 1 {
		t.Fatalf("admin role has %d permissions, want 1", len(adminRole.Permissions))
	}
	if err := db.Preload("Roles").First(&permission, permission.ID).Error; err != nil {
		t.Fatal(err)
	}
	if len(permission.Roles) != 2 {
		t.Fatalf("permission has %d roles, want 2", len(permission.Roles))
	}

	duplicate := model.UserRole{UserID: users[0].ID, RoleID: userRole.ID}
	if err := db.Create(&duplicate).Error; err == nil {
		t.Fatal("duplicate user_role assignment was accepted")
	}
	duplicateGrant := model.RolePermission{RoleID: adminRole.ID, PermissionID: permission.ID}
	if err := db.Create(&duplicateGrant).Error; err == nil {
		t.Fatal("duplicate role_permission grant was accepted")
	}
	invalidUserRole := model.UserRole{UserID: -1, RoleID: userRole.ID}
	if err := db.Create(&invalidUserRole).Error; err == nil {
		t.Fatal("user_role accepted a nonexistent user")
	}
	invalidRolePermission := model.RolePermission{RoleID: adminRole.ID, PermissionID: permission.ID + 1}
	if err := db.Create(&invalidRolePermission).Error; err == nil {
		t.Fatal("role_permission accepted a nonexistent permission")
	}
}
