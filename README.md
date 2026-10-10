# social-media

## Build service images

Each Go service has its own multi-stage Dockerfile. On Windows, build all five images from the repository root:

```powershell
.\scripts\build-services.ps1
```

The images are tagged `social-media/<service-name>:local`. Pass `-Tag v1` to use another tag or `-Services user-service,post-service` to build a subset. Each service's README lists its runtime environment variables. The Docker builds exclude local `.env` files; supply configuration when starting the containers.

## Run all services with Docker Compose

The Compose stack builds and runs User, Post, Media, Feed, and Gateway Service on the `social-media-net` bridge network. MySQL stores User and Media Service data. MongoDB stores Post Service documents in the `post_service` database. Both databases and uploaded files use named volumes. The containers do not use databases already running on your host.

The root `.env` is local and ignored by Git. This workspace has one configured already. In a new checkout, copy [.env.example](.env.example) to `.env`, then set `MYSQL_ROOT_PASSWORD` and a random `MEDIA_JWT_SECRET` of at least 32 bytes. Start the stack with:

```powershell
docker compose up --build -d
docker compose ps
```

Gateway is reachable on host port `8080`. MongoDB is reachable on `127.0.0.1:27017`, including from a local `mongosh` installation. User, Media, Feed, Post, and MySQL are accessible only inside the Compose network. Containers call each other by service name, for example `http://post-service:8080` and `mongodb://mongo:27017`. To stop the stack while retaining data volumes, run `docker compose down`.

The new MongoDB collection does not import existing MySQL posts. Migrate any posts you need to keep before retiring the old database.
