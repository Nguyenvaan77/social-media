FROM golang:1.26-alpine3.23 AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/run ./cmd

FROM alpine:3.23
WORKDIR /app
COPY --from=builder /out/run /app/run
ENTRYPOINT ["/app/run"]
