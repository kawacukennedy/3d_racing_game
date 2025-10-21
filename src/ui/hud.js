export class HUD {
    constructor() {
        this.hudElement = document.getElementById('hud');
        this.speed = 0;
        this.lap = 1;
        this.position = 1;
    }

    init() {
        this.updateDisplay();
    }

    update() {
        // TODO: Get actual values from game state
        this.updateDisplay();
    }

    updateDisplay() {
        this.hudElement.innerHTML = `
            <div>Speed: ${Math.round(this.speed)} km/h</div>
            <div>Lap: ${this.lap}/3</div>
            <div>Position: ${this.position}</div>
        `;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    setLap(lap) {
        this.lap = lap;
    }

    setPosition(position) {
        this.position = position;
    }
}