package service

import (
	"context"
	"errors"
	"reflect"
	"sync"
	"testing"
	"time"

	"feed/internal/model"
)

type postCall struct {
	authorID int
	limit    int
	offset   int
}

type fakeSource struct {
	following []int
	posts     map[int][]model.Post
	followErr error
	postErr   error

	mu            sync.Mutex
	followOffsets []int
	postCalls     []postCall
}

func (f *fakeSource) ListFollowing(ctx context.Context, userID, limit, offset int) ([]int, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	f.mu.Lock()
	f.followOffsets = append(f.followOffsets, offset)
	f.mu.Unlock()
	if f.followErr != nil {
		return nil, f.followErr
	}
	if offset >= len(f.following) {
		return nil, nil
	}
	end := offset + limit
	if end > len(f.following) {
		end = len(f.following)
	}
	return append([]int(nil), f.following[offset:end]...), nil
}

func (f *fakeSource) ListPosts(ctx context.Context, authorID, limit, offset int) ([]model.Post, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	f.mu.Lock()
	f.postCalls = append(f.postCalls, postCall{authorID, limit, offset})
	f.mu.Unlock()
	if f.postErr != nil {
		return nil, f.postErr
	}
	posts := f.posts[authorID]
	if offset >= len(posts) {
		return nil, nil
	}
	end := offset + limit
	if end > len(posts) {
		end = len(posts)
	}
	return append([]model.Post(nil), posts[offset:end]...), nil
}

func samplePost(authorID, id, minute int) model.Post {
	return model.Post{
		ID:        id,
		AuthorID:  authorID,
		CreatedAt: time.Date(2026, 10, 9, 0, minute, 0, 0, time.UTC),
	}
}

func ids(posts []model.Post) []int {
	result := make([]int, len(posts))
	for i, post := range posts {
		result[i] = post.ID
	}
	return result
}

func TestHomeNewestEligibleAndPaginationBoundary(t *testing.T) {
	source := &fakeSource{
		following: []int{2, 3, 4},
		posts: map[int][]model.Post{
			2: {samplePost(2, 110, 50), samplePost(2, 109, 49), samplePost(2, 108, 48), samplePost(2, 107, 47)},
			3: {samplePost(3, 206, 46), samplePost(3, 205, 45)},
			4: {samplePost(4, 304, 44)},
		},
	}
	feed := NewFeedService(source)
	all, err := feed.Home(context.Background(), 1, 20, 0)
	if err != nil {
		t.Fatal(err)
	}
	want := []int{110, 109, 206, 108, 107, 205, 304}
	if !reflect.DeepEqual(ids(all), want) {
		t.Fatalf("all post IDs = %v, want %v", ids(all), want)
	}
	first, err := feed.Home(context.Background(), 1, 2, 0)
	if err != nil {
		t.Fatal(err)
	}
	second, err := feed.Home(context.Background(), 1, 3, 2)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(ids(append(first, second...)), want[:5]) {
		t.Fatalf("page boundary changed order: %v + %v", ids(first), ids(second))
	}
	for i := 2; i < len(all); i++ {
		if all[i].AuthorID == all[i-1].AuthorID && all[i-1].AuthorID == all[i-2].AuthorID {
			t.Fatalf("three consecutive posts from author %d", all[i].AuthorID)
		}
	}
}

func TestHomeTieBreaksByIDThenAuthor(t *testing.T) {
	at := time.Date(2026, 10, 9, 0, 0, 0, 0, time.UTC)
	source := &fakeSource{
		following: []int{2, 3, 4},
		posts: map[int][]model.Post{
			2: {{ID: 8, AuthorID: 2, CreatedAt: at}},
			3: {{ID: 9, AuthorID: 3, CreatedAt: at}},
			4: {{ID: 8, AuthorID: 4, CreatedAt: at}},
		},
	}
	got, err := NewFeedService(source).Home(context.Background(), 1, 3, 0)
	if err != nil {
		t.Fatal(err)
	}
	want := []int{3, 4, 2}
	for i, post := range got {
		if post.AuthorID != want[i] {
			t.Fatalf("author order = %v, want %v", got, want)
		}
	}
}

func TestHomeStopsWhenOnlyOneAuthorRemains(t *testing.T) {
	source := &fakeSource{
		following: []int{2},
		posts: map[int][]model.Post{
			2: {samplePost(2, 3, 3), samplePost(2, 2, 2), samplePost(2, 1, 1)},
		},
	}
	feed := NewFeedService(source)
	got, err := feed.Home(context.Background(), 1, 10, 0)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(ids(got), []int{3, 2}) {
		t.Fatalf("post IDs = %v, want [3 2]", ids(got))
	}
	page, err := feed.Home(context.Background(), 1, 10, 2)
	if err != nil {
		t.Fatal(err)
	}
	if len(page) != 0 {
		t.Fatalf("page after strict stop = %v, want empty", ids(page))
	}
	for _, call := range source.postCalls {
		if call.offset != 0 {
			t.Fatalf("fetched unnecessary post page: %+v", call)
		}
	}
}

func TestHomeEmptyFollowing(t *testing.T) {
	source := &fakeSource{}
	got, err := NewFeedService(source).Home(context.Background(), 1, 20, 0)
	if err != nil {
		t.Fatal(err)
	}
	if got == nil || len(got) != 0 {
		t.Fatalf("posts = %v, want empty non-nil slice", got)
	}
	if len(source.postCalls) != 0 {
		t.Fatalf("unexpected post requests: %v", source.postCalls)
	}
}

func TestHomeRejectsInvalidInput(t *testing.T) {
	for _, input := range [][3]int{{0, 20, 0}, {1, 0, 0}, {1, 51, 0}, {1, 20, -1}, {1, 20, 1001}} {
		_, err := NewFeedService(&fakeSource{}).Home(context.Background(), input[0], input[1], input[2])
		if !errors.Is(err, ErrInvalidInput) {
			t.Errorf("Home(%d, %d, %d) error = %v, want ErrInvalidInput", input[0], input[1], input[2], err)
		}
	}
}

func TestHomePaginatesAndDeduplicatesFollowing(t *testing.T) {
	following := make([]int, 101)
	for i := range following {
		following[i] = i + 2
	}
	following[99] = 1  // The viewer must never appear in the feed.
	following[100] = 2 // Duplicate a followee across page boundaries.
	source := &fakeSource{following: following, posts: map[int][]model.Post{2: {samplePost(2, 5, 5)}}}
	got, err := NewFeedService(source).Home(context.Background(), 1, 10, 0)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(ids(got), []int{5}) {
		t.Fatalf("post IDs = %v, want [5]", ids(got))
	}
	if !reflect.DeepEqual(source.followOffsets, []int{0, 100}) {
		t.Fatalf("following offsets = %v, want [0 100]", source.followOffsets)
	}
	counts := make(map[int]int)
	for _, call := range source.postCalls {
		counts[call.authorID]++
		if call.limit > 100 {
			t.Fatalf("post limit = %d, want <= 100", call.limit)
		}
	}
	if counts[1] != 0 || counts[2] != 1 || len(counts) != 99 {
		t.Fatalf("post request counts = %v", counts)
	}
}

func TestHomePropagatesSourceErrors(t *testing.T) {
	sentinel := errors.New("upstream unavailable")
	for _, source := range []*fakeSource{
		{followErr: sentinel},
		{following: []int{2}, postErr: sentinel},
	} {
		_, err := NewFeedService(source).Home(context.Background(), 1, 10, 0)
		if !errors.Is(err, sentinel) {
			t.Errorf("error = %v, want wrapped upstream error", err)
		}
	}
}
