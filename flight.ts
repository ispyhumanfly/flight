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
import session from "koa-session"

import Redis from 'ioredis'

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

    app.keys = ['MY secret keys']

    const SESSION_CONFIG = {
        // Session configuration options
        // For example, to change the cookie name:
        key: 'koa:sess', // default
        maxAge: 86400000, // cookie's expire time, 24 hours in milliseconds
        // additional configurations...
    };

    app.use(session(SESSION_CONFIG, app))

    const router = new Router()

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
                db: new Redis(),
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
        console.log("App served out of dist/ and available on port 3000")
    }

    app.use(cors()).use(bodyParser())

    const backEndFiles = fg.sync('app/components/**/*.backend.ts')
    backEndFiles.forEach((file) => {
        const serverRoutes = require(path.resolve(file))
        if (serverRoutes && serverRoutes.default) {
            router.use(serverRoutes.default)
        }
    })

    app.use(router.routes()).use(router.allowedMethods())

    app.listen(3000, () => {
        console.log(`Server worker ${process.pid} started, All backend services are running on port 3000`)
    })

    if (argv.mode === 'development') {
        exec(__dirname + '/node_modules/.bin/vite', (error, stdout, stderr) => {
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
