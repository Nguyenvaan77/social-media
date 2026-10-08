package handler

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"user/internal/model"
	"user/internal/service"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	s *service.UserService
}

type createUserRequest struct {
	Email    string `json:"email" binding:"required"`
	FullName string `json:"full_name"`
}

type privateUser struct {
	ID        int       `json:"id"`
	Email     string    `json:"email"`
	FullName  string    `json:"full_name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type publicUser struct {
	ID        int       `json:"id"`
	FullName  string    `json:"full_name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{s: userService}
}

func privateView(user *model.User) privateUser {
	return privateUser{
		ID: user.ID, Email: user.Email, FullName: user.FullName,
		Status: user.Status, CreatedAt: user.CreatedAt, UpdatedAt: user.UpdatedAt,
	}
}

func publicView(user *model.User) publicUser {
	return publicUser{
		ID: user.ID, FullName: user.FullName, Status: user.Status, CreatedAt: user.CreatedAt,
	}
}

func respondError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
	case errors.Is(err, service.ErrConflict):
		c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
	case errors.Is(err, service.ErrSelfFollow):
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot follow yourself"})
	case errors.Is(err, service.ErrEmptyUpdate):
		c.JSON(http.StatusBadRequest, gin.H{"error": "no profile fields supplied"})
	case errors.Is(err, service.ErrInvalidInput):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
	}
}

func parsePositiveID(raw string) (int, error) {
	id, err := strconv.Atoi(raw)
	if err != nil || id <= 0 {
		return 0, service.ErrInvalidInput
	}
	return id, nil
}

func parsePagination(c *gin.Context) (int, int, error) {
	limit := 20
	offset := 0
	var err error
	if raw := c.Query("limit"); raw != "" {
		limit, err = strconv.Atoi(raw)
		if err != nil || limit < 1 || limit > 100 {
			return 0, 0, service.ErrInvalidInput
		}
	}
	if raw := c.Query("offset"); raw != "" {
		offset, err = strconv.Atoi(raw)
		if err != nil || offset < 0 {
			return 0, 0, service.ErrInvalidInput
		}
	}
	return limit, offset, nil
}

func currentUserID(c *gin.Context) int {
	return c.MustGet("userID").(int)
}

// RequireUserID reads the user identity forwarded by the gateway. It does not authenticate it.
func (h *UserHandler) RequireUserID(c *gin.Context) {
	id, err := parsePositiveID(c.GetHeader("X-User-ID"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "valid X-User-ID required"})
		return
	}
	c.Set("userID", id)
	c.Next()
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	request := createUserRequest{}

	if err := c.ShouldBindJSON(&request); err != nil {
		respondError(c, service.ErrInvalidInput)
		return
	}
	user, err := h.s.CreateUser(request.Email, request.FullName)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"user": privateView(user)})
}

func (h *UserHandler) GetMe(c *gin.Context) {
	user, err := h.s.GetUser(currentUserID(c))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": privateView(user)})
}

func (h *UserHandler) UpdateMe(c *gin.Context) {
	var request service.ProfileUpdate
	if err := c.ShouldBindJSON(&request); err != nil {
		respondError(c, service.ErrInvalidInput)
		return
	}
	user, err := h.s.UpdateProfile(currentUserID(c), request)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": privateView(user)})
}

func (h *UserHandler) GetPublicProfile(c *gin.Context) {
	id, err := parsePositiveID(c.Param("id"))
	if err != nil {
		respondError(c, err)
		return
	}
	user, err := h.s.GetUser(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": publicView(user)})
}

func (h *UserHandler) Follow(c *gin.Context) {
	id, err := parsePositiveID(c.Param("id"))
	if err == nil {
		err = h.s.Follow(currentUserID(c), id)
	}
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"following": true})
}

func (h *UserHandler) Unfollow(c *gin.Context) {
	id, err := parsePositiveID(c.Param("id"))
	if err == nil {
		err = h.s.Unfollow(currentUserID(c), id)
	}
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"following": false})
}

func (h *UserHandler) FollowStatus(c *gin.Context) {
	followerID, err := parsePositiveID(c.Query("follower_id"))
	if err != nil {
		respondError(c, err)
		return
	}
	followeeID, err := parsePositiveID(c.Query("followee_id"))
	if err != nil {
		respondError(c, err)
		return
	}
	following, err := h.s.IsFollowing(followerID, followeeID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"following": following})
}

func (h *UserHandler) ListFollowing(c *gin.Context) {
	h.listUsers(c, true)
}

func (h *UserHandler) ListFollowers(c *gin.Context) {
	h.listUsers(c, false)
}

func (h *UserHandler) listUsers(c *gin.Context, following bool) {
	id, err := parsePositiveID(c.Param("id"))
	if err != nil {
		respondError(c, err)
		return
	}
	limit, offset, err := parsePagination(c)
	if err != nil {
		respondError(c, err)
		return
	}
	var users []model.User
	if following {
		users, err = h.s.ListFollowing(id, limit, offset)
	} else {
		users, err = h.s.ListFollowers(id, limit, offset)
	}
	if err != nil {
		respondError(c, err)
		return
	}
	data := make([]publicUser, 0, len(users))
	for i := range users {
		data = append(data, publicView(&users[i]))
	}
	c.JSON(http.StatusOK, gin.H{"data": data, "limit": limit, "offset": offset})
}
