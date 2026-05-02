window.DopparProfiler = {
  open: false,
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
        const escapeHtml = (value) => {
          const div = document.createElement('div');
          div.textContent = String(value ?? '');
          return div.innerHTML;
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
          }
          .sidebar {
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
            padding: 10px 12px 14px;
            margin-bottom: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
          .sidebar-mark {
            width: 34px;
            height: 34px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            background: linear-gradient(180deg, #8f92ff, #7479ff);
            box-shadow: 0 10px 18px rgba(132, 134, 255, 0.22);
          }
          .sidebar-mark img {
            width: 18px;
            height: 18px;
          }
          .sidebar-title {
            font-size: 15px;
            font-weight: 800;
            color: #ffffff;
          }
          .sidebar-copy {
            font-size: 11px;
            color: rgba(230, 238, 249, 0.66);
          }
          .sidebar-nav {
            display: grid;
            gap: 6px;
          }
          .nav-button {
            appearance: none;
            border: 0;
            width: 100%;
            text-align: left;
            padding: 12px 12px;
            border-radius: 14px;
            background: transparent;
            color: rgba(230, 238, 249, 0.76);
            font: inherit;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
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
          .eyebrow {
            font-size: 11px;
            letter-spacing: .18em;
            text-transform: uppercase;
            color: #6b7890;
            font-weight: 800;
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

          @media (max-width: 820px) {
            .panel { width: 100%; padding: 12px; }
            .workspace { grid-template-columns: 1fr; }
            .sidebar-nav { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
            .hero-top, .row { flex-direction: column; }
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
          authSection = `
            <div class="section">
              <div class="section-title">
                <span class="section-title-main">Authentication</span>
                <span class="badge badge-success">Authenticated</span>
              </div>
              <div class="row"><span class="key">User:</span> <span class="val">${userName}</span></div>
              ${userEmail ? `<div class="row"><span class="key">Email:</span> <span class="val">${userEmail}</span></div>` : ''}
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

        const statusClass = Number(data.status) >= 500 || Number(data.status) >= 400
          ? 'err'
          : (Number(data.status) >= 300 ? 'warn' : 'ok');

        wrap.innerHTML = `
          <div class="workspace">
            <aside class="sidebar">
              <div class="sidebar-brand">
                <span class="sidebar-mark">D</span>
                <div>
                  <div class="sidebar-title">Quick View</div>
                  <div class="sidebar-copy">Doppar request workspace</div>
                </div>
              </div>
              <nav class="sidebar-nav">
                <button class="nav-button active" type="button" data-view="overview"><span>Overview</span><span class="nav-kicker">Summary</span></button>
                <button class="nav-button" type="button" data-view="request"><span>Request</span><span class="nav-kicker">${escapeHtml(data.method)}</span></button>
                <button class="nav-button" type="button" data-view="performance"><span>Performance</span><span class="nav-kicker">${escapeHtml(data.duration_ms?.toFixed?.(1) ?? data.duration_ms)} ms</span></button>
                <button class="nav-button" type="button" data-view="database"><span>Database</span><span class="nav-kicker">${escapeHtml(data.sql_total_count || 0)} queries</span></button>
                <button class="nav-button" type="button" data-view="redirects"><span>Redirects</span><span class="nav-kicker">${(chainData && chainData !== '[]') || (data.is_redirect && data.redirect_url) ? 'Active' : 'None'}</span></button>
                <button class="nav-button" type="button" data-view="auth"><span>Auth</span><span class="nav-kicker">${data.auth_authenticated ? 'User' : 'Guest'}</span></button>
              </nav>
            </aside>
            <main class="canvas">
              <section class="view-section active" data-view-section="overview">
                <div class="hero">
                  <div class="hero-top">
                    <div>
                      <div class="eyebrow">Quick View</div>
                      <div class="hero-title"><small>${escapeHtml(data.method)}</small>${escapeHtml(data.route)}</div>
                      <div class="hero-copy">A focused operational dashboard for this request, built for fast triage and deeper follow-up.</div>
                    </div>
                    <span class="hero-status ${statusClass}">
                      <span class="hero-dot"></span>
                      HTTP ${escapeHtml(data.status)}
                    </span>
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
              <section class="view-section" data-view-section="request">
                ${requestInfoSection}
              </section>
              <section class="view-section" data-view-section="performance">
                ${performanceSection}
              </section>
              <section class="view-section" data-view-section="database">
                ${sqlSection}
              </section>
              <section class="view-section" data-view-section="redirects">
                ${redirectChainSection || '<div class="section"><div class="section-title"><span class="section-title-main">Redirects</span></div><div class="no-data">No redirects were detected for this request chain</div></div>'}
              </section>
              <section class="view-section" data-view-section="auth">
                ${authSection}
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
