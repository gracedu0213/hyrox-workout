# Supabase — environments & runbook

Three environments, one set of migrations. The `supabase/migrations/` files are the
single source of truth and are **environment-agnostic** — they apply identically to
local, staging, and production. Only *config* (auth URLs, provider secrets) differs
per environment.

| Env | What it is | When it changes |
| --- | --- | --- |
| **local** | `supabase start` (Docker) on your machine | every dev iteration |
| **staging** (sandbox) | hosted project **"The Hyrox App"** (`bhnkoxqhgfoeowwqryra`, West US) — validate here first | before prod |
| **production** | a dedicated hosted project — **created at launch** (not yet provisioned) | after staging passes |

**Golden rule:** migrations flow **local → staging → production**. Never push an
untested migration straight to prod.

## Daily local loop
```bash
supabase start          # boot stack + apply all migrations
supabase test db        # run pgTAP tests (supabase/tests/*.sql)
supabase migration new <name>   # scaffold a new migration
supabase stop           # tear down (data is retained in a docker volume)
```

## Applying migrations to a hosted env
```bash
# Link to the target project first (switches which remote you act on):
supabase link --project-ref <ref>

# Preview, then apply. Password comes from env (never commit it):
export SUPABASE_DB_PASSWORD='…'          # or pass -p '…'
supabase db push --linked --dry-run
supabase db push --linked
```
Troubleshooting a **connection timeout**: the direct DB host is IPv6-only on newer
projects. If your network lacks IPv6, either add `--dns-resolver https`, or push via
the IPv4 pooler: `supabase db push --db-url "$SESSION_POOLER_URL"` (copy the session
pooler connection string from Dashboard → Connect). Forgot the password? Reset it in
Dashboard → Settings → Database.

## Config across environments
`config.toml` holds the **base** (local) config. Per-env overrides go in `[remotes.*]`
blocks, matched to the linked project by `project_id`, and applied with
`supabase config push`. Add these once the **staging** project exists:

```toml
[remotes.staging]
project_id = "bhnkoxqhgfoeowwqryra"   # "The Hyrox App"
[remotes.staging.auth]
site_url = "https://<staging-web-domain>"
additional_redirect_urls = ["https://<staging-web-domain>", "com.gracedu.hyrox://login-callback"]

[remotes.production]
project_id = "<prod-ref — created at launch>"
[remotes.production.auth]
site_url = "https://<prod-web-domain>"
additional_redirect_urls = ["https://<prod-web-domain>", "com.gracedu.hyrox://login-callback"]
```

## Secrets (never committed)
Set these in your shell / CI, and in each hosted project's dashboard. `config.toml`
references them via `env(...)` substitution.

| Var | Used for |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | CLI auth to the management API |
| `SUPABASE_DB_PASSWORD` | `db push` to a hosted project |
| `SUPABASE_AUTH_EXTERNAL_APPLE_CLIENT_ID` | Sign in with Apple (bundle id + Services ID, comma-separated) |
| `SUPABASE_AUTH_EXTERNAL_APPLE_SECRET` | Sign in with Apple (JWT from the Apple signing key) |

`supabase/.env`, `.env.local`, and `.env.*.local` are gitignored — safe for local secrets.

## Standing up the production project (at launch)
Staging already exists ("The Hyrox App"). Create prod when launching:
```bash
supabase projects create "Hyrox" \
  --org-id fobuompnhqdejbahclrv --region us-west-1
# then: supabase link --project-ref <new-ref> && supabase db push --linked
# then wire [remotes.production] above and `supabase config push`.
```
Free tier allows 2 projects per org (staging = 1, prod = 2). Or create it via the
dashboard — same result.
