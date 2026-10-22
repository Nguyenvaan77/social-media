package service

import "user/internal/model"

type UserService interface {
	CreateUser(email, fullName string) (*model.User, error)
	GetUser(id int) (*model.User, error)
	UpdateProfile(id int, update ProfileUpdate) (*model.User, error)
	Follow(followerID, followeeID int) error
	Unfollow(followerID, followeeID int) error
	IsFollowing(followerID, followeeID int) (bool, error)
	ListFollowing(userID, limit, offset int) ([]model.User, error)
	ListFollowers(userID, limit, offset int) ([]model.User, error)
	GetAllUsers() ([]model.User, error)
}
