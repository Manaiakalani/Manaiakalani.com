# Manaiakalani.com

Personal website for **Maximilian Stein** — Product Manager for **Microsoft Intune** and **Microsoft Security** within Customer Experience Engineering (CxE).

🌐 **Live:** [manaiakalani.com](https://manaiakalani.com)

## Overview

A lightweight, static personal site built with vanilla HTML, CSS, and JavaScript. Home/about, Thoughts, Projects (GitHub API), Uses, a colophon, ⌘K, a guestbook, and a GeoCities mode behind the cone (or Konami, or typing `clippy`). Hosted on **Azure Static Web Apps** and deployed via GitHub Actions on every push to `main`.

## Tech Stack

| Layer        | Technology                              |
| ------------ | --------------------------------------- |
| Markup       | HTML5 with semantic elements            |
| Styling      | CSS3 (custom properties, gradient animation) |
| Typography   | [Doto](https://fonts.google.com/specimen/Doto), self-hosted as WOFF2 in `fonts/` |
| Icons        | Inline SVG (no icon font or third-party icon library) |
| Hosting      | Azure Static Web Apps                   |
| CI/CD        | GitHub Actions                          |
| Analytics    | Self-hosted analytics (Rybbit) + real-user Web Vitals |
| Perf budgets | Lighthouse CI                           |
| Dependencies | Dependabot for workflow action updates  |

## Project Structure

```
├── .github/
│   ├── dependabot.yml          # Dependabot configuration
│   └── workflows/              # GitHub Actions CI/CD
├── .well-known/
│   └── security.txt            # Security contact info
├── tests/                      # Playwright fit-and-finish + spacing audits
├── api/                        # Guestbook + visitor counter (Azure Functions)
├── index.html                  # Home/About
├── thoughts.html               # Thoughts
├── projects.html               # GitHub projects
├── uses.html                   # Tools / studio kit
├── colophon.html               # How the site is made
├── 404.html                    # Custom 404
├── style.css / geocities.css
├── icons.js                    # currentColor glyph set
├── components.js               # Shared header + footer
├── command-palette.js          # ⌘K
├── script.js / boot.js / geocities.js
├── search.json                 # Palette content index
├── sw.js / manifest.json       # PWA
├── feed.xml / sitemap.xml
└── staticwebapp.config.json    # CSP, routes, caching
```

## Local Development

No build step required. Open `index.html` in a browser or serve it locally:

```bash
# Python
python -m http.server 8000

# Node.js (npx)
npx serve .
```

## License

This project is licensed under the [MIT License](LICENSE).