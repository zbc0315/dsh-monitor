import os from 'node:os';
import { statfs } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import Schema from '@deepseek-ai/schemastery';

const execFileAsync = promisify(execFile);

function cpuSnapshot() {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }
  return { idle, total };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function metrics() {
  const a = cpuSnapshot();
  await sleep(250);
  const b = cpuSnapshot();
  const idleDelta = b.idle - a.idle;
  const totalDelta = b.total - a.total;
  const cpuPercent = totalDelta > 0 ? Math.max(0, Math.min(100, (1 - idleDelta / totalDelta) * 100)) : 0;

  const memTotal = os.totalmem();
  const memUsed = memTotal - os.freemem();

  let disk = null;
  try {
    const s = await statfs(os.platform() === 'win32' ? 'C:\\' : '/');
    const diskTotal = s.blocks * s.bsize;
    const diskFree = s.bavail * s.bsize;
    disk = {
      total: diskTotal,
      used: diskTotal - diskFree,
      percent: diskTotal > 0 ? ((diskTotal - diskFree) / diskTotal) * 100 : 0,
    };
  } catch {
    disk = null;
  }

  return {
    cpu: { percent: cpuPercent, cores: os.cpus().length, loadavg: os.loadavg() },
    memory: { total: memTotal, used: memUsed, percent: (memUsed / memTotal) * 100 },
    disk,
    host: {
      hostname: os.hostname(),
      platform: `${os.type()} ${os.release()} (${os.arch()})`,
      uptimeSeconds: os.uptime(),
    },
    sampledAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Remote (Linux) metrics via SSH.
// Outputs 7 lines: cpu% / memTotal / memAvailable / diskTotal / diskUsed /
// hostname / uptimeSeconds. Uses single-quoted awk programs so `$2` etc. stay
// literal for awk, and avoids `\n` literals so it is safe inside a JS template
// literal.
// ---------------------------------------------------------------------------
const REMOTE_SCRIPT = `read -r _ u n s i w ir si st _ < /proc/stat
t1=$((u+n+s+i+w+ir+si+st)); d1=$((i+w))
sleep 0.5
read -r _ u n s i w ir si st _ < /proc/stat
t2=$((u+n+s+i+w+ir+si+st)); d2=$((i+w))
awk -v a=$((t2-t1)) -v b=$((d2-d1)) 'BEGIN{printf "%.1f", (a>0? (1-b/a)*100 : 0); print ""}'
awk '/MemTotal/{print $2*1024}' /proc/meminfo
awk '/MemAvailable/{print $2*1024}' /proc/meminfo
df -P -B1 / | awk 'NR==2{print $2; print $3}'
hostname
awk '{print int($1)}' /proc/uptime`;

function sshArgs(server) {
  const args = [
    '-p', String(server.port ?? 22),
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=6',
    '-o', 'StrictHostKeyChecking=accept-new',
  ];
  if (server.keyPath) args.push('-i', server.keyPath);
  args.push(`${server.user}@${server.host}`, REMOTE_SCRIPT);
  return args;
}

function parseRemoteOutput(stdout) {
  const lines = stdout.trim().split('\n').map((s) => s.trim());
  if (lines.length < 7) {
    throw new Error(`unexpected remote output (${lines.length} lines)`);
  }
  const cpuPercent = Number(lines[0]);
  const memTotal = Number(lines[1]);
  const memAvailable = Number(lines[2]);
  const diskTotal = Number(lines[3]);
  const diskUsed = Number(lines[4]);
  const hostname = lines[5];
  const uptimeSeconds = Number(lines[6]);
  if (![cpuPercent, memTotal, memAvailable, diskTotal, diskUsed].every(Number.isFinite)) {
    throw new Error('remote output contained non-numeric metrics');
  }
  const memUsed = memTotal - memAvailable;
  return {
    cpu: { percent: cpuPercent },
    memory: {
      total: memTotal,
      used: memUsed,
      percent: memTotal > 0 ? (memUsed / memTotal) * 100 : 0,
    },
    disk: {
      total: diskTotal,
      used: diskUsed,
      percent: diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0,
    },
    hostname,
    uptimeSeconds,
  };
}

async function remoteMetrics(server) {
  const { stdout } = await execFileAsync('ssh', sshArgs(server), {
    timeout: 15000,
    maxBuffer: 1_000_000,
  });
  return parseRemoteOutput(stdout);
}

// ---------------------------------------------------------------------------
// Per-server cache: TTL 5s to avoid hammering SSH on the client's 2s poll,
// with in-flight de-duplication so concurrent requests share one SSH call.
// ---------------------------------------------------------------------------
const REMOTE_TTL_MS = 5000;
const inflight = new Map();
const lastGood = new Map();

function serverKey(server) {
  return `${server.user}@${server.host}:${server.port ?? 22}`;
}

async function cachedRemote(server) {
  const key = serverKey(server);
  const cached = lastGood.get(key);
  if (cached && Date.now() - cached.at < REMOTE_TTL_MS) return cached.data;
  if (!inflight.has(key)) {
    const p = remoteMetrics(server)
      .then((data) => {
        lastGood.set(key, { at: Date.now(), data });
        return data;
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, p);
  }
  return inflight.get(key);
}

export const inject = ['connection'];

export const Config = Schema.object({
  servers: Schema.array(
    Schema.object({
      id: Schema.string().required(),
      label: Schema.string().default(''),
      host: Schema.string().required(),
      port: Schema.number().default(22),
      user: Schema.string().default('root'),
      keyPath: Schema.string().default(''),
    }),
  ).default([]),
});

export function apply(ctx, config) {
  const servers = Array.isArray(config?.servers) ? config.servers : [];

  ctx.connection.fetch.register({
    path: '/api/dsh-monitor/metrics',
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async () => {
      const local = await metrics();
      const remoteResults = await Promise.all(
        servers.map(async (server) => {
          const base = { id: server.id, label: server.label || server.id };
          try {
            const data = await cachedRemote(server);
            return { ...base, ...data, error: null };
          } catch (err) {
            return { ...base, error: String(err.message || err) };
          }
        }),
      );
      return Response.json({ local, servers: remoteResults });
    },
  });
}
