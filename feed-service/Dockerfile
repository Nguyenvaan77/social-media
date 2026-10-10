FROM golang:1.26-alpine3.23 AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/feed-service ./cmd

FROM alpine:3.23
RUN apk add --no-cache ca-certificates
COPY --from=build /out/feed-service /usr/local/bin/feed-service
USER 65532:65532
ENTRYPOINT ["/usr/local/bin/feed-service"]
