package forward

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type AuthForward struct {
	authAPIURL string
	client     *http.Client
}

func NewAuthForward() *AuthForward {
	baseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("AUTH_SERVICE_URL")), "/")
	if baseURL == "" {
		baseURL = "http://localhost:8085"
	}
	return &AuthForward{
		authAPIURL: baseURL + "/api/v1/auth",
		client:     &http.Client{Timeout: 5 * time.Second},
	}
}

func (f *AuthForward) LoginForward(c *gin.Context) {
	f.postForward(c, "/login")
}

func (f *AuthForward) RegisterForward(c *gin.Context) {
	f.postForward(c, "/register")
}

func (f *AuthForward) LogOut(c *gin.Context) {
	f.postForward(c, "/logout")
}

func (f *AuthForward) RefreshToken(c *gin.Context) {
	f.postForward(c, "/refresh")
}

func (f *AuthForward) postForward(c *gin.Context, path string) {
	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost, f.authAPIURL+path, c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "invalid auth-service URL"})
		return
	}
	req.Header.Set("Content-Type", c.GetHeader("Content-Type"))
	if path == "/refresh" {
		req.Header.Set("Refresh-token-X", c.GetHeader("Refresh-token-X"))
	}

	fmt.Println(f.authAPIURL + path)
	fmt.Println(c.Request.Body)

	resp, err := f.client.Do(req)

	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "auth-service unavailable"})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "invalid auth-service response"})
		return
	}
	c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), body)
}
