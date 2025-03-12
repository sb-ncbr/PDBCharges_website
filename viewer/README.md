# Mol* Viewer for PDBCharges

## Production

1. Build the viewer

```sh
npm run build
```

2. Move files to Flask app

```sh
mv dist/molstar.* ../app/static/molstar/
```

## Development

1. Rebuild viewer on file changes

```sh
npm run watch
```

2. Create symlinks to build files

```sh
ln -s dist/molstar.js ../app/static/molstar/molstar.js
ln -s dist/molstar.css ../app/static/molstar/molstar.css
```

## Testing color smoothing

1. Run Mol* with structure and charges

```sh
cd viewer/
npm install
npm run dev
```

2. Edit the function `smoothCharge` in file [utils.ts](./src/charges-extension/utils.ts)

3. If you want you can move some other mmCIF files with charges into the [./data](./data/) directory and then update the URL in file [TestArea.tsx](./src/TestArea.tsx) to point to the mmCIF file you want to load (ie. `http://localhost:3000/data/{mmcif-filename}`)
