import * as THREE from 'three';

export class VehicleController {
    constructor() {
        this.keys = {};
        this.vehicle = null;
        this.physicsVehicle = null;
        this.maxEngineForce = 1500;
        this.maxBrakeForce = 150;
        this.maxSteerValue = 0.4;
        this.hud = null;
        this.mobileControls = null;
        this.inputMode = 'keyboard'; // 'keyboard' or 'mobile'
    }

    init(world, hud, mobileControls = null) {
        this.hud = hud;
        this.mobileControls = mobileControls;
        this.inputMode = mobileControls && mobileControls.isActive() ? 'mobile' : 'keyboard';
        this.setupInput();
    }

    setupInput() {
        // Skip event listeners in test environment
        if (typeof document.addEventListener === 'undefined') {
            return;
        }

        this.keydownHandler = (event) => {
            this.keys[event.code] = true;
        };
        this.keyupHandler = (event) => {
            this.keys[event.code] = false;
        };

        document.addEventListener('keydown', this.keydownHandler);
        document.addEventListener('keyup', this.keyupHandler);
    }

    cleanup() {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        if (this.keyupHandler) {
            document.removeEventListener('keyup', this.keyupHandler);
        }
    }

    update(deltaTime) {
        if (!this.physicsVehicle || !this.physicsVehicle.chassisBody) return;

        const vehiclePosition = this.physicsVehicle.chassisBody.position;
        const vehicleQuaternion = this.physicsVehicle.chassisBody.quaternion;

        let forward = false, backward = false, left = false, right = false, brake = false;

        if (this.inputMode === 'mobile' && this.mobileControls) {
            // Use mobile controls
            const mobileInput = this.mobileControls.getInputState();
            forward = mobileInput.accelerate;
            brake = mobileInput.brake;
            const steeringValue = mobileInput.steering;

            // Convert steering value to left/right
            if (steeringValue < -0.1) left = true;
            if (steeringValue > 0.1) right = true;
        } else {
            // Use keyboard controls
            forward = this.keys['KeyW'] || this.keys['ArrowUp'];
            backward = this.keys['KeyS'] || this.keys['ArrowDown'];
            left = this.keys['KeyA'] || this.keys['ArrowLeft'];
            right = this.keys['KeyD'] || this.keys['ArrowRight'];
            brake = this.keys['Space'];
        }

        // Engine force
        let engineForce = 0;
        if (forward) {
            engineForce = this.maxEngineForce;
        } else if (backward) {
            engineForce = -this.maxEngineForce * 0.7; // Reverse is stronger for better control
        }

        // Add downforce based on speed for better handling
        if (this.physicsVehicle && this.physicsVehicle.chassisBody) {
            const velocity = this.physicsVehicle.chassisBody.velocity;
            const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
            const downforce = Math.min(speed * 50, 500); // Max downforce of 500N
            this.physicsVehicle.chassisBody.force.y -= downforce;
        }

        // Steering
        let steerValue = 0;
        if (left) {
            steerValue = this.maxSteerValue;
        } else if (right) {
            steerValue = -this.maxSteerValue;
        }

        // Braking
        let brakeForce = 0;
        if (brake) {
            brakeForce = this.maxBrakeForce;
        }

        // Apply forces to all wheels
        for (let i = 0; i < this.physicsVehicle.wheelInfos.length; i++) {
            this.physicsVehicle.applyEngineForce(engineForce, i);
            this.physicsVehicle.setBrake(brakeForce, i);

            // Steering for front wheels only (indices 0 and 1)
            if (i < 2) {
                this.physicsVehicle.setSteeringValue(steerValue, i);
            }
        }

        // Update HUD with speed from physics body
        if (this.hud && this.physicsVehicle.chassisBody) {
            const velocity = this.physicsVehicle.chassisBody.velocity;
            const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2) * 3.6; // Convert m/s to km/h
            this.hud.setSpeed(speed);

            // Check for tire squeal (sliding/drifting)
            this.checkTireSqueal(speed);
        }
    }

    checkTireSqueal(speed) {
        if (!this.physicsVehicle || speed < 10) return; // Only check at reasonable speeds

        let isSquealing = false;

        // Check if any wheel is sliding significantly
        this.physicsVehicle.wheelInfos.forEach((wheel) => {
            const slip = Math.abs(wheel.slipInfo || 0);
            if (slip > 0.5) { // Threshold for squeal
                isSquealing = true;
            }
        });

        // Also check for hard steering at speed
        const steerInput = Math.abs(this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 :
                                   this.keys['KeyD'] || this.keys['ArrowRight'] ? -1 : 0);
        if (steerInput > 0 && speed > 30) {
            isSquealing = true;
        }

        if (isSquealing && this.onTireSquealCallback) {
            this.onTireSquealCallback(speed / 100); // Normalize intensity
        }
    }

    setTireSquealCallback(callback) {
        this.onTireSquealCallback = callback;
    }

    setVehicle(vehicle) {
        this.vehicle = vehicle;
    }

    setPhysicsVehicle(physicsVehicle) {
        this.physicsVehicle = physicsVehicle;
    }

    accelerate(force = 1.0) {
        if (!this.physicsVehicle) return;
        const engineForce = force * this.maxEngineForce;
        // Apply to rear wheels
        this.physicsVehicle.applyEngineForce(engineForce, 2);
        this.physicsVehicle.applyEngineForce(engineForce, 3);
    }

    brake(force = 1.0) {
        if (!this.physicsVehicle) return;
        const brakeForce = force * this.maxBrakeForce;
        // Apply to all wheels
        for (let i = 0; i < this.physicsVehicle.wheelInfos.length; i++) {
            this.physicsVehicle.setBrake(brakeForce, i);
        }
    }

    // Accessibility methods
    setControlScheme(scheme) {
        this.controlScheme = scheme;
        // Switch between keyboard, gamepad, touch
        if (scheme === 'gamepad') {
            this.setupGamepadControls();
        } else if (scheme === 'touch') {
            this.inputMode = 'mobile';
        } else {
            this.inputMode = 'keyboard';
        }
    }

    setInvertY(invert) {
        this.invertY = invert;
    }

    setSensitivity(sensitivity) {
        this.sensitivity = sensitivity;
    }

    setupGamepadControls() {
        // Gamepad input handling
        this.gamepadConnected = false;
        window.addEventListener('gamepadconnected', (e) => {
            this.gamepadConnected = true;
            this.gamepadIndex = e.gamepad.index;
        });
        window.addEventListener('gamepaddisconnected', () => {
            this.gamepadConnected = false;
        });
    }
}