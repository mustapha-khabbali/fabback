# ID Strategy

All application record IDs are owned by the API.

## New Records

The API generates UUID primary keys in PostgreSQL with `gen_random_uuid()`.
Clients must not create durable IDs with `Date.now()`, `Math.random()`, or
`crypto.randomUUID()` for records that are saved to the backend.

## Seeded System Users

These system users keep stable seeded IDs so existing app behavior can be mapped
without breaking references:

- `user-sara` - Sara Ladouy
- `admin-resp-entrepreneuriat` - Responsable Entrepreneuriat
- `admin-resp-incubateur` - Responsable Incubateur

## Frontend Migration Rule

During steps 3-6, client-created temporary IDs must be replaced with IDs returned
by the API response after create operations succeed.
