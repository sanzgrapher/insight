class HistoryComponent extends InsightComponent {
    constructor() {
        super('history', 'history-list');
        this.limit = 40;
    }

    render(data) {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.warn(`Container ${this.containerId} not found for component ${this.name}`);
            return;
        }

        container.innerHTML = this.buildLoadingState();
        this.fetchHistory(data, container);
    }

    async fetchHistory(currentData, container) {
        try {
            const response = await fetch(`/_insight/api/history?limit=${this.limit}`, {
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Request history returned ${response.status}`);
            }

            const history = await response.json();
            container.innerHTML = this.buildHistory(history, currentData);
        } catch (error) {
            console.error('Unable to load insight request history:', error);
            container.innerHTML = '<div class="no-data">Unable to load request history right now.</div>';
        }
    }

    buildHistory(history, currentData) {
        if (!Array.isArray(history) || history.length === 0) {
            return this.buildEmptyState();
        }

        const items = history.map((item) => this.buildHistoryItem(item, currentData)).join('');

        return `
            <div class="history-shell">
                <div class="history-summary">
                    <span class="badge badge-info">${history.length} snapshots</span>
                    <span class="badge badge-neutral">Latest requests captured by Insight</span>
                </div>
                <div class="history-list-grid">
                    ${items}
                </div>
            </div>
        `;
    }

    buildHistoryItem(item, currentData) {
        const id = this.escapeHtml(String(item.id || 'unknown'));
        const method = this.escapeHtml(String(item.method || 'GET'));
        const route = this.escapeHtml(String(item.route || '/'));
        const status = Number(item.status || 0);
        const duration = Number(item.duration_ms || 0).toFixed(2);
        const isCurrent = String(item.id || '') === String(currentData.id || '');
        const statusClass = this.getStatusClass(status);
        const capturedAt = this.escapeHtml(this.formatCapturedAt(item));
        const link = `/_insight/${encodeURIComponent(String(item.id || ''))}`;

        return `
            <a class="history-item ${isCurrent ? 'is-current' : ''}" href="${link}">
                <div class="history-item-main">
                    <div class="history-item-head">
                        <span class="history-method">${method}</span>
                        <span class="history-route">${route}</span>
                    </div>
                    <div class="history-item-meta">
                        <span class="badge ${statusClass}">HTTP ${status || 0}</span>
                        <span class="history-duration">${duration} ms</span>
                        <span class="history-captured">${capturedAt}</span>
                    </div>
                </div>
                <div class="history-item-side">
                    ${isCurrent ? '<span class="badge badge-success">Current</span>' : '<span class="history-request-id">' + id.slice(0, 8) + '</span>'}
                </div>
            </a>
        `;
    }

    getStatusClass(status) {
        if (status >= 500 || status >= 400) {
            return 'badge-error';
        }

        if (status >= 300) {
            return 'badge-warning';
        }

        if (status >= 200) {
            return 'badge-success';
        }

        return 'badge-neutral';
    }

    formatCapturedAt(item) {
        if (!item || !item.captured_at) {
            return 'Unknown capture time';
        }

        const timestamp = new Date(item.captured_at);
        if (Number.isNaN(timestamp.getTime())) {
            return 'Unknown capture time';
        }

        return timestamp.toLocaleString();
    }

    buildLoadingState() {
        return '<div class="history-loading">Loading recent requests...</div>';
    }

    buildEmptyState() {
        return '<div class="no-data">No previous requests have been captured yet.</div>';
    }
}
