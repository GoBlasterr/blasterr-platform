---
name: Supabase database connectivity
description: Connection constraints for using Supabase PostgreSQL as BLASTERR's primary database from Replit.
---

Use a Supabase Session Pooler PostgreSQL URI with an IPv4-compatible `*.pooler.supabase.com` host. Do not use the Supabase project HTTPS URL or the direct `db.<project-ref>.supabase.co` host.

**Why:** The direct database host resolved only to IPv6 from this Replit environment, which could not open that connection. Repeated secret submissions also retained the project HTTPS URL instead of a PostgreSQL URI.

**How to apply:** Before any dump restore or database switch, verify that the configured value begins with `postgresql://` or `postgres://`, uses a pooler host, and passes a read-only connection test. Keep the existing database fallback active until import and row-count verification succeed.