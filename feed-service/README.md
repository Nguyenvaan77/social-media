# Feed Service

Feed Service builds a home feed from the accounts a user follows. It has no database of its own: it reads following relationships from User Service and posts from Post Service.

## Run locally

Start User Service on its default port `8081` and Post Service with `PORT=8084`, then run:

```powershell
cd feed-service
$env:USER_SERVICE_URL = "http://localhost:8081"
$env:POST_SERVICE_URL = "http://localhost:8084"
$env:PORT = "8083" # optional
go run ./cmd
```

Both upstream services must be reachable for the feed to load. Set the URLs explicitly because the services otherwise use overlapping default ports when run on one host.

## Docker

Build from the service directory and pass URLs reachable from the container:

```powershell
cd feed-service
docker build -t social-feed-service .
docker run --rm -p 8083:8083 -e USER_SERVICE_URL=http://host.docker.internal:8081 -e POST_SERVICE_URL=http://host.docker.internal:8084 social-feed-service
```

`host.docker.internal` reaches services running on the host with Docker Desktop. The Post Service Docker example maps it to host port `8084`. When all services share a Docker network, use their container names and internal ports instead. The container listens on port `8083` by default; set `PORT` and adjust the port mapping to change it.

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
      "_id": "6707a1b2c3d4e5f607182930",
      "author": 2,
      "content": {
        "raw_content": "A new post",
        "hastag": [],
        "media": {"image": "", "video": ""}
      },
      "action": {"like": 0, "unlike": 0, "love": 0, "angry": 0},
      "comment": [],
      "metadata": {
        "created_at": "2026-10-08T14:00:00Z",
        "last_updated": "2026-10-08T14:00:00Z",
        "is_delete": false,
        "is_hide": false,
        "is_block": false
      }
    }
  ],
  "limit": 20,
  "offset": 0
}
```

`data` contains Post Service MongoDB post objects from followed users only. The feed orders by `metadata.created_at` descending and breaks timestamp ties with `_id`, while ensuring that three consecutive posts never have the same author. Post Service excludes deleted, hidden, and blocked documents from its public list. When only one author has remaining posts and another post from that author would break this rule, the feed stops, so a page can contain fewer than `limit` posts. An account following nobody receives an empty `data` array. `offset` skips positions in the feed after applying this ordering rule.

The feed is rebuilt for each request. New posts published between page requests can shift `offset` positions.

Errors use JSON with an `error` field: `400` for a missing or invalid identity header or pagination value, `404` when the requesting user does not exist, and `502` when an upstream service fails or gives an unusable response.
