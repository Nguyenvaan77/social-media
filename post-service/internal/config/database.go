package config

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const (
	defaultMongoURI      = "mongodb://127.0.0.1:27017"
	defaultMongoDatabase = "post_service"
)

func ConnectDatabase(ctx context.Context) (*mongo.Client, *mongo.Database, error) {
	uri := strings.TrimSpace(os.Getenv("MONGODB_URI"))
	if uri == "" {
		uri = defaultMongoURI
	}
	databaseName := strings.TrimSpace(os.Getenv("MONGODB_DATABASE"))
	if databaseName == "" {
		databaseName = defaultMongoDatabase
	}

	client, err := mongo.Connect(options.Client().ApplyURI(uri).SetServerSelectionTimeout(5 * time.Second))
	if err != nil {
		return nil, nil, fmt.Errorf("connect MongoDB: %w", err)
	}
	if err := client.Ping(ctx, nil); err != nil {
		_ = client.Disconnect(context.Background())
		return nil, nil, fmt.Errorf("ping MongoDB: %w", err)
	}
	return client, client.Database(databaseName), nil
}
