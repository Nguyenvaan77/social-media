# Post Service

REST API for posts stored as MongoDB documents. All routes use the `/api/v1` prefix and return JSON unless the response is `204 No Content`.

## Run locally

`mongosh` is a client, so the `ECONNREFUSED 127.0.0.1:27017` error means a MongoDB server is not listening there. Start the MongoDB container from the repository root:

```powershell
docker compose up -d mongo
mongosh "mongodb://127.0.0.1:27017/post_service"
```

Then run Post Service in another terminal:

```powershell
cd post-service
$env:MONGODB_URI = "mongodb://127.0.0.1:27017"
$env:MONGODB_DATABASE = "post_service"
$env:PORT = "8084" # optional
go run ./cmd
```

The service reads a local `.env` file when present, without overriding environment variables set in the terminal or by Docker Compose. It uses `mongodb://127.0.0.1:27017` and database `post_service` when these variables are absent. MongoDB creates the database on the first write; startup creates indexes on `posts`. See [.env.example](.env.example) for local values. `USER_SERVICE_URL` is not needed.

## Docker

Build from the service directory after starting MongoDB with Compose. Join the same `social-media-net` network so the container can reach `mongo`:

```powershell
cd post-service
docker build -t social-post-service .
docker run --rm --network social-media-net -p 8084:8080 -e MONGODB_URI=mongodb://mongo:27017 -e MONGODB_DATABASE=post_service social-post-service
```

The container listens on port `8080` by default. The example maps it to host port `8084`. You can also start the complete stack with `docker compose up --build -d` from the repository root.

## Identity contract

This service does not authenticate requests or call the user service to check tokens. Create, edit, and delete requests require a positive integer `X-User-ID` header. The service trusts it as the author ID and still allows only the matching author to edit or delete a post. It does not independently verify that the user exists.

When an API gateway is added, it must authenticate external requests, remove any client supplied `X-User-ID`, and set the header from the authenticated identity. Until then, keep the service on a trusted internal network. For local calls, supply the header yourself.

## Endpoints

| Method | Endpoint | Identity | Request | Success response |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/posts` | `X-User-ID` | `{"content":{"raw_content":"Hello","hastag":["hello"],"media":{"image":"https://example.com/photo.jpg","video":""}}}` | `201` `{"data": {...}}` |
| `GET` | `/api/v1/posts/:id` | None | No body | `200` `{"data": {...}}` |
| `PATCH` | `/api/v1/posts/:id` | `X-User-ID` | `content` with one or more fields to change | `200` `{"data": {...}}` |
| `DELETE` | `/api/v1/posts/:id` | `X-User-ID` | No body | `204` No Content |
| `GET` | `/api/v1/users/:user_id/posts?limit=20&offset=0` | None | Optional `limit`, `offset` | `200` `{"data":[...],"limit":20,"offset":0}` |

A post needs nonempty `raw_content` or an image/video URL. `raw_content` is limited to 5,000 Unicode characters. `hastag` accepts up to 30 unique tags of at most 50 characters without whitespace. Image and video URLs must be absolute HTTP or HTTPS URLs of at most 2,048 bytes. PATCH accepts a subset of `raw_content`, `hastag`, `media.image`, and `media.video`; at least one field must be present. Post IDs are 24-character MongoDB ObjectID hex strings. Deleted, hidden, and blocked posts are excluded from public detail and list requests. List `limit` defaults to `20` and accepts values from `1` to `100`; `offset` defaults to `0`.

Example post response in `data`:

```json
{
  "_id": "6707a1b2c3d4e5f607182930",
  "author": 42,
  "content": {
    "raw_content": "Hello #go",
    "hastag": ["go"],
    "media": {"image": "https://example.com/photo.jpg", "video": ""}
  },
  "action": {"like": 0, "unlike": 0, "love": 0, "angry": 0},
  "comment": [],
  "metadata": {
    "created_at": "2026-10-10T08:00:00Z",
    "last_updated": "2026-10-10T08:00:00Z",
    "is_delete": false,
    "is_hide": false,
    "is_block": false
  }
}
```

The current API initializes `action` counters and `comment` but has no endpoints to change them. DELETE sets `metadata.is_delete` to `true`; it does not remove the MongoDB document. Existing MySQL posts are not migrated automatically.

Errors return a JSON message. Common statuses are `400` for invalid input or identity header, `403` when the supplied user ID is not the post's author, and `404` for a missing or deleted post. A PATCH that keeps conflicting with concurrent edits after several retries returns `409`.
