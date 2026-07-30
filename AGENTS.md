# Repository instructions
These rules apply to the entire repository.

## Maintaining this file

- Keep `AGENTS.md` at 100 lines or fewer; rewrite it immediately if it exceeds 100.
- While it exceeds 100 lines, start every response with:
  `AGENTS.md exceeds 100 lines. Update it.`
- When a user gives a concrete, repository-specific instruction that looks like
  a lasting rule, add it here in one short, direct bullet.
- Keep only enforceable repository rules; remove explanations and generic advice.

## Generated files

- Never edit `sst-env.d.ts`, `.sst/`, or `lambdas/dist/` manually.
- Regenerate SST files with `npx sst install`; build Lambda output with
  `npm run build`.
- Put Lambda source in `lambdas/`.

## Constants

- Put reusable or potentially reusable static values in
  `constants/infrastructure.constants.ts`.
- Use descriptive `UPPER_SNAKE_CASE` names and group values under short comments
  such as `// Application`, `// AWS`, and `// External systems`.
- Never store secrets, tokens, account IDs, or environment-specific URLs there;
  use SST resources, SSM, or environment variables.
- Keep `LAMBDA_RUNTIME`, `package.json#engines.node`, and Node types aligned.

## Infrastructure

- Keep `sst.config.ts` as composition only. SST requires dynamic `import()` calls
  inside `app()` or `run()`; top-level imports are forbidden there.
- Keep API Gateway and authorizers in `infra/api-gateway.ts`, Lambda definitions
  in `infra/lambdas.ts`, and route composition in `infra/endpoints.ts`.
- As endpoints grow, create `infra/routes/<domain>.routes.ts`; each file registers
  one business domain, and `endpoints.ts` only composes domain route modules.
- Return one base `apiUrl`; do not create an SST output for every endpoint.
- Protected routes must attach the shared authorizer. Add a short reason beside
  every intentionally public route.
- Preserve SST logical names during refactors unless replacement is approved.
- Do not deploy or remove an AWS stage unless the user explicitly requests it.

## Lambda names and structure

- Lambda source filenames must use `camelCase` and end with `Lambda.ts`, for
  example `getProjectLambda.ts`; tests use `getProjectLambda.test.ts`.
- AWS Lambda resource names must describe their action:
  `<app>-<stage>-<verb>-<resource>`, for example `ipms-dev-get-project`.
- Never add generic names such as `api`, `function`, `processor`, or `secured`.
- Keep Lambda files directly under `lambdas/` for now; do not create domain
  directories while the repository has 10 or fewer `*Lambda.ts` files.
- When it grows beyond 10 Lambda files, move related Lambdas into
  `lambdas/<domain>/` and keep the same `camelCaseLambda.ts` convention.
- Put external clients in `lambdas/integrations/<external-system>/` and shared
  HTTP or test helpers in `lambdas/shared/`.

## Lambda implementation

- Use `handler -> service/use case -> integration client`.
- A handler only validates the API Gateway event and auth context, calls one use
  case, and maps its result or known errors to an HTTP response.
- Keep business rules, AWS SDK calls, and external HTTP calls out of handlers.
- Inject typed integration interfaces into services and service functions into
  handlers; tests must use fakes and never call real systems.
- Export a `createHandler(dependencies)` factory or named handler for tests and
  export `handler` as the SST entry point.
- Instantiate reusable SDK and HTTP clients at module scope for warm reuse.
- Keep vendor DTOs and errors inside `lambdas/integrations/<system>/`; map them to
  domain types and typed integration errors.
- Set explicit request timeouts. Retry only transient failures; retry writes only
  with an idempotency key.
- Never log secrets, tokens, authorization headers, or sensitive payloads.

## Types, HTTP, and tests

- Keep strict TypeScript; do not add `any`. Use AWS types, `unknown`, type guards,
  and typed event factories.
- Use `.js` extensions in relative imports because the project uses `NodeNext`.
- Read identity only from the typed authorizer context, not request input.
- Return JSON with `content-type: application/json`; never expose stack traces or
  vendor error bodies.
- Use `node:test` and `node:assert/strict`. Cover success, validation, auth context,
  dependency errors, and error-to-status mapping; bug fixes require regression tests.
- Update the endpoint and authentication tables in `README.md` with route changes.
- Before handoff run `npm run check`, `npm run typecheck`, and `npm test`; for
  `sst.config.ts`, `infra/`, or `constants/` changes also run `npx sst install`.
- Change `package-lock.json` only when `package.json` dependencies change.
