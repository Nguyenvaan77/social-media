package router_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strconv"
	"testing"

	"auth/internal/config"
	"auth/internal/enum"
	"auth/internal/handler"
	"auth/internal/model"
	"auth/internal/repository"
	"auth/internal/router"
	"auth/internal/seed"
	"auth/internal/service"

	"github.com/glebarez/sqlite"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	authPath     = "/api/v1/auth"
	testPassword = "correct horse battery staple"
	testJWTKey   = "integration-test-secret-at-least-32-characters"
)

type authFixture struct {
	t      *testing.T
	db     *gorm.DB
	router http.Handler
}

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	UserID       int    `json:"user_id"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
}

func newAuthFixture(t *testing.T) *authFixture {
	t.Helper()
	t.Setenv("JWT_SECRET", testJWTKey)
	t.Setenv("JWT_ISSUER", "auth-integration-test")
	t.Setenv("JWT_AUDIENCE", "social-media-test")
	t.Setenv("JWT_EXPIRATION", "15m")
	t.Setenv("JWT_REFRESH_EXPIRATION", "24h")

	// A private in-memory database exercises the real migration and repository.
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{TranslateError: true})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.Exec("PRAGMA foreign_keys = ON").Error; err != nil {
		t.Fatal(err)
	}
	if err := config.MigrateDatabase(db); err != nil {
		t.Fatal(err)
	}
	if err := seed.SeedRoles(db); err != nil {
		t.Fatal(err)
	}
	authService, err := service.NewAuthService(repository.NewAuthRepository(db))
	if err != nil {
		t.Fatal(err)
	}
	return &authFixture{t: t, db: db, router: router.SetupRouter(handler.NewAuthHandler(authService))}
}

func (f *authFixture) post(path string, payload any, refreshToken string, wantStatus int) map[string]json.RawMessage {
	f.t.Helper()
	var body []byte
	if payload != nil {
		var err error
		body, err = json.Marshal(payload)
		if err != nil {
			f.t.Fatal(err)
		}
	}
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if refreshToken != "" {
		req.Header.Set("Refresh-token-X", refreshToken)
	}
	response := httptest.NewRecorder()
	f.router.ServeHTTP(response, req)
	if response.Code != wantStatus {
		f.t.Fatalf("POST %s: status %d, want %d; body: %s", path, response.Code, wantStatus, response.Body.String())
	}
	var result map[string]json.RawMessage
	if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
		f.t.Fatalf("POST %s: invalid JSON: %v", path, err)
	}
	return result
}

func (f *authFixture) register(email, fullName string) model.User {
	f.t.Helper()
	response := f.post(authPath+"/register", map[string]string{
		"email": email, "password": testPassword, "full_name": fullName,
	}, "", http.StatusCreated)
	var user model.User
	if err := json.Unmarshal(response["data"], &user); err != nil {
		f.t.Fatal(err)
	}
	return user
}

func (f *authFixture) login(email, password string, wantStatus int) tokenResponse {
	f.t.Helper()
	response := f.post(authPath+"/login", map[string]string{"email": email, "password": password}, "", wantStatus)
	if wantStatus != http.StatusOK {
		return tokenResponse{}
	}
	var tokens tokenResponse
	data, err := json.Marshal(response)
	if err != nil {
		f.t.Fatal(err)
	}
	if err := json.Unmarshal(data, &tokens); err != nil {
		f.t.Fatal(err)
	}
	if tokens.AccessToken == "" || tokens.RefreshToken == "" || tokens.TokenType != "Bearer" || tokens.ExpiresIn != 900 {
		f.t.Fatalf("incomplete login response: %+v", tokens)
	}
	return tokens
}

func (f *authFixture) claims(raw string) jwt.MapClaims {
	f.t.Helper()
	token, err := jwt.Parse(raw, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method %s", token.Method.Alg())
		}
		return []byte(testJWTKey), nil
	}, jwt.WithIssuer("auth-integration-test"), jwt.WithAudience("social-media-test"), jwt.WithExpirationRequired())
	if err != nil || !token.Valid {
		f.t.Fatalf("invalid signed token: %v", err)
	}
	return token.Claims.(jwt.MapClaims)
}

func (f *authFixture) storedToken(userID int) model.Token {
	f.t.Helper()
	var token model.Token
	if err := f.db.Where("user_id = ?", userID).Take(&token).Error; err != nil {
		f.t.Fatal(err)
	}
	return token
}

func TestAuthRegistrationAndLoginIntegration(t *testing.T) {
	f := newAuthFixture(t)
	user := f.register("Alice@Example.Test", "  Alice Example  ")
	if user.ID <= 0 || user.Email != "alice@example.test" || user.FullName != "Alice Example" || user.Status != "enable" || user.EmailVerifiedAt == nil {
		t.Fatalf("unexpected registered user: %+v", user)
	}
	response := f.post(authPath+"/register", map[string]string{
		"email": "bob@example.test", "password": testPassword,
	}, "", http.StatusCreated)
	var fallback model.User
	if err := json.Unmarshal(response["data"], &fallback); err != nil || fallback.FullName != "bob" {
		t.Fatalf("email-derived full name = %+v, err = %v", fallback, err)
	}
	if bytes.Contains(response["data"], []byte("password_hash")) {
		t.Fatal("registration response exposed password hash")
	}
	var stored model.User
	if err := f.db.Preload("Roles").First(&stored, user.ID).Error; err != nil {
		t.Fatal(err)
	}
	if bcrypt.CompareHashAndPassword([]byte(stored.PasswordHash), []byte(testPassword)) != nil {
		t.Fatal("registered password was not stored as a bcrypt hash")
	}
	if len(stored.Roles) != 1 || stored.Roles[0].Name != enum.RoleUser.String() {
		t.Fatalf("registered roles = %+v", stored.Roles)
	}
	permission := model.Permission{Name: enum.PermissionPostRead.String()}
	if err := f.db.Create(&permission).Error; err != nil {
		t.Fatal(err)
	}
	if err := f.db.Create(&model.RolePermission{RoleID: stored.Roles[0].ID, PermissionID: permission.ID}).Error; err != nil {
		t.Fatal(err)
	}
	tokens := f.login(" ALICE@EXAMPLE.TEST ", testPassword, http.StatusOK)
	if tokens.UserID != user.ID {
		t.Fatalf("login user ID = %d, want %d", tokens.UserID, user.ID)
	}
	access := f.claims(tokens.AccessToken)
	if access["sub"] != strconv.Itoa(user.ID) || !reflect.DeepEqual(access["Authorities"], []any{enum.PermissionPostRead.String()}) {
		t.Fatalf("unexpected access claims: %+v", access)
	}
	refresh := f.claims(tokens.RefreshToken)
	secret, ok := refresh["RefreshSecretToken"].(string)
	if !ok || secret == "" || f.storedToken(user.ID).RefreshToken != secret {
		t.Fatal("refresh secret was not persisted for the user")
	}
	if secret == tokens.RefreshToken {
		t.Fatal("database stored the signed refresh token instead of its secret")
	}
}

func TestAuthRejectsInvalidRegistrationAndLogin(t *testing.T) {
	f := newAuthFixture(t)
	f.register("alice@example.test", "Alice")
	for _, email := range []string{"alice@example.test", "ALICE@EXAMPLE.TEST"} {
		response := f.post(authPath+"/register", map[string]string{
			"email": email, "password": testPassword,
		}, "", http.StatusBadRequest)
		if string(response["msg"]) != `"email already registered"` {
			t.Fatalf("duplicate email response: %v", response)
		}
	}
	for _, request := range []map[string]string{
		{"email": "invalid", "password": testPassword},
		{"email": "new@example.test"},
		{"email": "new@example.test", "password": testPassword, "full_name": string(bytes.Repeat([]byte("x"), 51))},
	} {
		f.post(authPath+"/register", request, "", http.StatusBadRequest)
	}
	var count int64
	if err := f.db.Model(&model.User{}).Count(&count).Error; err != nil || count != 1 {
		t.Fatalf("invalid requests changed user count: %d, err: %v", count, err)
	}
	f.login("alice@example.test", "wrong password", http.StatusUnauthorized)
	f.login("missing@example.test", testPassword, http.StatusUnauthorized)
	f.post(authPath+"/login", map[string]string{"email": "alice@example.test"}, "", http.StatusBadRequest)
	if err := f.db.Model(&model.User{}).Where("email = ?", "alice@example.test").Update("status", "disabled").Error; err != nil {
		t.Fatal(err)
	}
	f.login("alice@example.test", testPassword, http.StatusUnauthorized)
}

func TestAuthRefreshRotationAndLogoutIntegration(t *testing.T) {
	f := newAuthFixture(t)
	user := f.register("alice@example.test", "Alice")
	first := f.login(user.Email, testPassword, http.StatusOK)
	f.post(authPath+"/refresh", nil, "", http.StatusUnauthorized)
	f.post(authPath+"/refresh", nil, first.AccessToken, http.StatusUnauthorized)
	f.post(authPath+"/refresh", nil, "invalid-jwt", http.StatusUnauthorized)

	response := f.post(authPath+"/refresh", nil, first.RefreshToken, http.StatusOK)
	var second tokenResponse
	data, err := json.Marshal(response)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(data, &second); err != nil {
		t.Fatal(err)
	}
	if second.UserID != user.ID || second.AccessToken == "" || second.RefreshToken == "" || second.RefreshToken == first.RefreshToken {
		t.Fatalf("invalid rotated tokens: %+v", second)
	}
	newSecret := f.claims(second.RefreshToken)["RefreshSecretToken"]
	if f.storedToken(user.ID).RefreshToken != newSecret {
		t.Fatal("rotation did not replace the stored refresh secret")
	}
	f.post(authPath+"/refresh", nil, first.RefreshToken, http.StatusUnauthorized)
	logout := f.post(authPath+"/logout", nil, second.RefreshToken, http.StatusOK)
	if string(logout["msg"]) != `"Đăng xuất thành công"` {
		t.Fatalf("logout reported failure after revoking token: %s", logout["msg"])
	}
	var remaining int64
	if err := f.db.Model(&model.Token{}).Where("user_id = ?", user.ID).Count(&remaining).Error; err != nil || remaining != 0 {
		t.Fatalf("logout left %d refresh tokens, err: %v", remaining, err)
	}
	f.post(authPath+"/refresh", nil, second.RefreshToken, http.StatusUnauthorized)

	// A new login replaces the previous session's refresh secret.
	third := f.login(user.Email, testPassword, http.StatusOK)
	fourth := f.login(user.Email, testPassword, http.StatusOK)
	f.post(authPath+"/refresh", nil, third.RefreshToken, http.StatusUnauthorized)
	if f.storedToken(user.ID).RefreshToken != f.claims(fourth.RefreshToken)["RefreshSecretToken"] {
		t.Fatal("second login did not replace the prior refresh secret")
	}
}
