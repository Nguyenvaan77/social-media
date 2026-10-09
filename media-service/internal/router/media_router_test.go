package router_test

import (
	"bytes"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strconv"
	"testing"
	"time"

	"media/internal/auth"
	"media/internal/handler"
	"media/internal/model"
	"media/internal/repository"
	"media/internal/router"
	"media/internal/service"
	"media/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func TestMediaHTTPFlow(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.AutoMigrate(&model.Media{}); err != nil {
		t.Fatal(err)
	}

	const (
		maxFileBytes = int64(512)
		secret       = "integration-test-secret-0123456789-abcdefgh"
		issuer       = "media-integration-test"
		audience     = "media-service"
	)
	uploadDir := t.TempDir()
	fileStorage, err := storage.NewLocal(uploadDir, "http://media.test")
	if err != nil {
		t.Fatal(err)
	}
	verifier, err := auth.NewVerifier(secret, issuer, audience)
	if err != nil {
		t.Fatal(err)
	}
	r := router.SetupRouter(handler.NewMediaHandler(
		service.NewMediaService(repository.NewMediaRepository(db), fileStorage, maxFileBytes),
		verifier, maxFileBytes,
	))

	tokenFor := func(userID int) string {
		t.Helper()
		claims := jwt.RegisteredClaims{
			Subject: strconv.Itoa(userID), Issuer: issuer,
			Audience:  jwt.ClaimStrings{audience},
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-time.Minute)),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		}
		signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
		if err != nil {
			t.Fatal(err)
		}
		return signed
	}
	ownerToken := tokenFor(7)
	otherToken := tokenFor(8)

	request := func(method, path, bearer string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(method, path, nil)
		if bearer != "" {
			req.Header.Set("Authorization", "Bearer "+bearer)
		}
		response := httptest.NewRecorder()
		r.ServeHTTP(response, req)
		return response
	}
	type testFile struct {
		name string
		data []byte
	}
	upload := func(bearer string, files ...testFile) *httptest.ResponseRecorder {
		t.Helper()
		var body bytes.Buffer
		writer := multipart.NewWriter(&body)
		for _, file := range files {
			part, err := writer.CreateFormFile("files", file.name)
			if err != nil {
				t.Fatal(err)
			}
			if _, err := part.Write(file.data); err != nil {
				t.Fatal(err)
			}
		}
		if err := writer.Close(); err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest(http.MethodPost, "/api/v1/media/upload", &body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		if bearer != "" {
			req.Header.Set("Authorization", "Bearer "+bearer)
		}
		response := httptest.NewRecorder()
		r.ServeHTTP(response, req)
		return response
	}
	checkStatus := func(response *httptest.ResponseRecorder, want int) {
		t.Helper()
		if response.Code != want {
			t.Fatalf("status = %d, want %d; body: %s", response.Code, want, response.Body.String())
		}
	}

	var pngBody bytes.Buffer
	imageData := image.NewRGBA(image.Rect(0, 0, 1, 1))
	imageData.Set(0, 0, color.RGBA{R: 255, A: 255})
	if err := png.Encode(&pngBody, imageData); err != nil {
		t.Fatal(err)
	}
	pngFile := testFile{name: "original-name.png", data: pngBody.Bytes()}
	if len(pngFile.data) >= int(maxFileBytes) {
		t.Fatalf("test PNG size %d exceeds configured limit", len(pngFile.data))
	}

	checkStatus(upload("", pngFile), http.StatusUnauthorized)
	checkStatus(upload(ownerToken, testFile{name: "fake.png", data: []byte("not an image")}), http.StatusBadRequest)
	oversized := append(bytes.Clone(pngFile.data), bytes.Repeat([]byte{0}, int(maxFileBytes))...)
	checkStatus(upload(ownerToken, testFile{name: "large.png", data: oversized}), http.StatusRequestEntityTooLarge)
	entries, err := os.ReadDir(uploadDir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 0 {
		t.Fatalf("failed uploads left %d files in storage", len(entries))
	}

	secondFile := testFile{name: "second.png", data: pngFile.data}
	response := upload(ownerToken, pngFile, secondFile)
	checkStatus(response, http.StatusCreated)
	var uploaded struct {
		Data []model.Media `json:"data"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &uploaded); err != nil {
		t.Fatal(err)
	}
	if len(uploaded.Data) != 2 {
		t.Fatalf("uploaded %d files, want 2: %s", len(uploaded.Data), response.Body.String())
	}
	if uploaded.Data[0].ID == uploaded.Data[1].ID || uploaded.Data[0].URL == uploaded.Data[1].URL {
		t.Fatal("two uploaded files should have distinct IDs and URLs")
	}
	for i, media := range uploaded.Data {
		if _, err := uuid.Parse(media.ID); err != nil {
			t.Fatalf("file %d has invalid UUID %q: %v", i, media.ID, err)
		}
		if media.UserID != 7 || media.Filename != []string{pngFile.name, secondFile.name}[i] ||
			media.Size != int64(len(pngFile.data)) || media.MIMEType != "image/png" || media.CreatedAt.IsZero() {
			t.Fatalf("file %d has unexpected metadata: %+v", i, media)
		}
		if media.StorageKey != "" {
			t.Fatalf("file %d exposed storage key", i)
		}
		parsedURL, err := url.Parse(media.URL)
		if err != nil || parsedURL.Host != "media.test" {
			t.Fatalf("file %d has invalid URL %q: %v", i, media.URL, err)
		}
		fileResponse := request(http.MethodGet, parsedURL.RequestURI(), "")
		checkStatus(fileResponse, http.StatusOK)
		if !bytes.Equal(fileResponse.Body.Bytes(), pngFile.data) || fileResponse.Header().Get("Content-Type") != "image/png" {
			t.Fatalf("file %d was not served correctly", i)
		}
	}

	first := uploaded.Data[0]
	metadataPath := "/api/v1/media/" + first.ID
	metadata := request(http.MethodGet, metadataPath, "")
	checkStatus(metadata, http.StatusOK)
	var fetched struct {
		Data model.Media `json:"data"`
	}
	if err := json.Unmarshal(metadata.Body.Bytes(), &fetched); err != nil {
		t.Fatal(err)
	}
	if fetched.Data.ID != first.ID || fetched.Data.URL != first.URL || fetched.Data.UserID != 7 {
		t.Fatalf("GET returned unexpected media metadata: %+v", fetched.Data)
	}

	checkStatus(request(http.MethodDelete, metadataPath, otherToken), http.StatusForbidden)
	checkStatus(request(http.MethodGet, metadataPath, ""), http.StatusOK)
	checkStatus(request(http.MethodDelete, metadataPath, ownerToken), http.StatusNoContent)
	checkStatus(request(http.MethodGet, metadataPath, ""), http.StatusNotFound)
	parsedURL, err := url.Parse(first.URL)
	if err != nil {
		t.Fatal(err)
	}
	fileResponse := request(http.MethodGet, parsedURL.RequestURI(), "")
	checkStatus(fileResponse, http.StatusOK)
	if !bytes.Equal(fileResponse.Body.Bytes(), pngFile.data) {
		t.Fatal("soft delete removed a file still reachable from its URL")
	}
}
