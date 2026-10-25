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
.sm-settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  font: var(--dsw-font-s-14);
  color: var(--dsw-alias-label-primary);
}
.sm-settings-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.sm-settings-hint {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 20px;
}
.sm-server-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sm-server-row {
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  padding: 12px;
}
.sm-server-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 12px;
}
.sm-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.sm-field.sm-field-wide {
  grid-column: 1 / -1;
}
.sm-label {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}
.sm-input {
  box-sizing: border-box;
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit;
}
.sm-input:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 0;
}
.sm-remove {
  margin-top: 10px;
  padding: 4px 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-state-error-primary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.sm-remove:hover {
  background: var(--dsw-alias-bg-layer-1);
}
.sm-settings-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.sm-add {
  padding: 5px 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.sm-add:hover {
  background: var(--dsw-alias-bg-layer-1);
}
.sm-save {
  padding: 5px 16px;
  border: 1px solid var(--dsw-alias-brand-primary);
  border-radius: 6px;
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-bg-base);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.sm-save:disabled {
  opacity: 0.6;
  cursor: default;
}
.sm-status {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}
.sm-status.sm-status-error {
  color: var(--dsw-alias-state-error-primary);
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

    function cloneServers(value) {
      if (!Array.isArray(value)) return [];
      return value.map((s) => ({
        id: String(s?.id ?? ''),
        label: String(s?.label ?? ''),
        host: String(s?.host ?? ''),
        port: String(s?.port ?? 22),
        user: String(s?.user ?? 'root'),
        keyPath: String(s?.keyPath ?? ''),
      }));
    }

    function normalizeServers(draft) {
      return draft.map((s) => ({
        id: s.id.trim(),
        label: s.label.trim(),
        host: s.host.trim(),
        port: Number(s.port) || 22,
        user: s.user.trim() || 'root',
        keyPath: s.keyPath.trim(),
      }));
    }

    function emptyServerDraft() {
      return { id: '', label: '', host: '', port: '22', user: 'root', keyPath: '' };
    }

    function ServerField({ label, hint, value, onChange, wide }) {
      return h('label', { className: 'sm-field' + (wide ? ' sm-field-wide' : '') },
        h('span', { className: 'sm-label' }, label),
        h('input', {
          type: 'text',
          className: 'sm-input',
          value,
          placeholder: hint || undefined,
          onChange: (event) => onChange(event.target.value),
        }));
    }

    // The settings-window page (a `settings.section` tab): lists every
    // configured remote server and lets the user add, edit, or remove entries.
    // `form` is the ConfigFormController injected from `ctx.configForms` for the
    // `dsh-monitor` namespace; it exposes getSnapshot/subscribe/mutate.
    function ServerSettings({ form, t }) {
      const subscribe = React.useCallback((listener) => form.subscribe(listener), [form]);
      const getSnapshot = React.useCallback(() => form.getSnapshot(), [form]);
      const snapshot = React.useSyncExternalStore(subscribe, getSnapshot);

      const serversValue = snapshot.value?.servers;
      const [draft, setDraft] = React.useState(null);
      const [dirty, setDirty] = React.useState(false);
      const [saving, setSaving] = React.useState(false);
      const [error, setError] = React.useState(null);
      const [saved, setSaved] = React.useState(false);
      const seededRef = React.useRef(false);

      React.useEffect(() => {
        if (!seededRef.current && Array.isArray(serversValue)) {
          seededRef.current = true;
          setDraft(cloneServers(serversValue));
        }
      }, [serversValue]);

      function update(index, field, value) {
        setDraft((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
        setDirty(true);
        setSaved(false);
        setError(null);
      }

      function remove(index) {
        setDraft((prev) => prev.filter((_, i) => i !== index));
        setDirty(true);
        setSaved(false);
        setError(null);
      }

      function add() {
        setDraft((prev) => [...(prev ?? []), emptyServerDraft()]);
        setDirty(true);
        setSaved(false);
        setError(null);
      }

      async function save() {
        if (!draft) return;
        const next = normalizeServers(draft);
        if (next.some((s) => !s.id || !s.host)) {
          setError(t('validationError'));
          return;
        }
        setSaving(true);
        setError(null);
        const ok = await form.mutate([{ op: 'set', path: ['servers'], value: next }]);
        setSaving(false);
        if (ok) {
          setDirty(false);
          setSaved(true);
        } else {
          setError(t('saveFailed'));
        }
      }

      if (draft === null) {
        return h('p', { className: 'sm-settings-hint' }, t('loadingServers'));
      }

      return h('div', { className: 'sm-settings' },
        h('h3', { className: 'sm-settings-title' }, t('settingsTitle')),
        h('p', { className: 'sm-settings-hint' }, t('settingsHint')),
        h('ul', { className: 'sm-server-list' },
          draft.map((server, index) => h('li', { className: 'sm-server-row', key: index },
            h('div', { className: 'sm-server-grid' },
              h(ServerField, { label: t('fieldId'), hint: t('idHint'), value: server.id, onChange: (v) => update(index, 'id', v) }),
              h(ServerField, { label: t('fieldLabel'), value: server.label, onChange: (v) => update(index, 'label', v) }),
              h(ServerField, { label: t('fieldHost'), hint: t('hostHint'), value: server.host, onChange: (v) => update(index, 'host', v) }),
              h(ServerField, { label: t('fieldPort'), value: server.port, onChange: (v) => update(index, 'port', v) }),
              h(ServerField, { label: t('fieldUser'), value: server.user, onChange: (v) => update(index, 'user', v) }),
              h(ServerField, { label: t('fieldKeyPath'), value: server.keyPath, onChange: (v) => update(index, 'keyPath', v), wide: true })),
            h('button', { type: 'button', className: 'sm-remove', onClick: () => remove(index) }, t('removeServer'))))),
        h('div', { className: 'sm-settings-actions' },
          h('button', { type: 'button', className: 'sm-add', onClick: add }, t('addServer')),
          h('button', { type: 'button', className: 'sm-save', disabled: saving || !dirty, onClick: save }, t(saving ? 'saving' : 'save')),
          saved ? h('p', { className: 'sm-status', role: 'status' }, t('saved')) : null,
          error ? h('p', { className: 'sm-status sm-status-error', role: 'alert' }, error) : null));
    }

    return {
      inject: ['slots', 'locale', 'configForms'],
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
          settingsNavLabel: 'Monitor',
          settingsTitle: 'Monitored servers',
          settingsHint: 'Add or remove remote servers to monitor. Changes take effect immediately.',
          loadingServers: 'Loading servers…',
          addServer: 'Add server',
          removeServer: 'Remove',
          save: 'Save',
          saving: 'Saving…',
          saved: 'Saved',
          saveFailed: 'Save failed',
          validationError: 'Each server needs an ID and a host.',
          fieldId: 'ID',
          fieldLabel: 'Label',
          fieldHost: 'Host',
          fieldPort: 'Port',
          fieldUser: 'User',
          fieldKeyPath: 'SSH key path',
          idHint: 'e.g. node01',
          hostHint: 'e.g. 192.168.1.10',
        };
        const dictZh = {
          local: '本机',
          cpu: 'CPU',
          memory: '内存',
          disk: '磁盘',
          settingsNavLabel: '监控',
          settingsTitle: '受监控的服务器',
          settingsHint: '添加或移除需要监控的远程服务器，修改立即生效。',
          loadingServers: '正在读取服务器…',
          addServer: '添加服务器',
          removeServer: '移除',
          save: '保存',
          saving: '保存中…',
          saved: '已保存',
          saveFailed: '保存失败',
          validationError: '每台服务器都需要填写 ID 和主机地址。',
          fieldId: 'ID',
          fieldLabel: '标签',
          fieldHost: '主机',
          fieldPort: '端口',
          fieldUser: '用户',
          fieldKeyPath: 'SSH 密钥路径',
          idHint: '例如 node01',
          hostHint: '例如 192.168.1.10',
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

        // The settings-window page: a top-level section (tab) contributed to the
        // settings panel. `form` is injected from ctx.configForms for this
        // bundle's namespace (`dsh-monitor`, the row id in cordis.patch.yml).
        ctx.slots.inject('settings.section', () => ctx.slots.register(
          {
            name: 'settings.section',
            id: 'dsh-monitor',
            order: 16,
            label: () => t('settingsNavLabel'),
            inject: () => ({ form: ctx.configForms.get('dsh-monitor') }),
          },
          (props) => h(ServerSettings, { ...props, t }),
        ));
      },
    };
  },
});
