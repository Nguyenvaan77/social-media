package forward

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"gateway/internal/user/model"

	"github.com/gin-gonic/gin"
)

type UserForward struct {
	userAPIURL string
	client     *http.Client
}

func NewUserForward() *UserForward {
	baseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("USER_SERVICE_URL")), "/")
	if baseURL == "" {
		baseURL = "http://localhost:8081"
	}
	return &UserForward{
		userAPIURL: baseURL + "/api/v1/users",
		client:     &http.Client{Timeout: 5 * time.Second},
	}
}

func (f *UserForward) GetAllUsersForward(c *gin.Context) {
	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, f.userAPIURL, nil)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "invalid user-service URL"})
		return
	}
	resp, err := f.client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "user-service unavailable"})
		return
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusForbidden:
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
	case http.StatusOK:
		var result struct {
			Data []model.User `json:"data"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "invalid user-service response"})
			return
		}
		if result.Data == nil {
			result.Data = []model.User{}
		}
		c.JSON(http.StatusOK, gin.H{"data": result.Data})
	default:
		c.JSON(resp.StatusCode, gin.H{"error": "user-service request failed"})
	}
}
