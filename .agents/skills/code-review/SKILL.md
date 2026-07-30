---
name: code-review
description: Review IPMS TypeScript, AWS Lambda, SST infrastructure, pull requests, diffs, or the full repository for correctness, regressions, security, architecture, performance, observability, error handling, and test gaps. Use when asked for a code review, repository audit, pre-merge assessment, risk review, or review of code produced by a human or another model. Report prioritized findings without modifying code unless the user separately requests fixes.
---

# IPMS Code Review

Perform an evidence-based review of the requested scope. Prefer consequential
defects over style preferences.

## Required context

1. Read the repository root `AGENTS.md`.
2. Read `references/ipms-review-rules.md`.
3. Read `references/general-review-checklist.md`.
4. Determine the scope from the user request. If unspecified, review current
   tracked and untracked working-tree changes.
5. Inspect complete affected files and their callers, contracts, tests, and
   infrastructure definitions; do not judge isolated diff lines only.

Exclude generated content in `.sst/`, `lambdas/dist/`, and `sst-env.d.ts` from
code-quality findings. Report unauthorized manual changes to generated files.

## Workflow

1. Inspect `git status`, the relevant diff or revision range, and nearby code.
2. Identify the intended behavior from the request, README, tests, and existing
   contracts.
3. Keep review-only validation read-only. Run `npm run check` and
   `npm run typecheck`; use existing CI evidence for tests when available.
   `npm test` rebuilds `lambdas/dist`, so run it only in a disposable copy or
   worktree, or when the user permits generated-output changes.
4. If lint did not run, failed because of tooling, or did not cover reviewed
   files, manually apply the imports, variables, constants, types, and promises
   checks in `references/general-review-checklist.md`. State why lint evidence
   is unavailable. Do not hide genuine lint findings.
5. Review correctness and failure paths before maintainability.
6. Trace changed inputs through handlers, services, integrations, and outputs.
7. Verify tests fail for the defect or regression they claim to protect.
8. Report findings only. Do not edit files during a review-only request.

Do not install dependencies, access AWS, deploy, or regenerate files merely to
complete a review. Record validations that could not be run and why.

## Finding standard

Report only issues with a concrete trigger and impact. For every finding include:

- severity and concise title;
- exact file and line;
- evidence from the code;
- failure or exploitation scenario;
- user, production, security, or maintenance impact;
- smallest safe correction and test to add.

Use these priorities:

- `P0 Critical`: auth bypass, secret exposure, data loss, or broad production
  outage requiring immediate action.
- `P1 High`: likely runtime failure, incorrect authorization, data corruption,
  broken API contract, or unsafe infrastructure change.
- `P2 Medium`: realistic edge-case failure, missing timeout/error mapping,
  measurable performance risk, or material observability/test gap.
- `P3 Low`: concrete maintainability risk with no immediate runtime impact.

Do not report speculative concerns, formatter-only preferences, or issues already
caught precisely by successful CI unless they expose a separate defect.

## Output

List findings first, ordered by severity:

```text
[P1] Short imperative title — path/to/file.ts:42
Evidence, trigger, impact, minimal correction, and required test.
```

Then provide:

- validation commands and results;
- assumptions or unavailable evidence;
- residual risks and missing coverage.

If there are no actionable findings, say so explicitly and still report
validation gaps or residual risks.
