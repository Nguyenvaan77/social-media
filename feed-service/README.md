# Feed Service

Feed Service builds a home feed from the accounts a user follows. It has no database of its own: it reads following relationships from User Service and posts from Post Service.

## Run locally

Start User Service on port `8080` and Post Service on port `8081`, then run:

```powershell
cd feed-service
$env:USER_SERVICE_URL = "http://localhost:8080" # optional
$env:POST_SERVICE_URL = "http://localhost:8081" # optional
$env:PORT = "8083" # optional
go run .
```

These are the default values. Both upstream services must be reachable for the feed to load.

## Identity

`GET /home` requires a positive integer `X-User-ID` header. Like User Service and Post Service, Feed Service trusts this gateway supplied identity; it does not validate a token itself. The API gateway must authenticate external requests, remove any client supplied `X-User-ID`, and set the header to the authenticated user's ID. Keep the service on a trusted internal network until a gateway is configured.

## Endpoint

`GET /home` and `GET /api/v1/feed/home` return the same feed. Optional `limit` defaults to `20` and must be `1` through `50`; optional `offset` defaults to `0` and must be `0` through `1000`.

```powershell
curl.exe -H "X-User-ID: 1" "http://localhost:8083/home?limit=20&offset=0"
```

Successful response:

```json
{
  "data": [
    {
      "id": 42,
      "author_id": 2,
      "text": "A new post",
      "media_urls": [],
      "created_at": "2026-10-08T14:00:00Z",
      "updated_at": "2026-10-08T14:00:00Z"
    }
  ],
  "limit": 20,
  "offset": 0
}
```

`data` contains Post Service post objects from followed users only. The feed chooses the newest eligible post at each position, while ensuring that three consecutive posts never have the same author. When only one author has remaining posts and another post from that author would break this rule, the feed stops, so a page can contain fewer than `limit` posts. An account following nobody receives an empty `data` array. `offset` skips positions in the feed after applying this ordering rule.

The feed is rebuilt for each request. New posts published between page requests can shift `offset` positions.

Errors use JSON with an `error` field: `400` for a missing or invalid identity header or pagination value, `404` when the requesting user does not exist, and `502` when an upstream service fails or gives an unusable response.
