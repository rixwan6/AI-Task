# Smart Daily Standup Bot

Write a daily standup in your own words; get back a concise, professional summary you can paste into a team channel. Both the original entry and the generated summary are stored with a timestamp and shown in a history list.

The app is designed to run correctly **with or without** an AI API key — without one it falls back to a local summariser, and it labels every summary with which produced it.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Angular 19 (NgModules), TypeScript, Reactive Forms, `HttpClient`, plain SCSS |
| Backend | Node.js, Express 4, TypeScript |
| AI | Groq (`llama-3.3-70b-versatile`) via the OpenAI-compatible API, with a local fallback |
| Storage | JSON file (`server/data/standups.json`) |
| GitHub (optional) | GitHub MCP server over Model Context Protocol, via `@modelcontextprotocol/sdk` |

Deliberately **not** used: standalone components, NgRx, Signals, Angular Material, or any other state-management layer. The brief asked for regular Angular architecture, and an app with one list and one form does not need more.

---

## Getting started

**Prerequisites:** Node.js 20+ (built and tested on 22.14) and npm.

### 1. Backend

```bash
cd server
npm install
npm run dev
```

Runs on <http://localhost:3000>. No `.env` is required — it boots with working defaults and uses the mock summariser.

To use real AI summaries, copy the example env file and add a key:

```bash
cp .env.example .env
```

Get a free Groq key at <https://console.groq.com/keys> — no credit card required — then set `AI_API_KEY=gsk_...` in `server/.env` and restart. Confirm it was picked up:

```bash
curl http://localhost:3000/api/health
```

`"aiProvider": "ai"` means the live provider is active; `"mock"` means no key was found.

> Put the key in `server/.env`, never in `.env.example` — that file is committed.

### 2. Frontend

In a second terminal:

```bash
cd client
npm install
npm start
```

Open <http://localhost:4200>.

### Environment variables

All optional. See `server/.env.example`.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | API port |
| `CORS_ORIGIN` | `http://localhost:4200` | Allowed browser origin |
| `AI_API_KEY` | *(unset)* | Enables the live provider. Without it, the mock is used. |
| `AI_BASE_URL` | `https://api.groq.com/openai/v1` | Any OpenAI-compatible endpoint. Change to switch vendor. |
| `AI_MODEL` | `llama-3.3-70b-versatile` | Model ID for that vendor. |
| `MCP_ENABLED` | `false` | Master switch for the optional GitHub integration. |
| `GITHUB_TOKEN` | *(unset)* | GitHub PAT. Required only when `MCP_ENABLED=true`. |
| `GITHUB_OWNER` / `GITHUB_REPO` | *(unset)* | Which repo to read. Never taken from the client. |
| `GITHUB_BRANCH` | *(unset)* | Branch for commits; blank means the default branch. |
| `GITHUB_MCP_URL` | `https://api.githubcopilot.com/mcp/` | MCP server endpoint. |

---

## API

Every endpoint returns the same envelope, so the client has one shape to branch on:

```jsonc
{ "success": true,  "data": { /* ... */ } }
{ "success": false, "error": { "message": "...", "details": ["..."] } }
```

### `GET /api/health`

```json
{ "success": true, "data": { "status": "ok", "aiProvider": "mock", "uptimeSeconds": 42 } }
```

### `GET /api/standups`

Returns all standups, newest first.

```json
{ "success": true, "data": [ { "id": "…", "yesterday": "…", "today": "…", "blockers": null,
  "summary": "…", "summarySource": "ai", "createdAt": "2026-08-04T07:11:30.499Z" } ] }
```

### `POST /api/standups`

**Body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `yesterday` | string | yes | non-blank, ≤ 2000 chars |
| `today` | string | yes | non-blank, ≤ 2000 chars |
| `blockers` | string | no | ≤ 2000 chars; blank/omitted is stored as `null` |

```bash
curl -X POST http://localhost:3000/api/standups \
  -H "Content-Type: application/json" \
  -d '{"yesterday":"Shipped the login flow","today":"Wire up the payments webhook"}'
```

**`201 Created`** returns the stored standup, including its generated `summary` and `summarySource`.

### `GET /api/github/*` (optional)

Present only in the sense that they always exist — when `MCP_ENABLED` is not `true` they report that rather than 404.

| Route | Returns |
|---|---|
| `/api/github/status` | Always `200`: `{ enabled, configured, connected, owner, repo, toolCount, message }` |
| `/api/github/commits` | Latest commits (`?limit=`, default 10, max 50) |
| `/api/github/pull-requests` | Open PRs |
| `/api/github/issues` | Open issues |
| `/api/github/repository` | Repository metadata |

Data routes return `503` when the integration is disabled or unconfigured, and `502` when the MCP call itself fails. `/status` never fails — the UI calls it first and hides the panel when disabled, so a user never meets those errors.

### Status codes

| Code | When |
|---|---|
| `200` | Successful `GET` |
| `201` | Standup created |
| `400` | Validation failure (with per-field `details`) or malformed JSON |
| `404` | Unknown route |
| `500` | Unexpected server error (logged server-side, never leaked to the client) |

A `400` lists **every** problem at once rather than one per attempt:

```json
{ "success": false, "error": { "message": "Validation failed.",
  "details": ["\"yesterday\" is required and must be a non-empty string.",
              "\"today\" is required and must be a non-empty string."] } }
```

---

## Architecture

The rule throughout is **controller → service → (AI | repository)**. Controllers never touch the filesystem or the AI SDK; the repository knows nothing about HTTP.

```
POST /api/standups
      │
      ▼
 controller ──── validation (throws 400 on bad input)
      │
      ▼
 standup.service ──► services/ai ──┬─► openai-compatible  (API key present)
      │                            └─► mock-provider      (no key, or AI failed)
      ▼
 standup.repository ──► server/data/standups.json
```

Optional GitHub path, enabled only when `MCP_ENABLED=true`:

```
 Angular  ──►  Node.js API  ──►  GitHub MCP client  ──►  GitHub MCP server  ──►  GitHub
 (4200)        (3000)            @modelcontextprotocol   api.githubcopilot.com    repo
                                 JSON-RPC 2.0 over Streamable HTTP
```

### Folder structure

```
AI-Smart-Standup-bot/
├── server/
│   └── src/
│       ├── config/env.ts                    # typed config, no throw on missing values
│       ├── models/                          # Standup + API envelope types
│       ├── repositories/standup.repository.ts   # the only module touching the filesystem
│       ├── services/
│       │   ├── ai/
│       │   │   ├── ai-provider.ts           # SummaryProvider interface
│       │   │   ├── openai-compatible-provider.ts # the live AI call
│       ├── mcp/                            # optional GitHub integration
│       │   ├── github.config.ts            # its own env vars, self-contained
│       │   ├── github.client.ts            # MCP connection lifecycle
│       │   ├── github.tools.ts             # tool names + content-block parsing
│       │   └── github.service.ts           # commits / PRs / issues / status
│       │   │   ├── mock-provider.ts         # deterministic local summariser
│       │   │   └── index.ts                 # provider selection + fallback
│       │   └── standup.service.ts           # summarise, then persist
│       ├── controllers/                     # HTTP in / HTTP out only
│       ├── routes/                          # /api/health, /api/standups
│       ├── middlewares/                     # error handler, 404
│       ├── utils/                           # AppError, validation, asyncHandler
│       ├── app.ts                           # express wiring (testable, no listen)
│       └── server.ts                        # listen()
└── client/
    └── src/app/
        ├── models/standup.model.ts          # mirrors the server contract
        ├── services/standup.service.ts      # the only place that knows the API exists
        ├── pages/standup-page/              # smart container: owns state + API calls
        └── components/
            ├── standup-form/                # reactive form, emits; never calls the API
            ├── standup-history/             # loading / error / empty / list states
            └── standup-card/                # renders one standup
```

`app.ts` builds the Express app without starting it, so it can be driven in-process by tests without binding a port.

---

## AI integration

`SummaryProvider` is a one-method interface with two implementations. `services/ai/index.ts` picks the live provider when a key is configured and the mock otherwise, and wraps the call so **any** failure degrades instead of propagating:

```ts
export async function summarizeStandup(input: CreateStandupInput): Promise<SummaryResult> {
  try {
    return { summary: await primaryProvider.summarize(input), source: primaryProvider.source };
  } catch (error) {
    // …log the reason, then fall back to the mock
  }
}
```

The reasoning: **the user's standup is the valuable thing; the summary is an enhancement.** An AI outage should never turn into a failed submission, so a rate limit, timeout, network drop, or content refusal all produce a `201` with `summarySource: "mock"` and a server-side warning log.

### Why an OpenAI-compatible adapter

`openai-compatible-provider.ts` uses the `openai` npm package pointed at a **configurable base URL** rather than a vendor-specific SDK. Groq, OpenRouter, Together, Fireworks, Cerebras, SiliconFlow, and local runtimes (Ollama, vLLM) all speak the same chat-completions protocol, so switching vendor is a change to `AI_BASE_URL` and `AI_MODEL` — no code change.

That gives two levels of swappability:

| To change… | Change |
|---|---|
| Vendor or model, within OpenAI-compatible providers | Two env vars |
| To a provider with a different protocol | One new class implementing `SummaryProvider` |

Details in the provider that are easy to get wrong:

- **`temperature: 0`, `top_p: 1`, `seed`.** These are the determinism levers. Near-deterministic, not byte-identical — batching and floating-point non-associativity still introduce variance.
- **`finish_reason` is checked before reading content.** A safety refusal ends the turn without usable text, so trusting `message.content` blindly would store a silently empty summary.
- **`choices[0]` is guarded.** `noUncheckedIndexedAccess` is on, so the empty-array case must be handled rather than assumed away.
- **`max_tokens: 300`** — roughly four sentences, a hard ceiling on runaway output.

A 30-second client timeout is set because the call sits inside a user-facing request; the SDK default would hang the browser.

### Choosing a model

Default is `llama-3.3-70b-versatile` on Groq: the best instruction-follower among Groq's *production* models, and — unlike reasoning-capable models such as `gpt-oss` or Qwen3 — it returns the summary directly with no reasoning content to strip.

One honest caveat: Llama 3.3 is **open weights** under a community licence (700M-MAU clause, attribution requirements), *not* OSI-approved open source. If strict OSI licensing is required, `openai/gpt-oss-120b` is Apache 2.0, also production, and a one-env-var swap.

---

## GitHub MCP integration (optional)

**Off by default.** With `MCP_ENABLED` unset the app behaves exactly as it does without any of this — the GitHub panel does not render and the standup flow never calls it.

### What MCP is

The Model Context Protocol is an open standard for connecting LLM applications to external tools and data. It is JSON-RPC 2.0 with a defined lifecycle: a **client** (here, the Express server) connects to a **server** (here, GitHub's hosted MCP server) which exposes **tools** — `list_commits`, `list_pull_requests`, `list_issues` and ~40 more.

Its value is removing the N×M problem: rather than every app writing a bespoke integration per service, any MCP client can talk to any MCP server.

### Why it is here

Two reasons. A standup asks "what did you do yesterday?" and the answer is already in git, so recent commits make a useful summary input. And it demonstrates a current standard end to end.

**Honest caveat worth knowing:** for simply displaying four lists, calling GitHub's REST API directly would be lighter — no SDK, one network hop instead of two, and typed JSON instead of JSON-encoded-inside-a-text-block. MCP earns its place through uniform access to many tools, schema discovery via `tools/list`, and the fact that swapping GitHub for GitLab or Jira is a config change. It is the right foundation once the LLM starts *choosing* what to fetch.

### Configuration

```ini
MCP_ENABLED=true
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo
GITHUB_BRANCH=
GITHUB_MCP_URL=https://api.githubcopilot.com/mcp/
```

Create a token at <https://github.com/settings/tokens>. Use the **smallest scope that works** — `public_repo` for a public repository, or a fine-grained token with read-only Contents, Issues, and Pull requests. This feature only reads.

**There is no MCP server to start.** `GITHUB_MCP_URL` points at GitHub's hosted one, so a token is the only prerequisite. To run one locally instead, start `ghcr.io/github/github-mcp-server` and point the URL at it — no code changes.

### Verifying it

```bash
curl http://localhost:3000/api/github/status
```

`"connected": true` with a non-zero `toolCount` means the MCP handshake and tool discovery both succeeded. The three booleans are deliberately separate: `enabled` (switched on), `configured` (has token/owner/repo), `connected` (handshake worked) — so a failure says *which* step broke.

### Security notes

- **`owner` and `repo` come from configuration, never the request.** Accepting them from a caller would turn the API into an authenticated proxy to any repository the token can reach.
- **Commit messages are untrusted text.** When fed to the AI they are fenced in a `<recent_commits>` block, angle brackets are stripped so a message cannot close the fence early, and the system prompt instructs the model to treat the block as data. Anyone with push access can write a commit message, so this is a real vector.
- The token stays server-side and never appears in a response or the Angular bundle.

---

## Error handling

| Case | Behaviour |
|---|---|
| Missing / blank / oversized fields | `400` listing every field problem at once |
| Whitespace-only input | Rejected client-side too — Angular's `Validators.required` passes on `"   "`, so a small `notBlank` validator handles it |
| Malformed JSON body | `400 "Request body is not valid JSON."` |
| Unknown route | `404` in the standard envelope |
| AI failure of any kind | `201` with a fallback summary; reason logged server-side |
| Unexpected server error | `500` with a generic message; the real error is logged, never returned |
| API unreachable from the browser | `"Cannot reach the API. Is the server running on http://localhost:3000?"` |

Async route handlers are wrapped in `asyncHandler`, because Express 4 does not forward rejected promises to error middleware — without it, an AI timeout would leave the request hanging rather than returning a response.

---

## Assumptions

The brief left some things unspecified. These were the calls made, and why:

1. **Groq as the AI provider**, model `llama-3.3-70b-versatile`, reached through its OpenAI-compatible endpoint. Chosen for an ongoing free tier (no card, no expiring credits), the fastest inference available, and a protocol that makes switching vendor a config change.
2. **JSON file over pure in-memory storage.** Barely more code, and history surviving a restart makes the feature actually demonstrable.
3. **Single user, no authentication.** The brief specifies exactly three fields, so no author field was added.
4. **`yesterday` and `today` required; `blockers` optional** — "*any* blockers" reads as optional.
5. **One field added to the data model: `summarySource`.** Without it the UI would present a fallback summary as though the AI wrote it. The badge on each card makes the degradation visible rather than silent.
6. **Single-page UI, no Angular Router**, per the confirmed preference. The form and history sit side by side above 900px.
7. **NgModules over standalone components.** Angular 19 defaults to standalone, so the app was scaffolded with `--standalone=false`. Worth knowing that NgModules are the legacy path in current Angular — the choice here follows the brief, not the framework default.

---

## Verified

Checked end-to-end during development:

- All three endpoints, including a deliberately invalid `POST`, malformed JSON, and an unknown route
- **AI failure fallback**, forced with an invalid API key: the request reached Groq, came back `401 Invalid API Key`, and the API still returned `201` with `summarySource: "mock"`
- Persistence across a server restart
- Full browser round trip: validation → submit → card appears → form resets → survives reload
- Responsive layout at 375px (single column, no horizontal overflow) and 1280px (two columns)
- Clean browser console; production build with no errors or warnings

- **A live Groq call with a real key**, returning `summarySource: "ai"`. Given deliberately sloppy input (`"finished the oauth token refresh, reviewed priyas PR on billing"`), the model returned clean prose and corrected `priyas` → *Priya's*, `db creds` → *database credentials*, and `infra` → *infrastructure* — confirming the prompt, model ID, and parameters all work against a real response.

Every path in the AI layer — no key, bad key, and working key — has now been exercised end to end.

---

## Possible improvements

- **Tests.** None are included — the brief did not ask for them, and shipping auto-generated specs that fail is worse than none. The seams are already there: `StandupService` takes an injected repository, `app.ts` builds the app without listening, and `SummaryProvider` is trivially stubbed.
- **A real database.** `standup.repository.ts` is the only module touching the filesystem, so SQLite or Postgres means replacing one class.
- **Atomic writes.** Concurrent writes are serialised through a promise chain, but a crash mid-write could still truncate the file; writing to a temp file and renaming would close that.
- **Pagination** on history once the list grows.
- **Structured outputs** to have the model return a typed object rather than prose.
- **Rate limiting** on `POST /api/standups`, since each call costs an AI request.
- **A shared types package** so the client and server contracts cannot drift — they are currently kept in sync by hand.
