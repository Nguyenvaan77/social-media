package logging

import (
	"time"

	"github.com/gin-gonic/gin"
)

func RequestLoggingMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		start := time.Now()
		ctx.Next()
		duration := time.Since(start)
		RequestLog.Info(
			"User request",
			"method", ctx.Request.Method,
			"path", ctx.Request.URL.Path,
			"status_code", ctx.Writer.Status(),
			"entry_time", start,
			"duration_time", duration,
		)
	}
}
