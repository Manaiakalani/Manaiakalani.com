# Manaiakalani.com

Personal website for **Maximilian Stein** — Community Strategy Lead for **Microsoft Intune** and **Microsoft Security** within Customer Experience Engineering (CxE).

🌐 **Live:** [manaiakalani.com](https://manaiakalani.com)

## Overview

A lightweight, static personal site built with vanilla HTML, CSS, and JavaScript. Hosted on **Azure Static Web Apps** and deployed via GitHub Actions on every push to `main`.

## Tech Stack

| Layer        | Technology                              |
| ------------ | --------------------------------------- |
| Markup       | HTML5 with semantic elements            |
| Styling      | CSS3 (custom properties, gradient animation) |
| Typography   | [Doto](https://fonts.google.com/specimen/Doto) via Google Fonts |
| Icons        | [Font Awesome 6](https://fontawesome.com/) |
| Hosting      | Azure Static Web Apps                   |
| CI/CD        | GitHub Actions                          |
| Analytics    | Self-hosted analytics                   |
| Dependencies | Dependabot for workflow action updates  |

## Project Structure

```
├── .github/
│   ├── dependabot.yml          # Dependabot configuration
│   └── workflows/              # GitHub Actions CI/CD
├── index.html                  # Main page
├── style.css                   # Styles and gradient animation
├── script.js                   # Typing effect
├── favicon.png                 # Site favicon
├── robots.txt                  # Crawler directives
├── LICENSE                     # MIT License
└── README.md
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