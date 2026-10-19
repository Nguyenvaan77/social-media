package logging

import (
	"log/slog"
	"os"
	"fmt"
)

var RequestLog *slog.Logger
var AuthLog *slog.Logger
var ConfigLog *slog.Logger

func Init() ([]error) {
	var err = []error{}
	var requestLogErr error
	var authLogErr error
	var configLogErr error

	RequestLog, requestLogErr = NewRequestLog()
	AuthLog, authLogErr = NewAuthLog()
	ConfigLog, configLogErr = NewConfigLog()

	if requestLogErr != nil {
		fmt.Errorf(
			"initialize auth logger: %w", requestLogErr,
		)
		err = append(err, requestLogErr)
	}
	if authLogErr != nil {
		fmt.Errorf(
			"initialize auth logger: %w", authLogErr,
		)
		err = append(err, authLogErr)
	}
	if configLogErr != nil {
		fmt.Errorf(
			"initialize auth logger: %w", configLogErr,
		)
		err = append(err, configLogErr)
	}
	
	if err != nil {
		return err
	}
	return nil
}

func NewRequestLog() (*slog.Logger, error) {
	file, err := os.OpenFile(
		"../../core/logging/log/request-log.txt",
		os.O_CREATE|os.O_APPEND|os.O_WRONLY,
		0644,
	)
	if err != nil {
		return nil, err
	}
	handler := slog.NewJSONHandler(file, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})

	return slog.New(handler), nil
}

func NewAuthLog() (*slog.Logger, error) {
	file, err := os.OpenFile(
		"../../core/logging/log/auth-log.txt",
		os.O_CREATE|os.O_APPEND|os.O_WRONLY,
		0644,
	)
	if err != nil {
		return nil, err
	}
	handler := slog.NewJSONHandler(file, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})

	return slog.New(handler), nil
}

func NewConfigLog() (*slog.Logger, error) {
	file, err := os.OpenFile(
		"../../core/logging/log/config-log.txt",
		os.O_CREATE|os.O_APPEND|os.O_WRONLY,
		0644,
	)
	if err != nil {
		return nil, err
	}
	handler := slog.NewJSONHandler(file, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})

	return slog.New(handler), nil
}

