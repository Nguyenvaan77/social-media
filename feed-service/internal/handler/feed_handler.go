package handler

import (
	"errors"
	"net/http"
	"strconv"

	"feed/internal/client"
	"feed/internal/model"
	"feed/internal/service"

	"github.com/gin-gonic/gin"
)

type FeedHandler struct {
	s *service.FeedService
}

func NewFeedHandler(feedService *service.FeedService) *FeedHandler {
	return &FeedHandler{s: feedService}
}

func positiveID(raw string) (int, error) {
	id, err := strconv.Atoi(raw)
	if err != nil || id <= 0 {
		return 0, service.ErrInvalidInput
	}
	return id, nil
}

func pagination(c *gin.Context) (int, int, error) {
	limit, offset := 20, 0
	if raw := c.Query("limit"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 1 || value > 50 {
			return 0, 0, service.ErrInvalidInput
		}
		limit = value
	}
	if raw := c.Query("offset"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 0 || value > 1000 {
			return 0, 0, service.ErrInvalidInput
		}
		offset = value
	}
	return limit, offset, nil
}

func (h *FeedHandler) Home(c *gin.Context) {
	userID, err := positiveID(c.GetHeader("X-User-ID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid X-User-ID required"})
		return
	}
	limit, offset, err := pagination(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid pagination"})
		return
	}
	posts, err := h.s.Home(c.Request.Context(), userID, limit, offset)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidInput):
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		case errors.Is(err, client.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		default:
			c.JSON(http.StatusBadGateway, gin.H{"error": "upstream service unavailable"})
		}
		return
	}
	if posts == nil {
		posts = []model.Post{}
	}
	c.JSON(http.StatusOK, gin.H{"data": posts, "limit": limit, "offset": offset})
}
