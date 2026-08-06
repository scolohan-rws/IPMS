# IPMS

## 1. Overview

IPMS is an API deployed to AWS with SST. Requests arrive at API Gateway V2, are
served by TypeScript Lambdas in `src/lambdas/`, and reach a PostgreSQL database
on RDS through Drizzle ORM using IAM authentication.

Gateway routes:

| Method | Path | Auth | Lambda source |
| --- | --- | --- | --- |
| `GET` | `/health` | none | `src/lambdas/healthCheckLambda.ts` |
| `GET` | `/secured` | bearer token | `src/lambdas/securedLambda.ts` |
| `ANY` | `/tasks/{proxy+}` | bearer token | `src/lambdas/tasksCrudLambda.ts` |

Authorizers on API Gateway V2 are attached per route. `/health` declares no
authorizer and is therefore public by construction.

Successful `/health` response:

```json
{
  "status": "ok"
}
```

Successful `/secured` response:

```json
{
  "message": "Access granted!",
  "principalId": "user"
}
```

### 1.1 Tasks API

`ANY /tasks/{proxy+}` routes every `/tasks` request to a single Lambda, which
dispatches internally with the Powertools `Router`. Adding a task route does not
require an API Gateway change.

| Method | Path | Success | Response body |
| --- | --- | --- | --- |
| `POST` | `/tasks/create` | `201` | Created task |
| `GET` | `/tasks/all` | `200` | `{ items, limit, offset }` |
| `GET` | `/tasks/{id}` | `200` | Task |
| `PATCH` | `/tasks/{id}` | `200` | Updated task |
| `DELETE` | `/tasks/{id}` | `204` | Empty |

Task representation:

```json
{
  "id": 1,
  "title": "Write tests",
  "description": "cover the task handlers",
  "status": "todo",
  "priority": 3,
  "dueAt": "2026-09-01T00:00:00.000Z",
  "createdAt": "2026-08-01T00:00:00.000Z",
  "updatedAt": "2026-08-01T00:00:00.000Z"
}
```

Field rules, defined in `src/lib/schemas.ts`:

| Field | Rule |
| --- | --- |
| `title` | Required on create, trimmed, 1-255 characters |
| `description` | Optional, trimmed, up to 10 000 characters, nullable |
| `status` | `todo`, `in_progress`, `review`, or `done`; defaults to `todo` |
| `priority` | Integer 1-5; defaults to `3` |
| `dueAt` | Optional ISO 8601 timestamp, nullable |

`PATCH` accepts any subset of these fields and rejects an empty body. It never
injects the create-time defaults for fields the caller omitted.

`GET /tasks/all` accepts `status`, `limit` (1-100, default `20`), and `offset`
(minimum `0`, default `0`) as query parameters and echoes `limit` and `offset`
back in the response.

Error responses:

| Status | Body | Cause |
| --- | --- | --- |
| `400` | `{ "error": "Validation failed", "details": ... }` | Body or parameters failed schema validation |
| `400` | `{ "error": "Request body is not valid JSON" }` | Body could not be parsed |
| `404` | `{ "error": "Task <id> not found" }` | No row with that id |
| `404` | Router default | Path is not a registered task route |
| `500` | `{ "error": "Internal server error" }` | Unhandled failure; details stay in the logs |

### 1.2 Authentication

`/secured` and `/tasks/{proxy+}` are protected by a Lambda authorizer owned by the
`auth` repository. This stack does not define an authorizer function; it creates
its own `aws.apigatewayv2.Authorizer` pointing at the function published by
`auth`, plus an `aws.lambda.Permission` allowing this API to invoke it.

The function ARNs are read from SSM Parameter Store at deploy time:

| Parameter | Used for |
| --- | --- |
| `/ipms-auth/<stage>/authorizer/arn` | `aws.lambda.Permission` target |
| `/ipms-auth/<stage>/authorizer/invoke-arn` | `authorizerUri` |

Requests supply `Authorization: Bearer <token>`. The authorizer's context surfaces
at `event.requestContext.authorizer.lambda` as `{ principalId }`; the
type is duplicated in this repository and must stay in step with `auth`.

Consequences:

- `auth` must be deployed to a stage before this stack. A missing parameter fails
  the deploy.
- This stack must be removed before `auth`. There is no cross-stack dependency to
  enforce it, so removing `auth` first leaves protected routes failing at runtime
  only.
- Stages are coupled by name: `ipms` `dev` reads `auth` `dev`.
- Resolution is deploy-time, not runtime. If `auth` replaces the authorizer
  function, this stack must be redeployed.

Failure modes:

| Symptom | Cause |
| --- | --- |
| `401` on a protected route, no authorizer logs | `Authorization` header absent; it is an identity source, so API Gateway rejects before invoking. |
| `403` on a protected route | Authorizer denied. Simple-response authorizers cannot return `401`. |
| `500` on a protected route, `Lambda function ... is not authorized` in execution logs | Invoke permission missing or its `sourceArn` does not match the authorizer id. |
| Revoked token still accepted for a few minutes | 300-second authorizer result cache, keyed on the token string. |

### 1.3 Database access

Database-backed Lambdas are wrapped in `withDbAccess` (`infra/with-db-access.ts`),
which attaches the VPC configuration, the DB environment variables, and an
`rds-db:connect` IAM permission. Outside `sst dev` the function runs in the RDS
VPC; a dedicated Lambda security group is granted ingress to the RDS security
group on port 5432.

There is no stored database password. `src/db/index.ts` builds a `pg` pool whose
password callback signs a short-lived IAM auth token with `@aws-sdk/rds-signer`,
then wraps the pool with Drizzle.

Runtime environment variables:

| Variable | Purpose |
| --- | --- |
| `DB_HOST` | RDS endpoint |
| `DB_NAME` | Database name; defaults to `postgres` |
| `DB_USER` | IAM database user; defaults to `postgres` |
| `AWS_REGION` | Region for the IAM auth token signer |
| `POWERTOOLS_SERVICE_NAME`, `POWERTOOLS_LOG_LEVEL` | Set from `infra/logger.ts`; log level comes from the `LOG_LEVEL` deployment variable |

The Drizzle schema lives in `src/db/schema/`. `drizzle-kit` is available as a dev
dependency, but no migration configuration is committed, so schema changes must
be applied to the database outside this repository.

## 2. Project structure

```text
constants/     Deploy-time constants used by sst.config.ts and infra/
infra/         SST resource definitions (API Gateway, Lambdas, VPC, DB access)
src/
  constants/   Runtime constants
  data/        Data access functions; each takes a Drizzle executor
  db/          Pool, Drizzle instance, and schema/
  handlers/    HTTP handlers and route tables: validate, call a use case, respond
  lambdas/     Lambda entry points, named <name>Lambda.ts
  lib/         Shared HTTP helpers, domain errors, zod schemas, and the logger
  services/    Use cases; the only place business rules live
tests/         Vitest specs mirroring src/, plus helpers/fixtures.ts
```

Runtime code lives under `src/` and is the only thing `tsconfig.json` compiles.
`infra/` and `constants/` are evaluated by SST, not by `tsc`.

### 2.1 Layering and dependency injection

```text
lambda entry point -> handler -> service -> data access -> database
```

Dependencies are passed inward, never imported inward:

- The **Lambda entry point** is the composition root and the only module allowed
  to import `src/db/index.ts`. It builds the service, hands it to the router
  factory at module scope (so the pool is still reused across warm invocations),
  and adds request logging.
- **`createTasksRouter(service)`** in `src/handlers/tasks.ts` owns the route
  table. It lives beside the handlers rather than in the Lambda file so routing
  can be exercised without constructing a database connection.
- **Handlers** receive a `TaskService`, validate input against a zod schema, call
  one use case, and shape the response. They hold no SQL and no business rules.
- **`createTaskService(executor)`** in `src/services/tasks.ts` holds the use
  cases. Passing the executor in means the same use cases can run against `db`
  or against a transaction handle from `db.transaction(...)`.
- **Data functions** in `src/data/` take that executor as their first argument
  and contain only queries.

Services signal failures with domain errors from `src/lib/errors.ts`, such as
`NotFoundError`. They never build HTTP responses; `withErrors` in
`src/lib/http.ts` is the single place that maps an error to a status code.

## 3. Local development

Requirements:

- Node.js 24
- npm

Install dependencies and validate the project:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
```

Additional commands:

```bash
npm run build
npm run dev
```

### 3.1 Formatting and linting

Biome formats TypeScript, JavaScript, and JSON files with two-space indentation
and checks them for lint problems. Diagnostics include the exact file, line, and
rule. Generated files, including `.sst` and `sst-env.d.ts`, are excluded, as is
anything matched by `.gitignore`.

```bash
npm run check          # Check formatting and lint
npm run format         # Format the project
npm run format:check   # Check formatting without changing files
npm run lint           # Lint the project
npm run lint:fix       # Apply safe lint fixes
```

Before each commit, Husky formats and lints staged files. Formatting changes are
added to the commit automatically. Lint errors block the commit; warnings remain
visible for review. To skip the checks once, use:

```bash
SKIP_LINT=1 git commit -m "message"
```

In PowerShell:

```powershell
$env:SKIP_LINT="1"; git commit -m "message"; Remove-Item Env:SKIP_LINT
```

### 3.2 Tests

Tests run on Vitest, configured in `vitest.config.ts`: the Node environment,
`tests/**/*.test.ts`, and `POWERTOOLS_LOG_LEVEL=SILENT` so Powertools output does
not pollute the test log.

```bash
npm test               # Single run, as CI executes it
npx vitest             # Watch mode
npx vitest run --coverage
```

Specs mirror the source tree: `tests/handlers/tasks.test.ts` covers
`src/handlers/tasks.ts`, `tests/services/tasks.test.ts` covers the use cases.
Shared event, context, service, and row factories live in
`tests/helpers/fixtures.ts`.

Tests never touch AWS or a database, and the injection seams are what makes that
cheap:

- **Handler specs** build a stub service with `makeTaskService()` and pass it to
  `createTaskHandlers`. They assert the arguments the use case received and the
  status code and body returned, including the mapping from `NotFoundError` to
  `404`. Routing is covered in the same file through `createTasksRouter`, which
  resolves a full API Gateway V2 event.
- **Service specs** pass `fakeExecutor` to `createTaskService` and mock the data
  layer, which imports only the Drizzle schema and so pulls in no connection.

No spec mocks `src/db/index.ts`, because no module below the Lambda entry point
imports it.

## 4. Environments

| Environment | Purpose | GitHub release type | SST stage |
| --- | --- | --- | --- |
| `dev` | Integration and acceptance testing | Prerelease | `dev` |
| `prod` | Production | Regular release | `prod` |

Create `dev` and `prod` GitHub environments with these environment secrets:

- `AWS_ACCESS_ROLE`: full ARN of the AWS deployment role
- `AWS_REGION`: AWS deployment region, such as `eu-west-2`
- `ACCOUNT_ID`: AWS account id
- `RDS_DB_ID`: RDS DB Id
- `DB_VPC_ID`: RDS VPC
- `RDS_SG_ID`: RDS Security Group Id
- `DB_HOST`: RDS DB host address
- `DB_NAME`: RDS DB name
- `DB_USER`: RDS username
- `DB_PORT`: DB PORT
- `LOG_LEVEL`: Powertools log level, such as `INFO`; defaults to `INFO`

The configured role must trust the repository's GitHub OIDC identity for the
matching environment. Long-lived AWS access keys must not be stored in GitHub.

Production deployments require approval from an authorized reviewer other than
the deployment initiator.

## 5. Resource naming

AWS resource names follow:

```text
<application>-<stage>-<resource>
```

Examples:

```text
ipms-dev-api
ipms-prod-api
ipms-dev-health
ipms-prod-health
```

## 6. Repository workflow

### 6.1 Branches

`main` is the only long-lived branch. Direct pushes and force pushes to `main`
are prohibited.

Branch format:

```text
<type>/<issue>-<short-description>
```

Allowed types:

| Type | Purpose |
| --- | --- |
| `feat` | New functionality |
| `fix` | Defect correction |
| `hotfix` | Urgent production correction |
| `refactor` | Internal code change |
| `test` | Test changes |
| `docs` | Documentation |
| `chore` | Maintenance or dependency changes |
| `ci` | CI/CD changes |

Example: `feat/ipms-123-user-search`.

### 6.2 Pull requests

Every change to `main` must use a pull request. A pull request must:

- Reference an issue or incident.
- Describe the change and verification steps.
- Include applicable tests and documentation.
- Pass all required status checks.
- Resolve all review conversations.
- Receive approval after the latest material change.

Use squash merging and delete the source branch after merge. Authors cannot
approve their own pull requests.

### 6.3 Required GitHub rules

The `main` ruleset must:

- Require pull requests.
- Require two approvals; one approval is acceptable only when the maintainer
  team has fewer than three members.
- Dismiss stale approvals after new changes.
- Require approval after the latest push.
- Require passing, up-to-date status checks.
- Block force pushes and branch deletion.

Required PR checks:

```text
npm ci
npm run check
npm run typecheck
npm test
```

Formatting, lint, typecheck, and tests run automatically for every non-draft
pull request in `.github/workflows/pr-validation.yml`.

## 7. Versioning

Development releases use:

```text
<major>.<minor>.<patch>-dev.<iteration>
```

| Version | Meaning |
| --- | --- |
| `0.1.0-dev.1` | First development candidate for `0.1.0` |
| `0.1.0-dev.2` | Second candidate for the same release |
| `0.1.0` | Production release |
| `0.1.1-dev.1` | First candidate for the next patch release |
| `0.2.0-dev.1` | First candidate for the next feature release |

Increment `dev.N` when testing another commit for the same production version.
Reset it to `dev.1` when the production version changes.

```text
0.1.0-dev.1 -> 0.1.0-dev.2 -> 0.1.0
0.1.0       -> 0.1.1-dev.1 -> 0.1.1
0.1.1       -> 0.2.0-dev.1 -> 0.2.0
```

Before `1.0.0`:

- Increment `PATCH` for backward-compatible fixes.
- Increment `MINOR` for features or breaking changes.

From `1.0.0`, follow Semantic Versioning:

- `PATCH` for backward-compatible fixes.
- `MINOR` for backward-compatible features.
- `MAJOR` for breaking changes.

Tags are immutable and must reference commits reachable from `main`.

## 8. Deployment procedure

### 8.1 Deploy to `dev`

1. Merge the approved change into `main`.
2. Confirm all checks passed.
3. Create a tag such as `v0.1.0-dev.1` on the verified commit.
4. Create a GitHub release and select **Set as a pre-release**.
5. Publish the release.
6. Verify the workflow, AWS account, health endpoint, logs, and alarms.

The workflow executes:

```bash
npx sst deploy --stage dev
```

The GitHub prerelease option determines the target environment. The `-dev.N`
suffix alone does not select `dev`.

If corrections are required, merge them through a new pull request and publish
the next candidate, for example `v0.1.0-dev.2`. Do not reuse an existing tag.

### 8.2 Deploy to `prod`

1. Select the commit successfully verified in `dev`.
2. Create the production tag, for example `v0.1.0`, on that exact commit.
3. Create a regular GitHub release. Do not select **Set as a pre-release**.
4. Publish the release.
5. Obtain approval from the `prod` environment reviewer.
6. Verify the deployed version, health endpoint, logs, metrics, and alarms.

The workflow executes:

```bash
npx sst deploy --stage prod
```

If the commit changes after `dev` verification, publish and verify a new
development candidate before deploying to production.

## 9. Security requirements

- Use separate AWS accounts or strictly separated IAM roles for `dev` and
  `prod`.
- Restrict OIDC trust policies to this repository and the matching environment.
- Apply least privilege to deployment roles.
- Authenticate to the database with IAM tokens only; never store a database
  password in code, SSM, or GitHub.
- Do not expose credentials or sensitive data in source code or workflow logs.

## 10. Rollback and hotfixes

Published tags must not be changed.

If production verification fails:

1. Stop further releases.
2. Revert the change through a reviewed pull request.
3. Deploy and verify the revert in `dev`.
4. Publish a new production patch release.

The current workflow has no dedicated rollback trigger.

Hotfixes must branch from the latest production commit and follow the normal
review, testing, `dev`, and production approval process. Any emergency bypass
must reference an incident and receive production-owner approval.
