# pixel-icons

The HackerNoon pixel icon library, solid set, vendored as path data.

- Source: https://github.com/hackernoon/pixel-icon-library
- License: MIT (see LICENSE, copied from the source repo)
- Vendored: 2026-07-29, 248 icons

`solid.js` is generated, not written. To update it, clone the source repo and
run the converter, which normalises every rect, polygon and path to SVG path
strings on the shared 24x24 grid and refuses anything it does not recognise:

    node build/vendor-icons.mjs /path/to/pixel-icon-library
