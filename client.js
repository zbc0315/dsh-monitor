window.__ModuleLoader__.load({
  id: 'dsh-monitor',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const METRICS_URL = '/api/dsh-monitor/metrics';
    const SELECT_KEY = 'dsh-monitor:selected-host';

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
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px 16px;
  padding: 2px 4px;
  font-size: calc(var(--dsh-content-font-size-secondary, 13px) - 1px);
  line-height: calc(20px + var(--dsh-content-font-delta-secondary, 0px));
  color: var(--dsw-alias-label-tertiary);
}
.sm-summary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 2px 4px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font: inherit;
  color: var(--dsw-alias-label-tertiary);
  cursor: default;
  white-space: nowrap;
}
.sm-summary.sm-clickable {
  cursor: pointer;
}
.sm-summary.sm-clickable:hover {
  background: var(--dsw-alias-bg-layer-1);
}
.sm-host-label {
  font-variant-numeric: tabular-nums;
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
.sm-dock-error {
  color: var(--dsw-alias-label-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
}
.sm-caret {
  display: inline-block;
  width: 10px;
  color: var(--dsw-alias-label-tertiary);
  transition: transform 0.12s ease;
}
.sm-caret.sm-caret-open {
  transform: rotate(180deg);
}
.sm-panel {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  min-width: 236px;
  padding: 4px;
  background: var(--dsw-alias-bg-overlay);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
  z-index: 1200;
}
.sm-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 6px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font: inherit;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  white-space: nowrap;
  text-align: left;
}
.sm-option:hover {
  background: var(--dsw-alias-bg-layer-1);
}
.sm-option.sm-option-selected {
  color: var(--dsw-alias-brand-primary);
}
.sm-option-label {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
}
.sm-option-metrics {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.sm-check {
  width: 12px;
  margin-left: 4px;
  color: var(--dsw-alias-brand-primary);
  visibility: hidden;
}
.sm-option.sm-option-selected .sm-check {
  visibility: visible;
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

    function Metrics({ host, t }) {
      if (host.error) {
        return h('span', { className: 'sm-dock-error', title: host.error }, '—');
      }
      return h(React.Fragment, null,
        h(MetricItem, { name: t('cpu'), percent: host.cpu ? host.cpu.percent : null }),
        h(MetricItem, { name: t('memory'), percent: host.memory ? host.memory.percent : null }),
        h(MetricItem, { name: t('disk'), percent: host.disk ? host.disk.percent : null }));
    }

    function ComposerMonitor({ t }) {
      const [data, setData] = React.useState(null);
      const [open, setOpen] = React.useState(false);
      const [selectedId, setSelectedId] = React.useState(() => {
        try { return localStorage.getItem(SELECT_KEY) || 'local'; } catch { return 'local'; }
      });
      const rootRef = React.useRef(null);

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

      React.useEffect(() => {
        function onDocDown(event) {
          if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
        }
        function onKey(event) {
          if (event.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', onDocDown);
        document.addEventListener('keydown', onKey);
        return () => {
          document.removeEventListener('mousedown', onDocDown);
          document.removeEventListener('keydown', onKey);
        };
      }, []);

      if (!data) return null;

      const hosts = [
        { id: 'local', label: t('local'), cpu: data.local.cpu, memory: data.local.memory, disk: data.local.disk, error: null },
      ];
      if (Array.isArray(data.servers)) {
        for (const server of data.servers) {
          hosts.push(server.error
            ? { id: server.id, label: server.label || server.id, cpu: null, memory: null, disk: null, error: server.error }
            : { id: server.id, label: server.label || server.id, cpu: server.cpu, memory: server.memory, disk: server.disk, error: null });
        }
      }

      const selected = hosts.find((host) => host.id === selectedId) || hosts[0];
      const canExpand = hosts.length > 1;

      function toggle() {
        if (!canExpand) return;
        setOpen((value) => !value);
      }

      function select(id) {
        setSelectedId(id);
        try { localStorage.setItem(SELECT_KEY, id); } catch { /* ignore */ }
        setOpen(false);
      }

      return h('div', { className: 'sm-dock', ref: rootRef },
        h('button', {
          type: 'button',
          className: canExpand ? 'sm-summary sm-clickable' : 'sm-summary',
          onClick: toggle,
          'aria-haspopup': canExpand ? 'listbox' : undefined,
          'aria-expanded': canExpand ? open : undefined,
        },
          h('span', { className: 'sm-host-label' }, selected.label),
          h(Metrics, { host: selected, t }),
          canExpand && h('span', { className: 'sm-caret' + (open ? ' sm-caret-open' : ''), 'aria-hidden': true }, '▾')),
        open && canExpand && h('div', { className: 'sm-panel', role: 'listbox' },
          hosts.map((host) => h('button', {
            type: 'button',
            key: host.id,
            role: 'option',
            'aria-selected': host.id === selected.id,
            className: 'sm-option' + (host.id === selected.id ? ' sm-option-selected' : ''),
            onClick: () => select(host.id),
          },
            h('span', { className: 'sm-option-label' }, host.label),
            h('span', { className: 'sm-option-metrics' },
              h(Metrics, { host, t })),
            h('span', { className: 'sm-check', 'aria-hidden': true }, '✓')))));
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
          cpu: 'CPU',
          memory: 'Mem',
          disk: 'Disk',
        };
        const dictZh = {
          local: '本机',
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
