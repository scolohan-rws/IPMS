# IPMS review rules

Treat the root `AGENTS.md` as authoritative if these notes drift.

## Generated files and modules

- Flag manual edits to `sst-env.d.ts`, `.sst/`, or `lambdas/dist/`.
- Lambda source belongs under `lambdas/`.
- Relative TypeScript imports require `.js` extensions under `NodeNext`.
- New `any` types are prohibited; require AWS types, `unknown`, or type guards.

## Constants

- Potentially reusable static values belong in
  `constants/infrastructure.constants.ts`.
- Flag duplicated runtimes, regions, AWS actions, principals, stage names,
  shared resource fragments, timeouts, or retry limits.
- Constants use descriptive `UPPER_SNAKE_CASE` names and category comments.
- Secrets, tokens, account IDs, and environment-specific URLs must not be
  constants.
- Lambda runtime, Node engine, and Node type versions must remain compatible.

## Infrastructure

- `sst.config.ts` is composition only and uses dynamic imports inside `app()` or
  `run()`; top-level imports are invalid in SST v4.
- API Gateway and authorizers belong in `infra/api-gateway.ts`; Lambda definitions
  in `infra/lambdas.ts`; route composition in `infra/endpoints.ts`.
- New domain routes belong in `infra/routes/<domain>.routes.ts` when route volume
  justifies the split.
- Infrastructure returns one base `apiUrl`, not one output per route.
- Protected routes attach the shared authorizer. Public routes explain why they
  are public.
- Refactors preserve SST logical resource names unless replacement is intended.

## Lambda conventions

- Source files use `camelCaseLambda.ts`; tests use `camelCaseLambda.test.ts`.
- AWS names follow `<app>-<stage>-<verb>-<resource>` and avoid generic names such
  as `api`, `function`, `processor`, or `secured`.
- Keep the flat `lambdas/` layout through 10 Lambda source files; beyond that,
  group related functions under `lambdas/<domain>/`.
- Use `handler -> service/use case -> integration client`.
- Handlers validate events/auth, call one use case, and map results/errors only.
- Reusable clients are created at module scope and injected behind typed
  interfaces.
- External calls define timeouts, bounded transient retries, and idempotency for
  retried writes.

## HTTP, security, and documentation

- Protected handlers trust only the typed Lambda authorizer context.
- JSON responses include `content-type: application/json`.
- Responses and logs never expose stack traces, secrets, tokens, authorization
  headers, sensitive payloads, or raw vendor errors.
- Route changes update endpoint and authentication tables in `README.md`.
- Bug fixes include regression tests; handlers cover validation, auth context,
  dependency failures, and error-to-status mapping.
