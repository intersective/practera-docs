# Platform Environment Variables

This page describes every environment variable that flows through the Practera platform, how it is injected in each environment, and the checklist to follow when adding a new variable.

## Canonical names

Use these names for shared configuration. Readers still accept the previous name when the canonical one is unset, so an existing deploy keeps working until its env file is updated.

| Setting | Canonical name | Previous names still read |
|---------|----------------|---------------------------|
| Postgres database name | `DB_NAME` | `DB_DATABASE` |
| Postgres host, port, user, password | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` | `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` on the test dashboard only |
| Login RSA public key (PEM or base64) | `LOGIN_PUBLIC_KEY` | `JWT_PUBLIC_KEY` (Project Hub), `LOGIN_JWTPUB`, JSON `{"public":"..."}` in `LOGIN_JWT`. `PRACTERA_JWT` is that same JSON; sandbox copies it into `LOGIN_JWT` |
| Login RSA private key | `LOGIN_PRIVATE_KEY` | |
| GraphQL service-token signing key | `JWT_PRIVATE` | Loaded from Secrets Manager `JwtSecret` outside local |
| Full Postgres URL (Project Hub, Drizzle, agent) | `DATABASE_URL` | Built from `DB_*` when a service does not take a URL |

`POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` stay on the Postgres container. Those names belong to the database image. Application services use `DB_*`.

`LOGIN_PRIVATE_KEY` and `JWT_PRIVATE` are different RSA private keys. The login key signs login tokens. The GraphQL key signs platform `apikey` tokens and service calls. `LOGIN_PUBLIC_KEY` verifies login tokens only. `PRACTERA_JWT` is the public half of `JWT_PRIVATE`.

---

## How env vars are injected

```
Local dev
  └─ practera-devops-center stack/env-templates/ → envvars/core.app.env → Docker Compose

Stage / Sandbox / Pre-release  (GHA: p2-stage.yml, p2-sandbox.yml, p2-prerelease.yml)
  └─ Heredoc in GHA workflow → envvars/core.env
       ├─ tee → envvars/core.app.env, core.api.env, core.queue.env
       └─ aws s3 sync → s3://{STACK_NAME}-core-admin-envvars-{ENV}/
            └─ ECS task EnvironmentFiles: → env-init.sh → php-fpm www.conf

Live (GHA: p2-aus.yml, p2-usa.yml, p2-euk.yml)
  └─ "Sync service URL env vars to S3" step
       ├─ Pulls existing env files from S3
       ├─ Appends current computed service URLs (last-value-wins)
       └─ aws s3 sync back to S3
  NOTE: Secrets are NOT rotated on live deploys. They stay as set during initial infra provisioning.
  To rotate a secret, update it in AWS Secrets Manager and re-run the stage workflow to sync.

GraphQL API (GHA: p2-*-graphql.yml / serverless)
  └─ .env file written by GHA before `serverless deploy`
       └─ loaded by dotenv.config() at Lambda cold start

Cutie (coordinator Angular app)
  └─ Build-time Angular environment via CUSTOM_GEAPHQLENDPOINT in GHA `cutie` action
```

---

## `practera-admin` env variables

### Core service URLs

These are **computed from `PUBLICZONENAME`** and are refreshed on every deploy (all environments).

| Variable | Local dev value | AWS value pattern | Notes |
|----------|----------------|-------------------|-------|
| `PRACTERA_DOMAIN` | `local.practera.com:8080` | `admin.{PUBLICZONENAME}` | |
| `PRACTERA_APP_DOMAIN` | `app.local.practera.com` | `app.{PUBLICZONENAME}` | |
| `PRACTERA_URL` | `http://local.practera.com:8080` | `https://admin.{PUBLICZONENAME}` | |
| `PRACTERA_GRAPHQL_URL` | `https://graphql.practera.local` | `https://core-graphql-api.{PUBLICZONENAME}` | **Used by designer JS (`window.graphqlUrl`)** — must be accessible from the browser |
| `PRACTERA_REDIS_HOST` | `practera-redis` | `redis.internal.{PUBLICZONENAME}` | |
| `PRACTERA_DB_HOST` | `practera-postgres` | `db.internal.{PUBLICZONENAME}` | |
| `MESSAGING_URL` | `https://p8u...amazonaws.com/notify/` | `https://messaging-api.{PUBLICZONENAME}` | |
| `PRACTERA_S3FILEMANAGER` | `develop.practera.com` | `files.{PUBLICZONENAME}` | |
| `PRACTERA_CERT_FUNC_NAME` | (unused locally) | `{STACK_NAME}-certification-ds-{ENV}-ds-certification` | |
| `PRACTERA_GLOBAL_LOGIN_URL` | (unused locally) | `https://app.login.practera.com` | |
| `PRACTERA_GLOBAL_LOGIN_API_URL` | (unused locally) | `https://api.login.practera.com` | |
| `PRACTERA_LTI_API` | `lti-api-stage.practera.com` | `lti-api.practera.com` | |
| `PRACTERA_LTI_APP` | `lti-app-stage.practera.com` | `lti-app.practera.com` | |

### Feature flags

These toggle application behaviour and are **not environment variables** — they are set in
`Config/config_practera.php` or override-able in `Config/local.php` for local dev.

| Flag | Type | Where to change |
|------|------|-----------------|
| `Practera.dev_login` | PHP config | `PRACTERA_DEV_LOGIN` env var → `config_practera.php` |
| `Practera.skip_global_login` | PHP config | `PRACTERA_SKIP_GLOBAL_LOGIN` env var |
| `Practera.skip_mfa` | PHP config | `PRACTERA_SKIP_MFA` env var |

### Institution feature flags (database, not env vars)

These are stored in the `config` JSON column of the `core_institutions` table. They are **not
environment variables** and do not appear in any deployment pipeline.

| Flag | Default | How to enable |
|------|---------|---------------|
| `todo_tasks_enabled` | `false` | Admin → Institutions → Edit → Advanced → "Team Todo Tasks" checkbox |

---

## `practera-graphql-api` env variables

The GraphQL API is a Lambda function deployed via Serverless Framework. The `.env` file is
created by the GHA workflow step **"Serverless environment variables creation .env file"** and
packaged into the Lambda ZIP before deploy.

| Variable | Source | Notes |
|----------|--------|-------|
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Computed + `CoreDBSecret` SM | `DB_DATABASE` is the previous name for `DB_NAME` |
| `REDIS_HOST` / `REDIS_PORT` | Computed | |
| `PRACTERA_DOMAIN` | Computed | Used for file URL formatting |
| `LOGIN_PUBLIC_KEY` | `JwtPubSecret` SM (`.public`) | `JWT_PUBLIC_KEY`, `LOGIN_JWTPUB`, `LOGIN_JWT`, and `PRACTERA_JWT` are previous names for the same public key |
| `CLOUDFRONT_PRIVATE_KEY` | GitHub Actions secret | |

> **Note:** `PRACTERA_GRAPHQL_URL` is **not used** by the GraphQL API itself — it *is* the
> GraphQL endpoint. The variable is only relevant in `practera-admin` (PHP server-side) and the
> designer JavaScript frontend.

---

## Checklist: adding a new env variable

When you add a new env variable to any service, follow these steps:

### For `practera-admin`

- [ ] Add the var to `Config/config_practera.php` with `getenv('MY_VAR') ?: 'default'`
- [ ] Add the var to **`envvars/core.app.env`** (base template, empty or local default)
- [ ] If it is a **computed service URL**: add it to the heredoc in `p2-stage.yml` → `p2-sandbox.yml` → `p2-prerelease.yml`, **and** to the `service-urls.env` snippet in the three live workflows (`p2-aus.yml`, `p2-usa.yml`, `p2-euk.yml`)
- [ ] If it is a **secret**: add it to AWS Secrets Manager for each environment, then add the `aws secretsmanager get-secret-value` line to `p2-stage.yml` (and the sandbox/prerelease equivalents). For live environments, add it to Secrets Manager in each account and add the retrieval line to `p2-aus.yml` / `p2-usa.yml` / `p2-euk.yml`
- [ ] Update `practera-devops-center/stack/env-templates/practera-local-setup.env` with the local dev value so new developer setups get it automatically

### For `practera-graphql-api`

- [ ] Add the var to `.env.example`
- [ ] Add the var to the `.env` creation step in ALL workflows (`p2-sandbox.yml`, `p2-stage.yml`, `p2-prerelease.yml`, `p2-aus.yml`, `p2-usa.yml`, `p2-euk.yml`)
- [ ] If it comes from AWS Secrets Manager, confirm the secret exists in every region's AWS account

---

## Where env files live in AWS

| Environment | S3 bucket | ECS task definition reference |
|------------|-----------|-------------------------------|
| Stage | `p2-stage-core-admin-envvars-live` | `EnvironmentFiles` → `core.app.env` |
| AUS live | `p2-aus-core-admin-envvars-live` | `EnvironmentFiles` → `core.app.env` |
| USA live | `p2-usa-core-admin-envvars-live` | `EnvironmentFiles` → `core.app.env` |
| EUK live | `p2-euk-core-admin-envvars-live` | `EnvironmentFiles` → `core.app.env` |

CloudFormation template: `infra/cfn-templates/ecs-fargate-service-app.yml`

---

## Known gaps

| Gap | Status | Mitigation |
|-----|--------|------------|
| Live deploys historically did not refresh service URL env vars | **Fixed in v2.5.2** — `p2-aus/usa/euk.yml` now syncs computed service URLs to S3 on every deploy | |
| Full secrets rotation on live requires a manual Secrets Manager update + re-deploy | Accepted — live secrets are long-lived by design | Update SM secret, then trigger a live deploy |
| GraphQL API sandbox workflow has newer vars (`LOGIN_API_URL`, `JWT_ISSUER`) not yet in stage/live | Backlog | Port sandbox `.env` creation to all other workflows |
| `envvars/core.app.env` base template previously had a hard-coded `graphql.practera.local` URL | **Fixed in v2.5.2** — now empty; value is set per-environment in GHA | |
