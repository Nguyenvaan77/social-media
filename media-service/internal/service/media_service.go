package service

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"net/http"
	"os"
	"path"
	"strings"
	"unicode"

	"media/internal/model"
	"media/internal/repository"
	"media/internal/storage"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrInvalidInput = errors.New("invalid media input")
	ErrFileTooLarge = errors.New("file too large")
	ErrNotFound     = errors.New("media not found")
	ErrForbidden    = errors.New("only the owner may delete this media")
)

const MaxFiles = 10

type UploadFile struct {
	Filename string
	Data     []byte
}

type MediaService struct {
	r            *repository.MediaRepository
	storage      *storage.Local
	maxFileBytes int64
}

func NewMediaService(mediaRepository *repository.MediaRepository, fileStorage *storage.Local, maxFileBytes int64) *MediaService {
	return &MediaService{r: mediaRepository, storage: fileStorage, maxFileBytes: maxFileBytes}
}

func imageType(data []byte) (string, string, error) {
	mimeType := http.DetectContentType(data)
	var extension string
	switch mimeType {
	case "image/jpeg":
		extension = ".jpg"
	case "image/png":
		extension = ".png"
	case "image/gif":
		extension = ".gif"
	case "image/webp":
		extension = ".webp"
	default:
		return "", "", ErrInvalidInput
	}
	if mimeType != "image/webp" {
		if _, _, err := image.DecodeConfig(bytes.NewReader(data)); err != nil {
			return "", "", ErrInvalidInput
		}
	}
	return mimeType, extension, nil
}

func safeFilename(original string) string {
	name := path.Base(strings.ReplaceAll(original, "\\", "/"))
	name = strings.TrimSpace(strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, name))
	if name == "" || name == "." || name == ".." {
		return "image"
	}
	if len(name) <= 255 {
		return name
	}
	var builder strings.Builder
	for _, r := range name {
		if builder.Len()+len(string(r)) > 255 {
			break
		}
		builder.WriteRune(r)
	}
	return builder.String()
}

func (s *MediaService) Upload(userID int, files []UploadFile) ([]model.Media, error) {
	if userID <= 0 || len(files) == 0 || len(files) > MaxFiles || s.maxFileBytes <= 0 {
		return nil, ErrInvalidInput
	}
	records := make([]model.Media, 0, len(files))
	for _, file := range files {
		if len(file.Data) == 0 || strings.TrimSpace(file.Filename) == "" {
			return nil, ErrInvalidInput
		}
		if int64(len(file.Data)) > s.maxFileBytes {
			return nil, ErrFileTooLarge
		}
		mimeType, ext, err := imageType(file.Data)
		if err != nil {
			return nil, err
		}
		id := uuid.NewString()
		key := id + ext
		records = append(records, model.Media{
			ID: id, UserID: userID, StorageKey: key,
			URL: s.storage.URL(key), Filename: safeFilename(file.Filename),
			Size: int64(len(file.Data)), MIMEType: mimeType,
		})
	}

	storedKeys := make([]string, 0, len(records))
	cleanup := func() {
		for _, key := range storedKeys {
			_ = s.storage.Delete(key)
		}
	}
	for i := range records {
		if err := s.storage.Put(records[i].StorageKey, files[i].Data); err != nil {
			cleanup()
			return nil, fmt.Errorf("store media: %w", err)
		}
		storedKeys = append(storedKeys, records[i].StorageKey)
	}
	if err := s.r.CreateMany(records); err != nil {
		cleanup()
		return nil, fmt.Errorf("save media metadata: %w", err)
	}
	return records, nil
}

func (s *MediaService) Get(id string) (*model.Media, error) {
	if _, err := uuid.Parse(id); err != nil {
		return nil, ErrInvalidInput
	}
	media, err := s.r.FindByID(id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return media, err
}

func (s *MediaService) Delete(id string, userID int) error {
	if userID <= 0 {
		return ErrInvalidInput
	}
	media, err := s.Get(id)
	if err != nil {
		return err
	}
	if media.UserID != userID {
		return ErrForbidden
	}
	if err := s.r.SoftDeleteOwned(id, userID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		return err
	}
	// Retain the object so existing post URLs continue to work.
	return nil
}

func (s *MediaService) OpenFile(key string) (*os.File, error) {
	return s.storage.Open(key)
}
