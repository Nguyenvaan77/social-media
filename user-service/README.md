# User Service

REST API for accounts, profiles, and follow relationships. All routes use the `/api/v1` prefix and return JSON.

## Run locally

Create the MySQL database `user_service`, then run:

```powershell
cd user-service
go run .
```

The service loads `user-service/.env` when started from this directory. An existing
`DATABASE_DSN` environment variable takes precedence over the file. `PORT` is
optional and defaults to `8081`.

Startup migrates the `User` and `Follow` tables. Existing `passwordhash` columns and session tables are left in place for database compatibility, but the service does not use them. New users have an empty password hash.

## Identity contract

This service does not authenticate requests or issue tokens. Routes acting on the current user require a positive integer `X-User-ID` header. The service trusts that value as the user identity. A missing or invalid value returns `400`; an ID absent from the user table returns `404` where the route loads that user.

When an API gateway is added, it must authenticate external requests, remove any client supplied `X-User-ID`, and set the header from the authenticated identity. Until then, keep the service on a trusted internal network. For local calls, supply the header yourself.

## Endpoints

| Method | Endpoint | Identity | Request | Success response |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/users` | None | `{"email":"...","full_name":"..."}` (`full_name` optional) | `201` `{"data": {...}}` |
| `GET` | `/api/v1/users` | None | No body | `200` `{"data": [...]}` |
| `GET` | `/api/v1/users/me` | `X-User-ID` | No body | `200` `{"data": {...}}` |
| `PATCH` | `/api/v1/users/me` | `X-User-ID` | `full_name` and/or `email` | `200` `{"data": {...}}` |
| `GET` | `/api/v1/users/:id` | None | No body | `200` `{"data": {...}}` |
| `POST` | `/api/v1/users/:id/follow` | `X-User-ID` | No body | `200` `{"data":{"following":true}}` |
| `DELETE` | `/api/v1/users/:id/follow` | `X-User-ID` | No body | `200` `{"data":{"following":false}}` |
| `GET` | `/api/v1/users/:id/followers` | None | Optional `limit`, `offset` | `200` `{"data":[...],"limit":20,"offset":0}` |
| `GET` | `/api/v1/users/:id/following` | None | Optional `limit`, `offset` | `200` `{"data":[...],"limit":20,"offset":0}` |
| `GET` | `/api/v1/follows/status` | None | `follower_id`, `followee_id` | `200` `{"data":{"following":true}}` or `{"data":{"following":false}}` |

User creation normalizes the email address and uses its local part as the default full name. The public profile omits email; `/users/me` includes it. Follow lists contain public user objects. `limit` defaults to `20` and has a maximum of `100`; `offset` defaults to `0`.

The former `/api/v1/auth/*` routes have been removed. Common errors are `400` for invalid input or identity header, `404` for an unknown user, and `409` for an email already in use.
