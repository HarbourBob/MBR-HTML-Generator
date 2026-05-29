=== MBR HTML Generator ===
Contributors: harbourbob
Tags: html, editor, dev tools, tinymce, code generator
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.7.2
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A two-panel HTML generator for WordPress. Compose visually in TinyMCE, watch the formatted HTML appear in real time alongside it.

== Description ==

MBR HTML Generator adds a clean, distraction-free HTML composing tool to WordPress. It runs in the admin under Tools → HTML Generator, and can also be embedded on any frontend page or post via the `[mbr_html_generator]` shortcode — useful for public-facing dev utility pages, internal team tools, or student exercises. The screen is split into two panels: TinyMCE on the left for visual editing, and a live source-code panel on the right that reflects every change as you make it.

The output is pretty-printed by default, syntax-highlighted, and can be copied to the clipboard with one click. A dark mode toggle flips both the chrome and the editor skin together, with the preference persisted between sessions.

This plugin bundles TinyMCE 8.5.0 (GPL community edition) locally — no external CDN, no API key, no licence prompts, and no telemetry. It is free, with no premium tier, no upsells, and no feature gating.

= Features =

* Two-panel split: TinyMCE editor on the left, live HTML output on the right
* Available as an admin Tools page **and** as a `[mbr_html_generator]` shortcode for embedding on any frontend page or post
* Tidy toggle that cleans up TinyMCE's HTML output for more semantic markup (unwraps standalone images from paragraphs, removes redundant spans on headings, drops empty paragraphs) — on by default, toggle off for raw output
* Classify toggle that extracts inline `style` attributes into reusable, atomic CSS utility classes (e.g. `color: red; font-size: 36px` becomes `class="c-red fs-36"` plus a single `<style>` block at the top of the output) — designed to pair with Tidy, off by default
* Collapsible Custom CSS drawer in the editor panel — write your own CSS, see it applied live in the TinyMCE preview, and get it included verbatim at the top of the generated output. When Classify is also on, your CSS and the generated atomic rules merge into the same `<style>` block with user CSS first (matching utility-class cascade semantics: base styles, then atomic utilities)
* Skeleton loading state while TinyMCE downloads, so the page feels responsive even on slow connections
* Self-hosted bundled fonts on the frontend (Geist, Fraunces, JetBrains Mono) — no Google Fonts dependency, GDPR-safe
* Pretty-printed, syntax-highlighted source view that updates in real time
* Production-grade formatting via the bundled js-beautify library
* Auto-save to localStorage with silent restore (debounced, no server round-trip)
* Multi-tab sync — edits in one tab mirror to others
* Copy-to-clipboard with toast confirmation
* Download as `.html` file (respects the Format toggle)
* Format on/off toggle (raw vs. pretty-printed)
* Line wrap toggle
* Light and dark mode, with TinyMCE skin matching the chrome
* Live character, word, and line counts
* Locally-bundled TinyMCE 8.5.0 and js-beautify — no CDN dependency, no API key
* UK English throughout, fully translatable
* No tracking, no upsells, no premium tier

= Shortcode usage =

Drop `[mbr_html_generator]` into any page, post, or builder text/shortcode block. Frontend assets (TinyMCE, js-beautify, stylesheets, fonts) only load on pages where the shortcode is present — pages without it are unaffected.

Only one instance per page is supported. A second `[mbr_html_generator]` in the same content will render a notice (visible to logged-in editors only) instead of a broken duplicate.

= Capability =

By default the admin tool requires the `manage_options` capability. To open access to editors, filter `mbr_html_generator_capability`:

`add_filter( 'mbr_html_generator_capability', function () { return 'edit_posts'; } );`

The frontend shortcode is intentionally not capability-gated — its audience is anonymous visitors using the tool as a quick utility.

== Installation ==

1. Upload the `mbr-html-generator` folder to your `/wp-content/plugins/` directory, or install the ZIP via Plugins → Add New → Upload Plugin.
2. Activate the plugin through the Plugins menu in WordPress.
3. Go to Tools → HTML Generator to start composing.

== Frequently Asked Questions ==

= Does this require a TinyMCE API key? =

No. The plugin bundles TinyMCE 8.5.0 community edition (GPL) locally and declares the `gpl` licence key in the init call, satisfying TinyMCE 8's licence requirement without any external account.

= Does it write data to the database? =

No. The tool is entirely client-side; nothing is saved server-side. Editor content and panel preferences (theme, format, wrap) persist in the browser's localStorage and never leave the device. To clear saved content, click the Clear button — it wipes both the editor and the saved copy.

= How does auto-save work? =

While you type, the editor content is saved to your browser's localStorage roughly half a second after the last change, and again on page unload as a safety net. When you reopen the tool, your previous session is restored silently. If you have the tool open in multiple tabs at once, edits made in one tab will appear in the others (last-write-wins). The Clear button is the single way to wipe saved content.

= Does it conflict with other TinyMCE instances on the site? =

The bundled TinyMCE only loads on the plugin's own admin page (Tools → HTML Generator). It does not affect Classic Editor, Gutenberg, or any other TinyMCE-driven UI elsewhere in WordPress.

== Changelog ==

= 1.7.2 =
* New: Inline colour swatches in the output panel. Every CSS colour value the output displays — `#fff`, `#ffffff`, `#ffffff80`, `rgb()`, `rgba()`, `hsl()`, `hsla()` — gets a small 10×10px coloured square rendered just before it, so colours are readable at a glance instead of having to mentally translate hex codes. Particularly useful when Classify generates rule sets like `.c-e03e2d { color: #e03e2d; }` and you want to see what `#e03e2d` actually looks like.
* Display-only decoration: the swatches live in the output panel rendering only. The text that Copy and Download produce is untouched (CSS source is plain text; there's no way to embed a coloured square IN the CSS that would survive a copy-paste). The swatches use a CSS custom property and a `::before` pseudo-element with a theme-aware border, so white and very pale colours remain visible against the panel background in both light and dark modes.
* Named colours (`red`, `blue`, etc.) are deliberately not decorated — detecting them safely without false positives on words like "red" inside attribute names or text content gets fiddly, and TinyMCE's colour picker emits hex anyway.
* Roughly 40 lines of JS plus a small CSS rule. No new dependencies, no impact on output content, no new toggle.

= 1.7.1 =
* Restored the TinyMCE `code` plugin (View → Source code menu item and `</>` toolbar button), which was removed in 1.2.1. The 1.2.1 rationale — that it was redundant with the live output panel — no longer holds now that 1.7.0 added the Custom CSS drawer: the output panel is read-only, and class-selector CSS rules in the drawer (`.card { padding: 20px }`) can't be applied without a way to edit the editor's underlying HTML to add `class="card"` to an element. Source code view is the simplest path back into the markup for that purpose.

= 1.7.0 =
* New: Collapsible Custom CSS drawer in the editor panel, opened from a new CSS button in the editor header. Whatever you write in the drawer is injected live into TinyMCE's content iframe (so the editor preview reflects your styles immediately) *and* included at the top of the generated output as a `<style>` block. Lets you write base styles for the elements you're composing — `.card { padding: 16px; border-radius: 8px }` and friends — and see them take effect as you work, rather than typing CSS blind.
* The drawer's open/closed state and its contents are persisted independently to localStorage (keys `mbrHtmlGen.cssDrawerOpen` and `mbrHtmlGen.customCss`), so reopening the tool restores both. The drawer header shows a live line count and has its own Clear button — deliberately separate from the editor's Clear button, since CSS is more deliberate work and shouldn't get swept up in a quick reset of the editor content.
* Live preview implementation: a `<style id="mbr-custom-css">` element is inserted into the editor iframe's `<head>` on init, and its `textContent` is updated on a 150ms debounce as you type in the drawer. Survives theme switches (re-injected on every editor init) and tab restores (persisted CSS is replayed into the iframe automatically when the editor is ready).
* Output integration: when Classify is also on, the user CSS and the generated atomic rules merge into a single `<style>` block, with the user CSS first. This matches utility-class cascade semantics — your CSS is the base layer, Classify's atomic classes are utilities that can override by source-order cascade. So writing `.c-red { color: blue }` in your CSS gets overridden by Classify's auto-generated `.c-red { color: red }` rule that follows. When Classify is off, the user CSS gets its own `<style>` block at the top.
* Independence: the Custom CSS drawer is independent of both Tidy and Classify. Non-empty drawer = `<style>` block in the output; empty drawer = no block. No master toggle to think about.
* Cross-tab sync: editing the CSS in one open tab updates the other tabs' drawers automatically (last-write-wins), matching the existing behaviour for editor content.
* No validation on the CSS — anything that's valid CSS in a browser works, including `@import`, `@media`, `@keyframes`, CSS variables, and vendor prefixes.
* Pipeline refactor: introduced `processHtml()` and `injectCustomCss()` so the tidy → classify → inject-custom-css chain is a single composable flow used by render, copy, and download (same as in 1.6.0, now with the third stage).

= 1.6.0 =
* New: Classify toggle in the output panel. When on, every inline `style` attribute in the generated HTML is extracted into a reusable, atomic CSS utility class, and the rules are emitted as a single `<style>` block at the top of the output. Identical declarations across elements dedupe to the same class, so a page with five elements all styled `color: red` ends up with one `.c-red` rule shared between them.
* Class naming format is `{property-abbreviation}-{value-token}`, kebab-cased. Common properties have short abbreviations (`c` for color, `bg` for background-color, `fs` for font-size, `ta` for text-align, margin/padding via `m`/`mt`/`mr`/`mb`/`ml` and `p`/`pt`/`pr`/`pb`/`pl`, etc.); unknown properties fall back to the full kebab name. Values are normalised for class-name safety: `#` stripped from hex (`#4ECDC4` → `4ecdc4`), `px` stripped (`36px` → `36`), decimals become `p` (`1.5em` → `1p5em`), `%` becomes `pc` (`100%` → `100pc`), negatives become `n` (`-10px` → `n10`), and spaces in multi-token values become hyphens.
* Values containing characters that can't safely live in a class name (commas, parens, quotes, slashes — typical of `url()`, `calc()`, `rgb()`, quoted font-families) fall back to a per-property sequential counter (`bg-1`, `bg-2`, `ff-1`); the CSS declaration in the `<style>` block keeps the original value verbatim.
* Existing class attributes on elements are preserved — generated classes append, with duplicate-name protection. No prefix on generated classes by default, so the output drops cleanly into an existing project.
* Classify is independent of Tidy but designed to pair with it: Tidy consolidates styles onto block elements first, then Classify turns those consolidated styles into shared classes. Working through them as a pair produces materially cleaner class lists than Classify alone. New `mbrHtmlGen.classify` localStorage key, off by default (Tidy is the safer default; Classify is more opinionated about output structure).
* Refactored the tidy/classify chain into a single `processHtml()` pipeline used by render, copy, and download, so the displayed output, clipboard contents, and downloaded `.html` file are always identical to what the toggles describe.

= 1.5.7 =
* New: When the editor is empty, a placeholder line now reads "Start typing your content. To add an image, use the Image button in the toolbar and paste its URL." This makes the URL-only image policy discoverable from first launch — students don't have to discover by failed attempt that local uploads aren't supported.
* New: Dragging an image (or any file) into the editor now shows a custom info notification — "Drag-and-drop upload isn't supported. Use the Image button in the toolbar and paste the image's URL instead." — instead of TinyMCE's generic "feature not supported" warning. The custom message tells users the working alternative rather than just declining.
* Both strings are translatable (`editorPlaceholder` and `dropFileMessage` i18n keys).

= 1.5.6 =
* Fixed: Inserting a local image via the editor's floating toolbar (the small "+" toolbar that pops up on empty lines) was producing HTML output of 400,000+ characters per image. TinyMCE was base64-encoding the binary file directly into the `src` attribute because no upload endpoint is configured (and can't be — this is a fully client-side tool). The image displayed correctly but the resulting HTML was unusable for its intended purpose (pasting into a CMS, email template, etc.).
* The fix sets four TinyMCE options to make image insertion URL-only:
  * `quickbars_insert_toolbar: 'quicktable'` — removes the image button from the empty-line floating toolbar (table button still there)
  * `image_uploadtab: false` — removes the "Upload" tab from the standard Image dialog; URL tab remains
  * `automatic_uploads: false` — drag-dropped images don't auto-convert to data: URIs
  * `paste_data_images: false` — pasted HTML containing base64 images is stripped
* Images can still be inserted normally via the toolbar Image button or Insert → Image menu — just by URL rather than local upload. For the educational use case this is actually the right behaviour: students learn that images live somewhere on the web and you reference them with a URL.

= 1.5.5 =
* Fixed: Buttons without an `aria-pressed` attribute (Light/Dark mode toggle, Clear, Download) were rendering with washed-out text and icons in light mode on Elementor Canvas. The v1.5.4 fix only covered buttons with `aria-pressed="false"`, leaving non-toggle buttons falling through to the default `.mbr-btn` rule at specificity (0,2,0) — beaten by something in that rendering context. Replaced the explicit `[aria-pressed="false"]` rule with `:not([aria-pressed="true"])`, which catches both off-state toggles and buttons without the attribute at all in a single rule at (0,3,0).
* Fixed: The footer credit link to littlewebshack.com was rendering as white-on-white on the frontend in light mode. The link colour was being hijacked by a theme/Elementor `a` rule. Bumped the credit link selector to four-class specificity (`.mbr-html-gen-app .mbr-html-gen-footer .mbr-html-gen-credit a`), added `:visited` coverage, and switched to a new `--mbr-link` CSS variable — `#2563eb` in light mode (a clean medium blue, visible on white) and `#60a5fa` in dark mode.

= 1.5.4 =
* Fixed: Toggle buttons in their unpressed state were still rendering with washed-out text and icons in light mode on Elementor Canvas. The v1.5.3 default-colour fix at `.mbr-html-gen-app .mbr-btn` (specificity 0,2,0) was being overridden by something at higher specificity in that rendering context. Added an explicit `[aria-pressed="false"]` rule (specificity 0,3,0), symmetric with the existing `[aria-pressed="true"]` rule, so off-state styling is no longer cascade-fragile.
* Improved: Frontend shortcode is now 70px taller again at every breakpoint — 870px desktop, 770px between 600-860px, 710px on narrow mobile. (Total height increase since v1.5.2 is 170px.)
* New: Footer credit "Created with ❤ by Robert Palmer" linking to https://littlewebshack.com (opens in new tab). Sits as the centre column of the footer between the TinyMCE attribution and the character/word/line stats.

= 1.5.3 =
* Improved: Frontend shortcode is 100px taller at every breakpoint — 800px on desktop (was 700px), 700px between 600-860px (was 600px), 640px on narrow mobile (was 540px). Both editor and output panels grow proportionally.
* Fixed: Toggle buttons in their unpressed state (Tidy off, Format off, Wrap off, plus the non-toggle Clear and Download buttons) had washed-out text and icons in light mode. The default colour was `--mbr-ink-soft` (#4a4f4d) — readable on a white panel but too faint against the beige app background. Default button colour now uses `--mbr-ink` (#1a1d1c in light mode), bringing it up to the same visual weight as the rest of the chrome. Hover feedback is preserved via the border-colour shift.

= 1.5.2 =
* Improved: Tidy now also unwraps `<iframe>`, `<video>`, and `<audio>` from `<p>` wrappers when the paragraph contains only the embed and has no attributes of its own — same logic that already applied to `<img>`. So `<p><iframe src="…"></iframe></p>` becomes a bare `<iframe src="…"></iframe>`. The conservative skip still applies: `<p style="text-align:center"><iframe></iframe></p>`, `<p>See <iframe></iframe> here</p>`, and paragraphs containing multiple media embeds are all left untouched.

= 1.5.1 =
* Improved: Tidy now also unwraps spans wrapping the entire content of a paragraph (`<p>`), not just headings — `<p><span style="color: red">text</span></p>` becomes `<p style="color: red">text</p>`.
* Improved: Tidy's style merging is now property-aware. Previously, if both the block element and its inner span had a `style` attribute, the unwrap was skipped to avoid clobbering. Now, Tidy checks at the CSS-property level — `<p style="text-align: left;"><span style="font-family: Arial; color: #333;">…</span></p>` becomes `<p style="text-align: left; font-family: Arial; color: #333;">…</p>` because none of the properties overlap. Genuine conflicts (e.g. both sides defining `color`) still cause the span to be left in place rather than picking a winner.
* Improved: Original CSS value syntax is preserved when merging styles. Hex colours stay hex (`#e03e2c` is no longer normalised to `rgb(224, 62, 44)`); units and shorthand stay as TinyMCE wrote them.

= 1.5.0 =
* New: "Tidy" toggle in the output panel that cleans up TinyMCE's HTML for more semantic output. When on (default), the output panel applies these transformations via the browser's DOMParser:
  * Standalone images (`<p><img></p>`) are unwrapped from their paragraph wrapper. Skipped if the paragraph has its own attributes (e.g. `<p style="text-align:center">`) so user layout intent is preserved.
  * Spans wrapping the entire content of a heading (`<h1><span style="color:red">Text</span></h1>` → `<h1 style="color:red">Text</h1>`) are unwrapped, with style/class moved up to the heading. Skipped on attribute conflicts to avoid losing data.
  * Empty paragraphs (`<p></p>`, `<p>&nbsp;</p>`, `<p><br></p>`) are removed.
  * Nested attribute-less spans (`<span><span>x</span></span>`) are collapsed.
  * Empty `style=""` attributes are stripped.
* Toggle Tidy off in the output panel header to see TinyMCE's exact output. Copy and Download follow the displayed (tidied or raw) state, so what you see is what you get.

= 1.4.3 =
* Fixed: Line numbers in the output panel were invisible on the frontend. The vertical gutter divider rendered correctly but the numbers themselves were overlapping the code text in the same coordinates. Caused by the v1.4.0 frontend theme-defence resets stripping `padding-left` from the `.mbr-line` element.
* Removed the broad element-level resets (button, span, p, h1-h3, pre, code, a, svg, input, textarea, select) from the frontend stylesheet. They were doing more harm than good — fighting the plugin's own admin.css rules and silently breaking line numbers, button padding, and output panel padding. The universal `box-sizing: border-box` reset is kept.
* Theme-leak defence now relies on admin.css's existing selector specificity, which is already (0,2,0) or higher for all chrome elements (`.mbr-html-gen-app .mbr-btn`, `.mbr-html-gen-app .mbr-html-gen-brand h1`, `.mbr-html-gen-output .mbr-tag`, etc.) and naturally beats typical post-content theme rules at (0,1,1) or below. If a particularly aggressive theme breaks the look, a targeted fix can be added.

= 1.4.2 =
* New: Line numbers in the HTML output panel. Each source line is rendered with a numbered gutter on the left, kept out of the clipboard via `user-select: none`. Wrap mode preserves the convention of one number per logical line (matching VS Code, GitHub, etc.).
* Improved: The Format toggle now produces a visible difference on every kind of input. Format ON pretty-prints via js-beautify as before; Format OFF now minifies (collapses whitespace between tags) instead of showing TinyMCE's already-formatted source. Copy and Download follow the displayed state, so what you see is what you get.
* Improved: 20px gap between the editor and output panels on the frontend shortcode, replacing the 1px divider line. The panels now read as distinct cards on the app background. Admin layout is unchanged.

= 1.4.1 =
* Fixed: TinyMCE menubar (Edit, Insert, View, Format, Table) rendered as collapsed unstyled text on the frontend because the v1.4.0 theme-defence resets were too aggressive and applied inside TinyMCE's own chrome.
* Fixed: TinyMCE menubar items and the Paragraph dropdown were invisible in dark mode for the same reason — `color: inherit` on those elements made them inherit dark text on the dark wrapper.
* Frontend resets now exclude the editor host (`.mbr-html-gen-editor-host`) using `:not(:where(.mbr-html-gen-editor-host *))`, leaving TinyMCE's complete styling system untouched while still defending the rest of the app's chrome from theme leakage.

= 1.4.0 =
* New: Frontend shortcode `[mbr_html_generator]` for embedding the tool on any page or post. Intended audience is web developers, designers, and students looking for a quick HTML utility.
* New: Skeleton loading state inside the editor panel while TinyMCE downloads and initialises. The rest of the UI renders immediately, with a small spinner sitting in the editor area until it's ready. A 25-second safety timeout surfaces a refresh hint if init never completes.
* New: Self-hosted bundled fonts on the frontend (Geist, Fraunces, JetBrains Mono) — no Google Fonts call, GDPR-safe. Drop the woff2 files into `assets/fonts/` per the README in that directory; the system stack is used as a graceful fallback if any are missing.
* New: Frontend stylesheet with theme-defence resets scoped under `.mbr-html-gen-app`, so the tool looks consistent across themes without leaking styles in or out.
* New: `mbr_html_generator_frontend_assets` filter for forcing asset enqueueing on pages where the shortcode is added via a non-standard mechanism (e.g. some page builder widgets).
* New: Single-instance-per-page enforcement on the shortcode. A second `[mbr_html_generator]` in the same content shows a notice (logged-in editors only) instead of rendering broken duplicate markup.
* Improved: TinyMCE now loads in the document footer on the frontend (instead of the head), so the page paints first and the editor activates afterwards. Admin behaviour is unchanged.
* Improved: Defensive double-load guard on the application script — if the file is somehow enqueued twice (e.g. by an aggressive optimisation plugin), the second invocation bails cleanly instead of double-binding events.

= 1.3.1 =
* Removed the TinyMCE `help` plugin, which dropped the misleading "Press ALT-0 for help" hint from the editor status bar (and the Help menu item that pointed nowhere useful in this context).

= 1.3.0 =
* New: Editor content auto-saves to the browser's localStorage and silently restores when you reopen the tool. Save is debounced by 500ms after the last change, with a final flush on page unload, so navigating away mid-edit no longer loses work.
* New: Multi-tab sync — if you have the tool open in two tabs and edit one, the other picks up the change automatically (last-write-wins).
* Improved: The Clear button now also wipes the saved content, so it remains the single way to start fresh.

= 1.2.1 =
* Removed the TinyMCE `code` plugin from the editor init. This drops the redundant View → Source code menu item and the toolbar `</>` button, since the right-hand panel already provides a live source view.

= 1.2.0 =
* New: Download button — saves the current output as `mbr-html-output-YYYY-MM-DD.html`. Respects the Format toggle.
* New: Inline SVG icons on Dark mode, Format, Wrap, Copy, Clear and Download buttons. Lucide-based, single-stroke, follows `currentColor` so they adapt to the theme automatically.
* Improved: Dark/light mode toggle now flips its icon (moon/sun) and label via pure CSS. No JS text-content swap.

= 1.1.0 =
* Replaced the in-house pretty-printer with js-beautify 1.15.4 for production-grade HTML formatting. Handles deeply nested markup, mixed inline and block content, comments, and edge cases far more reliably.
* js-beautify is bundled locally under `vendor/js-beautify/` (MIT licence). No CDN dependency.

= 1.0.0 =
* Initial release.

== Upgrade Notice ==

= 1.7.2 =
Adds inline colour swatches to the output panel — every hex, rgb, rgba, hsl or hsla value gets a small coloured square next to it so you can see the colour without translating the hex in your head. Display-only; the copied/downloaded output is unchanged. No new toggles.

= 1.7.1 =
Restores the TinyMCE Source code view (View menu and `</>` toolbar button), needed for assigning classes from the Custom CSS drawer. Undoes a 1.2.1 removal whose original rationale no longer applies. No other changes.

= 1.7.0 =
Adds a collapsible Custom CSS drawer in the editor panel. Write your own CSS, see it applied live in the TinyMCE preview, and get it at the top of the generated output. Pairs with Classify: when both are on, your CSS and the generated atomic classes merge into a single `<style>` block with your CSS first. Drawer closed by default — no behaviour change unless you open it.

= 1.6.0 =
Adds a Classify toggle that extracts inline `style` attributes into reusable, atomic CSS utility classes with a single `<style>` block at the top of the output. Pairs with Tidy: turn both on for the cleanest stylesheet-style output. Off by default — no behaviour change unless you enable it.

= 1.5.7 =
Adds discoverability for the URL-only image policy: an empty-editor placeholder pointing at the toolbar Image button, and a helpful drop-file notification that replaces TinyMCE's generic "not supported" warning.

= 1.5.6 =
Stops local image insertion from base64-bloating the HTML output to 400,000+ characters. Images are now URL-only — paste an image URL via the toolbar Image button or Insert → Image menu.

= 1.5.5 =
Bulletproofs the remaining non-toggle buttons (Light/Dark, Clear, Download) against theme leakage in light mode, and gives the footer credit link a visible blue against any theme.

= 1.5.4 =
Bulletproofs the unpressed-button colour on Elementor Canvas, adds another 70px of vertical space to the frontend shortcode, and adds a footer credit link.

= 1.5.3 =
Frontend shortcode is 100px taller and unpressed buttons have crisper text in light mode.

= 1.5.2 =
Tidy now unwraps standalone iframes, videos, and audio from `<p>` wrappers in addition to images.

= 1.5.1 =
Tidy now applies to paragraphs as well as headings, and merges non-conflicting styles instead of skipping when both block and span have a `style` attribute. Original hex colours are preserved.

= 1.5.0 =
Adds a Tidy toggle (on by default) that cleans TinyMCE's HTML output — unwraps standalone images from `<p>` tags, removes redundant spans on headings, drops empty paragraphs. Toggle off in the output panel header if you need TinyMCE's exact output.

= 1.4.3 =
Restores the line numbers on the frontend and tightens the frontend stylesheet by removing overly aggressive resets. Recommended.

= 1.4.2 =
Adds line numbers to the HTML output, makes the Format toggle minify on the off state, and adds a 20px gap between the editor and output panels on the frontend.

= 1.4.1 =
Restores the TinyMCE menubar layout and dark-mode visibility on the frontend. Recommended for anyone running the shortcode.

= 1.4.0 =
Adds frontend `[mbr_html_generator]` shortcode, a skeleton loading state, and self-hosted bundled fonts. No breaking changes to admin behaviour.

= 1.3.1 =
Removes the unused "Press ALT-0 for help" hint. No breaking changes.

= 1.3.0 =
Adds auto-save to localStorage with silent restore. No breaking changes.

= 1.2.1 =
Tidies the TinyMCE menus by removing the redundant Source Code option.

= 1.2.0 =
Adds Download button and button icons. No breaking changes.

= 1.1.0 =
Adds js-beautify for more robust HTML formatting. No breaking changes.

= 1.0.0 =
First release.
