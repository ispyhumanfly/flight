import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import Router from '@koa/router'
import Koa from 'koa'
import serve from 'koa-static'
import request from 'supertest'

import {
    parseCommaPrefixes,
    productionSpaPipelineActive,
    shouldSkipRateLimitForPath,
    spaIndexHtmlFallback
} from './spa-pipeline.js'

function makeTempDist(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flight-spa-'))
    fs.mkdirSync(path.join(dir, 'assets'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>flight-spa</title>', 'utf8')
    fs.writeFileSync(path.join(dir, 'assets', 'app.js'), "export const x = 'asset'", 'utf8')
    fs.writeFileSync(path.join(dir, 'secret.txt'), 'nope', 'utf8')
    return dir
}

function buildSpaStack(dist: string): Koa {
    const app = new Koa()
    const router = new Router()
    router.get('/api/ping', async (ctx) => {
        ctx.body = { ok: true }
    })
    app.use(router.routes()).use(router.allowedMethods())
    app.use(serve(dist))
    app.use(spaIndexHtmlFallback(dist, 'index.html', []))
    return app
}

test('productionSpaPipelineActive: production + disable_vite on by default', () => {
    assert.equal(productionSpaPipelineActive('production', true, {}), true)
})

test('productionSpaPipelineActive: opt-out env', () => {
    assert.equal(productionSpaPipelineActive('production', true, { FLIGHT_DISABLE_SPA_PIPELINE: '1' }), false)
    assert.equal(productionSpaPipelineActive('production', true, { FLIGHT_DISABLE_SPA_PIPELINE: 'true' }), false)
})

test('productionSpaPipelineActive: not when vite enabled', () => {
    assert.equal(productionSpaPipelineActive('production', false, {}), false)
})

test('productionSpaPipelineActive: not in development', () => {
    assert.equal(productionSpaPipelineActive('development', true, {}), false)
})

test('parseCommaPrefixes: defaults and trimming', () => {
    assert.deepEqual(parseCommaPrefixes(undefined, '/a,/b'), ['/a', '/b'])
    assert.deepEqual(parseCommaPrefixes('x, y', '/z'), ['/x', '/y'])
})

test('shouldSkipRateLimitForPath', () => {
    assert.equal(shouldSkipRateLimitForPath('/assets/foo.js', 'GET', ['/assets']), true)
    assert.equal(shouldSkipRateLimitForPath('/api/x', 'GET', ['/assets']), false)
    assert.equal(shouldSkipRateLimitForPath('/assets/foo.js', 'POST', ['/assets']), false)
})

test('GET hashed asset returns file body, not index.html', async () => {
    const dist = makeTempDist()
    const app = buildSpaStack(dist)
    const res = await request(app.callback()).get('/assets/app.js')
    assert.equal(res.status, 200)
    assert.match(res.text, /export const x/)
})

test('GET SPA deep link with Accept: text/html serves index.html', async () => {
    const dist = makeTempDist()
    const app = buildSpaStack(dist)
    const res = await request(app.callback()).get('/dashboard/deep').set('Accept', 'text/html')
    assert.equal(res.status, 200)
    assert.match(res.text, /flight-spa/)
})

test('GET /api/ping returns JSON', async () => {
    const dist = makeTempDist()
    const app = buildSpaStack(dist)
    const res = await request(app.callback()).get('/api/ping').set('Accept', 'application/json')
    assert.equal(res.status, 200)
    assert.deepEqual(res.body, { ok: true })
})

test('GET unknown /api route does not fall back to index.html', async () => {
    const dist = makeTempDist()
    const app = buildSpaStack(dist)
    const res = await request(app.callback()).get('/api/missing').set('Accept', 'text/html')
    assert.equal(res.status, 404)
    assert.ok(!String(res.text).includes('flight-spa'))
})

test('path with file extension in last segment is not rewritten to index', async () => {
    const dist = makeTempDist()
    const app = buildSpaStack(dist)
    const res = await request(app.callback()).get('/anything/secret.txt').set('Accept', 'text/html')
    assert.equal(res.status, 404)
})
