# IPMS
API for IPMS

The API is defined with SST and exposes:

```text
GET /health
```

The endpoint returns `{"status":"ok"}` with HTTP status `200`.

## Setup

Install dependencies:

```bash
npm install
```

Build the project:

```bash
npm run build
```

Run the tests:

```bash
npm test
```

## Deployment

Publishing a GitHub prerelease deploys the `dev` SST stage. Publishing a
regular release deploys the `prod` stage.

Create GitHub environments named `dev` and `prod`. Define these environment
variables in each one:

- `AWS_ACCOUNT_ID`: the target AWS account ID
- `AWS_REGION`: the target AWS region, for example `eu-west-2`

The target AWS account must have an IAM role named `sst-deployment` that trusts
the repository's GitHub OIDC identity for the corresponding environment. The
workflow uses short-lived OIDC credentials; AWS access keys are not stored in
GitHub.

Deployment runs on a self-hosted runner and uses the official GitHub and AWS
setup actions.

The deployment prints `healthUrl`, the complete URL of the health endpoint, as
an SST output.

## Resource naming

AWS resources with configurable physical names follow:

```text
<application>-<stage>-<resource>
```

For example, the API Gateway is named `ipms-dev-api` in `dev` and
`ipms-prod-api` in `prod`. Resources are tagged with `Application`,
`Environment`, and `ManagedBy` where supported.
