# IPMS

## 1. Overview

IPMS is an API deployed to AWS with SST.

Available endpoint:

```text
GET /health
```

Successful response:

```json
{
  "status": "ok"
}
```

## 2. Local development

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

### 2.1 Formatting and linting

Biome formats TypeScript, JavaScript, and JSON files with two-space indentation
and checks them for lint problems. Diagnostics include the exact file, line, and
rule.

```bash
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

## 3. Environments

| Environment | Purpose | GitHub release type | SST stage |
| --- | --- | --- | --- |
| `dev` | Integration and acceptance testing | Prerelease | `dev` |
| `prod` | Production | Regular release | `prod` |

Create `dev` and `prod` GitHub environments with these environment secrets:

- `AWS_ACCESS_ROLE`: full ARN of the AWS deployment role
- `AWS_REGION`

The configured role must trust the repository's GitHub OIDC identity for the
matching environment. Long-lived AWS access keys must not be stored in GitHub.

Production deployments require approval from an authorized reviewer other than
the deployment initiator.

## 4. Resource naming

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

## 5. Repository workflow

### 5.1 Branches

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

### 5.2 Pull requests

Every change to `main` must use a pull request. A pull request must:

- Reference an issue or incident.
- Describe the change and verification steps.
- Include applicable tests and documentation.
- Pass all required status checks.
- Resolve all review conversations.
- Receive approval after the latest material change.

Use squash merging and delete the source branch after merge. Authors cannot
approve their own pull requests.

### 5.3 Required GitHub rules

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
npm run format:check
npm run lint
npm run typecheck
npm test
```

The repository currently runs these checks during release deployment. A
pull-request CI workflow must be added before the checks are configured as
required in GitHub.

## 6. Versioning

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

## 7. Deployment procedure

### 7.1 Deploy to `dev`

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

### 7.2 Deploy to `prod`

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

## 8. Security requirements

- Use separate AWS accounts or strictly separated IAM roles for `dev` and
  `prod`.
- Restrict OIDC trust policies to this repository and the matching environment.
- Apply least privilege to deployment roles.
- Do not expose credentials or sensitive data in source code or workflow logs.

## 9. Rollback and hotfixes

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
