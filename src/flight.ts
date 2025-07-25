#!ts-node

import { exec, spawn } from 'child_process'

import Koa from 'koa'
import Redis from 'ioredis'
import RedisStore from 'koa-redis'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import cache from 'koa-redis-cache' // Import the middleware
import cluster from 'cluster'
import compress from 'koa-compress'
import cors from '@koa/cors'
import fg from 'fast-glob'
import logger from 'koa-logger'
import os from 'os'
import path from 'path'
import ratelimit from 'koa-ratelimit'
import serve from 'koa-static'
import session from 'koa-session'

const argv = require('yargs/yargs')(process.argv.slice(2)).argv

// Set default session duration (24 hours in milliseconds)
const DEFAULT_SESSION_DURATION = 86400000; // 24 hours in milliseconds

// Get session duration from environment variable or command line argument
argv.session_duration = Number(process.env.FLIGHT_SESSION_DURATION_MS) || argv.session_duration;

// Validate session duration
if (isNaN(argv.session_duration) || argv.session_duration < 0) {
    console.error('Invalid session duration specified. Using default of 24 hours (86400000ms).');
    argv.session_duration = DEFAULT_SESSION_DURATION;
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
process.chdir(appHomePath)

console.log(appHomePath)

const mode = process.env.FLIGHT_MODE || argv.mode || 'production'

console.log = console.log.bind(null, `Flight (${mode}):`)

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

    argv.payload_limit = process.env.FLIGHT_PAYLOAD_LIMIT || argv.payload_limit || '1mb'

    app.use(cors()).use(
        bodyParser({
            jsonLimit: argv.payload_limit
        })
    )

    const backEndFiles = fg.sync('**/*.backend.ts')
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
        app.use(cache({ expire: 30 /* Cache time in seconds */ }))
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
