<div align="center">

<img src="https://littlewebshack.com/wp-content/uploads/2025/12/Logo-5-icon.png" width="80" alt="MBR logo">

# MBR HTML Generator

### Write HTML visually. Ship clean source.

A free, two-panel HTML composer for WordPress.
Lives in `Tools → HTML Generator` — or runs on your front end via a single shortcode.

[![License](https://img.shields.io/badge/License-GPLv2-a3e635?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.7.2-3b82f6?style=flat-square)](https://littlewebshack.com/mbr-html-generator/)
[![WordPress](https://img.shields.io/badge/WordPress-5.0%2B-21759b?style=flat-square)](https://wordpress.org/)
[![Telemetry](https://img.shields.io/badge/Telemetry-Zero-65a30d?style=flat-square)]()
[![Premium tier](https://img.shields.io/badge/Premium%20tier-None-f59e0b?style=flat-square)]()

**[⬇ Download v1.7.2](https://littlewebshack.com/downloads/html-generator/mbr-html-generator-v1.7.2.zip)** · **[🌐 Plugin Page](https://littlewebshack.com/mbr-html-generator/)** · **[🐛 Report Issue](https://github.com/HarbourBob/MBR-HTML-Generator/issues)** · **[☕ Buy Me a Coffee](https://buymeacoffee.com/robertpalmer)**

<br>

<img src="https://littlewebshack.com/wp-content/uploads/2026/05/HTML-Generator-3-scaled.png" alt="MBR HTML Generator — two-panel workspace with TinyMCE on the left and live HTML output on the right" width="900">

</div>

<br>

---

## ✨ What it is

MBR HTML Generator is a small, focused tool for composing HTML in a friendly visual editor and getting clean, copy-paste-ready markup out the other side.

The typical workflow:

1. Type, format and style your content in TinyMCE on the left
2. Watch the formatted HTML appear in the panel on the right
3. Copy or download the result when you're happy

Everything runs in your browser. **No server round-trip. No telemetry. Nothing ever leaves your machine.**

<br>

## 🛠 The three passes

Three optional toggles shape what comes out. They're independent — use any combination.

### 🧹 Tidy — semantic cleanup
Cleans up TinyMCE's raw output: unwraps standalone images from paragraphs, removes redundant spans wrapping headings, drops empty paragraphs, merges non-conflicting inline styles onto block elements. Never changes the rendered output, only the structure.

### 🎨 Classify — inline styles to utility classes
Extracts every `style` attribute into reusable atomic CSS classes — one class per property/value pair. Identical declarations share the same class. If you've used Tailwind, the output will feel immediately familiar.

```html
<!-- Before -->
<h1 style="color: #e03e2c; font-size: 36px;">Welcome</h1>
<p style="color: #e03e2c;">Same red as the heading.</p>

<!-- After -->
<style>
  .c-e03e2c { color: #e03e2c; }
  .fs-36    { font-size: 36px; }
</style>
<h1 class="c-e03e2c fs-36">Welcome</h1>
<p class="c-e03e2c">Same red as the heading.</p>
```

Three elements, two rules — and a third red element later adds nothing new.

### 💅 Custom CSS drawer
Write your own CSS rules in a monospace textarea below the editor. The editor previews them live (within ~150ms of you stopping typing), and the same CSS is included verbatim at the top of the output. Tag selectors, attribute selectors, class selectors, pseudo-classes, media queries, CSS variables — all work.

### 🪄 The rest of it

- Light/dark theme toggle
- Auto-save to `localStorage` with silent restore — survives refreshes and tab closures
- Multi-tab sync via storage events
- Copy to clipboard with toast confirmation
- Download as a dated `.html` file
- Pretty-print (js-beautify) and line-wrap toggles
- Live character, word and line counts

<br>

## 🚀 The bit that makes it different

Most WordPress plugins live in the admin and stay there. This one doesn't have to.

**Drop one shortcode on any page or post:**

```
[mbr_html_generator]
```

…and the same two-panel composer renders inline for **everyone who visits**. Logged in or out, doesn't matter. Same toolbar, same CSS drawer, same toggles. Everything still runs client-side — nothing leaves the visitor's browser.

### Where that's useful

| Use case | Why it fits |
|---|---|
| 🎓 **Computer Science education** | A gentle on-ramp from HTML to CSS classes to Custom CSS for first-year students. The 30-page user guide is a structured companion. No installs, no dev environment, no accounts. |
| 📖 **Documentation pages** | Pair a "try it yourself" embed beside the explanatory text. |
| 🌍 **Public utilities** | Host a free tool on your site as a friendly first touchpoint with visitors. |
| 👥 **Internal team tools** | A compose-style-copy workspace on any members page your team can reach. |

<br>

## 📦 Installation

Since this plugin is distributed outside the WordPress.org repository, install it manually:

1. Download the latest `.zip` from [littlewebshack.com](https://littlewebshack.com/downloads/html-generator/mbr-html-generator-v1.7.2.zip) or grab it from the [Releases](https://github.com/HarbourBob/MBR-HTML-Generator/releases) tab
2. In WordPress: **Plugins → Add New → Upload Plugin**
3. Choose the `.zip`, click **Install Now**, then **Activate**
4. The tool now lives at **Tools → HTML Generator**

To enable it on the front end, add `[mbr_html_generator]` to any page or post.

### Requirements

- WordPress 5.0 or newer
- PHP 7.4 or newer
- Any modern browser (recent Chrome, Firefox, Safari or Edge)

<br>

## 🎯 Quick start

### The simple path — just generate clean HTML

1. Open **Tools → HTML Generator**
2. Type in the editor on the left, use the toolbar for headings, lists, links, colour
3. Copy the output from the right panel

That's it.

### With your own styles

1. Click the **CSS** button on the editor's panel header to open the drawer
2. Write your rules:
   ```css
   h1 {
     font-family: Georgia, serif;
     letter-spacing: -0.02em;
   }
   .cta {
     padding: 12px 24px;
     background: #2a5cad;
     color: #fff;
     border-radius: 8px;
   }
   ```
3. To use class selectors, open **View → Source code**, add `class="..."` to your elements, click **Save**
4. Watch the editor preview your styles live
5. Copy the output — your `<style>` block sits at the top, your HTML beneath

### Refactor inline styles into shared classes

1. Compose visually using TinyMCE's colour and size pickers
2. Toggle **Classify** on in the output panel header
3. The inline styles get extracted into atomic classes like `.c-e03e2c` and `.fs-36`
4. Copy the cleaner output

The user guide (bundled inside the `.zip`) has full worked examples for each of these.

<br>

## 🛡 The honest bit

This plugin is free. **Actually free.**

- ✓ GPLv2 licensed, full source in this repo
- ✓ No premium tier, no upsells, no "upgrade to pro" nag screens
- ✓ Zero telemetry — the plugin doesn't phone home
- ✓ No database writes beyond the plugin's activation state
- ✓ No CDN dependencies — every asset bundled locally
- ✓ No API keys required, ever
- ✓ Distributed direct from littlewebshack.com — no dependency on anyone else's policies
- ✓ Security-first development

If you find it useful, that's the whole point.

<br>

## 🔧 Built with

| Dependency | Version | License | Notes |
|---|---|---|---|
| [TinyMCE](https://www.tiny.cloud/) | 8.5.0 | GPL community edition | Bundled locally — no CDN, no API key prompt |
| [js-beautify](https://github.com/beautify-web/js-beautify) | 1.15.4 | MIT | Bundled locally |
| [Lucide](https://lucide.dev/) | latest | ISC | Inlined as SVG |

Scoped enqueuing means none of these assets load anywhere outside the plugin's own admin page (and the shortcode container on the front end). Zero impact on Gutenberg, Classic Editor, or any other TinyMCE elsewhere on your site.

<br>

## 📘 Documentation

A **30-page user guide** ships inside the `.zip`. It covers:

- The interface at a glance
- The Tidy / Classify / Custom CSS pipeline in detail
- Selecting elements with CSS (tag, attribute, class, pseudo-class)
- Two worked examples — a styled hero section and a TinyMCE refactor
- The frontend shortcode
- Privacy and local storage
- Tips, tricks and idioms
- Troubleshooting

<br>

## 🤝 Contributing & support

- 🐛 **Found a bug?** [Open an issue](https://github.com/HarbourBob/MBR-HTML-Generator/issues)
- 💡 **Want a feature?** Same place — the best additions come from real users
- 🙏 **Want to say thanks?** A [Buy Me a Coffee](https://buymeacoffee.com/robertpalmer) is always appreciated but never expected

Every message gets read. The plugin gets better because of them.

<br>

## 📄 License

GPLv2 — see [LICENSE](LICENSE) for the full text.

<br>

## 👋 About

Built and maintained by **Robert Palmer** — a freelance WordPress developer based in Cleethorpes, UK. Part of the free [MBR plugin suite](https://littlewebshack.com).

- 🌐 [littlewebshack.com](https://littlewebshack.com)
- 🏗 [madebyrobert.co.uk](https://madebyrobert.co.uk)
- 🐙 [@HarbourBob](https://github.com/HarbourBob)
- ☕ [buymeacoffee.com/robertpalmer](https://buymeacoffee.com/robertpalmer)

<br>

---

<div align="center">

**Free forever. No catch.**

</div>
