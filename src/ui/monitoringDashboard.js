export class MonitoringDashboard {
    constructor(analyticsManager, game) {
        this.analyticsManager = analyticsManager;
        this.game = game;
        this.isVisible = false;
        this.currentTab = 'overview';
        this.charts = {};

        this.createDashboard();
        this.updateInterval = setInterval(() => this.update(), 1000);
    }

    createDashboard() {
        // Create dashboard container
        this.container = document.createElement('div');
        this.container.id = 'monitoring-dashboard';
        this.container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 400px;
            height: 600px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #333;
            border-radius: 10px;
            color: white;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            display: none;
            overflow: hidden;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 10px;
            background: #333;
            border-bottom: 1px solid #555;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const title = document.createElement('div');
        title.textContent = 'Monitoring Dashboard';
        title.style.fontWeight = 'bold';

        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.cssText = `
            background: #555;
            border: none;
            color: white;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            cursor: pointer;
        `;
        closeButton.onclick = () => this.hide();

        header.appendChild(title);
        header.appendChild(closeButton);

        // Create tabs
        const tabs = document.createElement('div');
        tabs.style.cssText = `
            display: flex;
            background: #222;
            border-bottom: 1px solid #555;
        `;

        const tabNames = ['Overview', 'Performance', 'Errors', 'Network', 'Features'];
        tabNames.forEach(tabName => {
            const tab = document.createElement('div');
            tab.textContent = tabName;
            tab.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                border-right: 1px solid #555;
                background: ${this.currentTab.toLowerCase() === tabName.toLowerCase() ? '#444' : '#333'};
            `;
            tab.onclick = () => this.switchTab(tabName.toLowerCase());
            tabs.appendChild(tab);
        });

        // Create content area
        this.content = document.createElement('div');
        this.content.style.cssText = `
            padding: 10px;
            height: calc(100% - 80px);
            overflow-y: auto;
        `;

        this.container.appendChild(header);
        this.container.appendChild(tabs);
        this.container.appendChild(this.content);

        document.body.appendChild(this.container);

        // Initial render
        this.renderOverview();
    }

    show() {
        this.isVisible = true;
        this.container.style.display = 'block';
        this.update();
    }

    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        this.updateTabs();
        this.renderContent();
    }

    updateTabs() {
        const tabs = this.container.querySelectorAll('div[style*="cursor: pointer"]');
        tabs.forEach((tab, index) => {
            const tabNames = ['overview', 'performance', 'errors', 'network', 'features'];
            const isActive = tabNames[index] === this.currentTab;
            tab.style.background = isActive ? '#444' : '#333';
        });
    }

    renderContent() {
        switch (this.currentTab) {
            case 'overview':
                this.renderOverview();
                break;
            case 'performance':
                this.renderPerformance();
                break;
            case 'errors':
                this.renderErrors();
                break;
            case 'network':
                this.renderNetwork();
                break;
            case 'features':
                this.renderFeatures();
                break;
        }
    }

    renderOverview() {
        const report = this.analyticsManager.generatePerformanceReport();
        const sessionTime = Math.floor((Date.now() - this.analyticsManager.sessionStartTime) / 1000);

        this.content.innerHTML = `
            <h3>Session Overview</h3>
            <div style="margin-bottom: 15px;">
                <div>Session Time: ${Math.floor(sessionTime / 60)}:${(sessionTime % 60).toString().padStart(2, '0')}</div>
                <div>Session ID: ${this.analyticsManager.sessionId.slice(-8)}</div>
            </div>

            <h4>Key Metrics</h4>
            <div style="margin-bottom: 15px;">
                <div>Total Races: ${report.metrics.totalRaces}</div>
                <div>Total Distance: ${report.metrics.totalDistance.toFixed(1)} km</div>
                <div>Average Speed: ${report.metrics.averageSpeed.toFixed(1)} km/h</div>
                <div>Crashes: ${report.metrics.crashes}</div>
                <div>Errors: ${report.errors.total}</div>
            </div>

            <h4>Performance</h4>
            <div style="margin-bottom: 15px;">
                <div>Avg FPS: ${report.performance.averageFPS.toFixed(1)}</div>
                <div>Min FPS: ${report.performance.minFPS}</div>
                <div>Memory Usage: ${report.performance.averageMemoryUsage ?
                    (report.performance.averageMemoryUsage / 1024 / 1024).toFixed(1) + ' MB' : 'N/A'}</div>
            </div>

            <h4>Recent Alerts</h4>
            <div id="alerts-container" style="max-height: 150px; overflow-y: auto;">
                ${this.renderAlerts()}
            </div>
        `;
    }

    renderPerformance() {
        const report = this.analyticsManager.generatePerformanceReport();

        this.content.innerHTML = `
            <h3>Performance Metrics</h3>

            <h4>FPS History</h4>
            <div style="margin-bottom: 15px;">
                <canvas id="fps-chart" width="350" height="100" style="border: 1px solid #555;"></canvas>
            </div>

            <h4>Memory Usage</h4>
            <div style="margin-bottom: 15px;">
                <canvas id="memory-chart" width="350" height="100" style="border: 1px solid #555;"></canvas>
            </div>

            <h4>Detailed Stats</h4>
            <div>
                <div>FPS Range: ${report.performance.minFPS} - ${report.performance.maxFPS}</div>
                <div>Memory Peak: ${this.getMemoryPeak()} MB</div>
                <div>Network Latency: ${report.performance.averageNetworkLatency.toFixed(0)}ms</div>
                <div>Frame Drops: ${this.countFrameDrops()}</div>
            </div>
        `;

        this.renderCharts();
    }

    renderErrors() {
        const report = this.analyticsManager.generatePerformanceReport();

        this.content.innerHTML = `
            <h3>Error Tracking</h3>

            <h4>Error Summary</h4>
            <div style="margin-bottom: 15px;">
                <div>Total Errors: ${report.errors.total}</div>
                <div>JavaScript: ${report.errors.byCategory.javascript}</div>
                <div>Network: ${report.errors.byCategory.network}</div>
                <div>Game: ${report.errors.byCategory.game}</div>
                <div>User: ${report.errors.byCategory.user}</div>
            </div>

            <h4>Recent Errors</h4>
            <div style="max-height: 300px; overflow-y: auto;">
                ${report.errors.recentErrors.map(error => `
                    <div style="margin-bottom: 10px; padding: 5px; background: #333; border-radius: 3px;">
                        <div style="color: #ff6b6b; font-weight: bold;">${error.type}</div>
                        <div style="font-size: 11px; color: #ccc;">${error.message}</div>
                        <div style="font-size: 10px; color: #888;">${new Date(error.timestamp).toLocaleTimeString()}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderNetwork() {
        this.content.innerHTML = `
            <h3>Network Monitoring</h3>

            <h4>Connection Status</h4>
            <div style="margin-bottom: 15px;">
                <div>WebSocket: ${this.game.networkManager?.isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
                <div>Voice Chat: ${this.game.voiceChatManager?.isConnected ? '🟢 Active' : '🔴 Inactive'}</div>
                <div>Server Ping: ${this.getServerPing()}ms</div>
            </div>

            <h4>Latency Graph</h4>
            <div style="margin-bottom: 15px;">
                <canvas id="latency-chart" width="350" height="100" style="border: 1px solid #555;"></canvas>
            </div>

            <h4>Recent Network Events</h4>
            <div id="network-events" style="max-height: 200px; overflow-y: auto;">
                ${this.renderNetworkEvents()}
            </div>
        `;

        this.renderNetworkChart();
    }

    renderFeatures() {
        const report = this.analyticsManager.generatePerformanceReport();

        this.content.innerHTML = `
            <h3>Feature Usage</h3>

            <h4>Most Used Features</h4>
            <div style="margin-bottom: 15px;">
                ${Object.entries(report.featureUsage)
                    .sort(([,a], [,b]) => b.totalUses - a.totalUses)
                    .slice(0, 10)
                    .map(([feature, data]) => `
                        <div style="margin-bottom: 5px;">
                            <span style="color: #4ecdc4;">${feature}</span>:
                            ${data.totalUses} uses
                            (${Object.entries(data.actions).map(([action, count]) =>
                                `${action}: ${count}`).join(', ')})
                        </div>
                    `).join('')}
            </div>

            <h4>User Flow</h4>
            <div style="margin-bottom: 15px;">
                ${this.renderUserFlow()}
            </div>

            <h4>Export Data</h4>
            <div>
                <button onclick="this.analyticsManager.exportAnalyticsData()"
                        style="background: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                    Export Analytics
                </button>
            </div>
        `;
    }

    renderAlerts() {
        const alerts = this.analyticsManager.checkPerformanceAlerts();
        if (alerts.length === 0) {
            return '<div style="color: #4ecdc4;">No active alerts</div>';
        }

        return alerts.map(alert => `
            <div style="margin-bottom: 5px; padding: 5px; background: ${alert.severity === 'high' ? '#ff4757' : '#ffa502'}; border-radius: 3px;">
                <div style="font-weight: bold;">${alert.type.toUpperCase()}</div>
                <div style="font-size: 11px;">${alert.message}</div>
            </div>
        `).join('');
    }

    renderCharts() {
        // Simple canvas-based charts (could be enhanced with a charting library)
        this.renderFPSChart();
        this.renderMemoryChart();
    }

    renderFPSChart() {
        const canvas = document.getElementById('fps-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const fpsData = this.analyticsManager.metrics.fps.slice(-50);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 60; i += 10) {
            const y = canvas.height - (i / 60) * canvas.height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw FPS line
        ctx.strokeStyle = '#4ecdc4';
        ctx.lineWidth = 2;
        ctx.beginPath();

        fpsData.forEach((reading, index) => {
            const x = (index / fpsData.length) * canvas.width;
            const y = canvas.height - (reading.value / 60) * canvas.height;
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
    }

    renderMemoryChart() {
        const canvas = document.getElementById('memory-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const memoryData = this.analyticsManager.metrics.memoryUsage.slice(-50);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (memoryData.length === 0) return;

        const maxMemory = Math.max(...memoryData.map(m => m.limit));

        // Draw memory usage
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.beginPath();

        memoryData.forEach((reading, index) => {
            const x = (index / memoryData.length) * canvas.width;
            const y = canvas.height - (reading.used / maxMemory) * canvas.height;
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
    }

    renderNetworkChart() {
        const canvas = document.getElementById('latency-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const latencyData = this.analyticsManager.metrics.networkLatency.slice(-50);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (latencyData.length === 0) return;

        const maxLatency = Math.max(...latencyData.map(l => l.value));

        // Draw latency line
        ctx.strokeStyle = '#ffa502';
        ctx.lineWidth = 2;
        ctx.beginPath();

        latencyData.forEach((reading, index) => {
            const x = (index / latencyData.length) * canvas.width;
            const y = canvas.height - (reading.value / Math.max(maxLatency, 200)) * canvas.height;
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
    }

    renderNetworkEvents() {
        // Get recent network events from analytics
        const networkEvents = this.analyticsManager.events
            .filter(e => e.category === 'network')
            .slice(-10);

        return networkEvents.map(event => `
            <div style="margin-bottom: 5px; padding: 3px; background: #333; border-radius: 2px; font-size: 11px;">
                <div>${event.action}: ${event.details?.status || 'OK'}</div>
                <div style="color: #888;">${new Date(event.timestamp).toLocaleTimeString()}</div>
            </div>
        `).join('') || '<div style="color: #888;">No recent network events</div>';
    }

    renderUserFlow() {
        const userFlowEvents = this.analyticsManager.events
            .filter(e => e.category === 'user_flow')
            .slice(-10);

        return userFlowEvents.map(event => `
            <div style="margin-bottom: 3px; font-size: 11px;">
                ${event.action} (${Math.floor((Date.now() - event.details?.sessionTime || 0) / 1000)}s ago)
            </div>
        `).join('') || '<div style="color: #888;">No user flow data</div>';
    }

    getMemoryPeak() {
        if (this.analyticsManager.metrics.memoryUsage.length === 0) return 0;
        const peak = Math.max(...this.analyticsManager.metrics.memoryUsage.map(m => m.used));
        return (peak / 1024 / 1024).toFixed(1);
    }

    countFrameDrops() {
        return this.analyticsManager.metrics.fps.filter(reading => reading.value < 30).length;
    }

    getServerPing() {
        // This would need to be implemented with actual ping measurement
        return Math.floor(Math.random() * 50) + 20; // Mock data
    }

    update() {
        if (!this.isVisible) return;

        // Update alerts
        const alertsContainer = document.getElementById('alerts-container');
        if (alertsContainer) {
            alertsContainer.innerHTML = this.renderAlerts();
        }

        // Update charts if on performance tab
        if (this.currentTab === 'performance') {
            this.renderCharts();
        }

        // Update network events if on network tab
        if (this.currentTab === 'network') {
            const networkEvents = document.getElementById('network-events');
            if (networkEvents) {
                networkEvents.innerHTML = this.renderNetworkEvents();
            }
        }
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}