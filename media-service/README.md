# Media Service

Media Service stores image files on the local filesystem and stores only URLs and metadata in MySQL. It listens on port `8082` by default.

## Run locally

Create the `media_service` MySQL database, then start the service from the repository root:

```powershell
cd media-service
$env:DATABASE_DSN = "root:password@tcp(127.0.0.1:3306)/media_service?charset=utf8mb4&parseTime=True&loc=Local"
$env:JWT_SECRET = "replace-with-a-random-secret-of-at-least-32-bytes"
$env:PORT = "8082" # optional
$env:UPLOAD_DIR = "./uploads" # optional
$env:PUBLIC_BASE_URL = "http://localhost:8082" # optional
$env:MAX_FILE_SIZE_MB = "5" # optional; allowed range: 1-20
go run ./cmd
```

Startup creates the upload directory and migrates the `media` table. `PUBLIC_BASE_URL` must be the public HTTP(S) origin used to access this service. Uploaded files receive URLs under `/uploads/`.

## Run with Docker

Build from the repository root:

```powershell
docker build -t social-media-media-service ./media-service
docker volume create social-media-media-uploads
```

Run the container with MySQL on the Docker host (on Windows, `host.docker.internal` resolves to the host):

```powershell
docker run --rm --name media-service -p 8082:8082 `
  --env 'DATABASE_DSN=root:password@tcp(host.docker.internal:3306)/media_service?charset=utf8mb4&parseTime=True&loc=Local' `
  --env 'JWT_SECRET=replace-with-a-random-secret-of-at-least-32-bytes' `
  --env 'PUBLIC_BASE_URL=http://localhost:8082' `
  --mount 'type=volume,source=social-media-media-uploads,target=/uploads' `
  social-media-media-service
```

Set `DATABASE_DSN` to the actual MySQL address and credentials. If MySQL is another container, connect both containers to the same Docker network and use its container name as the DSN host. The upload volume persists images across container replacements. The container runs as UID `10001`; if using a host bind mount instead, make that directory writable by UID `10001`. Set `PUBLIC_BASE_URL` to the URL clients use to reach the service so returned media URLs remain valid.

## Authentication

Upload and delete require `Authorization: Bearer <JWT>`. The service verifies an HS256 signature using `JWT_SECRET`, requires a future `exp`, and reads the numeric user ID from `sub`. Set `JWT_ISSUER` and/or `JWT_AUDIENCE` to require matching `iss` and `aud` claims.

The current `user-service` does not issue JWTs; it expects a gateway to supply `X-User-ID`. A gateway or auth issuer must provide the JWT for Media Service. Media Service does not trust a client supplied `X-User-ID`.

## Endpoints

| Method | Endpoint | Auth | Request | Success |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/media/upload` | JWT | `multipart/form-data` with one or more `files` parts | `201` `{"data":[...]}` |
| `GET` | `/api/v1/media/:id` | Public | None | `200` `{"data":{...}}` |
| `DELETE` | `/api/v1/media/:id` | JWT owner | None | `204` |
| `GET` | `/uploads/:key` | Public | None | Image bytes |

Each metadata object contains `id`, `user_id`, `url`, original `filename`, byte `size`, `mime_type`, and `created_at`. A request accepts at most 10 images. Supported content types are JPEG, PNG, WebP, and GIF. The default size limit is 5 MiB per file. The service determines the format from file content and stores each file with a UUID and matching extension.

Example upload with two images:

```bash
curl -X POST http://localhost:8082/api/v1/media/upload \
  -H "Authorization: Bearer <JWT>" \
  -F "files=@photo-1.jpg" \
  -F "files=@photo-2.png"
```

`DELETE` soft deletes the metadata record. The file remains available at its URL so existing posts do not break. The metadata endpoint returns `404` after deletion. A later cleanup process can remove unreferenced files once post usage is tracked.

Errors return `{"error":"..."}` with `400` for malformed uploads or IDs, `401` for missing/invalid JWT, `403` for another user's media, `404` for missing media, `413` for an oversized file or request, and `500` for storage or database failures.
