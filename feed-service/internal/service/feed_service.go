package service

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"feed/internal/model"
)

const (
	followingPageSize = 100
	postPageSize      = 20
	initialWorkers    = 8
)

var ErrInvalidInput = errors.New("invalid feed input")

// Source supplies the following list and each author's posts in descending
// creation order. Both methods use zero-based offset pagination.
type Source interface {
	ListFollowing(ctx context.Context, userID, limit, offset int) ([]int, error)
	ListPosts(ctx context.Context, authorID, limit, offset int) ([]model.Post, error)
}

type FeedService struct {
	source Source
}

func NewFeedService(source Source) *FeedService {
	return &FeedService{source: source}
}

type authorCursor struct {
	authorID   int
	posts      []model.Post
	index      int
	nextOffset int
	exhausted  bool
}

func (c *authorCursor) current() (model.Post, bool) {
	if c.index >= len(c.posts) {
		return model.Post{}, false
	}
	return c.posts[c.index], true
}

func (s *FeedService) loadPage(ctx context.Context, c *authorCursor) error {
	if c.exhausted {
		c.posts = nil
		c.index = 0
		return nil
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	posts, err := s.source.ListPosts(ctx, c.authorID, postPageSize, c.nextOffset)
	if err != nil {
		return fmt.Errorf("list posts for user %d: %w", c.authorID, err)
	}
	c.nextOffset += len(posts)
	c.posts = posts
	c.index = 0
	c.exhausted = len(posts) < postPageSize
	return nil
}

func (s *FeedService) following(ctx context.Context, userID int) ([]int, error) {
	ids := make([]int, 0)
	seen := make(map[int]struct{})
	for offset := 0; ; offset += followingPageSize {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		page, err := s.source.ListFollowing(ctx, userID, followingPageSize, offset)
		if err != nil {
			return nil, fmt.Errorf("list following for user %d: %w", userID, err)
		}
		for _, id := range page {
			if id <= 0 || id == userID {
				continue
			}
			if _, exists := seen[id]; exists {
				continue
			}
			seen[id] = struct{}{}
			ids = append(ids, id)
		}
		if len(page) < followingPageSize {
			return ids, nil
		}
	}
}

func (s *FeedService) initialHeads(ctx context.Context, cursors []authorCursor) error {
	if len(cursors) == 0 {
		return nil
	}
	workCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	workers := initialWorkers
	if len(cursors) < workers {
		workers = len(cursors)
	}
	jobs := make(chan int)
	var wg sync.WaitGroup
	var once sync.Once
	var firstErr error
	for range workers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for index := range jobs {
				if err := s.loadPage(workCtx, &cursors[index]); err != nil {
					once.Do(func() {
						firstErr = err
						cancel()
					})
					return
				}
			}
		}()
	}
dispatch:
	for index := range cursors {
		select {
		case <-workCtx.Done():
			break dispatch
		case jobs <- index:
		}
	}
	close(jobs)
	wg.Wait()
	if firstErr != nil {
		return firstErr
	}
	return ctx.Err()
}

func newer(a model.Post, aAuthor int, b model.Post, bAuthor int) bool {
	if !a.CreatedAt.Equal(b.CreatedAt) {
		return a.CreatedAt.After(b.CreatedAt)
	}
	if a.ID != b.ID {
		return a.ID > b.ID
	}
	return aAuthor > bAuthor
}

// Home merges followed authors' posts from newest to oldest. When the last two
// emitted posts share an author, that author is temporarily ineligible. If no
// other author has a post, the feed ends; the rule is never relaxed. Pagination
// is replayed from the start so the rule also holds across page boundaries.
func (s *FeedService) Home(ctx context.Context, userID, limit, offset int) ([]model.Post, error) {
	if userID <= 0 || limit < 1 || limit > 50 || offset < 0 || offset > 1000 {
		return nil, ErrInvalidInput
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	ids, err := s.following(ctx, userID)
	if err != nil {
		return nil, err
	}
	cursors := make([]authorCursor, len(ids))
	for i, id := range ids {
		cursors[i].authorID = id
	}
	if err := s.initialHeads(ctx, cursors); err != nil {
		return nil, err
	}
	result := make([]model.Post, 0, limit)
	lastAuthor, consecutive := 0, 0
	for position := 0; position < offset+limit; position++ {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		best := -1
		for i := range cursors {
			candidate, ok := cursors[i].current()
			if !ok || (consecutive == 2 && cursors[i].authorID == lastAuthor) {
				continue
			}
			if best < 0 {
				best = i
				continue
			}
			currentBest, _ := cursors[best].current()
			if newer(candidate, cursors[i].authorID, currentBest, cursors[best].authorID) {
				best = i
			}
		}
		if best < 0 {
			break
		}
		post, _ := cursors[best].current()
		if position >= offset {
			result = append(result, post)
		}
		authorID := cursors[best].authorID
		if authorID == lastAuthor {
			consecutive++
		} else {
			lastAuthor, consecutive = authorID, 1
		}
		cursors[best].index++
		if cursors[best].index == len(cursors[best].posts) && position+1 < offset+limit {
			if err := s.loadPage(ctx, &cursors[best]); err != nil {
				return nil, err
			}
		}
	}
	return result, nil
}
