window.DopparProfiler = {
  open: false,
  async copyText(text){
    if(navigator.clipboard && window.isSecureContext){
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }

    if(!copied){
      throw new Error('Copy command failed');
    }

    return true;
  },
  setCopyButtonState(button, state){
    if(!button){
      return;
    }
    button.classList.remove('is-success', 'is-error');
    if(state === 'success'){
      button.classList.add('is-success');
      button.innerHTML = '<span class="copy-icon copy-icon-success" aria-hidden="true"></span>Copied';
      return;
    }
    if(state === 'error'){
      button.classList.add('is-error');
      button.innerHTML = '<span class="copy-icon copy-icon-error" aria-hidden="true"></span>Copy failed';
      return;
    }
    button.innerHTML = '<span class="copy-icon" aria-hidden="true"></span>Copy Payload';
  },
  getQuickViewTheme(){
    try {
      return window.localStorage.getItem('doppar.insight.quickview.theme') === 'light' ? 'light' : 'dark';
    } catch (error) {
      return 'light';
    }
  },
  setQuickViewTheme(panel, theme){
    if(!panel){
      return;
    }
    const resolved = theme === 'dark' ? 'dark' : 'light';
    panel.setAttribute('data-theme', resolved);
    panel.querySelectorAll('[data-action="toggle-theme"]').forEach((button) => {
      button.setAttribute('data-theme-mode', resolved);
      button.setAttribute('aria-pressed', resolved === 'dark' ? 'true' : 'false');
      button.setAttribute('aria-label', resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      button.innerHTML = resolved === 'dark'
        ? '<span class="theme-switch-icon theme-switch-icon-dark" aria-hidden="true"></span>'
        : '<span class="theme-switch-icon theme-switch-icon-light" aria-hidden="true"></span>';
    });
    try {
      window.localStorage.setItem('doppar.insight.quickview.theme', resolved);
    } catch (error) {}
  },
  getToolbarBounds(){
    const host = document.getElementById('doppar-profiler');
    if(!host || !host.shadowRoot){
      return null;
    }
    const toolbar = host.shadowRoot.querySelector('.dp-root');
    return toolbar ? toolbar.getBoundingClientRect() : null;
  },
  syncPanelPosition(){
    const host = document.getElementById('doppar-profiler-panel');
    const bounds = this.getToolbarBounds();
    if(!host || !bounds){
      return;
    }

    const gap = 14;
    const availableHeight = Math.max(220, bounds.top - gap - 12);

    host.style.left = bounds.left + 'px';
    host.style.right = 'auto';
    host.style.width = bounds.width + 'px';
    host.style.bottom = (window.innerHeight - bounds.top + gap) + 'px';
    host.style.setProperty('--dp-panel-available-height', availableHeight + 'px');
  },
  ensurePanelRoot(){
    let host = document.getElementById('doppar-profiler-panel');
    if(!host){
      host = document.createElement('div');
      host.id = 'doppar-profiler-panel';
      // Isolate the host from page CSS as much as possible
      host.style.all = 'initial';
      host.style.position = 'fixed';
      host.style.zIndex = '2147483647';
      document.body.appendChild(host);
    }
    this.syncPanelPosition();
    if(!host.shadowRoot){
      host.attachShadow({mode:'open'});
    }
    return host.shadowRoot;
  },
  openDetailsPage(){
    const id = document.getElementById('doppar-profiler').dataset.requestId;
    window.open('/_insight/' + id, '_blank');
  },
  toggle(){
    this.open = !this.open;
    const root = this.ensurePanelRoot();
    if(this.open){
      const id = document.getElementById('doppar-profiler').dataset.requestId;
      fetch('/_insight/api/' + id).then(r=>r.json()).then(data=>{
        const toolbarLogo = document.getElementById('doppar-profiler')?.shadowRoot?.querySelector('.dp-launcher-mark img')?.getAttribute('src') || '';
        const escapeHtml = (value) => {
          const div = document.createElement('div');
          div.textContent = String(value ?? '');
          return div.innerHTML;
        };
        const formatBytes = (bytes) => {
          const size = Number(bytes || 0);
          if(!size){
            return '0 Bytes';
          }
          const units = ['Bytes', 'KB', 'MB', 'GB'];
          const index = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)));
          return `${Math.round((size / Math.pow(1024, index)) * 100) / 100} ${units[index]}`;
        };
        const prettyJson = (value) => escapeHtml(JSON.stringify(value, null, 2));
        const hasEntries = (value) => {
          if(Array.isArray(value)){
            return value.length > 0;
          }
          return !!value && typeof value === 'object' && Object.keys(value).length > 0;
        };
        const formatCellValue = (value) => {
          if(value === null || value === undefined || value === ''){
            return '<span class="muted-value">N/A</span>';
          }
          if(typeof value === 'object'){
            return `<pre class="code-block code-block-compact">${prettyJson(value)}</pre>`;
          }
          return escapeHtml(String(value));
        };
        const buildPropertyTable = (dataset, keyHeader = 'Property', valueHeader = 'Value') => {
          if(!hasEntries(dataset)){
            return '';
          }
          const rows = Object.entries(dataset).map(([key, value]) => `
            <tr>
              <td>${escapeHtml(key)}</td>
              <td>${formatCellValue(value)}</td>
            </tr>
          `).join('');
          return `
            <table class="property-table">
              <thead>
                <tr>
                  <th>${escapeHtml(keyHeader)}</th>
                  <th>${escapeHtml(valueHeader)}</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          `;
        };
        const buildFilesTable = (files) => {
          if(!hasEntries(files)){
            return '';
          }
          const rows = Object.entries(files).map(([key, file]) => `
            <tr>
              <td>${escapeHtml(key)}</td>
              <td>${escapeHtml(file?.name || 'N/A')}</td>
              <td>${escapeHtml(file?.type || 'N/A')}</td>
              <td>${file?.size ? `${(Number(file.size) / 1024).toFixed(2)} KB` : 'N/A'}</td>
            </tr>
          `).join('');
          return `
            <table class="property-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          `;
        };
        const buildSubsection = (title, content) => {
          if(!content){
            return '';
          }
          return `
            <div class="subsection">
              <div class="subsection-title">${escapeHtml(title)}</div>
              ${content}
            </div>
          `;
        };
        const buildCodeBlock = (value) => {
          if(value === null || value === undefined || value === ''){
            return '';
          }
          const output = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
          return `<pre class="code-block">${escapeHtml(output)}</pre>`;
        };
        const requestUrl = data.url || data.route || '/';
        const buildJsonViewerItem = (key, value) => {
          const isArray = Array.isArray(value);
          const type = isArray ? 'array' : typeof value;
          const keyHtml = escapeHtml(String(key));

          if(value !== null && (type === 'object' || isArray)){
            const label = isArray ? `array[${value.length}]` : 'object';
            const children = Object.entries(value).map(([childKey, childValue]) => buildJsonViewerItem(childKey, childValue)).join('');

            return `
              <details class="json__node">
                <summary class="json__item json__item--collapsible">
                  <span class="json__key">${keyHtml}</span>
                  <span class="json__value json__value--type-${type}">${escapeHtml(label)}</span>
                </summary>
                <div class="json__children">
                  ${children}
                </div>
              </details>
            `;
          }

          const valueOutput = type === 'string'
            ? `"${escapeHtml(String(value))}"`
            : escapeHtml(String(value));

          return `
            <div class="json__item">
              <div class="json__key">${keyHtml}</div>
              <div class="json__value json__value--${type}">${valueOutput}</div>
            </div>
          `;
        };
        const buildJsonViewer = (value) => {
          if(!value || typeof value !== 'object'){
            return buildCodeBlock(value);
          }

          return `
            <div class="json">
              ${Object.entries(value).map(([key, childValue]) => buildJsonViewerItem(key, childValue)).join('')}
            </div>
          `;
        };
        const css = `
          :host{all:initial}

          .panel {
            width: 100%;
            max-height: min(78vh, var(--dp-panel-available-height, 78vh));
            overflow: auto;
            border-radius: 26px;
            padding: 14px;
            color: #142133;
            font: 14px/1.65 "Aptos", "Segoe UI Variable", "Segoe UI", sans-serif;
            background:
              radial-gradient(circle at top right, rgba(132, 134, 255, 0.16), transparent 22%),
              radial-gradient(circle at bottom left, rgba(15, 139, 141, 0.14), transparent 26%),
              linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(245, 247, 255, 0.95));
            border: 1px solid rgba(132, 134, 255, 0.24);
            box-shadow:
              0 28px 64px rgba(57, 72, 102, 0.18),
              inset 0 1px 0 rgba(255,255,255,0.8);
            backdrop-filter: blur(16px);
            position: relative;
          }

          .panel::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 26px;
            pointer-events: none;
            background: linear-gradient(180deg, rgba(255,255,255,0.56), transparent 22%);
          }

          .workspace {
            position: relative;
            z-index: 1;
            display: grid;
            grid-template-columns: 210px minmax(0, 1fr);
            gap: 14px;
            min-height: 420px;
            align-items: start;
          }
          .sidebar {
            position: sticky;
            top: 0;
            align-self: start;
            padding: 12px;
            border-radius: 20px;
            background:
              linear-gradient(180deg, rgba(20, 31, 48, 0.96), rgba(19, 34, 51, 0.94)),
              #182633;
            border: 1px solid rgba(132, 134, 255, 0.16);
            color: #e6eef9;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
          }
          .sidebar-brand {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 10px 10px;
            margin-bottom: 6px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
          .sidebar-mark {
            width: 40px;
            height: 40px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 40px;
            border-radius: 14px;
            background:
              linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)),
              linear-gradient(180deg, rgba(143,146,255,0.22), rgba(116,121,255,0.18));
            border: 1px solid rgba(132, 134, 255, 0.2);
            box-shadow:
              0 10px 20px rgba(132, 134, 255, 0.24),
              inset 0 1px 0 rgba(255,255,255,0.14);
          }
          .sidebar-mark img {
            width: 18px;
            height: 18px;
          }
          .sidebar-title {
            font-size: 15px;
            font-weight: 800;
            color: #ffffff;
            line-height: 1.08;
          }
          .sidebar-copy {
            margin-top: 4px;
            font-size: 11px;
            color: rgba(230, 238, 249, 0.66);
          }
          .sidebar-nav {
            display: grid;
            gap: 3px;
          }
          .nav-main {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
          }
          .nav-icon {
            width: 18px;
            height: 18px;
            flex: 0 0 18px;
            background-repeat: no-repeat;
            background-position: center;
            background-size: 18px 18px;
            opacity: 0.9;
          }
          .nav-icon-overview { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23dce7f7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='7' height='7' rx='1.5'/%3E%3Crect x='14' y='3' width='7' height='7' rx='1.5'/%3E%3Crect x='3' y='14' width='7' height='7' rx='1.5'/%3E%3Crect x='14' y='14' width='7' height='7' rx='1.5'/%3E%3C/svg%3E"); }
          .nav-icon-http { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23dce7f7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M3 12h18'/%3E%3Cpath d='M12 3a15 15 0 0 1 0 18'/%3E%3Cpath d='M12 3a15 15 0 0 0 0 18'/%3E%3C/svg%3E"); }
          .nav-icon-database { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23dce7f7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cellipse cx='12' cy='5' rx='7' ry='3'/%3E%3Cpath d='M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5'/%3E%3Cpath d='M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3'/%3E%3C/svg%3E"); }
          .nav-icon-cache { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23dce7f7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 3 4 7l8 4 8-4-8-4Z'/%3E%3Cpath d='m4 12 8 4 8-4'/%3E%3Cpath d='m4 17 8 4 8-4'/%3E%3C/svg%3E"); }
          .nav-icon-auth { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23dce7f7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 3 5 6v6c0 5 3.4 8 7 9 3.6-1 7-4 7-9V6l-7-3Z'/%3E%3Cpath d='m9.5 12 1.7 1.7L14.8 10'/%3E%3C/svg%3E"); }
          .nav-icon-request { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23dce7f7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 4v14'/%3E%3Cpath d='m7 13 5 5 5-5'/%3E%3Cpath d='M5 5h14'/%3E%3C/svg%3E"); }
          .nav-icon-response { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23dce7f7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 20V6'/%3E%3Cpath d='m17 11-5-5-5 5'/%3E%3Cpath d='M5 19h14'/%3E%3C/svg%3E"); }
          .nav-icon-performance { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23dce7f7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4.5 16a8 8 0 1 1 15 0'/%3E%3Cpath d='M12 12 9 15'/%3E%3Cpath d='M12 12h5'/%3E%3C/svg%3E"); }
          .nav-icon-session { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23dce7f7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='4' y='4' width='16' height='16' rx='2'/%3E%3Cpath d='M8 9h8'/%3E%3Cpath d='M8 13h8'/%3E%3Cpath d='M8 17h5'/%3E%3C/svg%3E"); }
          .nav-icon-logs { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23dce7f7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 3h8l4 4v14H4V3h4'/%3E%3Cpath d='M14 3v5h5'/%3E%3Cpath d='M8 13h8'/%3E%3Cpath d='M8 17h6'/%3E%3C/svg%3E"); }
          .nav-icon-json { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23dce7f7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 8c-1.5 0-2.5 1-2.5 2.5v3C5.5 15 4.5 16 3 16'/%3E%3Cpath d='M16 8c1.5 0 2.5 1 2.5 2.5v3c0 1 1 2 2.5 2'/%3E%3Cpath d='M10 6 8 18'/%3E%3Cpath d='M14 6l2 12'/%3E%3C/svg%3E"); }
          .nav-label {
            color: inherit;
            font-size: 13px;
            font-weight: 800;
          }
          .nav-button {
            appearance: none;
            border: 0;
            width: 100%;
            text-align: left;
            padding: 9px 10px;
            border-radius: 14px;
            background: transparent;
            color: rgba(230, 238, 249, 0.76);
            font: inherit;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 12px;
            transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
          }
          .nav-button:hover {
            background: rgba(255,255,255,0.06);
            color: #ffffff;
          }
          .nav-button.active {
            background: linear-gradient(135deg, rgba(132, 134, 255, 0.22), rgba(132, 134, 255, 0.1));
            color: #ffffff;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
          }
          .nav-kicker {
            font-size: 10px;
            letter-spacing: .14em;
            text-transform: uppercase;
            color: rgba(230, 238, 249, 0.52);
          }
          .canvas {
            min-width: 0;
            padding: 8px 2px 2px;
          }
          .view-section {
            display: none;
          }
          .view-section.active {
            display: block;
          }
          .hero {
            padding: 18px;
            border-radius: 22px;
            background: rgba(255,255,255,0.72);
            border: 1px solid rgba(132,134,255,0.12);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.8),
              0 8px 20px rgba(37, 51, 77, 0.06);
            margin-bottom: 16px;
          }
          .hero-top {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: flex-start;
            flex-wrap: wrap;
            margin-bottom: 14px;
          }
          .hero-top > div {
            min-width: 0;
            flex: 1 1 420px;
          }
          .eyebrow {
            font-size: 11px;
            letter-spacing: .18em;
            text-transform: uppercase;
            color: #6b7890;
            font-weight: 800;
            margin-bottom: 8px;
          }
          .hero-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
          }
          .hero-title {
            font-size: 28px;
            line-height: 1.15;
            font-weight: 800;
            letter-spacing: -.04em;
            margin: 0 0 8px;
            color: #152238;
          }
          .hero-request-bar {
            display: flex;
            align-items: center;
            gap: 12px;
            box-sizing: border-box;
            width: 100%;
            max-width: 100%;
            min-height: 60px;
            padding: 12px 16px;
            border-radius: 16px;
            background: #ffffff;
            border: 1px solid rgba(17, 40, 61, 0.1);
            box-shadow:
              0 1px 2px rgba(15, 23, 42, 0.04),
              0 10px 20px rgba(37, 51, 77, 0.04),
              inset 0 1px 0 rgba(255,255,255,0.96);
            margin: 0 0 12px;
            overflow: hidden;
          }
          .hero-method-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 56px;
            padding: 8px 12px;
            border-radius: 10px;
            background: linear-gradient(180deg, #d8f8e7, #cdf6df);
            border: 1px solid rgba(20, 125, 100, 0.08);
            color: #0f7a66;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: .16em;
            text-transform: uppercase;
            flex: 0 0 auto;
          }
          .hero-url {
            min-width: 0;
            flex: 1 1 auto;
            color: #5d6b80;
            font: 13px/1.5 "Berkeley Mono", "SFMono-Regular", Consolas, monospace;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .hero-request-copy {
            appearance: none;
            border: 0;
            background: transparent;
            color: #69778f;
            width: 34px;
            height: 34px;
            border-radius: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            flex: 0 0 34px;
            margin-left: auto;
            transition: background .18s ease, color .18s ease, transform .18s ease;
          }
          .hero-request-copy:hover {
            background: rgba(240, 244, 255, 0.72);
            color: #475672;
            transform: translateY(-1px);
          }
          .hero-request-copy.is-success {
            background: rgba(20, 125, 100, 0.12);
            color: #147d64;
          }
          .hero-request-copy.is-error {
            background: rgba(191, 60, 68, 0.12);
            color: #bf3c44;
          }
          .hero-request-copy-icon {
            width: 18px;
            height: 18px;
            display: inline-flex;
            background-repeat: no-repeat;
            background-position: center;
            background-size: 18px 18px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2369778f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='9' y='9' width='11' height='11' rx='2'/%3E%3Cpath d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'/%3E%3C/svg%3E");
          }
          .hero-title small {
            display: inline-flex;
            margin-right: 10px;
            padding: 7px 10px;
            border-radius: 999px;
            background: rgba(132, 134, 255, 0.1);
            color: #5a5ef0;
            border: 1px solid rgba(132, 134, 255, 0.16);
            font-size: 11px;
            letter-spacing: .14em;
            text-transform: uppercase;
          }
          .hero-copy {
            color: #5e6d85;
            max-width: 520px;
          }
          .hero-top-actions {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }
          .theme-switch {
            appearance: none;
            border: 1px solid rgba(132,134,255,0.14);
            background: rgba(255,255,255,0.82);
            color: #4f5d75;
            width: 38px;
            height: 38px;
            min-height: 38px;
            padding: 0;
            border-radius: 999px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.82);
            transition: background .18s ease, color .18s ease, border-color .18s ease, transform .18s ease;
            flex: 0 0 38px;
          }
          .theme-switch:hover {
            transform: translateY(-1px);
            background: rgba(248,250,255,0.96);
            color: #273550;
          }
          .theme-switch-icon {
            width: 16px;
            height: 16px;
            display: inline-flex;
            background-repeat: no-repeat;
            background-position: center;
            background-size: 16px 16px;
          }
          .theme-switch-icon-light {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235a5ef0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3Cpath d='M12 2v2'/%3E%3Cpath d='M12 20v2'/%3E%3Cpath d='m4.93 4.93 1.41 1.41'/%3E%3Cpath d='m17.66 17.66 1.41 1.41'/%3E%3Cpath d='M2 12h2'/%3E%3Cpath d='M20 12h2'/%3E%3Cpath d='m6.34 17.66-1.41 1.41'/%3E%3Cpath d='m19.07 4.93-1.41 1.41'/%3E%3C/svg%3E");
          }
          .theme-switch-icon-dark {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23d9e4ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 3a6 6 0 1 0 9 9 9 9 0 1 1-9-9Z'/%3E%3C/svg%3E");
          }
          .hero-status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            border: 1px solid rgba(132,134,255,0.14);
            background: rgba(255,255,255,0.76);
            font-weight: 800;
          }
          .hero-dot {
            width: 8px;
            height: 8px;
            border-radius: 999px;
            background: currentColor;
          }
          .hero-status.ok { color: #8ef0bd; }
          .hero-status.warn { color: #ffd277; }
          .hero-status.err { color: #ff9f97; }

          .metrics {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }
          .metric {
            padding: 14px;
            border-radius: 18px;
            background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(246,248,255,0.9));
            border: 1px solid rgba(132,134,255,0.12);
            box-shadow: 0 4px 12px rgba(37, 51, 77, 0.05);
          }
          .metric-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: .16em;
            color: #74829a;
            font-weight: 800;
            margin-bottom: 8px;
          }
          .metric-value {
            font-size: 26px;
            line-height: 1;
            font-weight: 800;
            letter-spacing: -.04em;
            color: #172033;
          }
          .metric-note {
            margin-top: 8px;
            color: #66758d;
            font-size: 12px;
          }

          .section {
            padding: 18px;
            border-radius: 22px;
            background: rgba(255,255,255,0.74);
            border: 1px solid rgba(132,134,255,0.12);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.82),
              0 10px 24px rgba(37, 51, 77, 0.05);
          }
          .section-title {
            font-size: 17px;
            font-weight: 800;
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
          }
          .section-title-main {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            color: #172033;
          }
          .section-copy {
            color: #607089;
            margin-bottom: 14px;
          }
          .api-shell {
            display: grid;
            gap: 16px;
          }
          .api-operation {
            display: grid;
            gap: 12px;
            padding: 18px;
            border-radius: 18px;
            background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(246,248,255,0.92));
            border: 1px solid rgba(132,134,255,0.14);
            box-shadow: 0 8px 18px rgba(37, 51, 77, 0.05);
          }
          .api-line {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }
          .api-method {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 56px;
            padding: 7px 12px;
            border-radius: 999px;
            background: rgba(20, 125, 100, 0.12);
            color: #147d64;
            border: 1px solid rgba(20, 125, 100, 0.16);
            font-size: 11px;
            font-weight: 900;
            letter-spacing: .14em;
            text-transform: uppercase;
          }
          .api-path {
            display: inline-flex;
            align-items: center;
            min-height: 40px;
            padding: 0 14px;
            border-radius: 14px;
            background: rgba(248, 250, 255, 0.98);
            border: 1px solid rgba(132,134,255,0.12);
            color: #172033;
            font: 13px/1.4 "Berkeley Mono", "SFMono-Regular", Consolas, monospace;
            word-break: break-all;
          }
          .api-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          .api-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .api-meta-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 10px;
            border-radius: 999px;
            background: rgba(132,134,255,0.08);
            border: 1px solid rgba(132,134,255,0.12);
            color: #54627c;
            font-size: 11px;
            font-weight: 700;
          }
          .api-response-shell {
            display: grid;
            gap: 12px;
          }
          .api-response-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
          }
          .api-response-title {
            color: #172033;
            font-size: 16px;
            font-weight: 800;
          }
          .copy-action {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-width: 152px;
            justify-content: center;
            transition:
              transform .16s ease,
              box-shadow .2s ease,
              background .2s ease,
              border-color .2s ease;
            box-shadow:
              0 12px 22px rgba(90, 94, 240, 0.18),
              inset 0 1px 0 rgba(255,255,255,0.2);
          }
          .copy-action:hover {
            transform: translateY(-1px);
            box-shadow:
              0 16px 28px rgba(90, 94, 240, 0.24),
              inset 0 1px 0 rgba(255,255,255,0.22);
          }
          .copy-action.is-success {
            background: linear-gradient(180deg, #22ae82, #157b64);
            border-color: rgba(21, 123, 100, 0.85);
            box-shadow:
              0 12px 24px rgba(21, 123, 100, 0.22),
              inset 0 1px 0 rgba(255,255,255,0.2);
          }
          .copy-action.is-error {
            background: linear-gradient(180deg, #e06a78, #bf3c44);
            border-color: rgba(191, 60, 68, 0.84);
            box-shadow:
              0 12px 24px rgba(191, 60, 68, 0.22),
              inset 0 1px 0 rgba(255,255,255,0.2);
          }
          .copy-icon {
            width: 14px;
            height: 14px;
            flex: 0 0 14px;
            background-repeat: no-repeat;
            background-position: center;
            background-size: 14px 14px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='9' y='9' width='11' height='11' rx='2'/%3E%3Cpath d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'/%3E%3C/svg%3E");
          }
          .copy-icon-success {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m5 12 4 4L19 6'/%3E%3C/svg%3E");
          }
          .copy-icon-error {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 6 6 18'/%3E%3Cpath d='m6 6 12 12'/%3E%3C/svg%3E");
          }
          .section-stack {
            display: grid;
            gap: 16px;
          }
          .subsection {
            display: grid;
            gap: 10px;
          }
          .subsection-title {
            color: #4f5d75;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: .14em;
            text-transform: uppercase;
          }

          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: .12em;
            border: 1px solid transparent;
          }
          .badge-info { background: rgba(132, 134, 255, 0.1); color: #5a5ef0; border-color: rgba(132, 134, 255, 0.16); }
          .badge-success { background: rgba(20, 125, 100, 0.12); color: #147d64; border-color: rgba(20, 125, 100, 0.16); }
          .badge-warning { background: rgba(242, 193, 78, 0.18); color: #b66912; border-color: rgba(242, 193, 78, 0.18); }

          .row {
            margin: 10px 0;
            display: flex;
            align-items: flex-start;
            gap: 14px;
            padding: 12px 14px;
            border-radius: 14px;
            background: rgba(255,255,255,0.78);
            border: 1px solid rgba(132,134,255,0.1);
          }
          .key {
            min-width: 108px;
            color: #728198;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: .12em;
            text-transform: uppercase;
          }
          .val {
            flex: 1;
            color: #172033;
            font-weight: 700;
            word-break: break-word;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px;
          }
          .summary-card {
            padding: 16px;
            border-radius: 18px;
            background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(246,248,255,0.92));
            border: 1px solid rgba(132,134,255,0.12);
            box-shadow: 0 6px 14px rgba(37, 51, 77, 0.05);
          }
          .summary-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: .16em;
            font-weight: 800;
            color: #76829a;
            margin-bottom: 10px;
          }
          .summary-value {
            color: #172033;
            font-size: 22px;
            line-height: 1.08;
            letter-spacing: -.03em;
            font-weight: 800;
          }
          .summary-note {
            margin-top: 8px;
            font-size: 12px;
            color: #63738b;
          }
          .muted-value {
            color: #8391a8;
            font-style: italic;
          }

          .property-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            overflow: hidden;
            border-radius: 16px;
            border: 1px solid rgba(132,134,255,0.12);
            background: rgba(255,255,255,0.86);
          }
          .property-table th,
          .property-table td {
            padding: 13px 14px;
            text-align: left;
            border-bottom: 1px solid rgba(132,134,255,0.08);
            vertical-align: top;
          }
          .property-table th {
            background: rgba(132,134,255,0.08);
            color: #53617a;
            font-size: 11px;
            letter-spacing: .12em;
            text-transform: uppercase;
            font-weight: 800;
          }
          .property-table td {
            color: #172033;
            font-size: 13px;
            font-weight: 600;
            word-break: break-word;
          }
          .property-table tr:last-child td {
            border-bottom: 0;
          }
          .code-block {
            margin: 0;
            padding: 14px 16px;
            border-radius: 16px;
            border: 1px solid rgba(132,134,255,0.1);
            background: rgba(246,248,255,0.96);
            color: #172033;
            font: 12px/1.7 "Berkeley Mono", "SFMono-Regular", Consolas, monospace;
            white-space: pre-wrap;
            word-break: break-word;
            overflow-x: auto;
          }
          .code-block-compact {
            padding: 10px 12px;
            border-radius: 12px;
            font-size: 11px;
          }
          .json {
            font: 12px/1.6 "Berkeley Mono", "SFMono-Regular", Consolas, monospace;
            color: #172033;
            background: rgba(246,248,255,0.96);
            border: 1px solid rgba(132,134,255,0.1);
            border-radius: 16px;
            padding: 14px 16px;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
          }
          .json > .json__item {
            display: block;
          }
          .json__node {
            display: block;
            margin-top: 8px;
          }
          .json__node:first-child {
            margin-top: 0;
          }
          .json__children {
            display: none;
            padding-left: 18px;
          }
          .json__node[open] > .json__children {
            display: block;
          }
          .json__item {
            display: block;
            margin-top: 8px;
            padding-left: 18px;
          }
          .json__item--collapsible {
            display: block;
            cursor: pointer;
            position: relative;
            list-style: none;
            margin-top: 0;
          }
          .json__item--collapsible::-webkit-details-marker {
            display: none;
          }
          .json__item--collapsible::before {
            content: "+";
            position: absolute;
            left: 2px;
            top: 0;
            color: #5a5ef0;
            font-weight: 800;
            user-select: none;
          }
          .json__item--collapsible::after {
            content: "";
            position: absolute;
            left: 6px;
            top: 22px;
            width: 1px;
            height: calc(100% - 18px);
            background: rgba(17, 40, 61, 0.16);
          }
          .json__item--collapsible:hover > .json__key,
          .json__item--collapsible:hover > .json__value {
            text-decoration: underline;
          }
          .json__node[open] > .json__item--collapsible::before {
            content: "-";
          }
          .json__key {
            color: #5a5ef0;
            display: inline;
            font-weight: 700;
          }
          .json__key::after {
            content: ": ";
            color: #7f8ca3;
          }
          .json__value {
            display: inline;
          }
          .json__value--string {
            color: #147d64;
          }
          .json__value--number {
            color: #7c3aed;
          }
          .json__value--boolean {
            color: #b66912;
          }
          .json__value--object,
          .json__value--type-object,
          .json__value--type-array {
            color: #c05621;
          }
          .json__value--undefined {
            color: #8391a8;
            font-style: italic;
          }
          .log-list {
            display: grid;
            gap: 12px;
          }
          .log-card {
            padding: 14px;
            border-radius: 16px;
            border: 1px solid rgba(132,134,255,0.1);
            background: rgba(255,255,255,0.82);
          }
          .log-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 10px;
          }
          .log-level {
            display: inline-flex;
            align-items: center;
            padding: 5px 10px;
            border-radius: 999px;
            font-size: 10px;
            letter-spacing: .14em;
            text-transform: uppercase;
            font-weight: 800;
            background: rgba(132,134,255,0.1);
            color: #5a5ef0;
          }
          .log-time {
            color: #728198;
            font-size: 12px;
            font-weight: 700;
          }
          .log-message {
            color: #172033;
            font-weight: 700;
            margin-bottom: 10px;
            word-break: break-word;
          }
          .pill-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
          }
          .pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 999px;
            background: rgba(132,134,255,0.08);
            border: 1px solid rgba(132,134,255,0.12);
            color: #4f5d75;
            font-size: 11px;
            font-weight: 700;
          }

          .sql-list { display: grid; gap: 12px; }
          .sql-item,
          .redirect-chain-item {
            padding: 16px;
            border-radius: 16px;
            background: rgba(255,255,255,0.86);
            border: 1px solid rgba(132,134,255,0.12);
          }
          .sql-header,
          .redirect-chain-header {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
            margin-bottom: 12px;
          }
          .sql-time,
          .redirect-chain-duration {
            color: #147d64;
            font-weight: 800;
            font-size: 12px;
            padding: 4px 10px;
            border-radius: 999px;
            background: rgba(20, 125, 100, 0.12);
          }
          .sql-rows,
          .redirect-chain-method,
          .redirect-chain-status {
            font-size: 11px;
            font-weight: 800;
            border-radius: 999px;
            padding: 4px 10px;
            background: rgba(132,134,255,0.08);
            color: #596883;
          }
          .sql-query,
          .sql-bindings,
          .redirect-chain-arrow {
            background: rgba(246,248,255,0.96);
            border: 1px solid rgba(132,134,255,0.1);
            border-radius: 14px;
            padding: 12px 14px;
            font-family: "Berkeley Mono", "SFMono-Regular", Consolas, monospace;
          }
          .sql-query,
          .redirect-chain-path {
            color: #172033;
            word-break: break-word;
          }
          .sql-bindings,
          .redirect-chain-arrow {
            margin-top: 10px;
            color: #607089;
            font-size: 12px;
          }
          .sql-error {
            margin-top: 10px;
            color: #bf3c44;
            background: rgba(191, 60, 68, 0.08);
            border: 1px solid rgba(191, 60, 68, 0.14);
            border-radius: 12px;
            padding: 10px 12px;
            font-weight: 700;
          }
          .no-data {
            color: #728198;
            font-style: italic;
            text-align: center;
            padding: 30px 16px;
            background: rgba(255,255,255,0.56);
            border-radius: 16px;
            border: 1px dashed rgba(132,134,255,0.18);
          }

          .panel[data-theme="dark"] {
            color: #ebebf0;
            background: #09090B;
            border-color: rgba(255, 255, 255, 0.08);
            box-shadow:
              0 28px 64px rgba(0, 0, 0, 0.6),
              inset 0 1px 0 rgba(255,255,255,0.04);
          }
          .panel[data-theme="dark"]::before {
            background: none;
          }
          .panel[data-theme="dark"] .hero,
          .panel[data-theme="dark"] .section,
          .panel[data-theme="dark"] .summary-card,
          .panel[data-theme="dark"] .metric,
          .panel[data-theme="dark"] .api-shell,
          .panel[data-theme="dark"] .api-operation,
          .panel[data-theme="dark"] .api-response-shell,
          .panel[data-theme="dark"] .sql-item,
          .panel[data-theme="dark"] .redirect-chain-item,
          .panel[data-theme="dark"] .log-card,
          .panel[data-theme="dark"] .cache-op-card,
          .panel[data-theme="dark"] .property-table,
          .panel[data-theme="dark"] .row,
          .panel[data-theme="dark"] .api-path {
            background: #18181B;
            border-color: rgba(255,255,255,0.07);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
          }
          .panel[data-theme="dark"] .hero-request-bar,
          .panel[data-theme="dark"] .code-block,
          .panel[data-theme="dark"] .json,
          .panel[data-theme="dark"] .sql-query,
          .panel[data-theme="dark"] .sql-bindings,
          .panel[data-theme="dark"] .redirect-chain-arrow {
            background: #0d0d10;
            border-color: rgba(255,255,255,0.08);
            color: #ebebf0;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
          }
          .panel[data-theme="dark"] .hero-url,
          .panel[data-theme="dark"] .hero-copy,
          .panel[data-theme="dark"] .summary-note,
          .panel[data-theme="dark"] .metric-note,
          .panel[data-theme="dark"] .key,
          .panel[data-theme="dark"] .log-time,
          .panel[data-theme="dark"] .api-meta-chip,
          .panel[data-theme="dark"] .sql-bindings,
          .panel[data-theme="dark"] .redirect-chain-arrow,
          .panel[data-theme="dark"] .muted-value,
          .panel[data-theme="dark"] .no-data,
          .panel[data-theme="dark"] .eyebrow,
          .panel[data-theme="dark"] .subsection-title,
          .panel[data-theme="dark"] .property-table th,
          .panel[data-theme="dark"] .pill {
            color: #888899;
          }
          .panel[data-theme="dark"] .hero-title,
          .panel[data-theme="dark"] .summary-value,
          .panel[data-theme="dark"] .metric-value,
          .panel[data-theme="dark"] .section-title-main,
          .panel[data-theme="dark"] .val,
          .panel[data-theme="dark"] .log-message,
          .panel[data-theme="dark"] .sql-query,
          .panel[data-theme="dark"] .redirect-chain-path,
          .panel[data-theme="dark"] .api-response-title,
          .panel[data-theme="dark"] .api-path,
          .panel[data-theme="dark"] .property-table td,
          .panel[data-theme="dark"] .json,
          .panel[data-theme="dark"] .json__value {
            color: #ebebf0;
          }
          .panel[data-theme="dark"] .theme-switch,
          .panel[data-theme="dark"] .hero-status,
          .panel[data-theme="dark"] .hero-request-copy {
            background: #18181B;
            border-color: rgba(255,255,255,0.08);
            color: #ebebf0;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
          }
          .panel[data-theme="dark"] .hero-request-copy:hover,
          .panel[data-theme="dark"] .theme-switch:hover {
            background: rgba(255,255,255,0.08);
          }
          .panel[data-theme="dark"] .hero-method-pill,
          .panel[data-theme="dark"] .api-method {
            background: rgba(34, 197, 94, 0.14);
            border-color: rgba(34, 197, 94, 0.20);
            color: #22c55e;
          }
          .panel[data-theme="dark"] .summary-card,
          .panel[data-theme="dark"] .metric {
            border-color: rgba(255,255,255,0.07);
          }
          .panel[data-theme="dark"] .api-meta-chip,
          .panel[data-theme="dark"] .pill,
          .panel[data-theme="dark"] .sql-rows,
          .panel[data-theme="dark"] .redirect-chain-method,
          .panel[data-theme="dark"] .redirect-chain-status {
            background: rgba(255,255,255,0.06);
            border-color: rgba(255,255,255,0.08);
            color: #888899;
          }
          .panel[data-theme="dark"] .sql-time,
          .panel[data-theme="dark"] .redirect-chain-duration,
          .panel[data-theme="dark"] .badge-success {
            background: rgba(34, 197, 94, 0.12);
            border-color: rgba(34, 197, 94, 0.18);
            color: #22c55e;
          }
          .panel[data-theme="dark"] .badge-info {
            background: rgba(96, 165, 250, 0.12);
            border-color: rgba(96, 165, 250, 0.18);
            color: #60a5fa;
          }
          .panel[data-theme="dark"] .badge-warning {
            background: rgba(245, 158, 11, 0.12);
            border-color: rgba(245, 158, 11, 0.18);
            color: #f59e0b;
          }
          .panel[data-theme="dark"] .hero-dot {
            background: currentColor;
          }
          .panel[data-theme="dark"] .property-table th {
            background: rgba(255,255,255,0.04);
          }
          .panel[data-theme="dark"] .no-data {
            background: rgba(255,255,255,0.02);
            border-color: rgba(255,255,255,0.10);
            color: #55566a;
            box-shadow: none;
          }
          .panel[data-theme="dark"] .section-copy,
          .panel[data-theme="dark"] .metric-label,
          .panel[data-theme="dark"] .summary-label {
            color: #55566a;
          }
          .panel[data-theme="dark"] .hero-request-copy-icon {
            filter: brightness(1.6);
          }
          .panel[data-theme="dark"] .json__item--collapsible::after {
            background: rgba(255, 255, 255, 0.12);
          }
          .panel[data-theme="dark"] .json__key {
            color: #60a5fa;
          }
          .panel[data-theme="dark"] .json__value--string {
            color: #22c55e;
          }
          .panel[data-theme="dark"] .json__value--number {
            color: #a78bfa;
          }
          .panel[data-theme="dark"] .json__value--boolean {
            color: #f59e0b;
          }
          .panel[data-theme="dark"] .json__value--object,
          .panel[data-theme="dark"] .json__value--type-object,
          .panel[data-theme="dark"] .json__value--type-array {
            color: #ef8354;
          }

          @media (max-width: 820px) {
            .panel { width: 100%; padding: 12px; }
            .workspace { grid-template-columns: 1fr; }
            .sidebar-nav { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
            .hero-top, .row { flex-direction: column; }
            .hero-head {
              width: 100%;
            }
            .metrics,
            .stats-grid { grid-template-columns: 1fr; }
            .key { min-width: 0; }
          }
        `;
        root.innerHTML = '';
        const style = document.createElement('style');
        style.textContent = css;
        const wrap = document.createElement('div');
        wrap.className = 'panel';
        
        // Build SQL section
        let sqlSection = '';
        if(data.sql && Array.isArray(data.sql) && data.sql.length > 0){
          const totalCount = data.sql_total_count || data.sql.length;
          const totalTime = data.sql_total_time_ms?.toFixed?.(2) ?? data.sql_total_time_ms ?? 0;
          sqlSection = `
            <div class="section">
              <div class="section-title">
                <span class="section-title-main">Database Queries</span>
                <span>
                  <span class="badge badge-info">${totalCount} queries</span>
                  <span class="badge badge-success">${totalTime} ms</span>
                </span>
              </div>
              <div class="sql-list">
                ${data.sql.map((q, idx) => {
                  const duration = q.duration_ms?.toFixed?.(2) ?? q.duration_ms ?? 0;
                  const rowCount = q.row_count !== null && q.row_count !== undefined ? q.row_count : '?';
                  const bindings = q.bindings && Object.keys(q.bindings).length > 0 
                    ? escapeHtml(JSON.stringify(q.bindings)) 
                    : '';
                  const error = q.error ? `<div class="sql-error">Error: ${escapeHtml(q.error)}</div>` : '';
                  return `
                    <div class="sql-item">
                      <div class="sql-header">
                        <div>
                          <span class="badge badge-info">#${idx + 1}</span>
                          <span class="sql-time">${duration} ms</span>
                          <span class="sql-rows">${rowCount} rows</span>
                        </div>
                      </div>
                      <div class="sql-query">${escapeHtml(q.sql || 'N/A')}</div>
                      ${bindings ? `<div class="sql-bindings">Bindings: ${bindings}</div>` : ''}
                      ${error}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        } else {
          sqlSection = `
            <div class="section">
              <div class="section-title"><span class="section-title-main">Database Queries</span></div>
              <div class="no-data">No database queries detected</div>
            </div>
          `;
        }
        
        // Build redirect section if applicable
        let redirectSection = '';
        if (data.is_redirect && data.redirect_url) {
          redirectSection = `
            <div class="row redirect-row">
              <span class="key">Redirect to:</span> 
              <span class="val redirect-url">→ ${escapeHtml(data.redirect_url)}</span>
            </div>
          `;
        }
        
        // Build redirect chain section
        let redirectChainSection = '';
        const host = document.getElementById('doppar-profiler');
        const chainData = host ? host.dataset.redirectChain : null;
        if (chainData && chainData !== '[]') {
          try {
            const chain = JSON.parse(chainData);
            if (chain && chain.length > 0) {
              const chainItems = chain.map((item, idx) => {
                const itemStatus = item.status || '?';
                const itemMethod = item.method || 'GET';
                const itemPath = item.route || item.url || '/';
                const itemDuration = item.duration_ms ? item.duration_ms.toFixed(1) : '0.0';
                const itemRedirectUrl = item.redirect_url || '';
                return `
                  <div class="redirect-chain-item">
                    <div class="redirect-chain-header">
                      <span class="badge badge-info">#${idx + 1}</span>
                      <span class="redirect-chain-status">${itemStatus}</span>
                      <span class="redirect-chain-method">${escapeHtml(itemMethod)}</span>
                      <span class="redirect-chain-path">${escapeHtml(itemPath)}</span>
                      <span class="redirect-chain-duration">${itemDuration} ms</span>
                    </div>
                    ${itemRedirectUrl ? `<div class="redirect-chain-arrow">Redirected to: ${escapeHtml(itemRedirectUrl)}</div>` : ''}
                  </div>
                `;
              }).join('');
              
              redirectChainSection = `
                <div class="section">
                  <div class="section-title">
                    <span class="section-title-main">Redirect Chain</span>
                    <span class="badge badge-warning">${chain.length} redirect${chain.length > 1 ? 's' : ''}</span>
                  </div>
                  <div class="redirect-chain-list">
                    ${chainItems}
                    <div class="redirect-chain-item redirect-chain-current">
                      <div class="redirect-chain-header">
                        <span class="badge badge-success">Current</span>
                        <span class="redirect-chain-status">${data.status}</span>
                        <span class="redirect-chain-method">${escapeHtml(data.method)}</span>
                        <span class="redirect-chain-path">${escapeHtml(data.route)}</span>
                        <span class="redirect-chain-duration">${(data.duration_ms?.toFixed?.(1) ?? data.duration_ms)} ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }
          } catch (e) {
            console.error('Failed to parse redirect chain:', e);
          }
        }
        
        // Build auth section
        let authSection = '<div class="section"><div class="section-title"><span class="section-title-main">Authentication</span></div><div class="no-data">No authenticated user context captured for this request</div></div>';
        if (data.auth_authenticated) {
          const userName = escapeHtml(data.auth_user_name || 'User');
          const userEmail = escapeHtml(data.auth_user_email || '');
          const authMeta = {};
          if (data.auth_user_id !== null && data.auth_user_id !== undefined) authMeta['User ID'] = data.auth_user_id;
          if (data.auth_guard) authMeta['Guard'] = data.auth_guard;
          authSection = `
            <div class="section">
              <div class="section-title">
                <span class="section-title-main">Authentication</span>
                <span class="badge badge-success">Authenticated</span>
              </div>
              <div class="row"><span class="key">User:</span> <span class="val">${userName}</span></div>
              ${userEmail ? `<div class="row"><span class="key">Email:</span> <span class="val">${userEmail}</span></div>` : ''}
              ${hasEntries(authMeta) ? buildSubsection('Metadata', buildPropertyTable(authMeta, 'Property', 'Value')) : ''}
              ${hasEntries(data.auth_user) ? buildSubsection('User Payload', buildPropertyTable(data.auth_user, 'Property', 'Value')) : ''}
            </div>
          `;
        }

        const requestInfoSection = `
          <div class="section">
            <div class="section-title"><span class="section-title-main">Request Information</span></div>
            <div class="row"><span class="key">Request ID:</span> <span class="val">${escapeHtml(data.id)}</span></div>
            <div class="row"><span class="key">Method:</span> <span class="val">${escapeHtml(data.method)}</span></div>
            <div class="row"><span class="key">Path:</span> <span class="val">${escapeHtml(data.route)}</span></div>
            <div class="row"><span class="key">Status:</span> <span class="val">${escapeHtml(data.status)}</span></div>
            ${redirectSection}
            <div class="row"><span class="key">Duration:</span> <span class="val">${escapeHtml(data.duration_ms?.toFixed?.(1) ?? data.duration_ms)} ms</span></div>
            <div class="row"><span class="key">Memory Peak:</span> <span class="val">${((data.memory_peak || 0) / (1024*1024)).toFixed(2)} MB</span></div>
          </div>
        `;

        const requestDetailsSection = `
          <div class="section">
            <div class="section-title"><span class="section-title-main">Request Payload</span></div>
            <div class="section-stack">
              ${buildSubsection('Headers', buildPropertyTable(data.request_headers, 'Header', 'Value'))}
              ${buildSubsection('Query Parameters', buildPropertyTable(data.request_query, 'Parameter', 'Value'))}
              ${buildSubsection('POST Parameters', buildPropertyTable(data.request_params, 'Parameter', 'Value'))}
              ${buildSubsection('Request Body', buildCodeBlock(data.request_body))}
              ${buildSubsection('Cookies', buildPropertyTable(data.request_cookies, 'Cookie', 'Value'))}
              ${buildSubsection('Uploaded Files', buildFilesTable(data.request_files))}
              ${buildSubsection('Server', buildPropertyTable(data.request_server, 'Variable', 'Value'))}
            </div>
            ${!hasEntries(data.request_headers) && !hasEntries(data.request_query) && !hasEntries(data.request_params) && !data.request_body && !hasEntries(data.request_cookies) && !hasEntries(data.request_files) && !hasEntries(data.request_server) ? '<div class="no-data">No detailed request payload captured</div>' : ''}
          </div>
        `;

        const performanceSection = `
          <div class="section">
            <div class="section-title"><span class="section-title-main">Performance Profile</span></div>
            <div class="summary-grid">
              <div class="summary-card">
                <div class="summary-label">Duration</div>
                <div class="summary-value">${escapeHtml(data.duration_ms?.toFixed?.(1) ?? data.duration_ms)} ms</div>
                <div class="summary-note">Total application runtime for this request.</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Peak Memory</div>
                <div class="summary-value">${((data.memory_peak || 0) / (1024*1024)).toFixed(2)} MB</div>
                <div class="summary-note">Maximum memory footprint recorded.</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">SQL Time</div>
                <div class="summary-value">${escapeHtml(data.sql_total_time_ms?.toFixed?.(2) ?? data.sql_total_time_ms ?? 0)} ms</div>
                <div class="summary-note">Time spent in database calls.</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Queries</div>
                <div class="summary-value">${escapeHtml(data.sql_total_count || 0)}</div>
                <div class="summary-note">Executed SQL statements in this lifecycle.</div>
              </div>
            </div>
          </div>
        `;

        const responseInfo = {};
        if (data.response_status !== undefined) responseInfo['Status Code'] = data.response_status;
        if (data.response_content_type) responseInfo['Content Type'] = data.response_content_type;
        if (data.response_body_size !== undefined) responseInfo['Body Size'] = formatBytes(data.response_body_size);

        const responseSection = `
          <div class="section">
            <div class="section-title"><span class="section-title-main">Response Details</span></div>
            <div class="section-stack">
              ${buildSubsection('Response', buildPropertyTable(responseInfo, 'Property', 'Value'))}
              ${buildSubsection('Headers', buildPropertyTable(data.response_headers, 'Header', 'Value'))}
              ${(data.is_redirect && data.redirect_url) ? `<div class="row"><span class="key">Redirect to:</span><span class="val">→ ${escapeHtml(data.redirect_url)}</span></div>` : ''}
            </div>
            ${!hasEntries(responseInfo) && !hasEntries(data.response_headers) && !(data.is_redirect && data.redirect_url) ? '<div class="no-data">No response details available</div>' : ''}
          </div>
        `;

        const cacheOperations = Array.isArray(data.cache_operations) ? data.cache_operations : [];
        const cacheReads = Number(data.cache_hits || 0) + Number(data.cache_misses || 0);
        const cacheHitRate = cacheReads > 0 ? ((Number(data.cache_hits || 0) / cacheReads) * 100).toFixed(1) : '0.0';
        const cacheSection = `
          <div class="section">
            <div class="section-title"><span class="section-title-main">Cache Activity</span></div>
            ${cacheOperations.length ? `
              <div class="summary-grid">
                <div class="summary-card"><div class="summary-label">Operations</div><div class="summary-value">${escapeHtml(data.cache_total || cacheOperations.length)}</div><div class="summary-note">Total captured cache events.</div></div>
                <div class="summary-card"><div class="summary-label">Hit Rate</div><div class="summary-value">${cacheHitRate}%</div><div class="summary-note">${escapeHtml(data.cache_hits || 0)} hits / ${escapeHtml(data.cache_misses || 0)} misses</div></div>
                <div class="summary-card"><div class="summary-label">Writes</div><div class="summary-value">${escapeHtml(data.cache_writes || 0)}</div><div class="summary-note">Set and forever style writes.</div></div>
                <div class="summary-card"><div class="summary-label">Deletes</div><div class="summary-value">${escapeHtml(data.cache_deletes || 0)}</div><div class="summary-note">Forget and delete operations.</div></div>
              </div>
              <div class="section-stack" style="margin-top:14px;">
                ${cacheOperations.map((operation, index) => {
                  let valueOutput = '';
                  if(operation.value_json){
                    try {
                      valueOutput = buildJsonViewer(JSON.parse(operation.value_json));
                    } catch (error) {
                      valueOutput = buildCodeBlock(operation.value_json);
                    }
                  } else if(operation.value !== null && operation.value !== undefined && operation.value !== ''){
                    valueOutput = buildCodeBlock(String(operation.value));
                  }
                  return `
                    <div class="subsection">
                      <div class="subsection-title">${escapeHtml(operation.type || 'unknown')} #${index + 1}</div>
                      <div class="pill-row">
                        <span class="pill">Key: ${escapeHtml(operation.key || 'N/A')}</span>
                        ${operation.type === 'get' ? `<span class="pill">${operation.hit ? 'HIT' : 'MISS'}</span>` : ''}
                      </div>
                      ${valueOutput}
                    </div>
                  `;
                }).join('')}
              </div>
            ` : '<div class="no-data">No cache operations detected</div>'}
          </div>
        `;

        const sessionSection = `
          <div class="section">
            <div class="section-title"><span class="section-title-main">Session Snapshot</span></div>
            ${hasEntries(data.session_data) ? buildCodeBlock(data.session_data) : '<div class="no-data">No session data available</div>'}
          </div>
        `;

        const logsList = Array.isArray(data.logs) ? data.logs : [];
        const logsSection = `
          <div class="section">
            <div class="section-title"><span class="section-title-main">Runtime Logs</span></div>
            ${logsList.length ? `
              <div class="log-list">
                ${logsList.map((log) => `
                  <div class="log-card">
                    <div class="log-head">
                      <span class="log-level">${escapeHtml((log.level || 'info').toUpperCase())}</span>
                      <span class="log-time">${escapeHtml(log.time || '')}</span>
                    </div>
                    <div class="log-message">${escapeHtml(log.message || '')}</div>
                    ${hasEntries(log.context) ? buildCodeBlock(log.context) : ''}
                  </div>
                `).join('')}
              </div>
            ` : '<div class="no-data">No logs captured during this request</div>'}
          </div>
        `;

        const outgoingRequests = Array.isArray(data.http_requests) ? data.http_requests : [];
        const jsonApiPath = `/_insight/api/${escapeHtml(data.id)}`;
        const jsonApiSection = `
          <div class="section">
            <div class="section-title">
              <span class="section-title-main">JSON API</span>
            </div>
            <div class="api-shell">
              <div class="api-operation">
                <div class="api-line">
                  <span class="api-method">GET</span>
                  <span class="api-path">${jsonApiPath}</span>
                </div>
                <div class="api-meta">
                  <span class="api-meta-chip">Status 200</span>
                  <span class="api-meta-chip">Content-Type application/json</span>
                  <span class="api-meta-chip">Request ${escapeHtml(data.id)}</span>
                </div>
              </div>
              <div class="api-response-shell">
                <div class="api-response-head">
                  <button class="dp-btn dp-btn-primary copy-action" type="button" data-action="json-api-copy">
                    <span class="copy-icon" aria-hidden="true"></span>
                    Copy Payload
                  </button>
                </div>
                ${buildCodeBlock(data)}
              </div>
            </div>
          </div>
        `;

        const httpSection = `
          <div class="section-stack">
            ${redirectChainSection || '<div class="section"><div class="section-title"><span class="section-title-main">Redirect Chain</span></div><div class="no-data">No redirects were detected for this request chain</div></div>'}
            <div class="section">
              <div class="section-title"><span class="section-title-main">Outgoing HTTP Requests</span></div>
              ${outgoingRequests.length ? `
                <div class="section-stack">
                  ${outgoingRequests.map((request, index) => `
                    <div class="subsection">
                      <div class="subsection-title">Request #${index + 1}</div>
                      <div class="pill-row">
                        <span class="pill">${escapeHtml(request.method || 'GET')}</span>
                        <span class="pill">${escapeHtml(request.status ?? 'N/A')}</span>
                        <span class="pill">${escapeHtml(request.duration_ms?.toFixed?.(1) ?? request.duration_ms ?? 0)} ms</span>
                        ${request.successful === true ? '<span class="pill">Successful</span>' : ''}
                        ${request.successful === false ? '<span class="pill">Failed</span>' : ''}
                      </div>
                      <div class="row"><span class="key">URL:</span><span class="val">${escapeHtml(request.url || 'unknown')}</span></div>
                      ${request.error ? `<div class="row"><span class="key">Error:</span><span class="val">${escapeHtml(request.error)}</span></div>` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : '<div class="no-data">No outgoing HTTP requests recorded</div>'}
            </div>
          </div>
        `;

        const statusClass = Number(data.status) >= 500 || Number(data.status) >= 400
          ? 'err'
          : (Number(data.status) >= 300 ? 'warn' : 'ok');

        const sidebarLogo = toolbarLogo
          ? `<img src="${escapeHtml(toolbarLogo)}" alt="Doppar Logo" width="18" height="18">`
          : 'D';

        wrap.innerHTML = `
          <div class="workspace">
            <aside class="sidebar">
              <div class="sidebar-brand">
                <span class="sidebar-mark">${sidebarLogo}</span>
                <div>
                  <div class="sidebar-title">Insight</div>
                  <div class="sidebar-copy">Request profiler</div>
                </div>
              </div>
              <nav class="sidebar-nav">
                <button class="nav-button active" type="button" data-view="overview"><span class="nav-main"><span class="nav-icon nav-icon-overview"></span><span class="nav-label">Overview</span></span></button>
                <button class="nav-button" type="button" data-view="http"><span class="nav-main"><span class="nav-icon nav-icon-http"></span><span class="nav-label">HTTP</span></span></button>
                <button class="nav-button" type="button" data-view="database"><span class="nav-main"><span class="nav-icon nav-icon-database"></span><span class="nav-label">Database</span></span></button>
                <button class="nav-button" type="button" data-view="cache"><span class="nav-main"><span class="nav-icon nav-icon-cache"></span><span class="nav-label">Cache</span></span></button>
                <button class="nav-button" type="button" data-view="auth"><span class="nav-main"><span class="nav-icon nav-icon-auth"></span><span class="nav-label">Auth</span></span></button>
                <button class="nav-button" type="button" data-view="request"><span class="nav-main"><span class="nav-icon nav-icon-request"></span><span class="nav-label">Request</span></span></button>
                <button class="nav-button" type="button" data-view="response"><span class="nav-main"><span class="nav-icon nav-icon-response"></span><span class="nav-label">Response</span></span></button>
                <button class="nav-button" type="button" data-view="performance"><span class="nav-main"><span class="nav-icon nav-icon-performance"></span><span class="nav-label">Performance</span></span></button>
                <button class="nav-button" type="button" data-view="session"><span class="nav-main"><span class="nav-icon nav-icon-session"></span><span class="nav-label">Session</span></span></button>
                <button class="nav-button" type="button" data-view="logs"><span class="nav-main"><span class="nav-icon nav-icon-logs"></span><span class="nav-label">Logs</span></span></button>
                <button class="nav-button" type="button" data-view="json-api"><span class="nav-main"><span class="nav-icon nav-icon-json"></span><span class="nav-label">JSON API</span></span></button>
              </nav>
            </aside>
            <main class="canvas">
              <section class="view-section active" data-view-section="overview">
                <div class="hero">
                  <div class="hero-top">
                    <div>
                      <div class="hero-head">
                        <div class="eyebrow">Quick View</div>
                        <button class="theme-switch" type="button" data-action="toggle-theme" data-theme-mode="light" aria-pressed="false" aria-label="Switch to dark mode">
                          <span class="theme-switch-icon theme-switch-icon-light" aria-hidden="true"></span>
                        </button>
                      </div>
                      <div class="hero-request-bar">
                        <span class="hero-method-pill">${escapeHtml(data.method)}</span>
                        <div class="hero-url" title="${escapeHtml(requestUrl)}">${escapeHtml(requestUrl)}</div>
                        <button class="hero-request-copy" type="button" data-action="copy-request-url" aria-label="Copy request URL">
                          <span class="hero-request-copy-icon" aria-hidden="true"></span>
                        </button>
                      </div>
                      <div class="hero-copy">A focused operational dashboard for this request, built for fast triage and deeper follow-up.</div>
                    </div>
                    <div class="hero-top-actions">
                      <span class="hero-status ${statusClass}">
                        <span class="hero-dot"></span>
                        HTTP ${escapeHtml(data.status)}
                      </span>
                    </div>
                  </div>
                  <div class="metrics">
                    <div class="metric">
                      <div class="metric-label">Duration</div>
                      <div class="metric-value">${escapeHtml(data.duration_ms?.toFixed?.(1) ?? data.duration_ms)}</div>
                      <div class="metric-note">milliseconds</div>
                    </div>
                    <div class="metric">
                      <div class="metric-label">Peak Memory</div>
                      <div class="metric-value">${((data.memory_peak || 0) / (1024*1024)).toFixed(2)}</div>
                      <div class="metric-note">MB</div>
                    </div>
                    <div class="metric">
                      <div class="metric-label">SQL Queries</div>
                      <div class="metric-value">${escapeHtml(data.sql_total_count || 0)}</div>
                      <div class="metric-note">${escapeHtml(data.sql_total_time_ms?.toFixed?.(2) ?? data.sql_total_time_ms ?? 0)} ms total</div>
                    </div>
                  </div>
                </div>
                <div class="stats-grid">
                  ${requestInfoSection}
                  ${performanceSection}
                </div>
              </section>
              <section class="view-section" data-view-section="http">
                ${httpSection}
              </section>
              <section class="view-section" data-view-section="request">
                ${requestDetailsSection}
              </section>
              <section class="view-section" data-view-section="response">
                ${responseSection}
              </section>
              <section class="view-section" data-view-section="performance">
                ${performanceSection}
              </section>
              <section class="view-section" data-view-section="database">
                ${sqlSection}
              </section>
              <section class="view-section" data-view-section="cache">
                ${cacheSection}
              </section>
              <section class="view-section" data-view-section="auth">
                ${authSection}
              </section>
              <section class="view-section" data-view-section="session">
                ${sessionSection}
              </section>
              <section class="view-section" data-view-section="logs">
                ${logsSection}
              </section>
              <section class="view-section" data-view-section="json-api">
                ${jsonApiSection}
              </section>
            </main>
          </div>
        `;
        root.appendChild(style);
        root.appendChild(wrap);
        const navButtons = wrap.querySelectorAll('[data-view]');
        const viewSections = wrap.querySelectorAll('[data-view-section]');
        navButtons.forEach((button) => {
          button.addEventListener('click', () => {
            const target = button.getAttribute('data-view');
            navButtons.forEach((item) => item.classList.toggle('active', item === button));
            viewSections.forEach((section) => {
              section.classList.toggle('active', section.getAttribute('data-view-section') === target);
            });
          });
        });
        wrap.querySelectorAll('[data-action="json-api-copy"]').forEach((button) => {
          button.addEventListener('click', async () => {
            const payload = JSON.stringify(data, null, 2);
            try {
              await this.copyText(payload);
              this.setCopyButtonState(button, 'success');
            } catch (error) {
              this.setCopyButtonState(button, 'error');
            }
            window.setTimeout(() => {
              this.setCopyButtonState(button, 'idle');
            }, 1600);
          });
        });
        wrap.querySelectorAll('[data-action="copy-request-url"]').forEach((button) => {
          button.addEventListener('click', async () => {
            button.classList.remove('is-success', 'is-error');
            try {
              await this.copyText(String(requestUrl));
              button.classList.add('is-success');
            } catch (error) {
              button.classList.add('is-error');
            }
            window.setTimeout(() => {
              button.classList.remove('is-success', 'is-error');
            }, 1600);
          });
        });
        wrap.querySelectorAll('[data-action="toggle-theme"]').forEach((button) => {
          button.addEventListener('click', () => {
            const current = wrap.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
            this.setQuickViewTheme(wrap, current === 'dark' ? 'light' : 'dark');
          });
        });
        this.setQuickViewTheme(wrap, this.getQuickViewTheme());
        this.syncPanelPosition();
      }).catch(()=>{});
    } else {
      root.innerHTML = '';
    }
  },
  bindLayoutSync(){
    if(this.layoutSyncBound){
      return;
    }
    this.layoutSyncBound = true;
    const sync = () => {
      if(this.open){
        this.syncPanelPosition();
      }
    };
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, { passive: true });
  }
};

window.DopparProfiler.bindLayoutSync();
