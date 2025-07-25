# create-clanker-tool

Create a new Clanker tool project with a single command.

## Usage

```bash
npx create-clanker-tool
```

This will prompt you for:
- Tool name
- Organization name
- Description
- Author
- TypeScript preference

## What You Get

A complete Clanker tool project with:

- ✅ Proper project structure
- ✅ TypeScript support (optional)
- ✅ Build scripts with esbuild
- ✅ Development workflow
- ✅ README with instructions
- ✅ Type definitions from @ziggler/clanker

## Project Structure

```
my-tool/
├── src/
│   └── index.ts      # Your tool implementation
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript config (if selected)
├── README.md         # Documentation
└── .gitignore        # Git ignore file
```

## Development Workflow

After creating your tool:

```bash
cd my-tool
npm install
npm run dev
```

## Building for Distribution

```bash
npm run build     # Compile TypeScript
npm run bundle    # Bundle with dependencies
```

The bundled tool will be in `dist/bundle.js`, ready to be:
- Installed locally in `~/.clanker/tools/`
- Published to the Clanker registry

## Publishing Your Tool

1. Test your tool thoroughly
2. Bundle it with `npm run bundle`
3. Fork [clanker-tools](https://github.com/ziggle-dev/clanker-tools)
4. Add your tool following the registry structure
5. Submit a pull request

## License

MIT