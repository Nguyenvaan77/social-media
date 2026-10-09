package forward

import (
	"encoding/json"
	"gateway/internal/user/model"
	"net/http"

	"github.com/gin-gonic/gin"
)

type UserForward struct {
}

func NewUserForward() *UserForward {
	return &UserForward{}
}

const baseUrl string = "http://localhost:8081"
const prefixApi string = "/api/v1"
const resouce string = "/users"

const userApiUrl string = baseUrl + prefixApi + resouce

func (f *UserForward) GetAllUsersForward(c *gin.Context) {

	urlForward := userApiUrl

	resp, err := http.Get(urlForward)

	switch resp.StatusCode {
	case http.StatusForbidden:
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
	case http.StatusOK:
		var result struct {
			User []model.User `json:"data"`
		}
		err = json.NewDecoder(resp.Body).Decode(&result)

		if err != nil {
			c.JSON(http.StatusInsufficientStorage, gin.H{"error": "Dữ liệu trả về từ Forward không hợp lệ"})
		}

		c.JSON(http.StatusOK, gin.H{"data": result.User})
	default:
		c.JSON(resp.StatusCode, gin.H{"message": "Other"})
	}
	defer resp.Body.Close()
}
