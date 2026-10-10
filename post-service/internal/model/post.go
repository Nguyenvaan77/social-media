package model

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Post struct {
	ID       bson.ObjectID `bson:"_id,omitempty" json:"_id"`
	Author   int           `bson:"author" json:"author"`
	Content  PostContent   `bson:"content" json:"content"`
	Action   PostAction    `bson:"action" json:"action"`
	Comment  []PostComment `bson:"comment" json:"comment"`
	Metadata PostMetadata  `bson:"metadata" json:"metadata"`
}

type PostContent struct {
	RawContent string    `bson:"raw_content" json:"raw_content"`
	Hastag     []string  `bson:"hastag" json:"hastag"`
	Media      PostMedia `bson:"media" json:"media"`
}

type PostMedia struct {
	Image string `bson:"image" json:"image"`
	Video string `bson:"video" json:"video"`
}

type PostAction struct {
	Like   int `bson:"like" json:"like"`
	Unlike int `bson:"unlike" json:"unlike"`
	Love   int `bson:"love" json:"love"`
	Angry  int `bson:"angry" json:"angry"`
}

type PostComment struct {
	ID        bson.ObjectID `bson:"_id" json:"_id"`
	Author    int           `bson:"author" json:"author"`
	Content   string        `bson:"content" json:"content"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
	Replies   []PostComment `bson:"replies" json:"replies"`
}

type PostMetadata struct {
	CreatedAt   time.Time `bson:"created_at" json:"created_at"`
	LastUpdated time.Time `bson:"last_updated" json:"last_updated"`
	IsDelete    bool      `bson:"is_delete" json:"is_delete"`
	IsHide      bool      `bson:"is_hide" json:"is_hide"`
	IsBlock     bool      `bson:"is_block" json:"is_block"`
}
