package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"post/internal/model"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var ErrNotFound = errors.New("post not found")
var ErrConflict = errors.New("post changed during update")

type PostRepository struct {
	collection *mongo.Collection
}

func NewPostRepository(collection *mongo.Collection) *PostRepository {
	return &PostRepository{collection: collection}
}

func EnsureIndexes(ctx context.Context, collection *mongo.Collection) error {
	_, err := collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "author", Value: 1},
			{Key: "metadata.created_at", Value: -1},
			{Key: "_id", Value: -1},
		},
	})
	if err != nil {
		return fmt.Errorf("create posts index: %w", err)
	}
	return nil
}

func (r *PostRepository) Create(ctx context.Context, post *model.Post) error {
	if post == nil {
		return errors.New("create post: post is nil")
	}
	now := time.Now().UTC()
	post.ID = bson.NewObjectID()
	post.Action = model.PostAction{}
	post.Comment = []model.PostComment{}
	post.Metadata = model.PostMetadata{CreatedAt: now, LastUpdated: now}
	if post.Content.Hastag == nil {
		post.Content.Hastag = []string{}
	}
	if _, err := r.collection.InsertOne(ctx, post); err != nil {
		return fmt.Errorf("create post: %w", err)
	}
	return nil
}

func (r *PostRepository) FindByID(ctx context.Context, id bson.ObjectID) (*model.Post, error) {
	var post model.Post
	err := r.collection.FindOne(ctx, bson.M{
		"_id":                id,
		"metadata.is_delete": false,
		"metadata.is_hide":   false,
		"metadata.is_block":  false,
	}).Decode(&post)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, fmt.Errorf("find post %s: %w", id.Hex(), ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("find post %s: %w", id.Hex(), err)
	}
	return &post, nil
}

// UpdateOwned compares the content read by the service and atomically changes
// only the requested fields. A conflicting edit is retried by the service so
// validation always applies to the actual content being modified.
func (r *PostRepository) UpdateOwned(ctx context.Context, id bson.ObjectID, authorID int, expected model.PostContent, fields map[string]any) (*model.Post, error) {
	if len(fields) == 0 {
		return nil, errors.New("update post: no fields provided")
	}
	updates := make(bson.M, len(fields)+1)
	for field, value := range fields {
		switch field {
		case "content.raw_content", "content.media.image", "content.media.video":
			if _, ok := value.(string); !ok {
				return nil, fmt.Errorf("update post: %s must be a string", field)
			}
		case "content.hastag":
			tags, ok := value.([]string)
			if !ok {
				return nil, errors.New("update post: content.hastag must be a string array")
			}
			if tags == nil {
				value = []string{}
			}
		default:
			return nil, fmt.Errorf("update post: unsupported field %q", field)
		}
		updates[field] = value
	}
	updates["metadata.last_updated"] = time.Now().UTC()
	if expected.Hastag == nil {
		expected.Hastag = []string{}
	}
	filter := bson.M{
		"_id":                 id,
		"author":              authorID,
		"metadata.is_delete":  false,
		"metadata.is_hide":    false,
		"metadata.is_block":   false,
		"content.raw_content": expected.RawContent,
		"content.hastag":      expected.Hastag,
		"content.media.image": expected.Media.Image,
		"content.media.video": expected.Media.Video,
	}
	update := bson.M{"$set": updates}
	var post model.Post
	err := r.collection.FindOneAndUpdate(ctx, filter, update,
		options.FindOneAndUpdate().SetReturnDocument(options.After)).Decode(&post)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, fmt.Errorf("update post %s: %w", id.Hex(), ErrConflict)
	}
	if err != nil {
		return nil, fmt.Errorf("update post %s: %w", id.Hex(), err)
	}
	return &post, nil
}

func (r *PostRepository) SoftDeleteOwned(ctx context.Context, id bson.ObjectID, authorID int) error {
	result, err := r.collection.UpdateOne(ctx, bson.M{
		"_id":                id,
		"author":             authorID,
		"metadata.is_delete": false,
	}, bson.M{"$set": bson.M{
		"metadata.is_delete":    true,
		"metadata.last_updated": time.Now().UTC(),
	}})
	if err != nil {
		return fmt.Errorf("delete post %s: %w", id.Hex(), err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("delete post %s: %w", id.Hex(), ErrNotFound)
	}
	return nil
}

func (r *PostRepository) ListByAuthor(ctx context.Context, authorID, limit, offset int) ([]model.Post, error) {
	if limit <= 0 {
		limit = 20
	} else if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	filter := bson.M{
		"author":             authorID,
		"metadata.is_delete": false,
		"metadata.is_hide":   false,
		"metadata.is_block":  false,
	}
	findOptions := options.Find().SetSort(bson.D{
		{Key: "metadata.created_at", Value: -1},
		{Key: "_id", Value: -1},
	}).SetLimit(int64(limit)).SetSkip(int64(offset))
	cursor, err := r.collection.Find(ctx, filter, findOptions)
	if err != nil {
		return nil, fmt.Errorf("list posts for author %d: %w", authorID, err)
	}
	defer cursor.Close(ctx)

	posts := []model.Post{}
	if err := cursor.All(ctx, &posts); err != nil {
		return nil, fmt.Errorf("decode posts for author %d: %w", authorID, err)
	}
	return posts, nil
}
