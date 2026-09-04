// Compiling MJML to HTML as a postprocess stage.
//
// The interesting parts are not the compile — mjml does that — but the
// contract this stage has with the engine's chain dispatcher:
//
//   - it reads entity.origin and writes entity.destination, both relative to
//     options.outputFolder
//   - it returns { success, result } where result is the destination the NEXT
//     stage should treat as its origin
//   - `output` declares 'html', because the postprocessor is called mjml and
//     the engine would otherwise compute a destination ending in .mjml
//   - validation problems are WARNINGS. An email that compiles with a soft
//     complaint still has to ship; failing the build on it would make one
//     unclosed attribute take a site down.
//
// Exercised against real files in a temp directory, because the contract IS
// filesystem behaviour and a mock of fs would be a test of the mock.

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { postMjml, postprocess, output } from '../index.js'

const MJML = `<mjml><mj-body><mj-section><mj-column>
  <mj-text>Hello</mj-text>
</mj-column></mj-section></mj-body></mjml>`

const collect = () => {
    const lines = []
    return { lines, warn: (...a) => lines.push(a.join(' ')), error: () => {}, debug: () => {} }
}

describe('compiling one entity', () => {
    let dir
    before(async () => { dir = await mkdtemp(path.join(tmpdir(), 'mjml-')) })
    after(async () => { await rm(dir, { recursive: true, force: true }) })

    const run = async (source, { origin = '/mail/welcome.mjml', destination = '/mail/welcome.html', config } = {}) => {
        await mkdir(path.join(dir, path.dirname(origin)), { recursive: true })
        await writeFile(path.join(dir, origin), source)
        const logger = collect()
        const result = await postprocess({
            entity: { id: origin, name: 'welcome', origin, destination },
            options: { outputFolder: dir }, config, logger,
        })
        return { result, logger, read: () => readFile(path.join(dir, destination), 'utf8') }
    }

    it('writes html at entity.destination', async () => {
        const { result, read } = await run(MJML)
        const html = await read()
        assert.match(html, /<html/i)
        assert.match(html, /Hello/)
        assert.equal(result.success, true)
    })

    it('returns the destination, which the next stage reads as its origin', async () => {
        // The chain dispatcher threads this value forward. Returning the
        // absolute path, or nothing, breaks a two-stage chain in a way that
        // only shows up when someone adds a second stage.
        const { result } = await run(MJML)
        assert.equal(result.result, '/mail/welcome.html')
    })

    it('creates the destination directory rather than failing on it', async () => {
        // The output folder mirrors a source tree that may not exist yet on
        // the first build.
        const { read } = await run(MJML, {
            origin: '/deep/a/b/c.mjml', destination: '/deep/x/y/z.html',
        })
        assert.match(await read(), /Hello/)
    })

    it('passes config.options through to the compiler', async () => {
        // Anything mjml supports that this package does not name.
        const { read } = await run(MJML, { config: { options: { beautify: false, minify: false } } })
        assert.match(await read(), /Hello/)
    })
})

describe('markup mjml complains about', () => {
    let dir
    before(async () => { dir = await mkdtemp(path.join(tmpdir(), 'mjml-warn-')) })
    after(async () => { await rm(dir, { recursive: true, force: true }) })

    it('warns and still produces output', async () => {
        // soft validation: an email with a questionable tag still ships. The
        // warning names the entity and the line so it can be found, and the
        // build stays green — one bad attribute must not take a site down.
        const bad = `<mjml><mj-body><mj-not-a-tag>x</mj-not-a-tag></mj-body></mjml>`
        const origin = '/m/bad.mjml', destination = '/m/bad.html'
        await mkdir(path.join(dir, '/m'), { recursive: true })
        await writeFile(path.join(dir, origin), bad)
        const logger = collect()
        const result = await postprocess({
            entity: { id: origin, name: 'bad', origin, destination },
            options: { outputFolder: dir }, config: undefined, logger,
        })
        assert.equal(result.success, true, 'a soft validation problem is not a failure')
        assert.ok(await readFile(path.join(dir, destination), 'utf8'), 'output still written')
        assert.ok(logger.lines.some(l => /MJML/.test(l) && /bad/.test(l)),
            `the warning should name the entity: ${JSON.stringify(logger.lines)}`)
    })
})

describe('the descriptor', () => {
    it('declares html as the produced extension', () => {
        // Without this the engine computes the destination from the
        // postprocessor's NAME and every email lands at .mjml.
        assert.equal(output, 'html')
        assert.equal(postMjml().output, 'html')
    })

    it('registers under `mjml`, and can be renamed', () => {
        assert.equal(postMjml().name, 'mjml')
        assert.equal(postMjml({ name: 'email' }).name, 'email')
        assert.equal(typeof postMjml().postprocess, 'function')
    })
})
