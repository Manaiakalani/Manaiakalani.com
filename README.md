# Manaiakalani.com

Personal website for **Maximilian Stein** — Community Strategy Lead for **Microsoft Intune** and **Microsoft Security** within Customer Experience Engineering (CxE).

🌐 **Live:** [manaiakalani.com](https://manaiakalani.com)

## Overview

A lightweight, static personal site built with vanilla HTML, CSS, and JavaScript. It includes a home/about page, a blog-style Thoughts page, a dynamic Projects page powered by the GitHub API (with client-side search), a Uses page, and a hidden GeoCities easter egg mode. Hosted on **Azure Static Web Apps** and deployed via GitHub Actions on every push to `main`.

## Tech Stack

| Layer        | Technology                              |
| ------------ | --------------------------------------- |
| Markup       | HTML5 with semantic elements            |
| Styling      | CSS3 (custom properties, gradient animation) |
| Typography   | [Doto](https://fonts.google.com/specimen/Doto) via Google Fonts |
| Icons        | [Font Awesome 6](https://fontawesome.com/) |
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
├── tests/
│   └── fit-and-finish.spec.js  # Playwright end-to-end tests
├── index.html                  # Home/About page
├── thoughts.html               # Blog-style thoughts page
├── projects.html               # Dynamic GitHub projects page (search/filter)
├── uses.html                   # Tools/hardware/software Uses page
├── 404.html                    # Custom 404 error page
├── style.css                   # Core styles (themes, layout, components)
├── geocities.css               # GeoCities mode styles
├── script.js                   # Theme toggle, typing effect, GitHub API
├── boot.js                     # Flash-prevention (theme/geocities pre-paint) + localStorage migration
├── cube.js                     # Three.js ASCII cube renderer
├── geocities.js                # GeoCities mode DOM injection
├── web-vitals-report.js        # Real-user Web Vitals → Rybbit custom events
├── cube-texture.webp           # Cube face texture
├── favicon.png                 # Site favicon
├── og-image.png                # Open Graph social preview image
├── feed.xml                    # Atom syndication feed
├── manifest.json               # Web app manifest
├── sitemap.xml                 # XML sitemap for search engines
├── robots.txt                  # Crawler directives
├── staticwebapp.config.json    # Azure Static Web Apps config (headers, routes, CSP)
├── playwright.config.js        # Playwright test configuration (6 viewports)
├── lighthouserc.json           # Lighthouse CI performance budgets
├── compute-hashes.js           # Dev utility: recompute CSP script-src hashes
├── package.json                # Node.js project metadata
└── LICENSE                     # MIT License
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