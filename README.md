# MBR HTML Generator

A two-panel HTML generator for the WordPress admin. Compose visually in TinyMCE on the left; watch the formatted, syntax-highlighted HTML appear in real time on the right.

Bundled with TinyMCE 8.5.0 (GPL community edition) — no CDN, no API key, no upsells.

## Features

- Two-panel split: TinyMCE editor on the left, live HTML output on the right
- Pretty-printed, syntax-highlighted source view that updates as you type or format
- Production-grade formatting via bundled js-beautify
- Auto-save to `localStorage` with silent restore (debounced, no server round-trip)
- Multi-tab sync — edits in one tab mirror to others
- Copy-to-clipboard with toast confirmation
- Download as `.html` file (respects the Format toggle)
- Format toggle (raw vs. pretty-printed) and line-wrap toggle
- Light and dark mode, with the TinyMCE skin matching the chrome
- Live character, word and line counts
- Locally-bundled TinyMCE 8.5.0 and js-beautify — no external CDN dependency, no licence prompts
- UK English throughout, fully translatable
- No tracking, no upsells, no premium tier

## Requirements

- WordPress 5.8 or later
- PHP 7.4 or later

## Installation

1. Upload the `mbr-html-generator` folder to `/wp-content/plugins/`, or install the ZIP through **Plugins → Add New → Upload Plugin**.
2. Activate the plugin from the Plugins screen.
3. Open **Tools → HTML Generator** in the WordPress admin.

## Filters

### `mbr_html_generator_capability`

Change the capability required to open the tool. Defaults to `manage_options`.

```php
add_filter( 'mbr_html_generator_capability', function () {
    return 'edit_posts';
} );
```

## Privacy

The tool runs entirely client-side. Nothing is sent to a server, no data is stored in the database, and no third-party services are contacted. The bundled TinyMCE assets are served from the plugin directory.

Editor content and toggle preferences (theme, format, wrap) persist in the browser's `localStorage`. The Clear button wipes both the editor and the saved content, and is the single way to start fresh.

The localStorage keys used are:

- `mbrHtmlGen.content` — the editor's HTML
- `mbrHtmlGen.theme` — `light` or `dark`
- `mbrHtmlGen.format` — `1` (pretty-printed) or `0` (raw)
- `mbrHtmlGen.wrap` — `1` (line-wrap on) or `0` (off)

## Bundled third-party software

- **TinyMCE 8.5.0** — GPL v2 (or later) community edition. Distributed in `vendor/tinymce/`. See `vendor/tinymce/license.md`.
- **js-beautify 1.15.4** — MIT licence. Distributed in `vendor/js-beautify/`. See `vendor/js-beautify/LICENSE`.
- **Lucide icons** — ISC licence. Icon paths are inlined as SVG in the plugin. See https://lucide.dev/license.

All licences are GPL-compatible and the code is bundled locally — no external CDN, no API keys, no telemetry.

## Licence

GPL v2 or later. See `LICENSE` (or https://www.gnu.org/licenses/gpl-2.0.html).

## Author

Robert Palmer · [madebyrobert.co.uk](https://madebyrobert.co.uk) · [littlewebshack.com](https://littlewebshack.com)
