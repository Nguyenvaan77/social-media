package seed

import (
	"errors"
	"fmt"

	"auth/internal/enum"
	"auth/internal/model"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	UserEmail       = "user@social-media.test"
	AdminEmail      = "admin@social-media.test"
	AdminGroupEmail = "admin-group@social-media.test"
)

type Passwords struct {
	User       string
	Admin      string
	AdminGroup string
}

var defaultRoles = []struct {
	Name        enum.Role
	Description string
}{
	{Name: enum.RoleUser, Description: "Người dùng"},
	{Name: enum.RoleAdmin, Description: "Quản trị viên social-media"},
	{Name: enum.RoleGroupAdmin, Description: "Quản trị viên các group"},
}

var defaultPermissions = []struct {
	Name        enum.Permission
	Description string
}{
	{Name: enum.PermissionUserCreate, Description: "Create user"},
	{Name: enum.PermissionUserRead, Description: "Read user"},
	{Name: enum.PermissionUserUpdate, Description: "Update user"},
	{Name: enum.PermissionUserDelete, Description: "Delete user"},
	{Name: enum.PermissionPostCreate, Description: "Create post"},
	{Name: enum.PermissionPostRead, Description: "Read post"},
	{Name: enum.PermissionPostUpdate, Description: "Update post"},
	{Name: enum.PermissionPostDelete, Description: "Delete post"},
}

var rolePermissions = map[enum.Role][]enum.Permission{
	enum.RoleUser: {
		enum.PermissionUserCreate, enum.PermissionUserRead, enum.PermissionUserUpdate,
		enum.PermissionPostCreate, enum.PermissionPostRead, enum.PermissionPostUpdate, enum.PermissionPostDelete,
	},
	enum.RoleAdmin: {
		enum.PermissionUserRead, enum.PermissionUserDelete, enum.PermissionPostDelete,
	},
	enum.RoleGroupAdmin: {
		enum.PermissionPostCreate, enum.PermissionPostRead, enum.PermissionPostUpdate, enum.PermissionPostDelete,
	},
}

// SeedRoles creates the three default roles and renames the previous group_admin role.
func SeedRoles(db *gorm.DB) error {
	return db.Transaction(seedRoles)
}

// Seed adds the default roles, permissions, grants, and three login accounts.
// Existing account passwords and grants are preserved on repeated runs.
func Seed(db *gorm.DB, passwords Passwords) error {
	accounts := []struct {
		email    string
		role     enum.Role
		password string
	}{
		{UserEmail, enum.RoleUser, passwords.User},
		{AdminEmail, enum.RoleAdmin, passwords.Admin},
		{AdminGroupEmail, enum.RoleGroupAdmin, passwords.AdminGroup},
	}

	return db.Transaction(func(tx *gorm.DB) error {
		if err := seedRoles(tx); err != nil {
			return err
		}

		roles := make(map[enum.Role]model.Role, len(defaultRoles))
		for _, spec := range defaultRoles {
			var role model.Role
			if err := tx.Where("name = ?", spec.Name.String()).First(&role).Error; err != nil {
				return fmt.Errorf("load role %s: %w", spec.Name, err)
			}
			roles[spec.Name] = role
		}

		permissions := make(map[enum.Permission]model.Permission, len(defaultPermissions))
		for _, spec := range defaultPermissions {
			permission := model.Permission{Name: spec.Name.String(), Description: spec.Description}
			if err := tx.Where("name = ?", spec.Name.String()).FirstOrCreate(&permission).Error; err != nil {
				return fmt.Errorf("seed permission %s: %w", spec.Name, err)
			}
			permissions[spec.Name] = permission
		}

		for roleName, permissionNames := range rolePermissions {
			for _, permissionName := range permissionNames {
				grant := model.RolePermission{
					RoleID: roles[roleName].ID, PermissionID: permissions[permissionName].ID,
				}
				if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&grant).Error; err != nil {
					return fmt.Errorf("grant %s to %s: %w", permissionName, roleName, err)
				}
			}
		}

		for _, account := range accounts {
			var user model.User
			err := tx.Where("email = ?", account.email).First(&user).Error
			if errors.Is(err, gorm.ErrRecordNotFound) {
				hash, hashErr := bcrypt.GenerateFromPassword([]byte(account.password), bcrypt.DefaultCost)
				if hashErr != nil {
					return fmt.Errorf("hash seed password for %s: %w", account.email, hashErr)
				}
				user = model.User{Email: account.email, PasswordHash: string(hash), Status: "active"}
				if err := tx.Create(&user).Error; err != nil {
					return fmt.Errorf("seed user %s: %w", account.email, err)
				}
			} else if err != nil {
				return fmt.Errorf("load seed user %s: %w", account.email, err)
			}
			assignment := model.UserRole{UserID: user.ID, RoleID: roles[account.role].ID}
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&assignment).Error; err != nil {
				return fmt.Errorf("assign role %s to %s: %w", account.role, account.email, err)
			}
		}
		return nil
	})
}

func seedRoles(tx *gorm.DB) error {
	if err := migrateGroupAdmin(tx); err != nil {
		return err
	}
	for _, spec := range defaultRoles {
		role := model.Role{Name: spec.Name.String(), Description: spec.Description}
		if err := tx.Where("name = ?", spec.Name.String()).FirstOrCreate(&role).Error; err != nil {
			return fmt.Errorf("seed role %s: %w", spec.Name, err)
		}
	}
	return nil
}

func migrateGroupAdmin(tx *gorm.DB) error {
	var legacy model.Role
	if err := tx.Where("name = ?", "group_admin").First(&legacy).Error; errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	} else if err != nil {
		return fmt.Errorf("load legacy group role: %w", err)
	}

	var current model.Role
	if err := tx.Where("name = ?", enum.RoleGroupAdmin.String()).First(&current).Error; errors.Is(err, gorm.ErrRecordNotFound) {
		return tx.Model(&legacy).Update("name", enum.RoleGroupAdmin.String()).Error
	} else if err != nil {
		return fmt.Errorf("load admin-group role: %w", err)
	}

	var assignments []model.UserRole
	if err := tx.Where("role_id = ?", legacy.ID).Find(&assignments).Error; err != nil {
		return err
	}
	for _, assignment := range assignments {
		assignment.RoleID = current.ID
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&assignment).Error; err != nil {
			return err
		}
	}
	var grants []model.RolePermission
	if err := tx.Where("role_id = ?", legacy.ID).Find(&grants).Error; err != nil {
		return err
	}
	for _, grant := range grants {
		grant.RoleID = current.ID
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&grant).Error; err != nil {
			return err
		}
	}
	if err := tx.Where("role_id = ?", legacy.ID).Delete(&model.UserRole{}).Error; err != nil {
		return err
	}
	if err := tx.Where("role_id = ?", legacy.ID).Delete(&model.RolePermission{}).Error; err != nil {
		return err
	}
	return tx.Delete(&legacy).Error
}
