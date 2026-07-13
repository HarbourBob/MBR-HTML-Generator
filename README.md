# MBR HTML Generator

A two-panel HTML generator for WordPress. Compose visually in TinyMCE on the left; watch the formatted, syntax-highlighted HTML appear in real time on the right.

Available as an admin Tools page **and** as a `[mbr_html_generator]` shortcode for embedding on any frontend page or post.

Bundled with TinyMCE 8.5.0 (GPL community edition) — no CDN, no API key, no upsells.

## Features

- Two-panel split: TinyMCE editor on the left, live HTML output on the right
- Available as an admin tool **and** as a `[mbr_html_generator]` frontend shortcode
- **Tidy toggle** that cleans up TinyMCE's HTML output for more semantic markup — see below
- **Classify toggle** that extracts inline `style` attributes into reusable CSS utility classes — see below
- **Custom CSS panel** for writing your own CSS — applied live in the editor and included in the output — see below
- Skeleton loading state inside the editor panel while TinyMCE downloads, so the page feels responsive immediately
- Self-hosted bundled fonts on the frontend (Geist, Fraunces, JetBrains Mono) — no Google Fonts dependency
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
3. To use it in the admin, open **Tools → HTML Generator**.
4. To use it on the frontend, add `[mbr_html_generator]` to any page or post.

## Shortcode

```
[mbr_html_generator]
```

The shortcode renders the same two-panel tool inside the post content. Frontend assets (TinyMCE, js-beautify, stylesheets, fonts) are only enqueued on pages where the shortcode is detected — pages without it stay completely unaffected.

**Single-instance:** Only one `[mbr_html_generator]` per page is supported. A second copy on the same page renders a notice (visible to logged-in editors only) instead of broken duplicate markup.

**Loading behaviour:** TinyMCE is loaded in the document footer on the frontend so the page paints before the editor's ~5MB script downloads. While that's happening, a skeleton placeholder with a spinner sits inside the editor panel. The skeleton fades out the moment TinyMCE's `init` event fires.

**Audience:** The shortcode is intentionally not capability-gated. Its intended audience is anonymous visitors — web developers, designers, and students who want a quick HTML utility without signing in.

## Tidy

The output panel includes a **Tidy** toggle (on by default) that cleans up TinyMCE's HTML output for more semantic, copy-paste-ready markup. The cleanup runs entirely in the browser via `DOMParser` — no server round-trip — and falls back to the original HTML on any parsing error.

When Tidy is on, these transformations are applied:

| Input | Output | When |
|-------|--------|------|
| `<p><img src="..."></p>`, `<p><iframe …></iframe></p>`, `<p><video …></video></p>`, `<p><audio …></audio></p>` | bare embed | `<p>` contains only the embed and has no attributes of its own. `<p style="text-align:center"><img></p>` is preserved (user wants the embed centered). Same rule applies to all four media types. |
| `<h1><span style="color:red">Text</span></h1>` | `<h1 style="color:red">Text</h1>` | Span wraps all of a heading's or paragraph's content. Style and class move up to the block element. Style merging is property-aware: if the block already has a `style` attribute, non-overlapping CSS properties from the span are merged in. Skipped only when there's a genuine property conflict (e.g. both sides defining `color`), to avoid losing data. |
| `<p style="text-align:left"><span style="color:#333">Text</span></p>` | `<p style="text-align:left; color:#333">Text</p>` | Same rule applied to paragraphs — non-conflicting styles merge onto the block. |
| `<p></p>`, `<p>&nbsp;</p>`, `<p><br></p>` | (removed) | Paragraph contains no meaningful content. |
| `<span><span>x</span></span>` | `<span>x</span>` | Nested attribute-less spans collapse to one. |
| `<p style=""></p>` | `<p></p>` | Empty `style` attribute stripped. |

Toggle Tidy off in the output panel header to see TinyMCE's exact output. The Copy and Download buttons always match what's currently displayed in the output panel — so what you see is what you copy.

The toggle state is persisted to `localStorage` (key `mbrHtmlGen.tidy`), per-browser, and applies to both the admin tool and the frontend shortcode independently.

## Classify

The output panel also includes a **Classify** toggle (off by default) that extracts inline `style` attributes into reusable, atomic CSS utility classes. Each unique CSS property/value declaration becomes one class; repeated declarations across elements share the same class. The generated rules are emitted as a single `<style>` block at the top of the output, so what you see is a self-contained, copy-pasteable artefact.

This turns the kind of output TinyMCE produces:

```html
<h1 style="color: #e03e2c; font-size: 36px;">Heading</h1>
<p style="color: #e03e2c;">Same red.</p>
```

into:

```html
<style>
.c-e03e2c { color: #e03e2c; }
.fs-36 { font-size: 36px; }
</style>
<h1 class="c-e03e2c fs-36">Heading</h1>
<p class="c-e03e2c">Same red.</p>
```

**Class naming.** Format is `{property-abbreviation}-{value-token}`, kebab-cased. Known properties have short abbreviations (`c` for `color`, `bg` for `background-color`, `fs` for `font-size`, `ta` for `text-align`, `m`/`mt`/`mr`/`mb`/`ml` for margin, etc.); unknown properties fall back to the full kebab name (`caret-color-red`). Values are normalised for class-name safety: `#` is stripped from hex colours, `px` units are stripped (the implicit default), decimals become `p` (`1.5em` → `1p5em`), `%` becomes `pc` (`100%` → `100pc`), negatives become `n` (`-10px` → `n10`), and spaces between multi-token values become hyphens (`10px 20px` → `10-20`).

**Fallback for un-tokenisable values.** Values containing characters that can't safely live in a class name — commas, parentheses, quotes, slashes (typical of `url()`, `calc()`, `rgb()`, quoted font-families) — fall back to a per-property sequential counter: `bg-1`, `bg-2`, `ff-1`, etc. The CSS declaration in the `<style>` block keeps the original value verbatim.

**Existing classes are preserved.** If an element already has a `class` attribute, the generated classes append to it: `class="hero"` + a style of `color: red` becomes `class="hero c-red"`. No attempt is made to merge or rewrite the user's own classes.

**No prefix.** Classes are unprefixed (`c-red`, not `mbr-c-red`) so the output drops cleanly into an existing project. If you have a class name collision, rename your own class — the generated names are atomic and predictable.

### Tidy and Classify together

Tidy and Classify are independent toggles, but they're designed to work as a pair. Tidy consolidates styles onto block elements (unwrapping spans inside headings and paragraphs, merging non-conflicting properties onto the block); Classify then turns those consolidated styles into shared utility classes. The natural workflow is **Tidy on, then turn Classify on** when you want the output as a stylesheet.

Classify works on its own — it doesn't require Tidy — but with Tidy off you'll see more classes than necessary because TinyMCE's redundant span wrappers each get their own class.

The Classify toggle state is persisted to `localStorage` (key `mbrHtmlGen.classify`), per-browser, and applies to both the admin tool and the frontend shortcode independently.

## Custom CSS

The editor panel includes a collapsible **CSS drawer**, opened from the **CSS** button in the editor header. Whatever you write in the drawer is applied live to the editor preview *and* included at the top of the generated output — letting you write base styles for the elements you're composing, and see them take effect immediately as you work in TinyMCE.

The drawer is closed by default. Its open/closed state and its contents are both persisted to `localStorage`, so reopening the tool brings you back exactly where you left off. Inside the drawer header, a line count shows the current size, and a **Clear** button wipes the drawer in one click (your editor content is untouched — Clear in the editor header and Clear in the CSS drawer are deliberately separate).

**How the live preview works.** The custom CSS is injected into TinyMCE's content iframe as a `<style>` element. As you type, the rules update on a 150ms debounce — write `.card { padding: 20px; border: 1px solid #ccc }`, type `<div class="card">…</div>` in the editor (via the toolbar's source view or Insert HTML), and the padding and border appear in the preview the moment you stop typing.

**How the output works.** Whenever the drawer has non-empty content, the output includes a `<style>` block at the top with your CSS verbatim. When Classify is also on, the user CSS and the generated atomic rules merge into the same `<style>` block, with the user CSS first:

```html
<style>
.card { padding: 16px; border: 1px solid #ccc; }
.c-e03e2c { color: #e03e2c; }
.fs-36 { font-size: 36px; }
</style>
<h1 class="c-e03e2c fs-36">Heading</h1>
<div class="card">Card content</div>
```

This ordering is deliberate — it matches utility-class cascade semantics. Your CSS is the base layer; Classify's atomic classes are utilities that can override the base by source-order cascade. So a rule like `.c-red { color: blue }` in your custom CSS will get overridden by Classify's auto-generated `.c-red { color: red }` rule that comes after, exactly as you'd expect from a utility-class system.

**Independence.** The drawer's content makes it into the output regardless of Tidy or Classify state — no master toggle. Empty drawer means no `<style>` block from your CSS. The three features (Tidy, Classify, Custom CSS) are independently toggleable and combine cleanly in any combination.

**No validation.** The CSS is text. You're writing it for your own output; the plugin doesn't inspect or sanitise it. `@import`, `@media`, `@keyframes`, CSS variables, vendor prefixes — anything that's valid CSS in a browser will work here.

The drawer state and content are persisted to `localStorage` (keys `mbrHtmlGen.customCss` and `mbrHtmlGen.cssDrawerOpen`), per-browser, and apply to both the admin tool and the frontend shortcode independently.

## Filters

### `mbr_html_generator_capability`

Change the capability required to open the **admin** tool. Defaults to `manage_options`. Does not affect the frontend shortcode.

```php
add_filter( 'mbr_html_generator_capability', function () {
    return 'edit_posts';
} );
```

### `mbr_html_generator_frontend_assets`

Force frontend assets to enqueue on a page where the shortcode isn't detected by the standard `has_shortcode( $post->post_content, … )` scan. Useful when the shortcode is rendered by a page builder widget that bypasses post content (for example an Elementor shortcode widget or a Gutenberg block whose attributes are stored separately).

```php
add_filter( 'mbr_html_generator_frontend_assets', function ( $needed ) {
    if ( is_page( 'html-tools' ) ) {
        return true;
    }
    return $needed;
} );
```

## Bundled fonts

The frontend shortcode uses self-hosted webfonts: Geist (sans), Fraunces (italic display), and JetBrains Mono (code). The `@font-face` declarations live in `assets/css/frontend.css` and reference woff2 files in `assets/fonts/`.

If those font files are missing, the browser falls back through the CSS stack (system sans, Georgia, system mono) — the plugin keeps working, it just doesn't use the intended typefaces. See `assets/fonts/README.md` for the file list, source URLs, and licences.

## Privacy

The tool runs entirely client-side. Nothing is sent to a server, no data is stored in the database, and no third-party services are contacted. The bundled TinyMCE assets and bundled fonts are served from the plugin directory.

The admin Tools page loads Google Fonts (Geist, Fraunces, JetBrains Mono) for visual consistency with the existing admin look. The frontend shortcode does **not** load Google Fonts — it uses self-hosted woff2 files instead, which keeps it GDPR-friendly for public-facing pages.

Editor content and toggle preferences (theme, format, wrap) persist in the browser's `localStorage`. The Clear button wipes both the editor and the saved content, and is the single way to start fresh.

The localStorage keys used are:

- `mbrHtmlGen.content` — the editor's HTML
- `mbrHtmlGen.theme` — `light` or `dark`
- `mbrHtmlGen.format` — `1` (pretty-printed) or `0` (raw)
- `mbrHtmlGen.tidy` — `1` (apply HTML cleanup) or `0` (raw TinyMCE output)
- `mbrHtmlGen.classify` — `1` (extract inline styles to CSS classes) or `0` (leave inline)
- `mbrHtmlGen.customCss` — the contents of the Custom CSS drawer
- `mbrHtmlGen.cssDrawerOpen` — `1` (drawer open) or `0` (drawer closed)
- `mbrHtmlGen.wrap` — `1` (line-wrap on) or `0` (off)

## Bundled third-party software

- **TinyMCE 8.5.0** — GPL v2 (or later) community edition. Distributed in `vendor/tinymce/`. See `vendor/tinymce/license.md`.
- **js-beautify 1.15.4** — MIT licence. Distributed in `vendor/js-beautify/`. See `vendor/js-beautify/LICENSE`.
- **Lucide icons** — ISC licence. Icon paths are inlined as SVG in the plugin. See https://lucide.dev/license.
- **Geist, Fraunces, JetBrains Mono** — SIL Open Font License 1.1. Self-hosted in `assets/fonts/` (frontend only). See `assets/fonts/README.md`.

All licences are GPL-compatible and the code is bundled locally — no external CDN (frontend), no API keys, no telemetry.

## Licence

GPL v2 or later. See `LICENSE` (or https://www.gnu.org/licenses/gpl-2.0.html).

## Author

Robert Palmer · [madebyrobert.co.uk](https://madebyrobert.co.uk) · [littlewebshack.com](https://littlewebshack.com)
