// Response Component
class ResponseComponent extends InsightComponent {
    constructor() {
        super('response', 'response-details');
    }
    
    buildContent(data) {
        let html = '';
        const headerCount = Number(data.response_header_count || (data.response_headers ? Object.keys(data.response_headers).length : 0));
        const redirectChain = Array.isArray(data.redirect_chain) ? data.redirect_chain : [];
        const redirectCount = redirectChain.length + (data.is_redirect ? 1 : 0);
        
        html += this.buildSummaryCards(data, headerCount, redirectCount);

        const info = {};
        if (data.response_status) info['Status Code'] = data.response_status_text ? `${data.response_status} ${data.response_status_text}` : data.response_status;
        if (data.response_classification) info['Classification'] = data.response_classification;
        if (data.response_content_type) info['Content Type'] = data.response_content_type;
        if (data.response_body_size !== undefined) info['Body Size'] = this.formatBytes(data.response_body_size);
        if (headerCount > 0) info['Header Count'] = headerCount;
        html += this.buildSection('Response', this.buildTable(info, ['Property', 'Value']));

        if (data.response_header_highlights && Object.keys(data.response_header_highlights).length > 0) {
            html += this.buildSection('Header Highlights', this.buildTable(data.response_header_highlights, ['Header', 'Value'], 'response-highlight-table'));
        }

        if (data.response_headers && Object.keys(data.response_headers).length > 0) {
            html += this.buildSection('All Headers', this.buildTable(data.response_headers, ['Header', 'Value'], 'response-highlight-table'));
        }
        
        // Redirect info
        html += this.buildRedirectInfo(data, redirectCount);

        // Body preview
        html += this.buildPreview(data);
        
        return html || this.buildEmptyState();
    }
    
    buildSummaryCards(data, headerCount, redirectCount) {
        const statusCode = data.response_status || data.status || 0;
        const statusText = data.response_status_text ? `${data.response_status} - ${data.response_status_text}` : (statusCode ? String(statusCode) : 'Unknown');
        const bodySize = this.formatBytes(data.response_body_size || 0);
        const classification = data.response_classification || 'HTTP Response';
        const statusChipClass = this.getStatusChipClass(statusCode);

        return `
            <div class="response-summary-grid">
                <div class="response-summary-card">
                    <div class="response-summary-label">Status</div>
                    <div class="response-summary-value"><span class="${statusChipClass}">${this.escapeHtml(statusText)}</span></div>
                    <div class="response-summary-note">Resolved from the final response code.</div>
                </div>
                <div class="response-summary-card">
                    <div class="response-summary-label">Classification</div>
                    <div class="response-summary-value">${this.escapeHtml(classification)}</div>
                    <div class="response-summary-note">Quick response type classification.</div>
                </div>
                <div class="response-summary-card">
                    <div class="response-summary-label">Body Size</div>
                    <div class="response-summary-value">${this.escapeHtml(bodySize)}</div>
                    <div class="response-summary-note">Measured before Insight injects the toolbar.</div>
                </div>
                <div class="response-summary-card">
                    <div class="response-summary-label">Headers</div>
                    <div class="response-summary-value">${this.escapeHtml(String(headerCount || 0))}</div>
                    <div class="response-summary-note">${this.escapeHtml(String(redirectCount || 0))} redirect hop${redirectCount === 1 ? '' : 's'} observed.</div>
                </div>
            </div>
        `;
    }

    getStatusChipClass(statusCode) {
        if (statusCode >= 500) return 'response-status-chip response-status-chip-error';
        if (statusCode >= 300) return 'response-status-chip response-status-chip-warning';
        return 'response-status-chip response-status-chip-success';
    }

    buildRedirectInfo(data, redirectCount) {
        if (!data.is_redirect && !redirectCount) return '';

        const info = {
            Redirected: data.is_redirect ? 'Yes' : 'No',
            'Redirect Count': redirectCount,
        };

        if (data.redirect_url) {
            info['Location'] = data.redirect_url;
        }
        
        return `
            <h3 class="subsection-title">Redirect Summary</h3>
            ${this.buildTable(info, ['Property', 'Value'])}
        `;
    }

    buildPreview(data) {
        if (!data.response_preview) {
            const message = data.response_classification === 'File Download' || data.response_classification === 'File Response'
                ? 'Preview skipped for file or binary response'
                : 'No response body preview captured';

            return `<h3 class="subsection-title">Body Preview</h3><div class="no-data">${this.escapeHtml(message)}</div>`;
        }

        const previewFormat = data.response_preview_format || 'text';
        const previewChips = [
            data.response_classification ? `<span class="response-preview-chip response-preview-chip-accent">${this.escapeHtml(data.response_classification)}</span>` : '',
            data.response_preview_truncated ? '<span class="response-preview-chip response-preview-chip-muted">Truncated</span>' : '',
        ].filter(Boolean).join('');

        return `
            <h3 class="subsection-title">Body Preview</h3>
            <div class="response-preview-shell">
                <div class="response-preview-head">
                    <div class="response-preview-title">${this.escapeHtml(previewFormat)} preview</div>
                    <div class="response-preview-chips">${previewChips}</div>
                </div>
                <div class="response-preview-scroll">${this.buildCodeBlock(data.response_preview)}</div>
            </div>
        `;
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
    
    buildEmptyState() {
        return '<div class="no-data">No response details available</div>';
    }
}
