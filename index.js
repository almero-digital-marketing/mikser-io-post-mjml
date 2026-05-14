import mjml2html from 'mjml'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export async function postprocess({ entity, options, config, logger }) {
    const sourcePath = path.join(options.outputFolder, entity.origin)
    const source = await readFile(sourcePath, 'utf8')

    const { html, errors } = await mjml2html(source, {
        validationLevel: 'soft',
        ...config?.options,
    })

    if (errors?.length) {
        for (const err of errors) {
            logger.warn('MJML %s:%d %s', entity.name || entity.id, err.line || 0, err.message || err.formattedMessage)
        }
    }

    // The default postprocessor convention names the output extension after the
    // postprocessor key (`.mjml` here). MJML actually produces HTML — rewrite
    // the destination so the writer emits `*.html`.
    if (entity.destination?.endsWith('.mjml')) {
        const desired = entity.destination.slice(0, -'.mjml'.length) + '.html'
        // Avoid the origin/destination collision (e.g. layout `name.html-mjml.hbs`
        // gives origin=`name.html`, which is also the desired output path).
        // Clearing origin prevents onComplete from unlinking our final file.
        if (desired === entity.origin) entity.origin = undefined
        entity.destination = desired
    }

    return html
}
