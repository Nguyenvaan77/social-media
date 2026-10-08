package model

import "time"

type Follow struct {
	FollowerID int       `gorm:"column:follower_id;primaryKey;index"`
	FolloweeID int       `gorm:"column:followee_id;primaryKey;index"`
	CreatedAt  time.Time `gorm:"column:created_at;autoCreateTime"`
}
