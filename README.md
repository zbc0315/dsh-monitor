# dsh-monitor

A [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) plugin that shows this machine's **CPU / memory / disk** usage live, right below the chat composer.

![platform](https://img.shields.io/badge/platform-DSH%20Desktop%20%2F%20Web-blue)

## What it does

Renders a compact, unobtrusive row under the composer (input box):

```
CPU 12.3%    Mem 45.6%    Disk 70.5%
```

- Values refresh every 2 seconds.
- Follows the built-in composer statistics styling (same color as the token / cache-hit pills).
- Bilingual labels (CPU / 内存 / 磁盘), localized through the DSH locale service.

## Install

Install the bundle into a profile:

```sh
dsh plugin --profile <profile-name> add dsh-monitor
```

Or, during local development, link the source directory directly:

```sh
dsh plugin --profile <profile-name> add /path/to/dsh-monitor
```

The plugin registers a `conversation.composer.dock` entry (`order: 2`, after the built-in `activity` and `usage` pills), so it appears with no further configuration.

## How it works

`dsh-monitor` is a **dual-face bundle plugin**:

- **Host half** (`index.js`, Node.js) — samples `os.cpus()`, `os.totalmem()/freemem()`, and `statfs('/')` (250 ms differential CPU), then serves JSON through the Harness connection layer:

  ```js
  ctx.connection.fetch.register({
    path: '/api/dsh-monitor/metrics',
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async () => Response.json(await metrics()),
  });
  ```

- **Client half** (`client.js`, browser) — polls `/api/dsh-monitor/metrics` with a same-origin `fetch` every 2 seconds and renders the three readings into `conversation.composer.dock`.

No persistent data is collected; all metrics are read on demand and shown locally.

## Project layout

```
.
├── index.js            # Host half: metrics sampling + /api fetch route
├── client.js           # Client half: composer.dock UI + polling
├── cordis.patch.yml    # Loader insert for the bundle
├── package.json        # Bundle manifest (dsh.bundle.patch + dsh.client)
├── locale/
│   ├── en.json         # English meta
│   └── zh.json         # Chinese meta
└── icon.svg            # Plugin icon
```

## Requirements

- DeepSeek Harness (DSH) with the `@deepseek-ai/dsh-client-connection` bundle (ships with the standard Desktop / Web profile).

## License

[MIT](./LICENSE)
