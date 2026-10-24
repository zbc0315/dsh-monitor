# dsh-monitor

A [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) plugin that shows **CPU / memory / disk** usage of this machine and any number of remote Linux servers, live, right below the chat composer.

![platform](https://img.shields.io/badge/platform-DSH%20Desktop%20%2F%20Web-blue)

## What it does

Renders a compact, unobtrusive block under the composer (input box), one line per host:

```
Local   CPU 12.3%  Mem 45.6%  Disk 70.5%
node01  CPU 5.8%   Mem 9.9%   Disk 40.7%
```

- The first line is the machine running DSH (the "local" host).
- Each configured server adds one more line.
- Values refresh every 2 seconds; remote readings are cached for 5 seconds.
- Follows the built-in composer statistics styling (same color as the token / cache-hit pills).
- Bilingual labels (`Local` / `本机`), localized through the DSH locale service.

## Install

Install the bundle into a profile:

```sh
dsh plugin --profile <profile-name> add dsh-monitor
```

Or, during local development, link the source directory directly:

```sh
dsh plugin --profile <profile-name> add /path/to/dsh-monitor
```

The plugin registers a `conversation.composer.dock` entry (`order: 2`, after the built-in `activity` and `usage` pills), so the local host appears with no further configuration.

## Configure remote servers

Remote servers are read from the plugin's `servers` config array. Add them to your profile's `cordis.patch.yml` (the patch layer survives bundle upgrades):

```yaml
- id: dsh-monitor
  name: "dsh-monitor"
  config:
    servers:
      - id: node01
        label: node01        # optional; falls back to id
        host: 192.168.51.110
        port: 22             # optional; default 22
        user: root           # optional; default root
        keyPath: ""          # optional; use an explicit private key, else the default ssh key
```

- Remote collection uses **SSH with key authentication** (`BatchMode=yes`); password prompts are intentionally unsupported.
- The remote host must be **Linux** (reads `/proc/stat`, `/proc/meminfo`, and `df`).
- A server that fails to connect shows a dash for its row without affecting the others.

## How it works

`dsh-monitor` is a **dual-face bundle plugin**:

- **Host half** (`index.js`, Node.js) — samples local `os.cpus()`, `os.totalmem()/freemem()`, and `statfs('/')`, and, for each configured server, runs a short SSH command that reports CPU / memory / disk. It serves everything as JSON through the Harness connection layer:

  ```js
  ctx.connection.fetch.register({
    path: '/api/dsh-monitor/metrics',
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async () => Response.json({ local, servers }),
  });
  ```

- **Client half** (`client.js`, browser) — polls `/api/dsh-monitor/metrics` with a same-origin `fetch` every 2 seconds and renders one row per host into `conversation.composer.dock`.

No persistent data is collected; all metrics are read on demand.

## Project layout

```
.
├── index.js            # Host half: local + SSH sampling, /api fetch route
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
- An `ssh` client on `PATH` for remote-server monitoring.

## License

[MIT](./LICENSE)
