// Auth Component
class AuthComponent extends InsightComponent {
    constructor() {
        super('auth', 'auth-details');
    }
    
    buildContent(data) {
        return data.auth_authenticated 
            ? this.buildAuthenticated(data) 
            : this.buildGuest();
    }
    
    buildAuthenticated(data) {
        let html = '<div class="auth-authenticated">';

        html += '<div class="summary-grid">';
        html += `<div class="summary-card">
            <div class="summary-card-label">State</div>
            <div class="summary-card-value">Authenticated</div>
            <div class="summary-card-note">A user context was resolved for this request.</div>
        </div>`;

        if (data.auth_user_id !== null && data.auth_user_id !== undefined) {
            html += `<div class="summary-card">
                <div class="summary-card-label">User ID</div>
                <div class="summary-card-value">${this.escapeHtml(String(data.auth_user_id))}</div>
                <div class="summary-card-note">Primary actor identifier captured by the profiler.</div>
            </div>`;
        }

        if (data.auth_user_name || data.auth_user_email) {
            html += `<div class="summary-card">
                <div class="summary-card-label">Identity</div>
                <div class="summary-card-value">${this.escapeHtml(data.auth_user_name || 'User')}</div>
                <div class="summary-card-note">${this.escapeHtml(data.auth_user_email || 'Email address unavailable')}</div>
            </div>`;
        }

        html += '</div>';
        
        if (data.auth_user) {
            html += this.buildSection('User', this.buildTable(data.auth_user));
        }
        
        html += '</div>';
        
        return html;
    }
    
    buildGuest() {
        return `
            <div class="auth-guest">
                <div class="guest-message">No authenticated actor was attached to this request.</div>
                <div class="guest-submessage">Insight did not observe a logged-in user context for this execution path.</div>
            </div>
        `;
    }
}
