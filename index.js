import os from 'node:os';
import { statfs } from 'node:fs/promises';

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

export const inject = ['connection'];

export function apply(ctx) {
  ctx.connection.fetch.register({
    path: '/api/dsh-monitor/metrics',
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async () => Response.json(await metrics()),
  });
}
