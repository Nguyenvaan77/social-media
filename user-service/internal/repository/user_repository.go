package repository

import (
	"errors"
	"fmt"

	"user/internal/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) CreateUser(user *model.User) error {
	if user == nil {
		return errors.New("create user: user is nil")
	}
	if err := r.db.Create(user).Error; err != nil {
		return fmt.Errorf("create user: %w", err)
	}
	return nil
}

func (r *UserRepository) FindByEmail(email string) (*model.User, error) {
	var user model.User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, fmt.Errorf("find user by email: %w", err)
	}
	return &user, nil
}

func (r *UserRepository) FindByID(id int) (*model.User, error) {
	var user model.User
	if err := r.db.Where("id = ?", id).First(&user).Error; err != nil {
		return nil, fmt.Errorf("find user by ID %d: %w", id, err)
	}
	return &user, nil
}

// FindById retains the older spelling for existing callers.
func (r *UserRepository) FindById(id int) (*model.User, error) {
	return r.FindByID(id)
}

func (r *UserRepository) FindAll() ([]model.User, error) {
	var users []model.User
	if err := r.db.Order("id ASC").Find(&users).Error; err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	return users, nil
}

func (r *UserRepository) UpdateUser(id int, updates map[string]interface{}) (*model.User, error) {
	if len(updates) == 0 {
		return nil, errors.New("update user: no fields provided")
	}
	for field := range updates {
		switch field {
		case "email", "fullname", "status":
		default:
			return nil, fmt.Errorf("update user: unsupported field %q", field)
		}
	}
	if _, err := r.FindByID(id); err != nil {
		return nil, err
	}
	result := r.db.Model(&model.User{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return nil, fmt.Errorf("update user %d: %w", id, result.Error)
	}
	return r.FindByID(id)
}

// Follow returns true only when a new follow relationship was inserted.
func (r *UserRepository) Follow(followerID, followeeID int) (bool, error) {
	if followerID <= 0 || followeeID <= 0 || followerID == followeeID {
		return false, errors.New("follow: invalid user IDs")
	}
	follow := model.Follow{FollowerID: followerID, FolloweeID: followeeID}
	result := r.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&follow)
	if result.Error != nil {
		return false, fmt.Errorf("follow user %d: %w", followeeID, result.Error)
	}
	return result.RowsAffected > 0, nil
}

// Unfollow returns true only when a follow relationship was removed.
func (r *UserRepository) Unfollow(followerID, followeeID int) (bool, error) {
	result := r.db.Where("follower_id = ? AND followee_id = ?", followerID, followeeID).Delete(&model.Follow{})
	if result.Error != nil {
		return false, fmt.Errorf("unfollow user %d: %w", followeeID, result.Error)
	}
	return result.RowsAffected > 0, nil
}

func (r *UserRepository) IsFollowing(followerID, followeeID int) (bool, error) {
	var count int64
	if err := r.db.Model(&model.Follow{}).
		Where("follower_id = ? AND followee_id = ?", followerID, followeeID).
		Count(&count).Error; err != nil {
		return false, fmt.Errorf("check follow status: %w", err)
	}
	return count > 0, nil
}

func (r *UserRepository) ListFollowing(userID, limit, offset int) ([]model.User, error) {
	limit, offset = normalizedPage(limit, offset)
	var users []model.User
	err := r.db.Model(&model.User{}).
		Select("users.*").
		Joins("JOIN follows ON follows.followee_id = users.id").
		Where("follows.follower_id = ?", userID).
		Order("follows.created_at DESC, users.id DESC").
		Limit(limit).Offset(offset).Find(&users).Error
	if err != nil {
		return nil, fmt.Errorf("list following for user %d: %w", userID, err)
	}
	return users, nil
}

func (r *UserRepository) ListFollowers(userID, limit, offset int) ([]model.User, error) {
	limit, offset = normalizedPage(limit, offset)
	var users []model.User
	err := r.db.Model(&model.User{}).
		Select("users.*").
		Joins("JOIN follows ON follows.follower_id = users.id").
		Where("follows.followee_id = ?", userID).
		Order("follows.created_at DESC, users.id DESC").
		Limit(limit).Offset(offset).Find(&users).Error
	if err != nil {
		return nil, fmt.Errorf("list followers for user %d: %w", userID, err)
	}
	return users, nil
}

func normalizedPage(limit, offset int) (int, int) {
	if limit <= 0 {
		limit = 20
	} else if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}
