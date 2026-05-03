<p align="center">
  <img src="readme-assets/thoughtpivot-logo.svg" alt="ThoughtPivot" width="280" />
</p>

# Flight

**Flight** is a Node.js application server for teams who want something **fast**, **boring in the good way**, and **ready for serious traffic**. You bring your own hosting—there is no lock-in to a proprietary edge or a single vendor’s deployment story. It fits **twelve-factor** style workflows: configuration via environment variables, horizontal scaling, and state kept where it belongs (for Flight, that includes **Redis** for sessions and cache-friendly layers).

Think **platform-agnostic**: not framework-as-a-platform, but a clear runtime you can run wherever Node runs—VMs, Kubernetes, bare metal, your cloud of choice. Flight is aimed at **hyperscale-friendly** designs (cluster workers out of the box), **ephemeral** processes, and **component-shaped** backends so routes stay colocated with the features they serve. **Vue** and **Vite** are first-class today; **React** support is on the roadmap.

Flight is **open source** from **[ThoughtPivot](https://github.com/thoughtpivot)**.

## Highlights

- **Performance-focused**: Cluster mode, compression, Redis-backed caching hooks, rate limiting in production
- **Developer velocity**: Vite-powered dev server with HMR for **Vue** (React roadmap)
- **Composable backends**: Discover `**/*.backend.ts` under your app root and mount Koa routes per component
- **Configurable discovery**: `--exclude_paths` / `FLIGHT_EXCLUDE_PATHS` to skip directories when scanning backends
- **TypeScript-native**: Written for TS projects; sensible defaults, minimal ceremony
- **Interop-friendly**: Correct handling of `yargs` when launched via **tsx** or similar loaders (no patch-package needed from **v1.0.8** onward)

## Installation

```bash
npm install @thoughtpivot/flight
# or
yarn add @thoughtpivot/flight
```

Legacy npm scope: the package was previously published as `@spytech/flight`—use `@thoughtpivot/flight` going forward.

### Downstream apps (tsx)

From **v1.0.8** onward, Flight normalizes `require('yargs/yargs')` under loaders that expose `{ default: factory }`. If you added **patch-package** only for that issue, upgrade Flight and drop that patch.

## Quick Start

1. Create a new project directory and initialize:

```bash
mkdir my-flight-app
cd my-flight-app
npm init -y
```

2. Install Flight and its dependencies:

```bash
npm install @thoughtpivot/flight ioredis
```

3. Ensure Redis is running locally or set environment variables (see table below).

4. Create a component with a backend route:

```bash
mkdir -p components/hello
```

Create `components/hello/hello.backend.ts`:

```typescript
import Router from '@koa/router'

const router = new Router()

router.get('/hello', async (ctx) => {
    ctx.body = { message: 'Hello from Flight!' }
})

export default router.routes()
```

5. Start the server:

**Development mode:**

```bash
node flight.js --mode development --app_home .
# Vite dev server on port 3001 with HMR; backend API on port 3000
```

**Production mode:**

```bash
node flight.js --mode production --app_home .
# Production bundle + server on port 3000 (see env table for ports/paths)
```

## Configuration: CLI, `.env`, and environment variables

Flight loads a **`.env`** file from the **current working directory** at startup (via **`dotenv`**), so local secrets and settings stay out of source control. Combine that with real **`FLIGHT_*`** variables in staging/production for twelve-factor style deployments.

**Precedence (important):**

- For **`mode`**, **`FLIGHT_MODE`** wins over **`--mode`** when the variable is set (non-empty).
- For other CLI flags below, if you **omit** the flag, Flight falls back to the matching **`FLIGHT_*`** value where listed, then to the default.

| CLI flag                              | Environment variable         | Default      | Notes                                                                                    |
| ------------------------------------- | ---------------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| `--app_home`                          | `FLIGHT_APP_HOME`            | `.`          | App root; working directory is changed here                                              |
| `--exclude_paths` / `--exclude-paths` | `FLIGHT_EXCLUDE_PATHS`       | _(none)_     | Comma-separated and/or repeat the flag; skips subtrees for `**/*.backend.ts` discovery   |
| `--app_key`                           | `FLIGHT_APP_KEY`             | `flightApp`  | Session cookie key name                                                                  |
| `--app_secret`                        | `FLIGHT_APP_SECRET`          | _(see code)_ | Session signing secret(s); comma-separated for multiple keys                             |
| _(argv `session_duration`)_           | `FLIGHT_SESSION_DURATION_MS` | `86400000`   | Session lifetime in ms after validation (set via env or any argv your launcher forwards) |
| `--port`                              | `FLIGHT_PORT`                | `3000`       | HTTP listen port                                                                         |
| `--payload_limit`                     | `FLIGHT_PAYLOAD_LIMIT`       | `1mb`        | Body parser JSON limit                                                                   |
| `--disable_vite`                      | `FLIGHT_DISABLE_VITE`        | `false`      | Set env to `true` to skip Vite production build trigger                                  |
| `--mode`                              | `FLIGHT_MODE`                | `production` | **`FLIGHT_MODE` overrides `--mode` when set**                                            |
| _(serve)_                             | `FLIGHT_DIST_PATH`           | `../dist`    | Static root in production (relative to cwd after chdir)                                  |
| _(Redis)_                             | `FLIGHT_REDIS_HOST`          | `localhost`  |                                                                                          |
| _(Redis)_                             | `FLIGHT_REDIS_PORT`          | `6379`       |                                                                                          |
| _(cluster)_                           | `FLIGHT_MAX_WORKERS`         | CPU count    | Cap worker processes on the primary                                                      |

Example `.env` fragment:

```bash
FLIGHT_MODE=development
FLIGHT_APP_HOME=.
FLIGHT_REDIS_HOST=127.0.0.1
FLIGHT_REDIS_PORT=6379
FLIGHT_PORT=3000
FLIGHT_MAX_WORKERS=4
```

## Project Structure

```
my-app/
├── components/
│   └── Hello/
│       ├── Hello.vue          # Vue UI (example)
│       └── Hello.backend.ts   # Koa routes for this component
├── assets/
├── dist/                      # Production build output
└── package.json
```

Example Vue + backend snippets:

`components/hello/Index.vue`:

```vue
<template>
    <div>
        <h1>{{ message }}</h1>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const message = ref('Hello from Flight!')
</script>
```

`components/hello/Index.backend.ts`:

```typescript
import Router from '@koa/router'

const router = new Router()

router.get('/hello', async (ctx) => {
    ctx.body = { message: 'Hello from Flight!' }
})

export default router.routes()
```

## Development Mode

- **Vue** + **Vite** with HMR on port **3001**
- Backend worker on **`--port`** (default **3000**)
- Helpful logging via Koa middleware

## Production Mode

- Optional **`npx vite build`** before serving static assets (unless `FLIGHT_DISABLE_VITE=true`)
- Compression, Redis-backed rate limiting, cache middleware hook
- Cluster workers with **`FLIGHT_MAX_WORKERS`** cap

## Requirements

- Node.js **16.x** or higher
- **Redis** (sessions / rate limit / cache integrations)
- **TypeScript** in your app if you author `.backend.ts` modules as TS

## License

MIT

## Contributing

Issues and pull requests are welcome. Flight improves fastest with real workloads—if you hit an edge case, open an issue with a minimal repro.

## Acknowledgments

**Flight** succeeds **[Avian](https://github.com/ispyhumanfly/avian)**—the component-oriented Node server that helped prove this programming model. **Dan Stevenson** created Avian and carried it into **FlyPaper Technologies**, where **Nick Fredericks**, Dan, and the FlyPaper team sharpened Avian’s component boundaries and pushed its operational story. Dan continued to maintain Avian while **Flight** took shape to embrace newer tooling and a cleaner baseline for the next decade.

Today **Flight** is maintained by the **ThoughtPivot** engineering team and **contributors like you**—the same spirit of openness and iteration, with a hard focus on speed, clarity, and deployment flexibility.
