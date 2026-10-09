package handler

import (
	"errors"
	"io"
	"net/http"
	"path"
	"strings"

	"media/internal/auth"
	"media/internal/service"

	"github.com/gin-gonic/gin"
)

type MediaHandler struct {
	s            *service.MediaService
	verifier     *auth.Verifier
	maxFileBytes int64
}

func NewMediaHandler(mediaService *service.MediaService, verifier *auth.Verifier, maxFileBytes int64) *MediaHandler {
	return &MediaHandler{s: mediaService, verifier: verifier, maxFileBytes: maxFileBytes}
}

func respondError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidInput):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid media input"})
	case errors.Is(err, service.ErrFileTooLarge):
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "file exceeds size limit"})
	case errors.Is(err, service.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "media not found"})
	case errors.Is(err, service.ErrForbidden):
		c.JSON(http.StatusForbidden, gin.H{"error": "only the owner may delete this media"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
	}
}

func (h *MediaHandler) RequireJWT(c *gin.Context) {
	parts := strings.Fields(c.GetHeader("Authorization"))
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "bearer JWT required"})
		return
	}
	userID, err := h.verifier.UserID(parts[1])
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired JWT"})
		return
	}
	c.Set("userID", userID)
	c.Next()
}

func userID(c *gin.Context) int {
	return c.MustGet("userID").(int)
}

func multipartError(c *gin.Context, err error) {
	var sizeError *http.MaxBytesError
	if errors.As(err, &sizeError) {
		respondError(c, service.ErrFileTooLarge)
		return
	}
	respondError(c, service.ErrInvalidInput)
}

func (h *MediaHandler) Upload(c *gin.Context) {
	maxRequestBytes := int64(service.MaxFiles)*h.maxFileBytes + (2 << 20)
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxRequestBytes)
	reader, err := c.Request.MultipartReader()
	if err != nil {
		multipartError(c, err)
		return
	}
	files := make([]service.UploadFile, 0, service.MaxFiles)
	for {
		part, err := reader.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			multipartError(c, err)
			return
		}
		if part.FormName() != "files" || part.FileName() == "" || len(files) >= service.MaxFiles {
			part.Close()
			respondError(c, service.ErrInvalidInput)
			return
		}
		data, readErr := io.ReadAll(io.LimitReader(part, h.maxFileBytes+1))
		filename := part.FileName()
		part.Close()
		if readErr != nil {
			multipartError(c, readErr)
			return
		}
		if int64(len(data)) > h.maxFileBytes {
			respondError(c, service.ErrFileTooLarge)
			return
		}
		files = append(files, service.UploadFile{Filename: filename, Data: data})
	}
	records, err := h.s.Upload(userID(c), files)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": records})
}

func (h *MediaHandler) Get(c *gin.Context) {
	media, err := h.s.Get(c.Param("id"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": media})
}

func (h *MediaHandler) Delete(c *gin.Context) {
	if err := h.s.Delete(c.Param("id"), userID(c)); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *MediaHandler) ServeFile(c *gin.Context) {
	key := c.Param("key")
	file, err := h.s.OpenFile(key)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	contentType := map[string]string{
		".jpg": "image/jpeg", ".png": "image/png",
		".webp": "image/webp", ".gif": "image/gif",
	}[path.Ext(key)]
	c.Header("Content-Type", contentType)
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	http.ServeContent(c.Writer, c.Request, key, info.ModTime(), file)
}
