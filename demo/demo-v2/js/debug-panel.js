// Debug Panel for Li2 Analytics SDK
class DebugPanel {
  constructor() {
    this.logs = [];
    this.isVisible = false;
    this.init();
  }

  init() {
    // Create debug panel HTML
    const panelHTML = `
      <div id="li2DebugPanel" style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 400px;
        max-height: 500px;
        background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
        border: 2px solid #8b5cf6;
        border-radius: 16px;
        box-shadow: 0 20px 50px rgba(139, 92, 246, 0.3);
        z-index: 10000;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        display: none;
        backdrop-filter: blur(10px);
      ">
        <div style="
          padding: 16px;
          border-bottom: 1px solid rgba(139, 92, 246, 0.3);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(139, 92, 246, 0.1);
          border-radius: 14px 14px 0 0;
        ">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">🐛</span>
            <h3 style="
              margin: 0;
              font-size: 16px;
              font-weight: 700;
              color: #e9d5ff;
              letter-spacing: 0.5px;
            ">SDK Debug Mode</h3>
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="li2ClearDebugBtn" style="
              background: rgba(248, 113, 113, 0.2);
              border: 1px solid rgba(248, 113, 113, 0.4);
              color: #fca5a5;
              padding: 6px 12px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 12px;
              font-weight: 600;
              transition: all 0.2s;
            ">Clear</button>
            <button id="li2MinimizeDebugBtn" style="
              background: rgba(139, 92, 246, 0.2);
              border: 1px solid rgba(139, 92, 246, 0.4);
              color: #c4b5fd;
              padding: 6px 12px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 12px;
              font-weight: 600;
              transition: all 0.2s;
            ">−</button>
          </div>
        </div>

        <div id="li2DebugContent" style="
          padding: 16px;
          max-height: 400px;
          overflow-y: auto;
        ">
          <div style="
            background: rgba(139, 92, 246, 0.1);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 10px;
            padding: 12px;
            margin-bottom: 12px;
            font-size: 13px;
            color: #e9d5ff;
            line-height: 1.6;
          ">
            <div style="font-weight: 700; margin-bottom: 6px; color: #c4b5fd;">📊 How to view debug logs:</div>
            <ol style="margin: 0; padding-left: 18px; color: #ddd6fe;">
              <li>Go to <strong>Analytics Settings</strong></li>
              <li>Enable <strong>Debug Mode</strong></li>
              <li>View all SDK requests in real-time</li>
              <li>Check request/response payloads</li>
            </ol>
          </div>

          <div id="li2DebugLogs" style="display: flex; flex-direction: column; gap: 8px;">
            <div style="
              text-align: center;
              padding: 40px 20px;
              color: #a78bfa;
              font-size: 14px;
            ">
              <div style="font-size: 32px; margin-bottom: 8px;">🎯</div>
              No tracking events yet.<br>
              Interact with the page to see logs.
            </div>
          </div>
        </div>
      </div>

      <!-- Floating Toggle Button -->
      <button id="li2DebugToggle" style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        border: 2px solid #a78bfa;
        border-radius: 50%;
        cursor: pointer;
        font-size: 24px;
        z-index: 9999;
        box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4);
        transition: all 0.3s;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        🐛
      </button>
    `;

    // Inject into DOM
    document.body.insertAdjacentHTML('beforeend', panelHTML);

    // Attach event listeners
    document.getElementById('li2DebugToggle').addEventListener('click', () => this.toggle());
    document.getElementById('li2MinimizeDebugBtn').addEventListener('click', () => this.toggle());
    document.getElementById('li2ClearDebugBtn').addEventListener('click', () => this.clear());

    // Add hover effects
    const buttons = ['li2ClearDebugBtn', 'li2MinimizeDebugBtn', 'li2DebugToggle'];
    buttons.forEach(id => {
      const btn = document.getElementById(id);
      btn.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.05)';
        this.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
      });
      btn.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
        this.style.boxShadow = 'none';
      });
    });
  }

  toggle() {
    this.isVisible = !this.isVisible;
    const panel = document.getElementById('li2DebugPanel');
    const toggle = document.getElementById('li2DebugToggle');

    if (this.isVisible) {
      panel.style.display = 'block';
      toggle.style.display = 'none';
      panel.style.animation = 'slideInRight 0.3s ease-out';
    } else {
      panel.style.display = 'none';
      toggle.style.display = 'flex';
    }
  }

  addLog(type, data) {
    const timestamp = new Date().toLocaleTimeString();
    const log = { type, data, timestamp };
    this.logs.push(log);

    const logsContainer = document.getElementById('li2DebugLogs');

    // Remove empty state if present
    if (logsContainer.children.length === 1 && logsContainer.children[0].textContent.includes('No tracking events')) {
      logsContainer.innerHTML = '';
    }

    const typeColors = {
      lead: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', emoji: '📧' },
      sale: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', emoji: '💰' },
      pageview: { bg: 'rgba(168, 85, 247, 0.1)', border: '#a855f7', emoji: '👁️' },
      interaction: { bg: 'rgba(249, 115, 22, 0.1)', border: '#f97316', emoji: '🖱️' }
    };

    const color = typeColors[type] || { bg: 'rgba(156, 163, 175, 0.1)', border: '#9ca3af', emoji: '📊' };

    const logElement = document.createElement('div');
    logElement.style.cssText = `
      background: ${color.bg};
      border: 1px solid ${color.border};
      border-radius: 10px;
      padding: 12px;
      font-size: 12px;
      animation: slideInLeft 0.3s ease-out;
    `;

    const requestId = data.request_id || 'pending...';
    const status = data.status || 'sent';

    logElement.innerHTML = `
      <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
          <span style="font-size: 16px;">${color.emoji}</span>
          <strong style="color: #f3e8ff; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">${type}</strong>
        </div>
        <span style="color: #a78bfa; font-size: 10px;">${timestamp}</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 4px; color: #e9d5ff; font-family: 'Courier New', monospace;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #c4b5fd; font-size: 11px;">Request ID:</span>
          <span style="color: #22c55e; font-weight: 600; font-size: 11px;">${requestId}</span>
        </div>
        ${status === 'success' ? `
          <div style="
            margin-top: 4px;
            padding: 6px 10px;
            background: rgba(34, 197, 94, 0.2);
            border-radius: 6px;
            color: #86efac;
            font-size: 11px;
            font-weight: 600;
            text-align: center;
          ">✓ Tracked Successfully</div>
        ` : ''}
      </div>
    `;

    logsContainer.insertBefore(logElement, logsContainer.firstChild);

    // Auto-scroll to top
    document.getElementById('li2DebugContent').scrollTop = 0;

    // Show panel if hidden
    if (!this.isVisible) {
      const toggle = document.getElementById('li2DebugToggle');
      toggle.style.animation = 'pulse 0.6s ease-in-out';
      setTimeout(() => {
        toggle.style.animation = '';
      }, 600);
    }
  }

  clear() {
    this.logs = [];
    const logsContainer = document.getElementById('li2DebugLogs');
    logsContainer.innerHTML = `
      <div style="
        text-align: center;
        padding: 40px 20px;
        color: #a78bfa;
        font-size: 14px;
      ">
        <div style="font-size: 32px; margin-bottom: 8px;">🎯</div>
        No tracking events yet.<br>
        Interact with the page to see logs.
      </div>
    `;
  }
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideInLeft {
    from {
      transform: translateX(-20px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }
`;
document.head.appendChild(style);

// Initialize debug panel
window.li2DebugPanel = new DebugPanel();

// Override SDK tracking methods to log to debug panel
if (window.li2Analytics) {
  const originalTrackLead = window.li2Analytics.trackLead;
  window.li2Analytics.trackLead = function(data) {
    window.li2DebugPanel.addLog('lead', { status: 'sent', ...data });

    // Call original with callback to capture response
    const result = originalTrackLead.call(this, data);

    // If promise-based, capture request_id from response
    if (result && result.then) {
      result.then(response => {
        if (response && response.request_id) {
          window.li2DebugPanel.addLog('lead', {
            status: 'success',
            request_id: response.request_id,
            ...data
          });
        }
      }).catch(err => {
        window.li2DebugPanel.addLog('lead', {
          status: 'error',
          error: err.message,
          ...data
        });
      });
    }

    return result;
  };

  const originalTrackSale = window.li2Analytics.trackSale;
  window.li2Analytics.trackSale = function(data) {
    window.li2DebugPanel.addLog('sale', { status: 'sent', ...data });

    const result = originalTrackSale.call(this, data);

    if (result && result.then) {
      result.then(response => {
        if (response && response.request_id) {
          window.li2DebugPanel.addLog('sale', {
            status: 'success',
            request_id: response.request_id,
            ...data
          });
        }
      }).catch(err => {
        window.li2DebugPanel.addLog('sale', {
          status: 'error',
          error: err.message,
          ...data
        });
      });
    }

    return result;
  };
}
