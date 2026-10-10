FROM golang:1.26-alpine3.23 AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/media-service ./cmd

FROM alpine:3.23

RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S -g 10001 app \
    && adduser -S -D -H -u 10001 -G app app \
    && mkdir -p /uploads \
    && chown app:app /uploads

WORKDIR /app
COPY --from=build /out/media-service ./media-service

ENV PORT=8082 \
    UPLOAD_DIR=/uploads

USER app
CMD ["/app/media-service"]
