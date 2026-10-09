package storage

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

var errInvalidKey = errors.New("invalid media key")

// Local stores media files in one directory and serves them under /uploads/.
type Local struct {
	dir     string
	baseURL *url.URL
}

func NewLocal(dir, publicBaseURL string) (*Local, error) {
	if strings.TrimSpace(dir) == "" {
		return nil, errors.New("upload directory is required")
	}

	absDir, err := filepath.Abs(dir)
	if err != nil {
		return nil, fmt.Errorf("resolve upload directory: %w", err)
	}
	if err := os.MkdirAll(absDir, 0o755); err != nil {
		return nil, fmt.Errorf("create upload directory: %w", err)
	}

	base, err := url.Parse(publicBaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse public base URL: %w", err)
	}
	if (base.Scheme != "http" && base.Scheme != "https") || base.Hostname() == "" ||
		base.User != nil || base.Opaque != "" || base.RawQuery != "" || base.Fragment != "" ||
		strings.Contains(base.Path, "\\") {
		return nil, errors.New("public base URL must be an HTTP(S) URL without credentials, query or fragment")
	}
	for _, segment := range strings.Split(base.Path, "/") {
		if segment == "." || segment == ".." {
			return nil, errors.New("public base URL contains an unsafe path")
		}
	}
	base.RawPath = ""

	return &Local{dir: absDir, baseURL: base}, nil
}

// Put writes to a temporary file in the same directory, then renames it into
// place so readers never see a partially uploaded file.
func (s *Local) Put(key string, data []byte) error {
	if err := validateKey(key); err != nil {
		return err
	}

	tmp, err := os.CreateTemp(s.dir, ".media-*")
	if err != nil {
		return fmt.Errorf("create temporary media file: %w", err)
	}
	defer os.Remove(tmp.Name())

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return fmt.Errorf("write media file: %w", err)
	}
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return fmt.Errorf("sync media file: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("close media file: %w", err)
	}
	if err := os.Rename(tmp.Name(), filepath.Join(s.dir, key)); err != nil {
		return fmt.Errorf("store media file: %w", err)
	}
	return nil
}

func (s *Local) Open(key string) (*os.File, error) {
	if err := validateKey(key); err != nil {
		return nil, err
	}
	return os.Open(filepath.Join(s.dir, key))
}

func (s *Local) Delete(key string) error {
	if err := validateKey(key); err != nil {
		return err
	}
	return os.Remove(filepath.Join(s.dir, key))
}

func (s *Local) URL(key string) string {
	if validateKey(key) != nil {
		return ""
	}
	u := *s.baseURL
	u.Path = "/" + strings.TrimPrefix(path.Join(u.Path, "uploads", key), "/")
	return u.String()
}

func validateKey(key string) error {
	ext := path.Ext(key)
	switch ext {
	case ".jpg", ".png", ".webp", ".gif":
	default:
		return errInvalidKey
	}
	idText := strings.TrimSuffix(key, ext)
	id, err := uuid.Parse(idText)
	if err != nil || id.String() != idText {
		return errInvalidKey
	}
	return nil
}
