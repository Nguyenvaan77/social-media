package model

import "time"

// Post mirrors the public post-service response used in the home feed.
type Post struct {
	ID        int       `json:"id"`
	AuthorID  int       `json:"author_id"`
	Text      string    `json:"text"`
	MediaURLs []string  `json:"media_urls"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
