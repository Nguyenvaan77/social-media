package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"post/internal/model"
	"post/internal/service"

	"github.com/gin-gonic/gin"
)

type PostHandler struct {
	s *service.PostService
}

func NewPostHandler(postService *service.PostService) *PostHandler {
	return &PostHandler{s: postService}
}

func respondError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidInput):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
	case errors.Is(err, service.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
	case errors.Is(err, service.ErrForbidden):
		c.JSON(http.StatusForbidden, gin.H{"error": "only the author may change this post"})
	case errors.Is(err, service.ErrConflict):
		c.JSON(http.StatusConflict, gin.H{"error": "post changed during update; retry the request"})
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
	limit, offset := 20, 0
	if raw := c.Query("limit"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 1 || value > 100 {
			return 0, 0, service.ErrInvalidInput
		}
		limit = value
	}
	if raw := c.Query("offset"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 0 {
			return 0, 0, service.ErrInvalidInput
		}
		offset = value
	}
	return limit, offset, nil
}

// RequireUserID reads the user identity forwarded by the gateway. It does not authenticate it.
func (h *PostHandler) RequireUserID(c *gin.Context) {
	userID, err := parsePositiveID(c.GetHeader("X-User-ID"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "valid X-User-ID required"})
		return
	}
	c.Set("authorID", userID)
	c.Next()
}

func authorID(c *gin.Context) int {
	return c.MustGet("authorID").(int)
}

func decodePostJSON(c *gin.Context, destination any) error {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 64<<10)
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		return err
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		return service.ErrInvalidInput
	}
	return nil
}

func (h *PostHandler) Create(c *gin.Context) {
	var input service.PostInput
	if err := decodePostJSON(c, &input); err != nil {
		respondError(c, service.ErrInvalidInput)
		return
	}
	post, err := h.s.Create(c.Request.Context(), authorID(c), input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": post})
}

func (h *PostHandler) Get(c *gin.Context) {
	post, err := h.s.Get(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": post})
}

func (h *PostHandler) Update(c *gin.Context) {
	var update service.PostUpdate
	if err := decodePostJSON(c, &update); err != nil {
		respondError(c, service.ErrInvalidInput)
		return
	}
	post, err := h.s.Update(c.Request.Context(), c.Param("id"), authorID(c), update)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": post})
}

func (h *PostHandler) Delete(c *gin.Context) {
	if err := h.s.Delete(c.Request.Context(), c.Param("id"), authorID(c)); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *PostHandler) ListByAuthor(c *gin.Context) {
	id, err := parsePositiveID(c.Param("user_id"))
	if err != nil {
		respondError(c, err)
		return
	}
	limit, offset, err := parsePagination(c)
	if err != nil {
		respondError(c, err)
		return
	}
	posts, err := h.s.ListByAuthor(c.Request.Context(), id, limit, offset)
	if err != nil {
		respondError(c, err)
		return
	}
	if posts == nil {
		posts = []model.Post{}
	}
	c.JSON(http.StatusOK, gin.H{"data": posts, "limit": limit, "offset": offset})
}
