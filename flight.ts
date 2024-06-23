#!ts-node

import Koa from 'koa'
import Router from '@koa/router'
import fg from 'fast-glob'
import path, { resolve } from 'path'
import cors from '@koa/cors'
import bodyParser from 'koa-bodyparser'
import logger from 'koa-logger'
import compress from 'koa-compress'
import ratelimit from 'koa-ratelimit'
import cluster from 'cluster'
import os from 'os'
import { exec } from 'child_process'
import serve from 'koa-static'
import cache from 'koa-redis-cache' // Import the middleware
import session from 'koa-session'
import RedisStore from 'koa-redis'
import Redis from 'ioredis'
// import send from 'koa-send'
// import historyFallback from 'koa-connect-history-api-fallback'

const argv = require('yargs/yargs')(process.argv.slice(2)).argv

if (!argv.app_home) {
    argv.app_home = '.'
}

const appHomePath = path.resolve(argv.app_home)
process.chdir(appHomePath)

console.log(appHomePath)

if (!argv.mode) {
    argv.mode = 'development'
}

console.log = console.log.bind(null, 'Flight:')

const redis = new Redis({
    host: process.env.FLIGHT_REDIS_HOST || 'localhost',
    port: Number(process.env.FLIGHT_REDIS_PORT) || 6379
})

if (cluster.isPrimary) {
    const numCPUs = os.cpus().length

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork()
    }

    cluster.on('exit', () => {
        cluster.fork()
    })
} else {
    const app = new Koa()
    app.use(logger())

    app.keys = ['//input example secret key//']

    const SESSION_CONFIG = {
        // Session configuration options
        // For example, to change the cookie name:
        key: 'flightApp', // default
        maxAge: 86400000, // cookie's expire time, 24 hours in milliseconds
        // autoCommit: true, /** (boolean) automatically commit headers (default true) */
        // overwrite: true, /** (boolean) can overwrite or not (default true) */
        // httpOnly: true, /** (boolean) httpOnly or not (default true) */
        // signed: true, /** (boolean) signed or not (default true) */
        // rolling: false, /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. (default is false) */
        // renew: false, /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false)*/
        // secure: false, /** (boolean) secure cookie*/
        sameSite: true /** (string) session cookie sameSite options (default null, don't set it) */,
        path: '/' /** (string) session cookie path */,
        store: RedisStore({
            client: redis
        })
    }

    app.use(session(SESSION_CONFIG, app))

    const router = new Router()

    app.use(cors()).use(bodyParser())

    const backEndFiles = fg.sync('**/*.backend.ts')
    backEndFiles.forEach((file) => {
        const serverRoutes = require(path.resolve(file))

        console.log('Found backend file: ' + path.resolve(file))

        if (serverRoutes && serverRoutes.default) {
            router.use(serverRoutes.default)
        }
    })

    app.use(router.routes()).use(router.allowedMethods())

    if (argv.mode === 'production') {
        exec('npx vite build', (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`)
                return
            }
            console.log(`stdout: ${stdout}`)
            console.error(`stderr: ${stderr}`)
        })

        app.use(compress())
        app.use(
            ratelimit({
                driver: 'redis',
                db: redis,
                duration: 60000,
                errorMessage: 'Sometimes You Just Have to Slow Down.',
                id: (ctx) => ctx.ip,
                headers: {
                    remaining: 'Rate-Limit-Remaining',
                    reset: 'Rate-Limit-Reset',
                    total: 'Rate-Limit-Total'
                },
                max: 100,
                disableHeader: false
            })
        )
        app.use(cache({ expire: 30 /* Cache time in seconds */ }))
        app.use(serve('../dist'))
        console.log('App served out of dist/ and available on port 3000')
    }

    app.listen(3000, () => {
        console.log(`Server worker ${process.pid} started, All backend services are running on port 3000`)
    })

    if (argv.mode === 'development') {
        exec('npx vite', (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`)
                return
            }
            console.log(`stdout: ${stdout}`)
            console.error(`stderr: ${stderr}`)
        })

        console.log(`Vite development server with hot module reload ${process.pid} started on 3001`)
    }
}
