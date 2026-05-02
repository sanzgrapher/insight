window.DopparProfiler = {
  open: false,
  ensurePanelRoot(){
    let host = document.getElementById('doppar-profiler-panel');
    if(!host){
      host = document.createElement('div');
      host.id = 'doppar-profiler-panel';
      // Isolate the host from page CSS as much as possible
      host.style.all = 'initial';
      host.style.position = 'fixed';
      host.style.right = '10px';
      host.style.bottom = '48px';
      host.style.zIndex = '2147483647';
      document.body.appendChild(host);
    }
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
            width: min(860px, calc(100vw - 48px));
            max-height: 78vh;
            overflow: auto;
            border-radius: 26px;
            padding: 22px;
            color: #edf5fc;
            font: 14px/1.65 "Aptos", "Segoe UI Variable", "Segoe UI", sans-serif;
            background:
              radial-gradient(circle at top right, rgba(242, 193, 78, 0.18), transparent 22%),
              radial-gradient(circle at bottom left, rgba(15, 139, 141, 0.22), transparent 28%),
              linear-gradient(145deg, rgba(7, 17, 31, 0.98), rgba(12, 31, 46, 0.96) 56%, rgba(14, 62, 81, 0.94));
            border: 1px solid rgba(255,255,255,0.12);
            box-shadow: 0 30px 80px rgba(2, 10, 18, 0.36), inset 0 1px 0 rgba(255,255,255,0.06);
            backdrop-filter: blur(16px);
            position: relative;
          }

          .panel::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 26px;
            pointer-events: none;
            background: linear-gradient(180deg, rgba(255,255,255,0.06), transparent 32%);
          }

          .hero, .section { position: relative; z-index: 1; }
          .hero {
            padding: 20px;
            border-radius: 22px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.08);
            margin-bottom: 18px;
          }
          .hero-top {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: flex-start;
            flex-wrap: wrap;
            margin-bottom: 16px;
          }
          .eyebrow {
            font-size: 11px;
            letter-spacing: .18em;
            text-transform: uppercase;
            color: rgba(237,245,252,0.62);
            font-weight: 800;
            margin-bottom: 8px;
          }
          .hero-title {
            font-size: 24px;
            line-height: 1.15;
            font-weight: 800;
            letter-spacing: -.04em;
            margin: 0 0 8px;
          }
          .hero-title small {
            display: inline-flex;
            margin-right: 10px;
            padding: 7px 10px;
            border-radius: 999px;
            background: rgba(242, 193, 78, 0.16);
            color: #ffe8a7;
            border: 1px solid rgba(242, 193, 78, 0.18);
            font-size: 11px;
            letter-spacing: .14em;
            text-transform: uppercase;
          }
          .hero-copy {
            color: rgba(237,245,252,0.76);
            max-width: 520px;
          }
          .hero-status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.08);
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
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
          }
          .metric {
            padding: 14px;
            border-radius: 18px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.08);
          }
          .metric-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: .16em;
            color: rgba(237,245,252,0.62);
            font-weight: 800;
            margin-bottom: 8px;
          }
          .metric-value {
            font-size: 24px;
            line-height: 1;
            font-weight: 800;
            letter-spacing: -.04em;
          }
          .metric-note {
            margin-top: 8px;
            color: rgba(237,245,252,0.68);
            font-size: 12px;
          }

          .section {
            margin-bottom: 18px;
            padding: 18px;
            border-radius: 20px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.08);
          }
          .section:last-child { margin-bottom: 0; }
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
          }
          .section-copy {
            color: rgba(237,245,252,0.72);
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
          .badge-info { background: rgba(42, 114, 212, 0.14); color: #8ec5ff; border-color: rgba(42, 114, 212, 0.18); }
          .badge-success { background: rgba(20, 125, 100, 0.16); color: #9ef3c8; border-color: rgba(158, 243, 200, 0.16); }
          .badge-warning { background: rgba(242, 193, 78, 0.14); color: #ffd277; border-color: rgba(242, 193, 78, 0.18); }

          .row {
            margin: 10px 0;
            display: flex;
            align-items: flex-start;
            gap: 14px;
            padding: 12px 14px;
            border-radius: 14px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.06);
          }
          .key {
            min-width: 108px;
            color: rgba(237,245,252,0.58);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: .12em;
            text-transform: uppercase;
          }
          .val {
            flex: 1;
            color: #f7fbff;
            font-weight: 700;
            word-break: break-word;
          }

          .sql-list { display: grid; gap: 12px; }
          .sql-item,
          .redirect-chain-item {
            padding: 16px;
            border-radius: 16px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.08);
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
            color: #9ef3c8;
            font-weight: 800;
            font-size: 12px;
            padding: 4px 10px;
            border-radius: 999px;
            background: rgba(20, 125, 100, 0.16);
          }
          .sql-rows,
          .redirect-chain-method,
          .redirect-chain-status {
            font-size: 11px;
            font-weight: 800;
            border-radius: 999px;
            padding: 4px 10px;
            background: rgba(255,255,255,0.08);
            color: rgba(237,245,252,0.76);
          }
          .sql-query,
          .sql-bindings,
          .redirect-chain-arrow {
            background: rgba(5, 12, 22, 0.32);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 14px;
            padding: 12px 14px;
            font-family: "Berkeley Mono", "SFMono-Regular", Consolas, monospace;
          }
          .sql-query,
          .redirect-chain-path {
            color: #f7fbff;
            word-break: break-word;
          }
          .sql-bindings,
          .redirect-chain-arrow {
            margin-top: 10px;
            color: rgba(237,245,252,0.72);
            font-size: 12px;
          }
          .sql-error {
            margin-top: 10px;
            color: #ffb6b0;
            background: rgba(191, 60, 68, 0.16);
            border: 1px solid rgba(191, 60, 68, 0.2);
            border-radius: 12px;
            padding: 10px 12px;
            font-weight: 700;
          }
          .no-data {
            color: rgba(237,245,252,0.62);
            font-style: italic;
            text-align: center;
            padding: 30px 16px;
            background: rgba(255,255,255,0.04);
            border-radius: 16px;
            border: 1px dashed rgba(255,255,255,0.1);
          }

          @media (max-width: 820px) {
            .panel { width: calc(100vw - 24px); padding: 16px; }
            .hero-top, .row { flex-direction: column; }
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
        let authSection = '';
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
        
        const statusClass = Number(data.status) >= 500 || Number(data.status) >= 400
          ? 'err'
          : (Number(data.status) >= 300 ? 'warn' : 'ok');

        wrap.innerHTML = `
          <div class="hero">
            <div class="hero-top">
              <div>
                <div class="eyebrow">Quick View</div>
                <div class="hero-title"><small>${escapeHtml(data.method)}</small>${escapeHtml(data.route)}</div>
                <div class="hero-copy">A fast operational snapshot of this request, optimized for immediate debugging.</div>
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
          ${authSection}
          ${redirectChainSection}
          ${sqlSection}
        `;
        root.appendChild(style);
        root.appendChild(wrap);
      }).catch(()=>{});
    } else {
      root.innerHTML = '';
    }
  }
};
