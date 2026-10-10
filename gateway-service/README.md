# Gateway Service

## Run locally

From the `gateway-service` directory:

```powershell
go run ./cmd
```

`PORT` defaults to `8080`. Set `USER_SERVICE_URL` to the base URL of the
user-service, for example `http://localhost:8081` when running both services
locally.

## Run with Docker

From the `gateway-service` directory:

```powershell
docker build -t social-gateway-service .
docker run --rm -p 8080:8080 -e USER_SERVICE_URL=http://host.docker.internal:8081 social-gateway-service
```

The example assumes user-service runs on the host. If both services run on a
shared Docker network, set `USER_SERVICE_URL` to its container hostname and
port, such as `http://user-service:8081`.
