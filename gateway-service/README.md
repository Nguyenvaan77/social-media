# Gateway Service

## Run locally

From the `gateway-service` directory:

```powershell
cd cmd/run
go run .
```

The service loads `gateway-service/.env` automatically, including when started
from `cmd/run`. Variables already set in the process take precedence.

`PORT` defaults to `8080`. Set `USER_SERVICE_URL` to the base URL of the
user-service, for example `http://localhost:8081` when running both services
locally. Set `AUTH_SERVICE_URL` to the base URL of auth-service; it defaults to
`http://localhost:8083` for local development. Login and registration are
forwarded to auth-service without changing its response. Set `JWT_SECRET`,
`JWT_ISSUER`, and `JWT_AUDIENCE` to the same values as auth-service when using
protected routes.

## Run with Docker

From the `gateway-service` directory:

```powershell
docker build -t social-gateway-service .
docker run --rm -p 8080:8080 -e USER_SERVICE_URL=http://host.docker.internal:8081 -e AUTH_SERVICE_URL=http://host.docker.internal:8083 -e JWT_SECRET social-gateway-service
```

The example assumes user-service runs on the host. If both services run on a
shared Docker network, set `USER_SERVICE_URL` to its container hostname and
port, such as `http://user-service:8081`.
