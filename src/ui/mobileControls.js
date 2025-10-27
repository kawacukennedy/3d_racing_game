export class MobileControls {
    constructor(game) {
        this.game = game;
        this.isMobile = this.detectMobile();
        this.touchControls = null;
        this.steeringWheel = null;
        this.accelButton = null;
        this.brakeButton = null;
        this.boostButton = null;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isAccelerating = false;
        this.isBraking = false;
        this.steeringValue = 0;
        this.sensitivity = 1.0;

        if (this.isMobile) {
            this.initializeTouchControls();
        }
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    initializeTouchControls() {
        // Create touch control overlay
        this.createTouchOverlay();

        // Set up touch event listeners
        this.setupTouchEvents();

        // Hide on-screen keyboard for mobile
        this.preventZoom();

        console.log('Mobile touch controls initialized');
    }

    createTouchOverlay() {
        this.touchControls = document.createElement('div');
        this.touchControls.id = 'touchControls';
        this.touchControls.innerHTML = `
            <div id="steeringWheel" class="steering-wheel">
                <div class="steering-indicator"></div>
            </div>
            <div id="accelButton" class="control-button accel-button">▲</div>
            <div id="brakeButton" class="control-button brake-button">▼</div>
            <div id="boostButton" class="control-button boost-button">🚀</div>
            <div id="driftButton" class="control-button drift-button">⭕</div>
        `;

        // Add CSS styles
        const style = document.createElement('style');
        style.textContent = `
            #touchControls {
                position: fixed;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 200px;
                pointer-events: none;
                z-index: 1000;
            }

            .steering-wheel {
                position: absolute;
                left: 20px;
                bottom: 20px;
                width: 120px;
                height: 120px;
                border: 3px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                background: rgba(0,0,0,0.5);
                pointer-events: auto;
                touch-action: none;
            }

            .steering-indicator {
                position: absolute;
                top: 10px;
                left: 50%;
                width: 4px;
                height: 40px;
                background: #00ff00;
                transform: translateX(-50%);
                border-radius: 2px;
            }

            .control-button {
                position: absolute;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: rgba(0,0,0,0.7);
                border: 2px solid rgba(255,255,255,0.5);
                color: white;
                font-size: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: auto;
                touch-action: none;
                user-select: none;
                transition: all 0.1s;
            }

            .control-button:active {
                background: rgba(255,255,255,0.3);
                transform: scale(0.95);
            }

            .accel-button {
                right: 100px;
                bottom: 80px;
                background: rgba(0,255,0,0.7);
            }

            .brake-button {
                right: 20px;
                bottom: 80px;
                background: rgba(255,0,0,0.7);
            }

            .boost-button {
                right: 100px;
                bottom: 20px;
                background: rgba(255,165,0,0.7);
            }

            .drift-button {
                right: 20px;
                bottom: 20px;
                background: rgba(255,0,255,0.7);
            }

            @media (orientation: landscape) {
                #touchControls {
                    height: 150px;
                }

                .steering-wheel {
                    width: 100px;
                    height: 100px;
                }

                .control-button {
                    width: 50px;
                    height: 50px;
                    font-size: 20px;
                }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(this.touchControls);

        // Get references to control elements
        this.steeringWheel = document.getElementById('steeringWheel');
        this.accelButton = document.getElementById('accelButton');
        this.brakeButton = document.getElementById('brakeButton');
        this.boostButton = document.getElementById('boostButton');
        this.driftButton = document.getElementById('driftButton');
    }

    setupTouchEvents() {
        // Skip in test environment
        if (!this.steeringWheel || typeof this.steeringWheel.addEventListener === 'undefined') {
            return;
        }

        // Steering wheel touch events
        this.steeringWheel.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.updateSteering(touch.clientX);
        });

        this.steeringWheel.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.updateSteering(touch.clientX);
        });

        this.steeringWheel.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.steeringValue = 0;
            this.updateSteeringIndicator(0);
        });

        // Button touch events
        this.accelButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isAccelerating = true;
        });

        this.accelButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isAccelerating = false;
        });

        this.brakeButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isBraking = true;
        });

        this.brakeButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isBraking = false;
        });

        this.boostButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.activateBoost();
        });

        this.driftButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.activateDrift();
        });

        // Prevent default touch behaviors
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('#touchControls')) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    updateSteering(clientX) {
        const wheelRect = this.steeringWheel.getBoundingClientRect();
        const wheelCenterX = wheelRect.left + wheelRect.width / 2;
        const deltaX = clientX - wheelCenterX;
        const maxDelta = wheelRect.width / 2;

        // Calculate steering value (-1 to 1)
        this.steeringValue = Math.max(-1, Math.min(1, deltaX / maxDelta));
        this.updateSteeringIndicator(this.steeringValue);
    }

    updateSteeringIndicator(value) {
        const indicator = this.steeringWheel.querySelector('.steering-indicator');
        const rotation = value * 45; // Max 45 degrees rotation
        indicator.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
    }

    activateBoost() {
        // Implement boost activation
        console.log('Boost activated');
        // This would integrate with vehicle controller
    }

    activateDrift() {
        // Implement drift activation
        console.log('Drift activated');
        // This would integrate with vehicle controller
    }

    preventZoom() {
        // Prevent zoom on double tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // Prevent zoom on pinch
        document.addEventListener('gesturestart', (e) => {
            e.preventDefault();
        });
    }

    getInputState() {
        return {
            accelerate: this.isAccelerating,
            brake: this.isBraking,
            steering: this.steeringValue,
            boost: false, // Would be set by boost button timing
            drift: false  // Would be set by drift button timing
        };
    }

    setSensitivity(value) {
        this.sensitivity = Math.max(0.1, Math.min(2.0, value));
    }

    show() {
        if (this.touchControls) {
            this.touchControls.style.display = 'block';
        }
    }

    hide() {
        if (this.touchControls) {
            this.touchControls.style.display = 'none';
        }
    }

    isActive() {
        return this.isMobile && this.touchControls;
    }

    update() {
        // Update visual feedback for buttons
        if (this.accelButton) {
            this.accelButton.style.opacity = this.isAccelerating ? '1' : '0.7';
        }
        if (this.brakeButton) {
            this.brakeButton.style.opacity = this.isBraking ? '1' : '0.7';
        }
    }
}