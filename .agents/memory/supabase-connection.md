---
name: Supabase connection
description: How to connect from Replit to Supabase — session pooler required, direct connection blocked.
---

Direct connection (`db.xxxx.supabase.co:5432`) times out from Replit — blocked by network.
Transaction pooler uses IPv6 by default — also blocked without the paid IPv4 add-on.
**Session pooler** (`aws-1-us-east-1.pooler.supabase.com:5432`) is IPv4-proxied for free and works.

Connection string stored as `SUPABASE_DATABASE_URL` (not `DATABASE_URL`, which is runtime-managed by Replit for the built-in Postgres).

DB client uses `ssl: { rejectUnauthorized: false }` to connect.
Drizzle config: `dbCredentials: { url: SUPABASE_DATABASE_URL, ssl: true }`.

**Why:** `DATABASE_URL` is a Replit runtime-managed key — cannot be overridden. A separate env var must be used for Supabase.
**How to apply:** Any new db config or connection code must prefer `SUPABASE_DATABASE_URL || DATABASE_URL`.
