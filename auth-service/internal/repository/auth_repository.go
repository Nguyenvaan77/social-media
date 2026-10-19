package repository

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"

	"auth/internal/enum"
	"auth/internal/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrDuplicateEmail = errors.New("email already registered")
var ErrRefreshTokenMismatch = errors.New("refresh token does not match")

type AuthRepository struct {
	db *gorm.DB
}

func NewAuthRepository(db *gorm.DB) *AuthRepository {
	return &AuthRepository{db: db}
}

func (r *AuthRepository) GetPermissionsByUserID(userID int) ([]model.Permission, error) {
	roleIDs := r.db.
		Model(&model.UserRole{}).
		Select("role_id").
		Where("user_id = ?", userID)

	permissionIDs := r.db.
		Model(&model.RolePermission{}).
		Select("permission_id").
		Where("role_id IN (?)", roleIDs)

	permissions := make([]model.Permission, 0)
	if err := r.db.
		Where("id IN (?)", permissionIDs).
		Order("id ASC").
		Find(&permissions).Error; err != nil {
		return nil, fmt.Errorf("load permissions for user %d: %w", userID, err)
	}
	return permissions, nil
}

func (r *AuthRepository) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	var user model.User
	if err := r.db.WithContext(ctx).Where("email = ?", email).Take(&user).Error; err != nil {
		return nil, fmt.Errorf("load auth user: %w", err)
	}
	return &user, nil
}

func (r *AuthRepository) EmailExists(ctx context.Context, email string) (bool, error) {
	var user model.User
	err := r.db.WithContext(ctx).Select("id").Where("email = ?", email).Take(&user).Error
	if err == nil {
		return true, nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	}
	return false, fmt.Errorf("check registered email: %w", err)
}

func (r *AuthRepository) CreateWithRole(ctx context.Context, user *model.User, roleName enum.Role) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var role model.Role
		if err := tx.Where("name = ?", roleName.String()).Take(&role).Error; err != nil {
			return fmt.Errorf("load user role: %w", err)
		}
		if err := tx.Create(user).Error; err != nil {
			if errors.Is(err, gorm.ErrDuplicatedKey) {
				return ErrDuplicateEmail
			}
			return fmt.Errorf("create auth user: %w", err)
		}
		if err := tx.Create(&model.UserRole{UserID: user.ID, RoleID: role.ID}).Error; err != nil {
			return fmt.Errorf("assign user role: %w", err)
		}
		user.Roles = []model.Role{role}
		return nil
	})
}

func (r *AuthRepository) FindRefreshTokenByEmail(ctx context.Context, email string) (*model.Token, error) {
	var user model.User
	if err := r.db.WithContext(ctx).Where("email = ?", email).Take(&user).Error; err != nil {
		return nil, fmt.Errorf("load auth user: %w", err)
	}
	var token model.Token
	if err := r.db.WithContext(ctx).Where("user_id = ?", user.ID).Take(&token).Error; err != nil {
		return nil, fmt.Errorf("load refresh token: %w", err)
	}
	return &token, nil
}

func (r *AuthRepository) FindRefreshTokenByUserID(ctx context.Context, userID int) (*model.Token, error) {
	var token model.Token
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).Take(&token).Error; err != nil {
		return nil, fmt.Errorf("load refresh token for user %d: %w", userID, err)
	}
	return &token, nil
}

func (r *AuthRepository) ReplaceRefreshToken(ctx context.Context, userID int, secret string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var user model.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Select("id").Take(&user, userID).Error; err != nil {
			return fmt.Errorf("load auth user: %w", err)
		}

		var existing model.Token
		err := tx.Where("user_id = ?", userID).Take(&existing).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("load existing refresh token: %w", err)
		}
		if err == nil {
			if err := tx.Delete(&existing).Error; err != nil {
				return fmt.Errorf("delete existing refresh token: %w", err)
			}
		}

		if err := tx.Create(&model.Token{UserID: userID, RefreshToken: secret}).Error; err != nil {
			return fmt.Errorf("store refresh token: %w", err)
		}
		return nil
	})
}

func (r *AuthRepository) RotateRefreshToken(ctx context.Context, userID int, currentSecret, newSecret string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var user model.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Select("id").Take(&user, userID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrRefreshTokenMismatch
			}
			return fmt.Errorf("load auth user: %w", err)
		}

		var existing model.Token
		if err := tx.Where("user_id = ?", userID).Take(&existing).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrRefreshTokenMismatch
			}
			return fmt.Errorf("load existing refresh token: %w", err)
		}
		if subtle.ConstantTimeCompare([]byte(existing.RefreshToken), []byte(currentSecret)) != 1 {
			return ErrRefreshTokenMismatch
		}
		if err := tx.Delete(&existing).Error; err != nil {
			return fmt.Errorf("delete existing refresh token: %w", err)
		}
		if err := tx.Create(&model.Token{UserID: userID, RefreshToken: newSecret}).Error; err != nil {
			return fmt.Errorf("store refresh token: %w", err)
		}
		return nil
	})
}

func (r *AuthRepository) DeleteRefreshTokenByUserID(ctx context.Context, userID int) (bool, error) {
	token := model.Token{}
	if result := r.db.WithContext(ctx).Where("user_id = ?", userID).Delete(&token); result.Error != nil {
		return false, fmt.Errorf("delete refresh token for user %d: %w", userID, result.Error)
	}

	if r.db.RowsAffected == 0 {
		return false, nil
	}

	return true, nil
}

func (r *AuthRepository) DeleteRefreshTokenByCurrentToken(ctx context.Context, userID int, currentToken string) (bool, error) {
	token := model.Token{}
	if result := r.db.WithContext(ctx).Where("refresh_token = ? AND user_id = ?", currentToken, userID).Delete(&token); result.Error != nil {
		return false, fmt.Errorf("delete refresh token for user %d: %w", userID, result.Error)
	}

	if r.db.RowsAffected == 0 {
		return false, nil
	}

	return true, nil
}
