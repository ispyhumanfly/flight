#!ts-node

import { exec, spawn } from 'child_process'

import Koa from 'koa'
import Redis from 'ioredis'
import RedisStore from 'koa-redis'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import cluster from 'cluster'
import compress from 'koa-compress'
import cors from '@koa/cors'
import fg from 'fast-glob'
import koaCash from 'koa-cash'
import logger from 'koa-logger'
import os from 'os'
import path from 'path'
import ratelimit from 'koa-ratelimit'
import serve from 'koa-static'
import session from 'koa-session'

/** CLI argv shape after Flight applies defaults (see block below). */
interface FlightArgv {
    session_duration?: number
    app_home?: string
    app_key?: string
    app_secret?: string
    port?: number | string
    payload_limit?: string
    disable_vite?: boolean
    mode?: string
    exclude_paths?: string[]
}

function normalizeExcludePaths(value: unknown): string[] {
    if (value == null || value === '') return []
    const parts = Array.isArray(value) ? value : [value]
    const out: string[] = []
    for (const p of parts) {
        const s = String(p).trim()
        if (!s) continue
        out.push(
            ...s
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean)
        )
    }
    return out
}

function dedupeStrings(items: string[]): string[] {
    return [...new Set(items)]
}

/** Build fast-glob ignore globs for trees rooted under `appRootAbs`. */
function backendDiscoveryIgnorePatterns(appRootAbs: string, excludeRelativeDirs: string[]): string[] {
    const patterns: string[] = []
    for (const raw of excludeRelativeDirs) {
        const trimmed = raw.trim()
        if (!trimmed) continue
        const resolved = path.resolve(appRootAbs, trimmed)
        const rel = path.relative(appRootAbs, resolved)
        const relPosix = rel.replace(/\\/g, '/')
        if (!relPosix || relPosix.startsWith('..') || path.isAbsolute(rel)) {
            console.warn(`Flight: exclude_paths entry skipped (outside app_home): ${trimmed}`)
            continue
        }
        patterns.push(`${relPosix}/**`)
    }
    return patterns
}

// tsx (and similar loaders) may expose require('yargs/yargs') as { default: factory } instead of factory.
interface YargsInstance {
    option(key: string, opts: Record<string, unknown>): YargsInstance
    parseSync(): FlightArgv
}
type YargsFn = (args: string[]) => YargsInstance
const _yargs = require('yargs/yargs') as YargsFn | { default: YargsFn }
const yargsEntry: YargsFn = typeof _yargs === 'function' ? _yargs : _yargs.default
const argv = yargsEntry(process.argv.slice(2))
    .option('exclude_paths', {
        alias: 'exclude-paths',
        type: 'array',
        string: true,
        default: [],
        describe: 'Directories under app_home to skip when discovering **/*.backend.ts (repeat flag or comma-separated)'
    })
    .parseSync() as FlightArgv

// Set default session duration (24 hours in milliseconds)
const DEFAULT_SESSION_DURATION = 86400000 // 24 hours in milliseconds

// Get session duration from environment variable or command line argument
argv.session_duration = Number(process.env.FLIGHT_SESSION_DURATION_MS) || argv.session_duration

// Validate session duration
if (isNaN(argv.session_duration) || argv.session_duration < 0) {
    console.error('Invalid session duration specified. Using default of 24 hours (86400000ms).')
    argv.session_duration = DEFAULT_SESSION_DURATION
}

if (!argv.app_home) {
    argv.app_home = '.'
}

if (!argv.app_key) {
    argv.app_key = 'flightApp'
}

if (!argv.app_secret) {
    argv.app_secret = 'the best secret key in the world'
}

// Set default port values
if (!argv.port) {
    // Check for environment variable first, then use default
    argv.port = process.env.FLIGHT_PORT || 3000
}

if (!argv.payload_limit) {
    argv.payload_limit = process.env.FLIGHT_PAYLOAD_LIMIT || '1mb'
}

// Convert port to number
argv.port = Number(argv.port)

// Validate port is a valid number
if (isNaN(argv.port) || argv.port < 1 || argv.port > 65535) {
    console.error('Invalid port specified. Using default port 3000.')
    argv.port = 3000
}

// Set default value for disable_vite flag
if (argv.disable_vite === undefined) {
    // Check for environment variable first, then default to false
    argv.disable_vite = process.env.FLIGHT_DISABLE_VITE === 'true' ? true : false
}

// Ensure the value is a boolean
argv.disable_vite = Boolean(argv.disable_vite)

const appHomePath = path.resolve(argv.app_home)
const excludePathsConfigured = dedupeStrings([
    ...normalizeExcludePaths(argv.exclude_paths),
    ...normalizeExcludePaths(process.env.FLIGHT_EXCLUDE_PATHS)
])
const backendDiscoveryIgnores = backendDiscoveryIgnorePatterns(appHomePath, excludePathsConfigured)

process.chdir(appHomePath)

console.log(appHomePath)
if (backendDiscoveryIgnores.length > 0) {
    console.log(
        'Flight: excluding **/*.backend.ts discovery under:',
        backendDiscoveryIgnores.map((g) => g.replace(/\*\*$/, '')).join(', ')
    )
}

const mode = process.env.FLIGHT_MODE || argv.mode || 'production'

/** Prefix without breaking printf-style logs (koa-logger uses `%s` as the first argument). */
const flightModeLabel = `Flight (${mode}):`
const origConsoleLog = console.log.bind(console)
console.log = (first?: unknown, ...rest: unknown[]): void => {
    if (typeof first === 'string' && /%[sdjifoO%]/.test(first)) {
        origConsoleLog(`${flightModeLabel} ${first}`, ...rest)
    } else if (first !== undefined) {
        origConsoleLog(flightModeLabel, first, ...rest)
    } else {
        origConsoleLog(flightModeLabel)
    }
}

const redis = new Redis({
    host: process.env.FLIGHT_REDIS_HOST || 'localhost',
    port: Number(process.env.FLIGHT_REDIS_PORT) || 6379
})

if (cluster.isPrimary) {
    const numCPUs = os.cpus().length
    const maxWorkers = Number(process.env.FLIGHT_MAX_WORKERS) || numCPUs
    const workersCount = Math.min(maxWorkers, numCPUs)

    for (let i = 0; i < workersCount; i++) {
        cluster.fork()
    }

    cluster.on('exit', () => {
        cluster.fork()
    })
} else {
    const app = new Koa()
    app.use(logger())

    app.keys = argv.app_secret.split(',')

    const SESSION_CONFIG = {
        key: argv.app_key,
        maxAge: argv.session_duration,
        sameSite: true,
        path: '/',
        store: RedisStore({
            client: redis
        })
    }

    app.use(session(SESSION_CONFIG, app))

    const router = new Router()

    app.use(cors()).use(
        bodyParser({
            jsonLimit: argv.payload_limit
        })
    )

    const backEndFiles = fg.sync('**/*.backend.ts', {
        ignore: backendDiscoveryIgnores
    })
    backEndFiles.forEach((file) => {
        const serverRoutes = require(path.resolve(file))

        console.log('Found component backend file: ' + path.resolve(file))

        if (serverRoutes && serverRoutes.default) {
            router.use(serverRoutes.default)
        }
    })

    app.use(router.routes()).use(router.allowedMethods())

    if (mode === 'production') {
        console.log('Starting flight in production mode')

        if (!argv.disable_vite) {
            exec('npx vite build', (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`)
                    return
                }
                console.log(`stdout: ${stdout}`)
                console.error(`stderr: ${stderr}`)
            })
        }

        app.use(compress())
        app.use(
            ratelimit({
                driver: 'redis',
                db: redis,
                duration: 60000,
                errorMessage: 'Sometimes You Just Have to Slow Down.',
                id: (ctx) => ctx.get('x-forwarded-for') || ctx.ip,
                headers: {
                    remaining: 'Rate-Limit-Remaining',
                    reset: 'Rate-Limit-Reset',
                    total: 'Rate-Limit-Total'
                },
                max: 1200,
                disableHeader: false
            })
        )
        app.use(
            koaCash({
                get: (key) => redis.get(key),
                set: (key, value) => redis.set(key, value, 'EX', 30)
            })
        )
        app.use(serve(process.env.FLIGHT_DIST_PATH || '../dist'))

        if (!argv.disable_vite) {
            console.log(`App served out of dist/ and available on port ${argv.port}`)
        } else {
            console.log(`App served out of ${appHomePath} and available on port ${argv.port}`)
        }
    }

    app.listen(argv.port, () => {
        console.log(`Server worker ${process.pid} started, All backend services are running on port ${argv.port}`)
    })

    if (mode === 'development') {
        console.log('Starting flight in development mode')
        const viteProcess = spawn('npx', ['vite', '--port', '3001', '--host', '0.0.0.0'], {
            stdio: 'inherit',
            shell: true
        })

        viteProcess.on('error', (error) => {
            console.error('Failed to start vite server:', error)
        })

        viteProcess.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Vite server exited with code ${code}`)
            }
        })

        process.on('SIGINT', () => {
            viteProcess.kill('SIGINT')
            process.exit(0)
        })

        console.log(`Vite development server with hot module reload ${process.pid} started on 3001`)
    }
}
