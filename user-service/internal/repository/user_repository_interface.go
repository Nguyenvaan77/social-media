package repository

import "user/internal/model"

type UserRepository interface {
	CreateUser(user *model.User) error
	FindByEmail(email string) (*model.User, error)
	FindByID(id int) (*model.User, error)
	FindById(id int) (*model.User, error)
	FindAll() ([]model.User, error)
	UpdateUser(id int, updates map[string]interface{}) (*model.User, error)
	Follow(followerID, followeeID int) (bool, error)
	Unfollow(followerID, followeeID int) (bool, error)
	IsFollowing(followerID, followeeID int) (bool, error)
	ListFollowing(userID, limit, offset int) ([]model.User, error)
	ListFollowers(userID, limit, offset int) ([]model.User, error)
}
