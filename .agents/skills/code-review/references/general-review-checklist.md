# General review checklist

Use this checklist in addition to automated validation. Apply the first five
sections manually whenever lint is unavailable or incomplete.

## Imports

- Find unused, duplicate, missing, circular, or incorrect relative imports.
- Prefer `import type` when an import is used only as a type.
- Verify imported paths and exported names, including case sensitivity.
- Check NodeNext relative imports for `.js` extensions.
- Reject imports that cross an intended layer boundary.

## Variables and constants

- Find unused, shadowed, misleading, over-broad, or incorrectly scoped variables.
- Check initialization before use and mutation across asynchronous boundaries.
- Replace duplicated stable values with the existing canonical constant.
- Flag magic values likely to be reused, but do not extract request-specific data
  or one-off domain messages without a reuse case.
- Check units in names such as `timeoutMs`, and detect mixed seconds/milliseconds.

## Types and control flow

- Find unsafe casts, `any`, unchecked `unknown`, invalid narrowing, and hidden
  `undefined` or `null` paths.
- Check every conditional branch, early return, switch, and optional-chain
  fallback against the intended invariant.
- Detect impossible branches, swallowed errors, stale closures, and unreachable
  code.
- Confirm async functions return or await promises; find floating promises,
  accidental sequential work, and lost rejections.

## Functions and APIs

- Verify argument order, defaults, return types, side effects, and public
  contracts at every changed call site.
- Check parsing and serialization boundaries for malformed, empty, oversized, or
  unexpected input.
- Ensure errors are mapped at the correct layer and cleanup occurs on failure.
- Look for behavior changes hidden inside refactors or renames.

## Modules and dependencies

- Find unused dependencies, wrong runtime/dev placement, unexpected lockfile
  changes, and imports from transitive packages.
- Check for duplicated helpers before approving a new abstraction.
- Keep domain behavior out of generic shared modules until two real consumers
  exist.

## Correctness and resilience

- Trace success, validation, not-found, conflict, authorization, timeout,
  throttling, malformed upstream response, and unexpected exception paths.
- Check retries for bounded backoff and idempotency.
- Detect partial writes, race conditions, concurrency hazards, and non-atomic
  state transitions.

## Security and privacy

- Validate untrusted inputs at boundaries and enforce authorization server-side.
- Look for injection, path traversal, SSRF, unsafe deserialization, over-broad IAM,
  sensitive logging, and hardcoded credentials.
- Confirm error responses do not leak internal details.

## Performance and Lambda behavior

- Detect clients created per invocation, unbounded loops/data/concurrency,
  unnecessary serialization, repeated remote calls, and independent work run
  sequentially.
- Check payload sizes, pagination, timeout budgets, cold-start dependencies, and
  memory retained across warm invocations.

## Observability and tests

- Require actionable error logs with request ID, operation, safe error code, and
  relevant identifiers; never require sensitive payloads.
- Ensure tests assert behavior rather than implementation details.
- Check negative paths, boundary values, dependency errors, and regression tests.
- Treat passing tests as evidence, not proof of correctness.
