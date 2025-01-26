# Mol* Viewer for PDBCharges

1. Build the viewer

```sh
npm run build
```

2. Move files to Flask app

```sh
mv dist/assets/*.css ../app/static/molstar/molstar.css
mv dist/assets/*.js ../app/static/molstar/molstar.js
```