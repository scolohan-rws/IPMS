# Repository instructions
These rules apply to the entire repository.

## Maintaining this file

- Keep `AGENTS.md` at 100 lines or fewer; rewrite it immediately if it exceeds 100.
- While it exceeds 100 lines, start every response with:
  `AGENTS.md exceeds 100 lines. Update it.`
- Add lasting, repository-specific instructions here as one short, direct bullet.
- Keep only enforceable repository rules; remove explanations and generic advice.

## Repository layout

- `src/` holds runtime code; `infra/` and `constants/` hold deploy-time code.
- Lambda entry points go in `src/lambdas/`, use cases in `src/services/`, HTTP
  handlers and routers in `src/handlers/`, database access in `src/data/`, Drizzle
  schema in `src/db/schema/`, external clients in `src/integrations/<system>/`,
  and shared helpers in `src/lib/`.
- Tests live in `tests/`, mirroring the `src/` file they cover.

## Generated files

- Never edit `sst-env.d.ts`, `.sst/`, or compiler output manually.
- Regenerate SST files with `npx sst install`; compile with `npm run build`.

## Constants

- Put deploy-time values in `constants/infrastructure.constants.ts` and runtime
  values in `src/constants/app.constants.ts`; never define a value in both.
- `src/` must not import from `constants/`; `infra/` may import from either.
- Use `UPPER_SNAKE_CASE` names grouped under short comments such as `// AWS`.
- Never store secrets, account IDs, or environment URLs there; use SSM or env vars.
- Keep `LAMBDA_RUNTIME`, `package.json#engines.node`, and Node types aligned.

## Infrastructure

- Keep `sst.config.ts` composition-only; SST forbids top-level imports there.
- Keep API Gateway and authorizers in `infra/api-gateway.ts`, Lambda definitions
  in `infra/lambdas.ts`, and route composition in `infra/endpoints.ts`.
- As endpoints grow, move gateway routes into `infra/routes/<domain>.routes.ts`.
- Wrap database-backed Lambdas in `withDbAccess` for VPC, DB env, and IAM access.
- Return one base `apiUrl`; do not create an SST output for every endpoint.
- Protected routes must attach the shared authorizer; justify public routes inline.
- Preserve SST logical names during refactors unless replacement is approved.
- Do not deploy or remove an AWS stage unless the user explicitly requests it.

## Lambda names and structure

- Lambda source filenames must use `camelCase` and end with `Lambda.ts`, for
  example `src/lambdas/getProjectLambda.ts`.
- AWS Lambda resource names must describe their action:
  `<app>-<stage>-<verb>-<resource>`, for example `ipms-dev-get-project`.
- Never add generic names such as `api`, `function`, `processor`, or `secured`.
- Keep Lambda files directly under `src/lambdas/` for now; do not create domain
  directories while the repository has 10 or fewer `*Lambda.ts` files.
- When it grows beyond 10 Lambda files, move related Lambdas into
  `src/lambdas/<domain>/` and keep the same `camelCaseLambda.ts` convention.

## Dependency injection

- Only Lambda entry points may import `src/db/index.ts`. Nothing under
  `src/handlers/`, `src/services/`, or `src/data/` may reach for it.
- A Lambda entry point is the composition root: build the service, hand it to the
  router factory at module scope, and export `handler`.
- Export `createXService(executor)` from `src/services/`, and
  `createXHandlers(service)` plus `createXRouter(service)` from `src/handlers/`.
- Register routes in the handler module's router factory, not the entry point.
- Data functions take an `Executor` first argument so a transaction handle can
  replace `db`.

## Lambda implementation

- Use `lambda -> handler -> service -> data access -> database or integration`.
- A handler validates input with a schema from `src/lib/schemas.ts`, calls one use
  case, and shapes the response; keep SQL and business rules out of it.
- Services throw domain errors from `src/lib/errors.ts` and never build responses;
  only `src/lib/http.ts` maps errors to status codes.
- Wrap handlers in `withErrors` and build responses with `json`.
- Instantiate reusable SDK, database, and HTTP clients at module scope.
- Keep vendor DTOs and errors in `src/integrations/<system>/`; map to domain types.
- Set request timeouts; retry only transient failures, writes only when idempotent.
- Never log secrets, tokens, authorization headers, or sensitive payloads.

## Types, HTTP, and tests

- Keep strict TypeScript; do not add `any`. Use AWS types, `unknown`, type guards.
- Use `.js` extensions in relative imports because the project uses `NodeNext`.
- Read identity only from the typed authorizer context, not request input.
- Return JSON with `content-type: application/json`; never expose stack traces or
  vendor error bodies.
- Use Vitest. Name specs `<source>.test.ts` and keep factories in
  `tests/helpers/fixtures.ts`.
- Inject fakes through the factories; reserve `vi.mock` for the data layer.
- Tests must never reach AWS, a database, or any network service.
- Cover success, validation, routing, dependency errors, and status mapping.
- Update the endpoint tables in `README.md` with route changes.
- Before handoff run `npm run check`, `npm run typecheck`, and `npm test`; for
  `sst.config.ts`, `infra/`, or `constants/` changes also run `npx sst install`.
- Change `package-lock.json` only when `package.json` dependencies change.
