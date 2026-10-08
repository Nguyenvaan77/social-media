# Post Service

REST API for creating and reading posts. All routes use the `/api/v1` prefix and return JSON unless the response is `204 No Content`.

## Run locally

Create the MySQL database, then run:

```powershell
cd post-service
$env:DATABASE_DSN = "root:password@tcp(127.0.0.1:3306)/post_service?charset=utf8mb4&parseTime=True&loc=Local"
$env:PORT = "8081" # optional
go run .
```

Startup migrates the posts table. `USER_SERVICE_URL` is no longer needed.

## Identity contract

This service does not authenticate requests or call the user service to check tokens. Create, edit, and delete requests require a positive integer `X-User-ID` header. The service trusts it as the author ID and still allows only the matching author to edit or delete a post. It does not independently verify that the user exists.

When an API gateway is added, it must authenticate external requests, remove any client supplied `X-User-ID`, and set the header from the authenticated identity. Until then, keep the service on a trusted internal network. For local calls, supply the header yourself.

## Endpoints

| Method | Endpoint | Identity | Request | Success response |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/posts` | `X-User-ID` | `{"text":"Hello","media_urls":["https://example.com/photo.jpg"]}` | `201` `{"post": {...}}` |
| `GET` | `/api/v1/posts/:id` | None | No body | `200` `{"post": {...}}` |
| `PATCH` | `/api/v1/posts/:id` | `X-User-ID` | `text` and/or `media_urls` | `200` `{"post": {...}}` |
| `DELETE` | `/api/v1/posts/:id` | `X-User-ID` | No body | `204` No Content |
| `GET` | `/api/v1/users/:user_id/posts?limit=20&offset=0` | None | Optional `limit`, `offset` | `200` `{"data":[...],"limit":20,"offset":0}` |

A post needs nonempty text or at least one media URL. Text is limited to 5,000 Unicode characters. `media_urls` accepts at most 10 absolute HTTP or HTTPS URLs, each at most 2,048 bytes. A `PATCH` request can clear the text or media URLs if the other field remains nonempty. Deleted posts are hidden from detail and list requests. List `limit` defaults to `20` and accepts values from `1` to `100`; `offset` defaults to `0`.

Errors return a JSON message. Common statuses are `400` for invalid input or identity header, `403` when the supplied user ID is not the post's author, and `404` for a missing or deleted post.
