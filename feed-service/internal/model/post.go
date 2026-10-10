package model

import "time"

// Post mirrors the public MongoDB post document returned by Post Service.
type Post struct {
	ID       string    `json:"_id"`
	AuthorID int       `json:"author"`
	Content  Content   `json:"content"`
	Action   Action    `json:"action"`
	Comment  []Comment `json:"comment"`
	Metadata Metadata  `json:"metadata"`
}

type Content struct {
	RawContent string   `json:"raw_content"`
	Hastag     []string `json:"hastag"`
	Media      Media    `json:"media"`
}

type Media struct {
	Image string `json:"image"`
	Video string `json:"video"`
}

type Action struct {
	Like   int `json:"like"`
	Unlike int `json:"unlike"`
	Love   int `json:"love"`
	Angry  int `json:"angry"`
}

type Comment struct {
	ID        string    `json:"_id"`
	AuthorID  int       `json:"author"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
	Replies   []Comment `json:"replies"`
}

type Metadata struct {
	CreatedAt   time.Time `json:"created_at"`
	LastUpdated time.Time `json:"last_updated"`
	IsDelete    bool      `json:"is_delete"`
	IsHide      bool      `json:"is_hide"`
	IsBlock     bool      `json:"is_block"`
}
