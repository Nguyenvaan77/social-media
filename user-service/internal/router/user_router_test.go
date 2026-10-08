package router_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"user/internal/handler"
	"user/internal/model"
	"user/internal/repository"
	"user/internal/router"
	"user/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestUserHTTPFlowWithoutServiceAuth(t *testing.T) {
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
	if err := db.AutoMigrate(&model.User{}, &model.Follow{}); err != nil {
		t.Fatal(err)
	}
	r := router.SetupRouter(handler.NewUserHandler(service.NewUserService(repository.NewUserRepository(db))))

	request := func(method, path, userID string, body any, wantStatus int) map[string]any {
		t.Helper()
		var payload []byte
		if body != nil {
			var err error
			payload, err = json.Marshal(body)
			if err != nil {
				t.Fatal(err)
			}
		}
		req := httptest.NewRequest(method, path, bytes.NewReader(payload))
		if body != nil {
			req.Header.Set("Content-Type", "application/json")
		}
		if userID != "" {
			req.Header.Set("X-User-ID", userID)
		}
		response := httptest.NewRecorder()
		r.ServeHTTP(response, req)
		if response.Code != wantStatus {
			t.Fatalf("%s %s: status %d, want %d; body: %s", method, path, response.Code, wantStatus, response.Body.String())
		}
		if response.Body.Len() == 0 {
			return nil
		}
		if wantStatus == http.StatusNotFound && !json.Valid(response.Body.Bytes()) {
			return nil // Gin's response for an unregistered route is plain text.
		}
		var result map[string]any
		if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
			t.Fatalf("%s %s: invalid JSON: %v", method, path, err)
		}
		return result
	}
	userOf := func(response map[string]any) map[string]any {
		t.Helper()
		user, ok := response["user"].(map[string]any)
		if !ok {
			t.Fatalf("missing user in response: %#v", response)
		}
		return user
	}

	alice := userOf(request(http.MethodPost, "/api/v1/users", "", map[string]string{
		"email": " Alice@Example.com ", "full_name": "Alice",
	}, http.StatusCreated))
	aliceID := int(alice["id"].(float64))
	if aliceID <= 0 || alice["email"] != "alice@example.com" || alice["full_name"] != "Alice" {
		t.Fatalf("unexpected created user: %#v", alice)
	}
	bob := userOf(request(http.MethodPost, "/api/v1/users", "", map[string]string{
		"email": "bob@example.com",
	}, http.StatusCreated))
	bobID := int(bob["id"].(float64))
	if bob["full_name"] != "bob" {
		t.Fatalf("unexpected default name: %#v", bob)
	}
	request(http.MethodPost, "/api/v1/users", "", map[string]string{
		"email": "ALICE@example.com",
	}, http.StatusConflict)
	request(http.MethodPost, "/api/v1/auth/login", "", nil, http.StatusNotFound)
	request(http.MethodPost, "/api/v1/auth/logout", "", nil, http.StatusNotFound)

	var stored model.User
	if err := db.First(&stored, aliceID).Error; err != nil {
		t.Fatal(err)
	}
	if stored.LegacyPasswordHash != "" {
		t.Fatal("new user unexpectedly has a password hash")
	}

	for _, badID := range []string{"", "0", "abc", "-1"} {
		request(http.MethodGet, "/api/v1/users/me", badID, nil, http.StatusBadRequest)
	}
	request(http.MethodGet, "/api/v1/users/me", "99999", nil, http.StatusNotFound)
	aliceHeader := strconv.Itoa(aliceID)
	me := userOf(request(http.MethodGet, "/api/v1/users/me", aliceHeader, nil, http.StatusOK))
	if me["id"] != float64(aliceID) || me["email"] != "alice@example.com" {
		t.Fatalf("unexpected /me response: %#v", me)
	}
	updated := userOf(request(http.MethodPatch, "/api/v1/users/me", aliceHeader, map[string]string{
		"email": "alice.new@example.com", "full_name": "Alice Updated",
	}, http.StatusOK))
	if updated["email"] != "alice.new@example.com" || updated["full_name"] != "Alice Updated" {
		t.Fatalf("profile was not updated: %#v", updated)
	}
	publicPath := fmt.Sprintf("/api/v1/users/%d", aliceID)
	public := userOf(request(http.MethodGet, publicPath, "", nil, http.StatusOK))
	if public["full_name"] != "Alice Updated" || public["id"] != float64(aliceID) {
		t.Fatalf("unexpected public profile: %#v", public)
	}
	if _, exists := public["email"]; exists {
		t.Fatal("public profile exposed email")
	}
	request(http.MethodGet, "/api/v1/users/99999", "", nil, http.StatusNotFound)

	bobPath := fmt.Sprintf("/api/v1/users/%d", bobID)
	alicePath := fmt.Sprintf("/api/v1/users/%d", aliceID)
	request(http.MethodPost, bobPath+"/follow", "", nil, http.StatusBadRequest)
	request(http.MethodPost, alicePath+"/follow", aliceHeader, nil, http.StatusBadRequest)
	request(http.MethodPost, bobPath+"/follow", aliceHeader, nil, http.StatusOK)
	request(http.MethodPost, bobPath+"/follow", aliceHeader, nil, http.StatusOK)
	statusPath := "/api/v1/follows/status?follower_id=" + aliceHeader + "&followee_id=" + strconv.Itoa(bobID)
	if request(http.MethodGet, statusPath, "", nil, http.StatusOK)["following"] != true {
		t.Fatal("follow status should be true")
	}
	request(http.MethodDelete, bobPath+"/follow", aliceHeader, nil, http.StatusOK)
	if request(http.MethodGet, statusPath, "", nil, http.StatusOK)["following"] != false {
		t.Fatal("follow status should be false")
	}
}
