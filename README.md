# mikser-io-post-mjml

[MJML](https://www.npmjs.com/package/mjml) postprocessor for [Mikser](https://github.com/almero-digital-marketing/mikser-io). Compiles a rendered MJML document into responsive email-safe HTML.

Multi-format publishing — when the same source content needs to ship as both a web page *and* a responsive email. MJML compiles down to the table-soup HTML that survives Outlook, Gmail, Apple Mail, every dark-mode quirk. Sits in mikser's postprocess phase, so emails build in the same pipeline as the rest of the site — no separate email build script, no MJML CLI, no out-of-band sync.

## Install

```bash
npm install mikser-io-post-mjml
```

## Usage

```js
// mikser.config.js
import { postMjml } from 'mikser-io-post-mjml'

export default {
  plugins: [
    postMjml({
      options: { keepComments: false, minify: true }
    })
  ]
}
```

The `options` key is passed through to [`mjml2html`](https://www.npmjs.com/package/mjml). The plugin sets `validationLevel: 'soft'` by default.

## Layout naming

Mikser's convention for layouts that need a postprocessor is `<name>.<format>-<postprocessor>.<template>`. Use the `-mjml` suffix to opt in:

| Layout file | Renderer output | Final output |
|---|---|---|
| `welcome.html-mjml.hbs` | MJML markup (rendered via HBS) | `welcome.html` |
| `welcome.html-mjml.liquid` | MJML markup (rendered via Liquid) | `welcome.html` |

The renderer's job is to produce **MJML markup**; the `format` segment (`html` above) is mostly a no-op for naming. The plugin reads the rendered file, compiles MJML → HTML, and writes the result to `<name>.html`.

### Why not just `welcome.mjml.hbs`?

Without the `-mjml` postprocessor suffix, Mikser treats the rendered output as the final file (`welcome.mjml`) — no compilation happens. The suffix is what hooks the postprocessor into the pipeline.

## Example layout

```hbs
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text font-size="20px">{{document.meta.title}}</mj-text>
        <mj-text>{{document.meta.body}}</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

MJML validation errors (if any) are surfaced via the Mikser logger as warnings.

## License

MIT
