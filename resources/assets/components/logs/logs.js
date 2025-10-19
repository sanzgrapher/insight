// Logs Component
class LogsComponent extends InsightComponent {
    constructor() {
        super('logs', 'logs-list');
    }
    
    buildContent(data) {
        if (!data.logs || data.logs.length === 0) {
            return this.buildEmptyState();
        }
        
        return '<div class="logs-list">' + 
            data.logs.map((log, idx) => this.buildLogItem(log, idx)).join('') + 
            '</div>';
    }
    
    buildLogItem(log, index) {
        const level = log.level || 'info';
        const message = log.message || '';
        const time = log.time || '';
        const context = log.context && Object.keys(log.context).length > 0 
            ? JSON.stringify(log.context, null, 2) 
            : '';
        
        // Define level colors
        const levelConfig = {
            debug: { color: '#9ca3af', label: 'DEBUG' },
            info: { color: '#3b82f6', label: 'INFO' },
            notice: { color: '#06b6d4', label: 'NOTICE' },
            warning: { color: '#f59e0b', label: 'WARNING' },
            error: { color: '#ef4444', label: 'ERROR' },
            critical: { color: '#dc2626', label: 'CRITICAL' },
            alert: { color: '#991b1b', label: 'ALERT' },
            emergency: { color: '#7f1d1d', label: 'EMERGENCY' }
        };
        
        const config = levelConfig[level.toLowerCase()] || levelConfig.info;
        
        return `
            <div class="log-item">
                <div class="log-header">
                    <div class="log-level-badge log-${level}">
                        <span class="log-level-text">${config.label}</span>
                    </div>
                    <span class="log-time">${this.escapeHtml(time)}</span>
                </div>
                <div class="log-message">${this.escapeHtml(message)}</div>
                ${context ? `<details class="log-context">
                    <summary>Context</summary>
                    <pre class="log-context-data">${this.escapeHtml(context)}</pre>
                </details>` : ''}
            </div>
        `;
    }
    
    buildEmptyState() {
        return '<div class="no-data">No logs captured during this request</div>';
    }
}
