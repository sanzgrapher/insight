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
        // Shadow DOM content
        const css = `
          :host{all:initial}

          .panel {
              background: linear-gradient(135deg, #ddd 0%, #f8fafc 100%);
              color: #1f2937;
              border: 2px solid #e5e7eb;
              border-radius: 16px;
              padding: 24px;
              width: 720px;
              max-height: 75vh;
              overflow: auto;
              box-shadow: 
                  0 20px 60px rgba(0, 0, 0, 0.15),
                  0 8px 32px rgba(0, 0, 0, 0.1),
                  inset 0 1px 0 rgba(255, 255, 255, 0.8);
              font: 14px/1.6 system-ui, Segoe UI, Roboto, Helvetica, Arial;
              position: relative;
              backdrop-filter: blur(10px);
          }

          .panel::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background-size: 200% 100%;
              animation: gradientShift 3s ease infinite;
              border-radius: 16px 16px 0 0;
          }

          @keyframes gradientShift {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
          }

          .section {
              margin-bottom: 24px;
              padding-bottom: 20px;
              border-bottom: 2px solid #f3f4f6;
              position: relative;
          }

          .section:last-child {
              border-bottom: none;
              margin-bottom: 0;
          }

          .section-title {
              font-size: 16px;
              font-weight: 700;
              color: #1f2937;
              margin-bottom: 16px;
              display: flex;
              align-items: center;
              gap: 12px;
              padding-left: 12px;
          }

          .badge {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 6px 14px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border: 1px solid transparent;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }

          .badge-info {
              background: linear-gradient(135deg, #eff6ff, #dbeafe);
              color: #1e40af;
              border-color: #93c5fd;
          }

          .badge-success {
              background: linear-gradient(135deg, #d1fae5, #a7f3d0);
              color: #065f46;
              border-color: #6ee7b7;
          }

          .badge-warning {
              background: linear-gradient(135deg, #fef3c7, #fde68a);
              color: #92400e;
              border-color: #fbbf24;
          }

          .badge-error {
              background: linear-gradient(135deg, #fee2e2, #fecaca);
              color: #991b1b;
              border-color: #fca5a5;
          }

          .row {
              margin: 12px 0;
              display: flex;
              align-items: center;
              gap: 16px;
              padding: 10px 16px;
              background: #f9fafb;
              border-radius: 10px;
              border: 1px solid #e5e7eb;
              transition: all 0.2s ease;
          }

          .row:hover {
              background: #ffffff;
              border-color: #d1d5db;
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          }

          .key {
              color: #6b7280;
              display: inline-block;
              min-width: 140px;
              font-weight: 600;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
          }

          .val {
              color: #1f2937;
              flex: 1;
              font-weight: 600;
              font-size: 14px;
              word-break: break-word;
          }

          .sql-list {
              margin-top: 16px;
          }

          .sql-item {
              border: 2px solid #e5e7eb;
              border-radius: 12px;
              padding: 18px;
              margin-bottom: 12px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
              transition: all 0.3s ease;
              position: relative;
              overflow: hidden;
          }

          .sql-item:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
          }

          .sql-item:last-child {
              margin-bottom: 0;
          }

          .sql-item::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 6px;
              height: 100%;
          }

          .sql-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 12px;
              flex-wrap: wrap;
              gap: 12px;
          }

          .sql-time {
              color: #059669;
              font-weight: 800;
              font-size: 14px;
              background: #d1fae5;
              padding: 4px 12px;
              border-radius: 20px;
              border: 1px solid #10b981;
          }

          .sql-rows {
              color: #6b7280;
              font-size: 12px;
              margin-left: 12px;
              font-weight: 600;
              background: #f3f4f6;
              padding: 4px 10px;
              border-radius: 12px;
          }

          .sql-query {
              color: #1f2937;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 13px;
              line-height: 1.7;
              word-break: break-all;
              white-space: pre-wrap;
              background: #f9fafb;
              padding: 14px 16px;
              border-radius: 10px;
              margin-bottom: 12px;
              border: 1px solid #e5e7eb;
              font-weight: 500;
          }

          .sql-bindings {
              font-size: 12px;
              color: #6b7280;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              background: #f3f4f6;
              padding: 10px 14px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
              margin-top: 8px;
          }

          .sql-error {
              color: #dc2626;
              font-size: 13px;
              margin-top: 12px;
              background: #fee2e2;
              padding: 10px 14px;
              border-radius: 8px;
              border: 1px solid #fecaca;
              font-weight: 600;
          }

          .no-data {
              color: #9ca3af;
              font-style: italic;
              font-size: 14px;
              text-align: center;
              padding: 40px 20px;
              background: #f9fafb;
              border-radius: 12px;
              border: 2px dashed #e5e7eb;
          }

          .redirect-row {
              background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
              padding: 16px 20px;
              margin: 16px 0;
              border-radius: 12px;
              border: 1px solid #dbeafe;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
          }

          .redirect-url {
              color: #1e40af;
              font-weight: 700;
              word-break: break-all;
              font-size: 14px;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }

          .redirect-chain-list {
              margin-top: 16px;
          }

          .redirect-chain-item {
              background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
              border: 2px solid #e5e7eb;
              border-radius: 12px;
              padding: 18px;
              margin-bottom: 12px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
              transition: all 0.2s ease;
              position: relative;
          }

          .redirect-chain-item:hover {
              transform: translateY(-1px);
              box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
              border-color: #d1d5db;
          }

          .redirect-chain-item:last-child {
              margin-bottom: 0;
          }

          .redirect-chain-current::before {
              position: absolute;
              top: 16px;
              right: 16px;
              color: white;
              font-size: 10px;
              font-weight: 800;
              padding: 4px 10px;
              border-radius: 20px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
          }

          .redirect-chain-header {
              display: flex;
              align-items: center;
              gap: 12px;
              flex-wrap: wrap;
          }

          .redirect-chain-status {
              color: #f59e0b;
              font-weight: 800;
              font-size: 13px;
              background: #fef3c7;
              padding: 4px 12px;
              border-radius: 20px;
              border: 1px solid #fbbf24;
          }

          .redirect-chain-method {
              color: #3b82f6;
              font-size: 12px;
              font-weight: 700;
              background: #eff6ff;
              padding: 4px 10px;
              border-radius: 12px;
              border: 1px solid #dbeafe;
          }

          .redirect-chain-path {
              color: #1f2937;
              font-size: 13px;
              font-weight: 600;
              flex: 1;
              word-break: break-all;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }

          .redirect-chain-duration {
              color: #059669;
              font-size: 12px;
              font-weight: 800;
              margin-left: auto;
              background: #d1fae5;
              padding: 4px 12px;
              border-radius: 20px;
              border: 1px solid #10b981;
          }

          .redirect-chain-arrow {
              color: #3b82f6;
              font-size: 12px;
              margin-top: 12px;
              padding-left: 28px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 8px;
          }

          .redirect-chain-arrow::before {
              content: '→';
              font-size: 16px;
              font-weight: 800;
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
                <span>Database Queries</span>
                <span class="badge badge-info">${totalCount} queries</span>
                <span class="badge badge-success">${totalTime} ms</span>
              </div>
              <div class="sql-list">
                ${data.sql.map((q, idx) => {
                  const duration = q.duration_ms?.toFixed?.(2) ?? q.duration_ms ?? 0;
                  const rowCount = q.row_count !== null && q.row_count !== undefined ? q.row_count : '?';
                  const bindings = q.bindings && Object.keys(q.bindings).length > 0 
                    ? JSON.stringify(q.bindings) 
                    : '';
                  const error = q.error ? `<div class="sql-error">Error: ${q.error}</div>` : '';
                  return `
                    <div class="sql-item">
                      <div class="sql-header">
                        <div>
                          <span class="badge badge-info">#${idx + 1}</span>
                          <span class="sql-time">${duration} ms</span>
                          <span class="sql-rows">${rowCount} rows</span>
                        </div>
                      </div>
                      <div class="sql-query">${q.sql || 'N/A'}</div>
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
              <div class="section-title">Database Queries</div>
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
              <span class="val redirect-url">→ ${data.redirect_url}</span>
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
                      <span class="redirect-chain-method">${itemMethod}</span>
                      <span class="redirect-chain-path">${itemPath}</span>
                      <span class="redirect-chain-duration">${itemDuration} ms</span>
                    </div>
                    ${itemRedirectUrl ? `<div class="redirect-chain-arrow">↓ Redirected to: ${itemRedirectUrl}</div>` : ''}
                  </div>
                `;
              }).join('');
              
              redirectChainSection = `
                <div class="section">
                  <div class="section-title">
                    <span>Redirect Chain</span>
                    <span class="badge badge-warning">${chain.length} redirect${chain.length > 1 ? 's' : ''}</span>
                  </div>
                  <div class="redirect-chain-list">
                    ${chainItems}
                    <div class="redirect-chain-item redirect-chain-current">
                      <div class="redirect-chain-header">
                        <span class="badge badge-success">Current</span>
                        <span class="redirect-chain-status">${data.status}</span>
                        <span class="redirect-chain-method">${data.method}</span>
                        <span class="redirect-chain-path">${data.route}</span>
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
          const userName = data.auth_user_name || 'User';
          const userEmail = data.auth_user_email || '';
          authSection = `
            <div class="section">
              <div class="section-title">
                <span>Authentication</span>
                <span class="badge badge-success">Authenticated</span>
              </div>
              <div class="row"><span class="key">User:</span> <span class="val">${userName}</span></div>
              ${userEmail ? `<div class="row"><span class="key">Email:</span> <span class="val">${userEmail}</span></div>` : ''}
            </div>
          `;
        }
        
        wrap.innerHTML = `
          <div class="section">
            <div class="section-title">Request Information</div>
            <div class="row"><span class="key">Request ID:</span> <span class="val">${data.id}</span></div>
            <div class="row"><span class="key">Method:</span> <span class="val">${data.method}</span></div>
            <div class="row"><span class="key">Path:</span> <span class="val">${data.route}</span></div>
            <div class="row"><span class="key">Status:</span> <span class="val">${data.status}</span></div>
            ${redirectSection}
            <div class="row"><span class="key">Duration:</span> <span class="val">${(data.duration_ms?.toFixed?.(1) ?? data.duration_ms)} ms</span></div>
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
