package service

import (
	"errors"
	"net/mail"
	"strings"
	"unicode/utf8"

	"user/internal/model"
	"user/internal/repository"

	"gorm.io/gorm"
)

var (
	ErrInvalidInput = errors.New("invalid input")
	ErrConflict     = errors.New("email already registered")
	ErrNotFound     = errors.New("user not found")
	ErrSelfFollow   = errors.New("cannot follow yourself")
	ErrEmptyUpdate  = errors.New("no profile fields supplied")
)

type UserService struct {
	r *repository.UserRepository
}

type ProfileUpdate struct {
	Email    *string `json:"email"`
	FullName *string `json:"full_name"`
}

func NewUserService(userRepository *repository.UserRepository) *UserService {
	return &UserService{r: userRepository}
}

func normalizeEmail(value string) (string, error) {
	email := strings.ToLower(strings.TrimSpace(value))
	address, err := mail.ParseAddress(email)
	if err != nil || address.Address != email || len(email) > 254 {
		return "", ErrInvalidInput
	}
	return email, nil
}

func validateName(value string) (string, error) {
	name := strings.TrimSpace(value)
	if name == "" || utf8.RuneCountInString(name) > 50 {
		return "", ErrInvalidInput
	}
	return name, nil
}

func (s *UserService) CreateUser(email, fullName string) (*model.User, error) {
	var err error
	email, err = normalizeEmail(email)
	if err != nil {
		return nil, ErrInvalidInput
	}
	if strings.TrimSpace(fullName) == "" {
		fullName = strings.SplitN(email, "@", 2)[0]
	}
	fullName, err = validateName(fullName)
	if err != nil {
		return nil, err
	}
	_, err = s.r.FindByEmail(email)
	if err == nil {
		return nil, ErrConflict
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	user := &model.User{Email: email, FullName: fullName, Status: "active"}
	if err := s.r.CreateUser(user); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return nil, ErrConflict
		}
		return nil, err
	}
	return user, nil
}

func (s *UserService) GetUser(id int) (*model.User, error) {
	if id <= 0 {
		return nil, ErrInvalidInput
	}
	user, err := s.r.FindByID(id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return user, err
}

func (s *UserService) UpdateProfile(id int, update ProfileUpdate) (*model.User, error) {
	fields := make(map[string]interface{})
	if update.Email != nil {
		email, err := normalizeEmail(*update.Email)
		if err != nil {
			return nil, err
		}
		fields["email"] = email
	}
	if update.FullName != nil {
		name, err := validateName(*update.FullName)
		if err != nil {
			return nil, err
		}
		fields["fullname"] = name
	}
	if len(fields) == 0 {
		return nil, ErrEmptyUpdate
	}
	user, err := s.r.UpdateUser(id, fields)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return nil, ErrConflict
	}
	return user, err
}

func (s *UserService) Follow(followerID, followeeID int) error {
	if followerID == followeeID {
		return ErrSelfFollow
	}
	if _, err := s.GetUser(followerID); err != nil {
		return err
	}
	if _, err := s.GetUser(followeeID); err != nil {
		return err
	}
	_, err := s.r.Follow(followerID, followeeID)
	return err
}

func (s *UserService) Unfollow(followerID, followeeID int) error {
	if _, err := s.GetUser(followerID); err != nil {
		return err
	}
	if _, err := s.GetUser(followeeID); err != nil {
		return err
	}
	_, err := s.r.Unfollow(followerID, followeeID)
	return err
}

func (s *UserService) IsFollowing(followerID, followeeID int) (bool, error) {
	if _, err := s.GetUser(followerID); err != nil {
		return false, err
	}
	if _, err := s.GetUser(followeeID); err != nil {
		return false, err
	}
	return s.r.IsFollowing(followerID, followeeID)
}

func (s *UserService) ListFollowing(userID, limit, offset int) ([]model.User, error) {
	if _, err := s.GetUser(userID); err != nil {
		return nil, err
	}
	return s.r.ListFollowing(userID, limit, offset)
}

func (s *UserService) ListFollowers(userID, limit, offset int) ([]model.User, error) {
	if _, err := s.GetUser(userID); err != nil {
		return nil, err
	}
	return s.r.ListFollowers(userID, limit, offset)
}
