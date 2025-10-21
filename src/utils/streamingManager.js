export class StreamingManager {
    constructor(game) {
        this.game = game;
        this.isStreaming = false;
        this.overlayElement = null;
        this.streamingData = {
            raceStatus: 'waiting',
            currentLap: 0,
            totalLaps: 3,
            position: 1,
            totalPlayers: 1,
            bestLapTime: null,
            currentLapTime: null,
            speed: 0,
            trackName: 'Unknown Track',
            playerName: 'Player'
        };

        this.createStreamingOverlay();
    }

    createStreamingOverlay() {
        // Create overlay for streaming software
        this.overlayElement = document.createElement('div');
        this.overlayElement.id = 'streamingOverlay';
        this.overlayElement.innerHTML = `
            <div class="streaming-header">
                <div class="game-title">VelocityRush3D</div>
                <div class="track-name" id="streamTrackName">Unknown Track</div>
            </div>
            <div class="streaming-stats">
                <div class="stat-row">
                    <span class="stat-label">Position:</span>
                    <span class="stat-value" id="streamPosition">1/1</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Lap:</span>
                    <span class="stat-value" id="streamLap">0/3</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Speed:</span>
                    <span class="stat-value" id="streamSpeed">0 km/h</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Best Lap:</span>
                    <span class="stat-value" id="streamBestLap">--:--.---</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Current Lap:</span>
                    <span class="stat-value" id="streamCurrentLap">--:--.---</span>
                </div>
            </div>
            <div class="streaming-status" id="streamStatus">Waiting for race to start...</div>
        `;

        // Add CSS for streaming overlay
        const style = document.createElement('style');
        style.textContent = `
            #streamingOverlay {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 300px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                padding: 15px;
                border-radius: 8px;
                border: 2px solid #00ff00;
                z-index: 10000;
                display: none;
                pointer-events: none;
            }

            .streaming-header {
                text-align: center;
                margin-bottom: 15px;
                border-bottom: 1px solid #00ff00;
                padding-bottom: 10px;
            }

            .game-title {
                font-size: 18px;
                font-weight: bold;
                color: #00ff00;
                margin-bottom: 5px;
            }

            .track-name {
                font-size: 12px;
                color: #cccccc;
            }

            .streaming-stats {
                margin-bottom: 15px;
            }

            .stat-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
            }

            .stat-label {
                color: #cccccc;
            }

            .stat-value {
                color: #00ff00;
                font-weight: bold;
            }

            .streaming-status {
                text-align: center;
                font-size: 12px;
                color: #ffff00;
                padding: 8px;
                background: rgba(255, 255, 0, 0.1);
                border-radius: 4px;
            }

            /* Hide from normal gameplay but visible to streaming software */
            @media screen and (max-width: 1920px) {
                #streamingOverlay {
                    display: block !important;
                }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(this.overlayElement);
    }

    enableStreaming() {
        this.isStreaming = true;
        this.overlayElement.style.display = 'block';
        console.log('Streaming overlay enabled');
    }

    disableStreaming() {
        this.isStreaming = false;
        this.overlayElement.style.display = 'none';
        console.log('Streaming overlay disabled');
    }

    updateStreamingData(data) {
        if (!this.isStreaming) return;

        // Update internal data
        Object.assign(this.streamingData, data);

        // Update DOM elements
        document.getElementById('streamTrackName').textContent = this.streamingData.trackName;
        document.getElementById('streamPosition').textContent =
            `${this.streamingData.position}/${this.streamingData.totalPlayers}`;
        document.getElementById('streamLap').textContent =
            `${this.streamingData.currentLap}/${this.streamingData.totalLaps}`;
        document.getElementById('streamSpeed').textContent = `${Math.round(this.streamingData.speed)} km/h`;
        document.getElementById('streamBestLap').textContent =
            this.streamingData.bestLapTime ? this.formatTime(this.streamingData.bestLapTime) : '--:--.---';
        document.getElementById('streamCurrentLap').textContent =
            this.streamingData.currentLapTime ? this.formatTime(this.streamingData.currentLapTime) : '--:--.---';

        // Update status
        let statusText = '';
        switch (this.streamingData.raceStatus) {
            case 'waiting':
                statusText = 'Waiting for race to start...';
                break;
            case 'countdown':
                statusText = 'Race starting soon!';
                break;
            case 'racing':
                statusText = 'Racing in progress...';
                break;
            case 'finished':
                statusText = 'Race finished!';
                break;
            default:
                statusText = 'Unknown status';
        }
        document.getElementById('streamStatus').textContent = statusText;
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const ms = Math.floor((milliseconds % 1000) / 10); // 2 decimal places

        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    takeScreenshot() {
        // Take a screenshot of the current game state for streaming
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return null;

        const dataURL = canvas.toDataURL('image/png');

        // Create download link (for manual saving)
        const link = document.createElement('a');
        link.download = `velocityrush_screenshot_${Date.now()}.png`;
        link.href = dataURL;

        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return dataURL;
    }

    getStreamingStats() {
        return {
            isStreaming: this.isStreaming,
            ...this.streamingData
        };
    }

    // Integration methods for game events
    onRaceStart(trackName, totalLaps, totalPlayers) {
        this.updateStreamingData({
            raceStatus: 'waiting',
            trackName,
            totalLaps,
            totalPlayers,
            currentLap: 0,
            position: 1,
            bestLapTime: null,
            currentLapTime: null,
            speed: 0
        });
    }

    onRaceBegin() {
        this.updateStreamingData({
            raceStatus: 'racing',
            currentLapTime: 0
        });
    }

    onLapComplete(lapNumber, lapTime, bestLapTime, position) {
        this.updateStreamingData({
            currentLap: lapNumber,
            currentLapTime: 0, // Reset for next lap
            bestLapTime,
            position
        });
    }

    onPositionUpdate(position, speed) {
        this.updateStreamingData({
            position,
            speed
        });
    }

    onRaceEnd(finalPosition) {
        this.updateStreamingData({
            raceStatus: 'finished',
            position: finalPosition
        });
    }

    onLapTimeUpdate(currentLapTime) {
        if (this.streamingData.raceStatus === 'racing') {
            this.updateStreamingData({
                currentLapTime
            });
        }
    }
}