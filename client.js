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
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
  padding: 2px 4px;
  font-size: calc(var(--dsh-content-font-size-secondary, 13px) - 1px);
  line-height: calc(20px + var(--dsh-content-font-delta-secondary, 0px));
  color: var(--dsw-alias-label-tertiary);
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

      const { cpu, memory, disk } = data;
      return h('div', { className: 'sm-dock' },
        h(MetricItem, { name: t('cpu'), percent: cpu.percent }),
        h(MetricItem, { name: t('memory'), percent: memory.percent }),
        h(MetricItem, { name: t('disk'), percent: disk ? disk.percent : null }));
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
          cpu: 'CPU',
          memory: 'Mem',
          disk: 'Disk',
        };
        const dictZh = {
          cpu: 'CPU',
          memory: '内存',
          disk: '磁盘',
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
