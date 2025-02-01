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

Move the build artifacts to Flask app.

```sh
mv dist/molstar.* ../app/static/molstar/
```