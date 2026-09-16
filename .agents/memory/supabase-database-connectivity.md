---
name: Supabase database connectivity
description: Connection constraints for using Supabase PostgreSQL as BLASTERR's primary database from Replit.
---

Use a Supabase Session Pooler PostgreSQL URI with an IPv4-compatible `*.pooler.supabase.com` host, the exact project-specific pooler username from Supabase's Connect dialog, and the real database password. Do not use the Supabase project HTTPS URL or the direct `db.<project-ref>.supabase.co` host.

**Why:** The direct database host resolved only to IPv6 from this Replit environment, which could not open that connection. Repeated secret submissions retained the project HTTPS URL instead of a PostgreSQL URI, and a pooler URI with incorrect credentials reached Supabase but failed authentication.

**How to apply:** Before any dump restore or database switch, verify that the configured value begins with `postgresql://` or `postgres://`, uses a pooler host, and passes a read-only connection test. Apply project migrations through the configured Supabase/Drizzle connection; Replit's generic database SQL tools may target a separate built-in database. Keep the existing database fallback active until import and row-count verification succeed.