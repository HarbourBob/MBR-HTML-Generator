=== MBR HTML Generator ===
Contributors: harbourbob
Tags: html, editor, dev tools, tinymce, code generator
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.3.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A two-panel HTML generator for WordPress. Compose visually in TinyMCE, watch the formatted HTML appear in real time alongside it.

== Description ==

MBR HTML Generator adds a clean, distraction-free HTML composing tool to your WordPress admin under Tools → HTML Generator. The screen is split into two panels: TinyMCE on the left for visual editing, and a live source-code panel on the right that reflects every change as you make it.

The output is pretty-printed by default, syntax-highlighted, and can be copied to the clipboard with one click. A dark mode toggle flips both the chrome and the editor skin together, with the preference persisted between sessions.

This plugin bundles TinyMCE 8.5.0 (GPL community edition) locally — no external CDN, no API key, no licence prompts, and no telemetry. It is free, with no premium tier, no upsells, and no feature gating.

= Features =

* Two-panel split: TinyMCE editor on the left, live HTML output on the right
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

= Capability =

By default the tool requires the `manage_options` capability. To open access to editors, filter `mbr_html_generator_capability`:

`add_filter( 'mbr_html_generator_capability', function () { return 'edit_posts'; } );`

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
