# Cloud Agent

Cloud Agent investigates why a cloud application is failing — through whichever mode fits: a
deterministic CLI workflow that follows a fixed diagnostic script, or an LLM-driven reasoning loop
that decides for itself which tools to call and in what order. Both share one validated tool
platform (27 tools across Azure and GitHub), so the investigation logic and its input/output
contracts are identical no matter which mode you use.

```
<appName + flags>  --->  cloud-agent CLI  --->  ToolRouter (27 tools)  --->  Azure + GitHub APIs  --->  structured report
```

## Contents
- [Why this exists](#why-this-exists)
- [Monorepo layout](#monorepo-layout)
- [Prerequisites](#prerequisites)
- [Getting the credentials you need](#getting-the-credentials-you-need)
- [Try it yourself](#try-it-yourself)
  - [Option A — deterministic `diagnose`](#option-a--deterministic-diagnose)
  - [Option B — LLM-driven `investigate`](#option-b--llm-driven-investigate)
  - [Option C — real Azure deployment](#option-c--real-azure-deployment)
- [Environment variables](#environment-variables)
- [Development setup](#development-setup)
- [Workspace scripts](#workspace-scripts)
- [Tool inventory](#tool-inventory)
- [Security design](#security-design)
- [Notable engineering decisions](#notable-engineering-decisions)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)
- [License](#license)

## Why this exists

Investigating a production incident usually means checking several unrelated systems by hand —
cloud telemetry in one dashboard, deployment history in another, recent code changes in a third —
and manually deciding whether they're connected. Cloud Agent centralizes that into one tool
platform, then exposes it two different ways:

| Mode | What it is | When to use it |
|---|---|---|
| `cloud-agent diagnose` | A fixed, deterministic 8-step script: status → failed requests → exceptions → deployments → commits → timestamp correlation → PR lookup → report | Predictable, fast, fully testable without any LLM involved — the control group that proves the underlying tools are correct |
| `cloud-agent investigate` | The same 27 tools handed to Claude, which decides which to call, in what order, based on what it learns | Real investigative reasoning — adapts mid-investigation, including recovering from a real tool failure by correcting its own query |

Both commands are built on the same `ToolRouter`, the same `GitHubToolProvider` and
`AzureToolProvider`, the same authentication, and the same human-approval gate before either of
the two mutating tools (`azure.restart_app_service`, `github.create_issue`) can run. A fix or
validation rule added once at the router level applies identically no matter which command
triggered it.

## Monorepo layout

```
Cloud-agent/
├── apps/
│   └── cli/                    # cloud-agent CLI — composition root (@cloud-agent/cli)
├── packages/
│   ├── shared/                  # Tool/ToolProvider types, config loading, confirmAction (@cloud-agent/shared)
│   ├── agent-core/              # AgentRuntime, ToolRouter, LlmAgent (@cloud-agent/agent-core)
│   ├── mcp-github/              # GitHubToolProvider — 13 tools (@cloud-agent/mcp-github)
│   └── mcp-azure/               # AzureToolProvider — 14 tools (@cloud-agent/mcp-azure)
├── .github/workflows/           # CI + GHCR publish pipeline
├── Dockerfile
├── .dockerignore
└── pnpm-workspace.yaml
```

It's a pnpm workspaces monorepo (`apps/*`, `packages/*`) — `pnpm install` at the root wires up all
four packages with `workspace:*` links between them.

## Prerequisites

- **Node.js 24+** and **pnpm** — the exact pnpm version is pinned via the `packageManager` field in
  the root `package.json`; `corepack enable` will pick it up automatically.
- **A GitHub personal access token** with read access to whichever repository you want to
  investigate.
- **An Azure Service Principal** with read access to the resources being investigated (and
  restart/write access only if you intend to actually use `azure.restart_app_service`).
- **An Anthropic API key** — required only for `investigate`; `diagnose` never calls the Anthropic
  API at all.
- **(Deployment only)** Docker, the Azure CLI (`az`) with the `containerapp` extension, and a
  GitHub Container Registry–capable repo (public repos publish for free).

## Getting the credentials you need

**GitHub token** — create a fine-grained personal access token at
`github.com/settings/personal-access-tokens/new`, scoped to just the repository you'll investigate,
with read access to contents, commits, pull requests, and Actions.

**Azure Service Principal** — create one scoped to the resource group you want to investigate:

```sh
az ad sp create-for-rbac \
  --name cloud-agent-sp \
  --role Reader \
  --scopes /subscriptions/<subscriptionId>/resourceGroups/<resourceGroup>
```

This returns `appId` (→ `AZURE_CLIENT_ID`), `password` (→ `AZURE_CLIENT_SECRET`), and `tenant` (→
`AZURE_TENANT_ID`). Grant `Contributor` instead of `Reader` on that scope only if you also want
`azure.restart_app_service` to work.

**Application Insights workspace ID** — needed as `--workspace-id` on both CLI commands:

```sh
az monitor app-insights component show \
  --app <appInsightsName> --resource-group <resourceGroup> \
  --query workspaceResourceId -o tsv
```

**Anthropic API key** — generate one at `console.anthropic.com/settings/keys`.

## Try it yourself

Both CLI modes need the same four flags (`--resource-group`, `--workspace-id`, `--owner`,
`--repo`) — the underlying tools require those exact values, and neither mode can guess them.

### Option A — deterministic `diagnose`

```sh
git clone https://github.com/JeffreyIga4/Cloud-agent.git
cd Cloud-agent
pnpm install
cp .env.example .env   # fill in real values

node --env-file=.env --import tsx apps/cli/src/index.ts diagnose <appName> \
  --resource-group <resourceGroup> --workspace-id <appInsightsWorkspaceId> \
  --owner <githubOwner> --repo <githubRepo>
```

### Option B — LLM-driven `investigate`

Same setup, swap the subcommand. This makes a real, billed call to the Anthropic API:

```sh
node --env-file=.env --import tsx apps/cli/src/index.ts investigate <appName> \
  --resource-group <resourceGroup> --workspace-id <appInsightsWorkspaceId> \
  --owner <githubOwner> --repo <githubRepo>
```

Both commands print a real `y/N` prompt in your terminal before executing either mutating tool —
declining leaves the tool uncalled and (in `investigate`) tells Claude explicitly that the human
declined, so it can't report a false success.

### Option C — real Azure deployment

```sh
docker build -t cloud-agent .
docker run --env-file .env cloud-agent diagnose <appName> \
  --resource-group <resourceGroup> --workspace-id <appInsightsWorkspaceId> \
  --owner <githubOwner> --repo <githubRepo>
```

See [Deployment](#deployment) for the full path from a merged commit to a running Azure Container
Apps Job.

## Environment variables

| Variable | Required for | Notes |
|---|---|---|
| `GITHUB_TOKEN` | Both CLI modes | Fine-grained PAT, scoped to the repo you're investigating |
| `AZURE_TENANT_ID` | Both CLI modes | From `az ad sp create-for-rbac` |
| `AZURE_CLIENT_ID` | Both CLI modes | From `az ad sp create-for-rbac` |
| `AZURE_CLIENT_SECRET` | Both CLI modes | From `az ad sp create-for-rbac` |
| `AZURE_SUBSCRIPTION_ID` | Both CLI modes | The subscription containing the resources being investigated |
| `ANTHROPIC_API_KEY` | `investigate` only | `diagnose` never touches the Anthropic API |

All six are validated up front by `loadConfig()` (a Zod schema over `process.env`) — the app fails
fast with a clear error the moment it starts if any are missing, rather than failing confusingly
deep inside a tool call later. See `.env.example` for the exact shape.

## Development setup

```sh
git clone https://github.com/JeffreyIga4/Cloud-agent.git
cd Cloud-agent
pnpm install
cp .env.example .env   # fill in real values for local development
```

## Workspace scripts

Run from the repo root:

| Script | What it does |
|---|---|
| `pnpm lint` | Lint the whole repo with ESLint |
| `pnpm format` | Format the whole repo with Prettier |
| `pnpm format:check` | Check formatting without writing (CI-style) |
| `pnpm test` | Run the full Vitest suite across every package |
| `pnpm -r exec tsc --noEmit` | Type-check every package in the workspace at once |
| `pnpm --filter <package> exec tsc --noEmit` | Type-check one package only |

There's no separate `build` step — the CLI runs directly from TypeScript source via `tsx`, both
locally and inside the deployed Docker image, deliberately, to stay consistent with what's actually
been tested rather than introducing an unproven compile step. See
[Notable engineering decisions](#notable-engineering-decisions).

## Tool inventory

**Azure — `packages/mcp-azure` (14 tools):** `get_app_service_status`,
`get_app_service_configuration` (names only, never values), `get_deployment`, `list_deployments`,
`get_exceptions`, `get_failed_requests`, `get_performance_metrics`, `query_application_logs`,
`get_resource`, `list_resources`, `list_resource_groups`, `list_app_services`,
`list_subscriptions`, `restart_app_service` (mutating — requires human confirmation).

**GitHub — `packages/mcp-github` (13 tools):** `get_repository`, `get_file`, `list_files`,
`search_code`, `get_commit`, `list_commits`, `get_pull_request`, `get_pull_request_diff`,
`list_pull_requests`, `list_workflows`, `list_workflow_runs`, `get_workflow_run`, `create_issue`
(mutating — requires human confirmation).

## Security design

- **Human approval the model can't bypass.** `investigate`'s reasoning loop keeps an explicit,
  hand-maintained list of mutating tool names. For any tool on that list, it prompts a real human
  via `readline` before doing anything, then builds the actual arguments as
  `{ ...args, confirm: true }` — a real human's `y` always overwrites whatever `confirm` value the
  model itself supplied, because in object spreading a key written later always wins.
- **Names-only secret exposure.** `get_app_service_configuration` returns only Application Insights
  setting *names*, never values — not a heuristic guessing which values look safe, but a stricter
  guarantee that removes the possibility of a leak entirely.
- **Centralized output validation and execution logging**, both enforced once at `ToolRouter`
  rather than duplicated across 27 individual tools.
- **Secrets never reach a Docker image layer.** `.dockerignore` excludes `.env`; real secrets reach
  the deployed container only as environment variables injected by Azure at runtime.

## Notable engineering decisions

- **`diagnose` was built first and kept, not replaced.** It's the control group that proves the
  underlying tools and correlation logic are correct independent of any model's reasoning.
- **Timestamp-proximity correlation, not exact commit tracing.** Azure Resource Manager deployments
  don't carry a Git commit SHA — that only exists in a separate Kudu/SCM API this project doesn't
  use. `correlateDeploymentWithCommit` finds the closest commit by timestamp and returns an
  explicit confidence level (High / Medium / Low) plus a limitation note, rather than claiming a
  certainty the data can't support.
- **`tsx` at runtime, not a compiled build.** The Docker image runs the CLI exactly the way it's
  always been run and tested locally, rather than introducing an unproven `tsc` compile step under
  time pressure.
- **Azure Container Apps *Job*, not a regular Container App.** The CLI runs to completion and
  exits — it isn't a long-running service, so it's deployed as the Azure resource type built for
  exactly that execution model, avoiding a new HTTP-facing security surface a regular app would
  need.

## Testing

```sh
pnpm test
```

55 tests across 10 files: every tool provider against mocked SDK clients, the router (output
validation, logging, and a real failure-path test proving errors are logged and re-thrown, not
swallowed), the deterministic workflow's pure functions, and the LLM reasoning loop — multi-round
tool dispatch, the approval gate proven in both directions with deliberately adversarial inputs,
and the iteration safety cap.

## Deployment

```sh
docker build -t cloud-agent .
```

On every merge to `main`, GitHub Actions runs `pnpm -r exec tsc --noEmit` and `pnpm test`; only if
both pass does it build and push the image to `ghcr.io/jeffreyiga4/cloud-agent`, tagged with both
`latest` and the exact commit SHA. A single Azure Container Apps Job
(`cloud-agent-diagnose-job`, in the `cloud-agent-rg` resource group) runs that image on demand,
with all six secrets registered as encrypted Job secrets and referenced via `secretRef`. Switching
which mode the job runs is a config update (`az containerapp job update --yaml`), not a redeploy —
see [Troubleshooting](#troubleshooting) for why `job start`'s per-execution override isn't used
instead.

## Troubleshooting

- **`{"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too
  low..."}}` from `investigate`** — your Anthropic Console account needs a top-up. Minimum $5 at
  `console.anthropic.com/settings/billing`. Note this is unrelated to any Claude.ai subscription —
  the raw Messages API this project uses is billed separately from claude.ai/Claude Code usage.

- **`unrecognized arguments: --workspace-id ... --owner ... --repo ...` when creating the Container
  Apps Job** — don't pass `--args` as space-separated flags to `az containerapp job create`. This
  project's own CLI flags (`--resource-group`, etc.) share the exact `--flag` syntax Azure CLI's
  own parser uses, so a `--resource-group` inside an `--args` list gets misread as a new top-level
  flag rather than a plain string. Define the job via a `--yaml` manifest instead, where each
  argument is an unambiguous plain list item.

- **`az containerapp job start --yaml <override>` runs successfully but the output is still the
  old command, not the new one** — per-execution template overrides on `job start` don't reliably
  apply; this is a real, documented Azure CLI limitation, not a mistake in the override file.
  Update the job's stored configuration instead (`az containerapp job update --yaml <file>`), then
  `job start` with no override.

- **`az containerapp job logs show` errors asking for `--container`** — pass the container name
  from the job's template (`--container cloud-agent-diagnose-job` for this project's job).

- **Image push to `ghcr.io/JeffreyIga4/cloud-agent` fails** — GHCR image names must be lowercase
  even though the GitHub repo itself (`JeffreyIga4/Cloud-agent`) isn't. Use
  `ghcr.io/jeffreyiga4/cloud-agent`.

- **A Zod/TypeScript type error inside `toAnthropicTool`** — if you're on Zod v4 (this project is),
  use Zod's own native `z.toJSONSchema()`, not the third-party `zod-to-json-schema` package, whose
  types are written against Zod v3's internals and don't line up with v4.

- **`loadConfig()` throws a Zod validation error immediately on startup** — one of the six required
  environment variables is missing from `.env`. Check against
  [Environment variables](#environment-variables) above.

## Future updates
API
rate-limit/retry handling would be worth adding before any higher-traffic use, though it isn't
exercised at this project's current usage volume. An HTTP-facing version of `investigate` would let
it be triggered remotely instead of only via CLI or a manually-started Container Apps Job — that
would need real authentication in front of an endpoint capable of triggering mutating actions,
which is why it's future work rather than something built alongside the current deployment.
## License

MIT — see [`LICENSE`](./LICENSE).