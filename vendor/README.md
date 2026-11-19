# Vendored third-party code

Served from this origin so the site has no runtime CDN dependency. The CSP
`script-src` is `'self'` plus hashes, nothing else.

| Package | Version | Files | npm integrity (verified on download) |
|---|---|---|---|
| three | 0.170.0 | `build/three.module.min.js`, the postprocessing passes the footer cube imports, `CopyShader.js` | `sha512-FQK+LEpYc0fBD+J8g6oSEyyNzjp+Q7Ks1C568WWaoMRLW+TkNNWmenWeGgJjV105Gd+p/2ql1ZcjYvNiPZBhuQ==` |
| web-vitals | 5.3.0 | `dist/web-vitals.js` | `sha512-q6LWsLatGYZp5VGBIOvbTj6JBV2nOmC8KvWztXBmwJcfFAzhwKwbOxhUH306XY3CcaZDUlSmSuNPBsCn0bFu+g==` |

Files are copied unmodified from the npm tarballs. To upgrade: `npm pack <pkg>@<version>`,
compare `integrity` with `npm view <pkg>@<version> dist.integrity`, copy the same files into
a new versioned folder, and update the import map in each page plus
`web-vitals-report.js`. Paths are versioned, so they are served as immutable.
