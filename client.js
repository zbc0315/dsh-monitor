window.__ModuleLoader__.load({
  id: 'dsh-monitor',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const METRICS_URL = '/api/dsh-monitor/metrics';

    async function fetchMetrics() {
      const res = await fetch(METRICS_URL, {
        method: 'GET',
        headers: { accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }

    const CSS = `
.sm-dock {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 2px 4px;
  font-size: calc(var(--dsh-content-font-size-secondary, 13px) - 1px);
  line-height: calc(20px + var(--dsh-content-font-delta-secondary, 0px));
  color: var(--dsw-alias-label-tertiary);
}
.sm-host-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.sm-host-label {
  color: var(--dsw-alias-label-tertiary);
  margin-right: 2px;
}
.sm-dock-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.sm-dock-name {
  color: var(--dsw-alias-label-tertiary);
}
.sm-dock-value {
  color: var(--dsw-alias-label-tertiary);
}
.sm-host-error {
  color: var(--dsw-alias-label-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
}
`;

    function clamp(percent) {
      return Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : null;
    }

    function MetricItem({ name, percent }) {
      const pct = clamp(percent);
      return h('span', { className: 'sm-dock-item' },
        h('span', { className: 'sm-dock-name' }, name),
        h('span', { className: 'sm-dock-value' }, pct === null ? '—' : `${pct.toFixed(1)}%`));
    }

    function HostRow({ label, cpu, memory, disk, error }) {
      return h('div', { className: 'sm-host-row' },
        h('span', { className: 'sm-host-label' }, label),
        error
          ? h('span', { className: 'sm-host-error', title: error }, '—')
          : h(React.Fragment, null,
              h(MetricItem, { name: 'CPU', percent: cpu.percent }),
              h(MetricItem, { name: 'Mem', percent: memory.percent }),
              h(MetricItem, { name: 'Disk', percent: disk ? disk.percent : null })));
    }

    function ComposerMonitor({ t }) {
      const [data, setData] = React.useState(null);

      React.useEffect(() => {
        let cancelled = false;
        let inFlight = false;
        async function poll() {
          if (inFlight) return;
          inFlight = true;
          try {
            const result = await fetchMetrics();
            if (!cancelled) setData(result);
          } catch {
            /* keep last reading; stay silent */
          } finally {
            inFlight = false;
          }
        }
        poll();
        const id = setInterval(poll, 2000);
        return () => {
          cancelled = true;
          clearInterval(id);
        };
      }, []);

      if (!data) return null;

      const { local, servers } = data;
      const rows = [];

      rows.push(h(HostRow, {
        key: 'local',
        label: t('local'),
        cpu: local.cpu,
        memory: local.memory,
        disk: local.disk,
      }));

      if (Array.isArray(servers)) {
        for (const server of servers) {
          rows.push(h(HostRow, {
            key: server.id,
            label: server.label || server.id,
            cpu: server.error ? null : server.cpu,
            memory: server.error ? null : server.memory,
            disk: server.error ? null : server.disk,
            error: server.error || null,
          }));
        }
      }

      return h('div', { className: 'sm-dock' }, rows);
    }

    function interpolate(template, vars) {
      return template.replace(/\{(\w+)\}/g, (_, key) => (vars && key in vars ? String(vars[key]) : `{${key}}`));
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const style = document.createElement('style');
          style.dataset.dyn = 'dsh-monitor';
          style.textContent = CSS;
          document.head.append(style);
          return () => {
            style.remove();
          };
        }, 'dsh-monitor: dock styles');

        const dictEn = {
          local: 'Local',
        };
        const dictZh = {
          local: '本机',
        };

        let t = (key) => dictEn[key] || key;
        try {
          if (ctx.locale && typeof ctx.locale.register === 'function') {
            ctx.locale.register('dsh-monitor', 'en', dictEn);
            ctx.locale.register('dsh-monitor', 'zh', dictZh);
            ctx.locale.register('dsh-monitor', 'zh-CN', dictZh);
          }
          if (ctx.locale && typeof ctx.locale.bind === 'function') {
            const bound = ctx.locale.bind('dsh-monitor');
            t = (key) => bound(key);
          }
        } catch {
          t = (key) => dictEn[key] || key;
        }

        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
          { name: 'conversation.composer.dock', id: 'dsh-monitor', order: 2 },
          () => h(ComposerMonitor, { t }),
        ));
      },
    };
  },
});
