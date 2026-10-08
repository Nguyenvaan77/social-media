package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRequireUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewPostHandler(nil)
	r.POST("/posts", h.RequireUserID, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"author_id": authorID(c)})
	})

	for _, test := range []struct {
		name, userID string
		wantStatus   int
	}{
		{"missing", "", http.StatusBadRequest},
		{"zero", "0", http.StatusBadRequest},
		{"negative", "-2", http.StatusBadRequest},
		{"nonnumeric", "alice", http.StatusBadRequest},
		{"valid", "42", http.StatusOK},
	} {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/posts", nil)
			if test.userID != "" {
				req.Header.Set("X-User-ID", test.userID)
			}
			response := httptest.NewRecorder()
			r.ServeHTTP(response, req)
			if response.Code != test.wantStatus {
				t.Fatalf("status %d, want %d: %s", response.Code, test.wantStatus, response.Body.String())
			}
			if test.wantStatus == http.StatusOK && response.Body.String() != "{\"author_id\":42}" {
				t.Fatalf("unexpected identity: %s", response.Body.String())
			}
		})
	}
}
