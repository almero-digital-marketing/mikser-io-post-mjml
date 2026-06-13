import mjml2html from 'mjml'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

// Declare the produced file extension so mikser-io can compute the
// destination correctly even though the postprocessor name and the
// output extension differ.
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

    // File-path contract: write directly to entity.destination, return
    // its path so the chain dispatcher can thread it as the next stage's
    // origin. Intermediates land in scratch under runtimeFolder; final
    // stage's destination is the outputFolder/<destination>.
    const outputPath = path.join(options.outputFolder, entity.destination)
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, html)
    return { success: true, result: entity.destination }
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
