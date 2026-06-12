import mjml2html from 'mjml'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

// Declare the produced file extension so mikser-io can compute the
// destination correctly even though the postprocessor name and the
// output extension differ. Requires mikser-io >= 6.3.
export const output = 'html'

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

    return html
}

// v9 factory — ADR-0010.
export function postMjml(options = {}) {
    return {
        name: options.name ?? 'mjml',
        options,
        output,
        postprocess,
    }
}
