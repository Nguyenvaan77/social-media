# Auth Service RBAC

`auth-service` owns its `users` table in the separate MySQL `auth_service` database. Each user stores an email, full name, password hash, account status, optional email verification and last login timestamps, and RBAC roles. Other profile and bio data belong to `user-service`; the two services do not synchronize their user records automatically.

Tables: `users`, `roles`, `user_role`, `permissions`, and `role_permission`. Both join tables use composite primary keys and foreign keys. A user can have many roles, and a permission can belong to many roles.

For local development, create the `auth_service` database first. The server automatically loads `auth-service/.env` when started from the repository root, `auth-service`, or `auth-service/cmd`; variables already set in the process take precedence. Set `DATABASE_DSN` for that database, `JWT_SECRET` (at least 32 characters), `JWT_ISSUER`, `JWT_AUDIENCE`, and `JWT_EXPIRATION` (a Go duration) in that file or in the shell. `JWT_REFRESH_EXPIRATION` defaults to `168h` and must be longer than `JWT_EXPIRATION`. `PORT` defaults to `8085`. To set the values in PowerShell instead of using `.env`:

```powershell
$env:DATABASE_DSN = 'root:password@tcp(localhost:3306)/auth_service?charset=utf8mb4&parseTime=True&loc=Local'
$env:JWT_SECRET = 'your-random-secret-with-at-least-32-characters'
$env:JWT_ISSUER = 'auth-service'
$env:JWT_AUDIENCE = 'social-media'
$env:JWT_EXPIRATION = '15m'
$env:JWT_REFRESH_EXPIRATION = '168h'
go run ./cmd
```

Run the seed command only when you want to populate or reconcile the RBAC data. Set three passwords with at least 12 characters each:

```powershell
$env:AUTH_SEED_USER_PASSWORD = 'your-user-password'
$env:AUTH_SEED_ADMIN_PASSWORD = 'your-admin-password'
$env:AUTH_SEED_ADMIN_GROUP_PASSWORD = 'your-admin-group-password'
go run ./cmd seed
```

Seeding creates the roles `user`, `admin`, and `admin-group`, eight permissions, and three login accounts:

| Email | Role |
| --- | --- |
| `user@social-media.test` | `user` |
| `admin@social-media.test` | `admin` |
| `admin-group@social-media.test` | `admin-group` |

Permissions use names such as `post.create` and `user.read`:

| Role | Post | User |
| --- | --- | --- |
| `user` | create, read, update, delete | create, read, update |
| `admin` | delete | read, delete |
| `admin-group` | create, read, update, delete | none |

Seeding is safe to repeat. Existing account passwords and additional role grants are preserved. A previous `group_admin` role is renamed to `admin-group` without losing its assignments. `admin-group` does not yet identify which group a user administers.

`POST /api/v1/auth/register` accepts `{"email":"...","password":"...","full_name":"..."}` and returns `201` with the new account in `data` (without its password hash). If `full_name` is empty, the part of the email before `@` is used. A duplicate email returns `400` with `{"msg":"email already registered"}`. Registration assigns the already seeded `user` role, sets status to `enable`, and records the email verification time immediately. The required role must exist in the database before registration; the request never creates role records. It creates an auth account only.

`POST /api/v1/auth/login` accepts `{"email":"...","password":"..."}` and returns `access_token`, `refresh_token`, and `user_id`, plus `token_type` (`Bearer`) and `expires_in` (access token seconds). The access token uses the configured issuer, audience, and lifetime. The refresh token uses a separate derived signing key and its own lifetime. Protected routes accept only access tokens. There is no refresh endpoint yet. Login accepts newly registered `enable` accounts and existing `active` accounts. Docker Compose exposes auth-service on `127.0.0.1:8083`. Copy the root `.env.example` to `.env` and set `MYSQL_ROOT_PASSWORD` and `AUTH_JWT_SECRET` for normal startup. The three `AUTH_SEED_*_PASSWORD` values are used only by the on-demand `auth-seed` service:

```powershell
docker compose up -d auth-service
docker compose run --rm --build auth-seed
```

Set all three seed passwords in the root `.env` before running the second command. `auth-seed` is behind the `seed` Compose profile, so ordinary `docker compose up` does not run it. The seed container uses the same auth-service image and waits for `auth-db-init` to create the database.

The root Docker Compose stack creates the `auth_service` database on both fresh and existing MySQL volumes. When running without Compose, create the database first:

```sql
CREATE DATABASE IF NOT EXISTS auth_service CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
