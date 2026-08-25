# Cloud Agent — AI Cloud Operations Agent Platform

A TypeScript monorepo that investigates real Azure and GitHub incidents two ways: a deterministic, scripted CLI workflow, and an LLM-driven reasoning loop that decides which tools to call on its own — both built on the same 27-tool platform, the same authentication, and the same human-approval safeguard for any action that mutates real infrastructure.

## Overview

`cloud-agent` is a CLI for investigating why a cloud application is failing. It was built as a full-stack exercise in agent tooling: designing a provider-based tool platform from scratch, wiring real Azure and GitHub SDKs behind a validated, typed interface, building a deterministic investigation workflow, then layering a genuine LLM tool-calling loop on top of the exact same tools, and finally containerizing and deploying the whole thing to real Azure infrastructure with CI/CD.

Two commands, one platform:

- **`cloud-agent diagnose <appName>`** — a fixed, 8-step deterministic workflow: check App Service status, failed requests, and exceptions; if something's wrong, pull recent ARM deployments and GitHub commits, correlate them by timestamp proximity with an explicit confidence score, look up the likely pull request, and produce a structured report. Predictable, testable, and fast.
- **`cloud-agent investigate <appName>`** — hands the same 27 tools to Claude and lets it decide which to call, in what order, based on what it learns along the way. A real agentic reasoning loop, not a script — proven in testing to adapt its own approach mid-investigation, including recovering from a real tool failure by correcting its own query and retrying.

The deterministic command was built and proven first, deliberately, and kept rather than replaced — it's the control group that proves the underlying tools and correlation logic are correct independent of any model's reasoning, and a working fallback if the LLM ever misbehaves.

## Architecture

```
                     cloud-agent CLI (diagnose / investigate)
                                    |
                               AgentRuntime
                                    |
                   ToolRouter (execution logging + output validation)
                        /                            \
        GitHubToolProvider                  AzureToolProvider
          (13 tools, Octokit)               (14 tools, Azure SDKs)

  investigate mode additionally routes through:

         LlmAgent (Anthropic Messages API + the same ToolRouter above)
```

Every tool provider implements one shared `ToolProvider` interface (`listTools()` / `callTool()`), and every dependency — SDK clients, the tool router, even the human-confirmation function — is injected via constructors rather than built internally. That's what makes `LlmAgent` able to reuse the identical `ToolRouter` already wired for `diagnose` with zero new tool code, and what makes every layer of this project testable with plain fakes, no framework-level mocking required.

## Tool inventory (27 tools)

### Azure (14) — `packages/mcp-azure`

| Tool | Description |
|---|---|
| `azure.get_app_service_status` | Current running state of an App Service |
| `azure.get_app_service_configuration` | Application setting **names only, never values** — deliberately secret-safe by design |
| `azure.get_deployment` | Details of a specific resource-group deployment |
| `azure.list_deployments` | Recent deployments in a resource group |
| `azure.get_exceptions` | Exceptions logged in Application Insights over a time window |
| `azure.get_failed_requests` | Failed HTTP requests logged in Application Insights |
| `azure.get_performance_metrics` | CPU / memory / performance counters over a time window |
| `azure.query_application_logs` | Raw KQL query against Application Insights |
| `azure.get_resource` | Details of a specific Azure resource |
| `azure.list_resources` | Resources in a resource group |
| `azure.list_resource_groups` | Resource groups in the subscription |
| `azure.list_app_services` | App Services in a resource group |
| `azure.list_subscriptions` | Accessible Azure subscriptions |
| `azure.restart_app_service` | **Mutating** — restarts an App Service, requires human confirmation |

### GitHub (13) — `packages/mcp-github`

| Tool | Description |
|---|---|
| `github.get_repository` | Repository metadata |
| `github.get_file` | Contents of a file at a given path/ref |
| `github.list_files` | Files in a repository path |
| `github.search_code` | Searches code across a repository |
| `github.get_commit` | Details of a specific commit |
| `github.list_commits` | Recent commits on a repository |
| `github.get_pull_request` | Details of a specific pull request |
| `github.get_pull_request_diff` | The diff for a specific pull request |
| `github.list_pull_requests` | Pull requests on a repository |
| `github.list_workflows` | GitHub Actions workflows defined on a repository |
| `github.list_workflow_runs` | GitHub Actions workflow runs |
| `github.get_workflow_run` | Details of a specific workflow run |
| `github.create_issue` | **Mutating** — creates a GitHub issue, requires human confirmation |

## Security design

- **Human approval, not just a flag.** Both mutating tools require `confirm: true`. In `diagnose`, that confirmation comes from a real `readline` prompt in the terminal. In `investigate`, the LLM loop maintains an explicit, hand-maintained `MUTATING_TOOLS` list — deliberately explicit rather than inferred from tool schemas, so nothing new is silently missed — and always overwrites whatever `confirm` value the model itself supplies with the real result of a human prompt (`{ ...args, confirm: true }`, where the human's value always wins via object-spread ordering). The model's own opinion about approval never reaches the tool.
- **Names-only secret exposure.** `get_app_service_configuration` returns only setting *names*, never values, by design — not a heuristic that tries to detect which values look safe, which could always have a false negative, but a stricter guarantee that removes the possibility entirely.
- **Centralized output validation.** Every tool's result is validated against its declared Zod output schema in one place (`ToolRouter.callTool`), not duplicated 27 times across individual tools.
- **Execution logging.** Every tool call is logged with a timestamp, level, and outcome at the router level, again once, not per-tool.
- **Secrets never touch the image.** `.dockerignore` excludes `.env`; real secrets reach the deployed container only as environment variables injected by Azure Container Apps at runtime, registered as encrypted Job secrets, never baked into a Docker layer.

## Notable engineering decisions

- **Timestamp-proximity correlation, not exact commit tracing.** Azure Resource Manager deployments don't carry a Git commit SHA — that data only exists in a separate Kudu/SCM API. Rather than claim an exact relationship the data can't support, `correlateDeploymentWithCommit` finds the closest commit by timestamp and returns an explicit confidence level (High / Medium / Low) plus a limitation note, baked into the result itself so no caller can silently ignore the caveat.
- **`diagnose` kept alongside `investigate`, not replaced.** See Overview above — the deterministic path is the control group.
- **`confirmAction` injected, not imported.** It originally lived as a bare imported function inside `LlmAgent`. Writing a test for the approval gate is what exposed that this broke the project's dependency-injection consistency (everything else is constructor-injected specifically so tests can substitute fakes); the fix made it a third constructor parameter.
- **A real Zod version-mismatch bug, fixed by removing a dependency.** The original Claude tool-schema conversion used the third-party `zod-to-json-schema` package, whose types were written against Zod v3's internals while this repo runs Zod v4. Rather than paper over it with a cast, the fix was switching to Zod v4's own native `z.toJSONSchema()`, removing the dependency entirely.
- **A real Azure CLI argument-parsing bug, fixed structurally.** Creating the Container Apps Job via flags failed because of the `--resource-group` flag, embedded inside a space-separated `--args` list, collided with Azure CLI's own same-named flag — the parser couldn't tell which dashes belonged to which command. The fix was defining the job as a YAML manifest instead, where every argument is a plain list item, never a flag, eliminating the ambiguity by construction rather than escaping around it.
- **A second real Azure CLI bug.** Per-execution template overrides on `az containerapp job start` don't reliably apply — a documented CLI limitation, confirmed against a real GitHub issue after the override was silently ignored in practice. The reliable alternative is updating the job's stored configuration (`az containerapp job update --yaml`) before each `start`, which still avoids any duplicate infrastructure for the two CLI modes, just via a different mechanism than originally intended.
- **Container Apps *Job*, not a regular Container App.** The CLI runs to completion and exits — it isn't a long-running service. A Job is Azure's purpose-built resource for exactly that execution model, and it avoided introducing a new HTTP-facing security surface (an internet-reachable endpoint able to trigger `restart_app_service` or `create_issue` would need real authentication in front of it, out of scope for this phase).

## Tech stack

Node 24, TypeScript, pnpm workspaces monorepo. Zod for schema validation and (via Zod v4's native `z.toJSONSchema()`) tool-use schema generation for Claude. Octokit for GitHub, `@azure/arm-*` and `@azure/monitor-query-logs` for Azure, `@anthropic-ai/sdk` for Claude. Vitest for testing, ESLint + Prettier for linting. Docker, GitHub Actions, and Azure Container Apps Jobs for deployment.

## Project structure

```
apps/
  cli/          — the cloud-agent CLI (composition root)
packages/
  shared/       — Tool/ToolProvider types, config loading, confirmAction, shared utilities
  agent-core/   — AgentRuntime, ToolRouter, LlmAgent (the reasoning loop)
  mcp-github/   — GitHubToolProvider (13 tools)
  mcp-azure/    — AzureToolProvider (14 tools)
```

## Setup

Requires Node 24+ and pnpm (version pinned via `packageManager` in `package.json`).

```
git clone https://github.com/JeffreyIga4/Cloud-agent.git
cd Cloud-agent
pnpm install
cp .env.example .env   # fill in real values
```

Required environment variables (see `.env.example`): `GITHUB_TOKEN` (a GitHub personal access token), `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` / `AZURE_SUBSCRIPTION_ID` (an Azure Service Principal with read access to the resources being investigated), and `ANTHROPIC_API_KEY` (required only for `investigate`).

## Usage

```
# deterministic investigation
node --env-file=.env --import tsx apps/cli/src/index.ts diagnose <appName> \
  --resource-group <resourceGroup> --workspace-id <appInsightsWorkspaceId> \
  --owner <githubOwner> --repo <githubRepo>

# LLM-driven investigation
node --env-file=.env --import tsx apps/cli/src/index.ts investigate <appName> \
  --resource-group <resourceGroup> --workspace-id <appInsightsWorkspaceId> \
  --owner <githubOwner> --repo <githubRepo>
```

Both commands prompt for real human confirmation (`y`/`N`) before executing either mutating tool.

## Testing

```
pnpm lint
pnpm -r exec tsc --noEmit
pnpm test
```

55 tests across 10 files: every tool provider against mocked SDK clients (plus real smoke tests against live Azure/GitHub data during development), the router (output validation, logging, and a real failure-path test proving errors are logged and re-thrown, not swallowed), the deterministic workflow's pure functions (extracted specifically for testability, no mocking required), and the LLM reasoning loop — tool dispatch across multiple rounds, the approval gate proven in both directions with deliberately adversarial inputs, and the iteration safety cap.

## Deployment

The CLI is containerized (multi-stage-lite `Dockerfile`, running via `tsx` rather than a separate compile step — consistency with what was already proven working locally, under time pressure, beat a theoretically cleaner build) and published to GitHub Container Registry on every merge to `main` via GitHub Actions, gated on a full lint/typecheck/test pass — a broken build can never reach the registry. Every image is tagged with both `latest` and the exact commit SHA it was built from.

A single Azure Container Apps Job runs the published image on demand, authenticated via the same Service Principal credentials used locally, with all six secrets (`GITHUB_TOKEN`, the four `AZURE_*` values, `ANTHROPIC_API_KEY`) registered as encrypted Job secrets. Both `diagnose` and `investigate` have been run for real against this deployed Job — proven via distinct output shapes in the execution logs, not just a success status — through the exact same environment, secrets, and underlying tool platform described above.

## Known limitations / deliberately deferred work

A few things were evaluated and consciously not built, given limited time against low expected value for this project's actual purpose:

- `github.list_repositories`, `azure.get_app_service`, and `azure.get_metric` — narratively described in the original tool spec but never needed by the actual investigation workflows.
- API rate-limit/retry handling — not exercised at this project's real usage volume.
- An HTTP-facing version of `investigate` — would require real authentication in front of an endpoint capable of triggering mutating actions, out of scope for the current deployment.

## License
 
MIT