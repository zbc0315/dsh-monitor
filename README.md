# dsh-monitor

A [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) plugin that shows **CPU / memory / disk** usage of this machine and any number of remote Linux servers, live, right below the chat composer.

![platform](https://img.shields.io/badge/platform-DSH%20Desktop%20%2F%20Web-blue)

## What it does

Renders a single compact entry under the composer (input box) showing the **currently selected host**:

```
Local ▾   CPU 12.3%  Mem 45.6%  Disk 70.5%
```

Clicking the entry opens a popover that lists every host — the machine running DSH ("local") plus all configured servers — with their live readings. Pick one to make it the displayed host; the choice is remembered across reloads.

- The local host is the machine running DSH.
- Values refresh every 2 seconds; remote readings are cached for 5 seconds.
- Follows the built-in composer statistics styling (same color as the token / cache-hit pills).
- Bilingual labels (`Local` / `本机`, `Mem` / `内存`, `Disk` / `磁盘`), localized through the DSH locale service.

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

Remote servers are managed from the **settings window** — no file editing needed:

1. Open **Settings** (⚙️).
2. Pick the **Monitor** tab in the left-hand nav.
3. Add, edit, or remove servers, then **Save**.

Each server has these fields:

| Field | Required | Default | Notes |
| --- | --- | --- | --- |
| `id` | ✅ | — | Short unique name, e.g. `node01` |
| `label` | — | falls back to `id` | Display name |
| `host` | ✅ | — | IP or hostname, e.g. `192.168.1.10` |
| `port` | — | `22` | SSH port |
| `user` | — | `root` | SSH login user |
| `keyPath` | — | `""` | Explicit private key path; empty uses the default ssh key |

Changes take effect immediately (no restart). The same `servers` array can also be set declaratively in the profile's `cordis.patch.yml` (that patch layer survives bundle upgrades):

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

- **Client half** (`client.js`, browser) — polls `/api/dsh-monitor/metrics` with a same-origin `fetch` every 2 seconds and renders the selected host's reading into `conversation.composer.dock`, with a popover to switch hosts. It also registers a `settings.section` entry (id `dsh-monitor`, order 16) that renders the server editor as its own tab in the Settings window, reading and writing the `dsh-monitor` namespace through the `configForms` service (`form.getSnapshot` / `form.subscribe` / `form.mutate`).

No persistent data is collected; all metrics are read on demand.

## Project layout

```
.
├── index.js            # Host half: local + SSH sampling, /api fetch route
├── client.js           # Client half: composer.dock UI + server settings page
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
