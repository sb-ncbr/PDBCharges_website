# Mol* Viewer for PDBCharges

## How to run

For development run a build watcher. Dev server won't work with our setup.

```sh
npm run watch
```

For production build the viewer.

```sh
npm run build
```

Both commands create build artifacts which are referenced by a symlink in Flask app. Therefore it's necessary to first build the viewer before running the Flask app.
