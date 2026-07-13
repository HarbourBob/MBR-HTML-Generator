# Bundled Fonts

This directory holds the self-hosted webfonts used by the frontend
shortcode. The plugin's `frontend.css` references these files via
relative paths — they need to live here with the exact filenames listed
below.

If a file is missing, the browser falls back through the CSS stack
(Geist → -apple-system → BlinkMacSystemFont → Segoe UI → sans-serif,
Fraunces → Georgia → serif, JetBrains Mono → ui-monospace → Cascadia
Code → Menlo → Consolas → monospace), so the plugin keeps working — it
just won't be using the intended typefaces.

## Required files

| Filename                       | Family         | Weight | Style  | Source                                                                                                |
|--------------------------------|----------------|-------:|--------|--------------------------------------------------------------------------------------------------------|
| `geist-400.woff2`              | Geist          |    400 | normal | https://github.com/vercel/geist-font (`packages/next/dist/fonts/geist-sans/Geist-Regular.woff2`)        |
| `geist-500.woff2`              | Geist          |    500 | normal | https://github.com/vercel/geist-font (`packages/next/dist/fonts/geist-sans/Geist-Medium.woff2`)         |
| `geist-600.woff2`              | Geist          |    600 | normal | https://github.com/vercel/geist-font (`packages/next/dist/fonts/geist-sans/Geist-SemiBold.woff2`)       |
| `fraunces-500-italic.woff2`    | Fraunces       |    500 | italic | https://github.com/undercasetype/Fraunces — Italic 500 woff2 from the latest release                   |
| `jetbrains-mono-400.woff2`     | JetBrains Mono |    400 | normal | https://github.com/JetBrains/JetBrainsMono — `JetBrainsMono-Regular.woff2` from the latest release     |
| `jetbrains-mono-500.woff2`     | JetBrains Mono |    500 | normal | https://github.com/JetBrains/JetBrainsMono — `JetBrainsMono-Medium.woff2` from the latest release      |

## Licences

All three font families ship under licences that allow self-hosting and
redistribution alongside the plugin:

- **Geist** — SIL Open Font License 1.1
- **Fraunces** — SIL Open Font License 1.1
- **JetBrains Mono** — SIL Open Font License 1.1

Keep this README in the directory when packaging the plugin so users
understand why the fonts are present and where they come from.
