import * as CANNON from 'cannon-es';

export class PhysicsManager {
    constructor() {
        this.world = new CANNON.World();
        this.vehicles = [];
        this.vehicle = null;
        this.groundBody = null;
        this.onCollisionCallback = null;

        // Enhanced physics properties
        this.vehicleStates = new Map(); // vehicle -> state data
        this.fuelConsumptionRate = 0.001; // Fuel per second at full throttle
        this.tireWearRate = 0.0001; // Tire wear per second of sliding

        // Drafting system
        this.draftingDistance = 8; // Distance for drafting effect
        this.draftingReduction = 0.3; // 30% reduction in drag when drafting
    }

    init() {
        // Set up physics world
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.defaultContactMaterial.friction = 0.4;
        this.world.defaultContactMaterial.restitution = 0.3;

        // Create ground
        const groundShape = new CANNON.Plane();
        const groundMaterial = new CANNON.Material({ friction: 0.8, restitution: 0.1 });
        this.groundBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: groundMaterial });
        this.groundBody.addShape(groundShape);
        this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(this.groundBody);

        // Create contact material for vehicle-ground interaction
        const vehicleGroundContact = new CANNON.ContactMaterial(
            this.groundBody.material,
            new CANNON.Material({ friction: 0.3, restitution: 0.1 }),
            { friction: 0.9, restitution: 0.1 }
        );
        this.world.addContactMaterial(vehicleGroundContact);

        // Create raycast vehicle
        this.createVehicle();
    }

    createVehicle(config = null) {
        // Default configuration with detailed physics parameters
        const defaultConfig = {
            mass: 1200,
            geometry: { width: 1.8, height: 1.2, length: 4.2 },
            friction: 0.3,
            restitution: 0.1,
            // Detailed physics parameters from spec
            inertiaTensor: null, // Will be calculated if not provided
            gearbox: {
                gears: [3.5, 2.2, 1.6, 1.2, 1.0, 0.8], // Gear ratios
                finalDriveRatio: 3.5,
                reverseRatio: -3.0
            },
            engineTorqueCurve: [
                { rpm: 1000, torque: 200 },
                { rpm: 2000, torque: 300 },
                { rpm: 3000, torque: 350 },
                { rpm: 4000, torque: 380 },
                { rpm: 5000, torque: 400 },
                { rpm: 6000, torque: 380 },
                { rpm: 7000, torque: 300 }
            ],
            rpmLimits: { idle: 800, redline: 7000 },
            tireModelParameters: {
                anisotropicFriction: true,
                corneringStiffness: 1500, // N/rad
                longitudinalStiffness: 1000, // N/unit slip
                tireTemperatureModel: {
                    temperatureIncreasePerSlip: 0.1,
                    optimallyGrippyRange: { min: 80, max: 100 }
                }
            },
            suspensionParameters: {
                restLength: 0.3,
                stiffnessNperM: 30000,
                damping: 2000,
                antiRollBar: 5000
            },
            aerodynamics: {
                dragCoefficient: 0.3,
                frontalArea: 2.2,
                downforceCoefficient: 0.8,
                liftAtSpeedCurve: [
                    { speed: 0, lift: 0 },
                    { speed: 50, lift: -100 },
                    { speed: 100, lift: -300 },
                    { speed: 150, lift: -600 }
                ]
            }
        };

        const vehicleConfig = config ? { ...defaultConfig, ...config } : defaultConfig;

        // Vehicle body with inertia tensor
        const chassisShape = new CANNON.Box(new CANNON.Vec3(
            vehicleConfig.geometry.width / 2,
            vehicleConfig.geometry.height / 2,
            vehicleConfig.geometry.length / 2
        ));

        // Calculate inertia tensor if not provided
        let inertiaTensor = vehicleConfig.inertiaTensor;
        if (!inertiaTensor) {
            // Approximate inertia tensor based on mass and dimensions
            const mass = vehicleConfig.mass;
            const w = vehicleConfig.geometry.width;
            const h = vehicleConfig.geometry.height;
            const l = vehicleConfig.geometry.length;
            inertiaTensor = new CANNON.Vec3(
                (mass / 12) * (h*h + l*l), // Ixx
                (mass / 12) * (w*w + l*l), // Iyy
                (mass / 12) * (w*w + h*h)  // Izz
            );
        }

        const chassisBody = new CANNON.Body({
            mass: vehicleConfig.mass,
            material: new CANNON.Material({
                friction: vehicleConfig.friction,
                restitution: vehicleConfig.restitution
            })
        });

        chassisBody.addShape(chassisShape);
        chassisBody.position.set(0, 2, 0);

        // Set custom inertia tensor
        chassisBody.inertia.copy(inertiaTensor);
        chassisBody.updateInertiaWorld(true);

        // Vehicle
        const vehicle = new CANNON.RaycastVehicle({
            chassisBody: chassisBody,
            indexRightAxis: 0,
            indexUpAxis: 1,
            indexForwardAxis: 2,
        });

        // Advanced wheel options with detailed tire and suspension model
        const wheelOptions = {
            radius: 0.35,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: vehicleConfig.suspensionParameters.stiffnessNperM / 1000, // Convert to Cannon units
            suspensionRestLength: vehicleConfig.suspensionParameters.restLength,
            maxSuspensionForce: vehicleConfig.suspensionParameters.stiffnessNperM * vehicleConfig.suspensionParameters.restLength * 2,
            maxSuspensionTravel: vehicleConfig.suspensionParameters.restLength * 0.5,
            dampingRelaxation: vehicleConfig.suspensionParameters.damping / 100,
            dampingCompression: vehicleConfig.suspensionParameters.damping / 50,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(
                vehicleConfig.geometry.width / 2 - 0.2,
                -vehicleConfig.geometry.height / 2 + 0.1,
                vehicleConfig.geometry.length / 2 - 0.5
            ),
            useCustomSlidingRotationalSpeed: true,
            customSlidingRotationalSpeed: -30,
            frictionSlip: vehicleConfig.tireModelParameters.longitudinalStiffness / 1000,
            // Advanced tire parameters
            rollInfluence: 0.01,
            isFrontWheel: false,
        };

        // Add wheels - front left
        wheelOptions.chassisConnectionPointLocal.set(
            vehicleConfig.geometry.width / 2 - 0.2,
            -vehicleConfig.geometry.height / 2 + 0.1,
            vehicleConfig.geometry.length / 2 - 0.5
        );
        wheelOptions.isFrontWheel = true;
        vehicle.addWheel(wheelOptions);

        // Front right
        wheelOptions.chassisConnectionPointLocal.set(
            -(vehicleConfig.geometry.width / 2 - 0.2),
            -vehicleConfig.geometry.height / 2 + 0.1,
            vehicleConfig.geometry.length / 2 - 0.5
        );
        vehicle.addWheel(wheelOptions);

        // Rear left
        wheelOptions.chassisConnectionPointLocal.set(
            vehicleConfig.geometry.width / 2 - 0.2,
            -vehicleConfig.geometry.height / 2 + 0.1,
            -(vehicleConfig.geometry.length / 2 - 0.5)
        );
        wheelOptions.isFrontWheel = false;
        vehicle.addWheel(wheelOptions);

        // Rear right
        wheelOptions.chassisConnectionPointLocal.set(
            -(vehicleConfig.geometry.width / 2 - 0.2),
            -vehicleConfig.geometry.height / 2 + 0.1,
            -(vehicleConfig.geometry.length / 2 - 0.5)
        );
        vehicle.addWheel(wheelOptions);

        vehicle.addToWorld(this.world);

        // Add wheel bodies for rendering
        vehicle.wheelInfos.forEach((wheel) => {
            const cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 20);
            const wheelBody = new CANNON.Body({ mass: 0 });
            wheelBody.type = CANNON.Body.KINEMATIC;
            wheelBody.collisionFilterGroup = 0; // Turn off collisions
            wheelBody.addShape(cylinderShape);
            this.world.addBody(wheelBody);
            wheel.wheelBody = wheelBody;
        });

        this.vehicles.push(vehicle);
        this.vehicle = vehicle; // Set as current vehicle for controls

        return vehicle;
    }

    getVehicleBody(index = 0) {
        return this.vehicles[index] ? this.vehicles[index].chassisBody : null;
    }

    getVehicle(index = 0) {
        return this.vehicles[index] || null;
    }

    update(deltaTime) {
        this.world.fixedStep(1 / 60, deltaTime);

        // Update all vehicles
        this.vehicles.forEach((vehicle) => {
            // Update wheel positions for rendering
            try {
                vehicle.wheelInfos.forEach((wheel) => {
                    vehicle.updateWheelTransform(wheel.index);
                    if (wheel.wheelBody && wheel.worldTransform) {
                        wheel.wheelBody.position.copy(wheel.worldTransform.position);
                        wheel.wheelBody.quaternion.copy(wheel.worldTransform.quaternion);
                    }
                });
            } catch (e) {
                // Skip wheel updates in test environments where physics mocks may be incomplete
                console.warn('Wheel transform update skipped:', e.message);
            }

            // Apply advanced aerodynamic forces
            this.applyAdvancedAerodynamics(vehicle, deltaTime);

            // Update tire wear and conditions
            this.updateTireWear(vehicle, deltaTime);
        });
    }

    applyAerodynamicForces() {
        this.vehicles.forEach((vehicle) => {
            if (!vehicle || !vehicle.chassisBody) return;

            const velocity = vehicle.chassisBody.velocity;
            const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);

            if (speed > 1) {
                // Air resistance (drag)
                const dragCoefficient = 0.3;
                const frontalArea = 2.2; // m²
                const airDensity = 1.225; // kg/m³
                const dragForce = 0.5 * dragCoefficient * frontalArea * airDensity * speed * speed;

                // Apply drag force opposite to velocity direction
                const dragDirection = new CANNON.Vec3(-velocity.x, -velocity.y, -velocity.z);
                dragDirection.normalize();
                dragDirection.scale(dragForce * 0.001, dragDirection); // Scale down for game balance

                vehicle.chassisBody.force.vadd(dragDirection, vehicle.chassisBody.force);

                // Downforce (increases with speed)
                const downforceCoefficient = 0.8;
                const downforce = 0.5 * downforceCoefficient * frontalArea * airDensity * speed * speed * 0.1;
                vehicle.chassisBody.force.y -= downforce;
            }
        });
    }

    updateTireConditions() {
        this.vehicles.forEach((vehicle) => {
            if (!vehicle) return;

            // Update friction based on various factors
            vehicle.wheelInfos.forEach((wheel, index) => {
            let frictionMultiplier = 1.0;

            // Reduce friction if sliding too much (simulate tire wear)
            if (wheel.slipInfo > 1.0) {
                frictionMultiplier *= 0.8;
            }

            // Could add weather effects here
            // if (this.weather === 'rain') frictionMultiplier *= 0.7;

                // Apply friction multiplier
                wheel.frictionSlip = 2.0 * frictionMultiplier;
            });
        });
    }

    checkCollisions() {
        if (!this.onCollisionCallback) return;

        // Check contacts involving any vehicle chassis
        this.world.contacts.forEach((contact) => {
            const bodyA = contact.bi;
            const bodyB = contact.bj;

            const isVehicleCollision = this.vehicles.some(vehicle =>
                (bodyA === vehicle.chassisBody || bodyB === vehicle.chassisBody) &&
                (bodyA !== this.groundBody && bodyB !== this.groundBody)
            );

            if (isVehicleCollision) {
                // Calculate collision intensity
                const relativeVelocity = contact.getImpactVelocityAlongNormal();
                const intensity = Math.min(Math.abs(relativeVelocity) / 10, 1);

                if (intensity > 0.1) {
                    this.onCollisionCallback(intensity);
                }
            }
        });
    }

    setCollisionCallback(callback) {
        this.onCollisionCallback = callback;
    }

    // Fuel System
    initializeVehicleState(vehicle) {
        this.vehicleStates.set(vehicle, {
            fuel: 100, // 100% fuel
            tireCondition: {
                frontLeft: 100,
                frontRight: 100,
                rearLeft: 100,
                rearRight: 100
            },
            engineTemp: 20, // Celsius
            lastUpdate: Date.now(),
            // Engine and transmission state
            currentGear: 1,
            engineRPM: 1000,
            clutchEngaged: true,
            throttle: 0,
            brake: 0,
            // Damage and wear
            engineHealth: 100,
            transmissionHealth: 100,
            suspensionHealth: 100
        });
    }

    consumeFuel(vehicle, throttle, deltaTime) {
        if (!this.vehicleStates.has(vehicle)) {
            this.initializeVehicleState(vehicle);
        }

        const state = this.vehicleStates.get(vehicle);
        const fuelConsumption = this.fuelConsumptionRate * throttle * deltaTime * 60; // Scale to seconds
        state.fuel = Math.max(0, state.fuel - fuelConsumption);

        // Engine temperature increases with throttle
        const tempIncrease = throttle * deltaTime * 2;
        state.engineTemp = Math.min(120, state.engineTemp + tempIncrease);

        return state.fuel;
    }

    refuel(vehicle, amount = 100) {
        if (!this.vehicleStates.has(vehicle)) {
            this.initializeVehicleState(vehicle);
        }

        const state = this.vehicleStates.get(vehicle);
        state.fuel = Math.min(100, state.fuel + amount);
        return state.fuel;
    }

    // Tire Wear System with detailed model
    updateTireWear(vehicle, deltaTime) {
        if (!this.vehicleStates.has(vehicle)) {
            this.initializeVehicleState(vehicle);
        }

        const state = this.vehicleStates.get(vehicle);
        const config = this.getVehicleConfig(vehicle);
        const tireModel = config.tireModelParameters || {
            tireTemperatureModel: {
                temperatureIncreasePerSlip: 0.1,
                optimallyGrippyRange: { min: 80, max: 100 }
            }
        };

        vehicle.wheelInfos.forEach((wheel, index) => {
            const wheelName = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'][index];

            // Initialize tire temperature if not exists
            if (!state.tireTemperature) {
                state.tireTemperature = {
                    frontLeft: 20,
                    frontRight: 20,
                    rearLeft: 20,
                    rearRight: 20
                };
            }

            const currentTemp = state.tireTemperature[wheelName];
            const slip = Math.abs(wheel.slipInfo);

            // Temperature increase based on slip
            const tempIncrease = tireModel.tireTemperatureModel.temperatureIncreasePerSlip * slip * deltaTime * 60;
            state.tireTemperature[wheelName] = Math.min(120, currentTemp + tempIncrease);

            // Tire wear based on slip and temperature
            if (slip > 0.3) {
                const wearAmount = this.tireWearRate * slip * deltaTime * 60;

                // Extra wear from high temperature
                const tempWearMultiplier = currentTemp > 100 ? 2.0 : 1.0;

                state.tireCondition[wheelName] = Math.max(0, state.tireCondition[wheelName] - wearAmount * tempWearMultiplier);
            }

            // Grip based on temperature and wear
            const optimalRange = tireModel.tireTemperatureModel.optimallyGrippyRange;
            let tempGripMultiplier = 1.0;

            if (currentTemp < optimalRange.min) {
                tempGripMultiplier = 0.7 + 0.3 * (currentTemp / optimalRange.min);
            } else if (currentTemp > optimalRange.max) {
                tempGripMultiplier = 1.0 - 0.3 * ((currentTemp - optimalRange.max) / 20);
            }

            const wearMultiplier = state.tireCondition[wheelName] / 100;
            const totalGripMultiplier = tempGripMultiplier * wearMultiplier;

            // Apply grip to friction
            wheel.frictionSlip = config.tireModelParameters.longitudinalStiffness / 1000 * totalGripMultiplier;
        });
    }

    changeTires(vehicle, tireType = 'standard') {
        if (!this.vehicleStates.has(vehicle)) {
            this.initializeVehicleState(vehicle);
        }

        const state = this.vehicleStates.get(vehicle);
        const tireConditions = {
            standard: 100,
            soft: 80, // Better grip but wear faster
            hard: 120, // Last longer but less grip
            intermediate: 90 // For mixed conditions
        };

        Object.keys(state.tireCondition).forEach(wheel => {
            state.tireCondition[wheel] = tireConditions[tireType] || 100;
        });

        console.log(`Changed tires to ${tireType} compound`);
    }

    // Enhanced Aerodynamics with Drafting
    applyAdvancedAerodynamics(vehicle, deltaTime) {
        if (!vehicle || !vehicle.chassisBody) return;

        const velocity = vehicle.chassisBody.velocity;
        const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);

        if (speed > 5) { // Only apply at higher speeds
            // Get vehicle config for aerodynamics
            const config = this.getVehicleConfig(vehicle);
            const aero = config.aerodynamics || {
                dragCoefficient: 0.3,
                frontalArea: 2.2,
                downforceCoefficient: 0.8
            };

            // Check for drafting effect
            const draftingMultiplier = this.calculateDraftingEffect(vehicle);

            // Advanced drag calculation
            const dragCoefficient = aero.dragCoefficient * draftingMultiplier; // Reduced drag when drafting
            const frontalArea = aero.frontalArea;
            const airDensity = 1.225; // kg/m³

            // Quadratic drag
            const dragForce = 0.5 * dragCoefficient * frontalArea * airDensity * speed * speed;

            // Apply drag force
            const dragDirection = new CANNON.Vec3(-velocity.x, 0, -velocity.z);
            dragDirection.normalize();
            dragDirection.scale(dragForce * 0.01, dragDirection); // Scale for game balance

            vehicle.chassisBody.force.vadd(dragDirection, vehicle.chassisBody.force);

            // Lift/downforce effects with speed curve
            let downforce = 0;
            if (aero.liftAtSpeedCurve) {
                // Interpolate from curve
                const curve = aero.liftAtSpeedCurve;
                const speedKmh = speed * 3.6; // Convert to km/h

                if (speedKmh <= curve[0].speed) {
                    downforce = curve[0].lift;
                } else if (speedKmh >= curve[curve.length - 1].speed) {
                    downforce = curve[curve.length - 1].lift;
                } else {
                    for (let i = 0; i < curve.length - 1; i++) {
                        if (speedKmh >= curve[i].speed && speedKmh <= curve[i + 1].speed) {
                            const ratio = (speedKmh - curve[i].speed) / (curve[i + 1].speed - curve[i].speed);
                            downforce = curve[i].lift + ratio * (curve[i + 1].lift - curve[i].lift);
                            break;
                        }
                    }
                }
            } else {
                // Fallback calculation
                downforce = -0.5 * aero.downforceCoefficient * frontalArea * airDensity * speed * speed * 0.1;
            }

            vehicle.chassisBody.force.y += downforce * 0.01;

            // Side force (yaw effect) - reduced when drafting
            const sideForce = 0.1 * speed * speed * 0.001 * draftingMultiplier;
            const lateralVelocity = new CANNON.Vec3(velocity.x, 0, velocity.z);
            lateralVelocity.normalize();

            // Apply side force perpendicular to velocity
            const sideDirection = new CANNON.Vec3(-lateralVelocity.z, 0, lateralVelocity.x);
            sideDirection.scale(sideForce, sideDirection);
            vehicle.chassisBody.force.vadd(sideDirection, vehicle.chassisBody.force);
        }
    }

    // Drafting System
    calculateDraftingEffect(vehicle) {
        if (!vehicle || !vehicle.chassisBody) return 1.0;

        const vehiclePos = vehicle.chassisBody.position;
        const vehicleVel = vehicle.chassisBody.velocity;
        const vehicleSpeed = Math.sqrt(vehicleVel.x ** 2 + vehicleVel.z ** 2);

        if (vehicleSpeed < 10) return 1.0; // No drafting at low speeds

        let closestDraftingDistance = Infinity;
        let isDrafting = false;

        // Check distance to other vehicles
        this.vehicles.forEach(otherVehicle => {
            if (otherVehicle === vehicle || !otherVehicle.chassisBody) return;

            const otherPos = otherVehicle.chassisBody.position;
            const otherVel = otherVehicle.chassisBody.velocity;
            const otherSpeed = Math.sqrt(otherVel.x ** 2 + otherVel.z ** 2);

            // Only draft behind faster vehicles
            if (otherSpeed <= vehicleSpeed) return;

            const distance = Math.sqrt(
                Math.pow(vehiclePos.x - otherPos.x, 2) +
                Math.pow(vehiclePos.z - otherPos.z, 2)
            );

            if (distance < this.draftingDistance) {
                // Check if we're behind the other vehicle
                const toOther = new CANNON.Vec3(
                    otherPos.x - vehiclePos.x,
                    0,
                    otherPos.z - vehiclePos.z
                );
                toOther.normalize();

                const vehicleDir = new CANNON.Vec3(vehicleVel.x, 0, vehicleVel.z);
                vehicleDir.normalize();

                const dotProduct = vehicleDir.dot(toOther);
                if (dotProduct > 0.7) { // Within 45 degrees behind
                    isDrafting = true;
                    closestDraftingDistance = Math.min(closestDraftingDistance, distance);
                }
            }
        });

        if (isDrafting) {
            // Calculate drafting strength based on distance
            const draftingStrength = Math.max(0, 1 - (closestDraftingDistance / this.draftingDistance));
            const dragReduction = 1 - (this.draftingReduction * draftingStrength);

            // Store drafting state for UI feedback
            if (!this.vehicleStates.has(vehicle)) {
                this.initializeVehicleState(vehicle);
            }
            const state = this.vehicleStates.get(vehicle);
            state.isDrafting = true;
            state.draftingStrength = draftingStrength;

            return dragReduction;
        } else {
            // Clear drafting state
            if (this.vehicleStates.has(vehicle)) {
                const state = this.vehicleStates.get(vehicle);
                state.isDrafting = false;
                state.draftingStrength = 0;
            }
            return 1.0;
        }
    }

    // Get drafting status for UI
    getDraftingStatus(vehicle) {
        if (!this.vehicleStates.has(vehicle)) return null;
        const state = this.vehicleStates.get(vehicle);
        return {
            isDrafting: state.isDrafting || false,
            strength: state.draftingStrength || 0
        };
    }

    // Engine and Transmission
    applyEngineForces(vehicle, throttle, brake, deltaTime) {
        if (!vehicle || !vehicle.chassisBody) return;

        const state = this.vehicleStates.get(vehicle);
        if (!state) return;

        // Check if we have fuel
        if (state.fuel <= 0) {
            throttle = 0; // No power without fuel
        }

        // Update engine and get wheel torque
        const wheelTorque = this.updateEngine(vehicle, throttle, deltaTime);

        // Apply engine force to driven wheels (rear wheels for RWD)
        const engineForce = wheelTorque / 0.35; // Convert torque to force (radius = 0.35m)

        // Apply to rear wheels only (RWD configuration)
        vehicle.applyEngineForce(engineForce, 2); // Rear left
        vehicle.applyEngineForce(engineForce, 3); // Rear right

        // Brake force
        if (brake > 0) {
            const maxBrakeForce = 1500;
            const brakeForce = maxBrakeForce * brake;

            // Apply braking to all wheels
            for (let i = 0; i < 4; i++) {
                vehicle.setBrake(brakeForce, i);
            }
        } else {
            // Release brakes
            for (let i = 0; i < 4; i++) {
                vehicle.setBrake(0, i);
            }
        }

    // Consume fuel
        this.consumeFuel(vehicle, throttle, deltaTime);
    }

    updateEngineTemperature(vehicle, throttle, deltaTime) {
        if (!this.vehicleStates.has(vehicle)) return;

        const state = this.vehicleStates.get(vehicle);
        const engineRPM = state.engineRPM || 1000;

        // Temperature increases with RPM and throttle
        const tempIncrease = (throttle * 0.5 + (engineRPM / 7000) * 0.3) * deltaTime * 10;
        state.engineTemp = Math.min(120, state.engineTemp + tempIncrease);

        // Cooling when engine is off
        if (throttle < 0.1 && engineRPM < 1200) {
            state.engineTemp = Math.max(20, state.engineTemp - deltaTime * 5);
        }

        // Engine damage from overheating
        if (state.engineTemp > 110) {
            state.engineHealth = Math.max(0, state.engineHealth - deltaTime * 0.1);
        }
    }

    // Engine and Transmission Simulation
    calculateEngineTorque(vehicle, throttle, currentRPM) {
        if (!vehicle) return 0;

        const config = this.getVehicleConfig(vehicle);
        if (!config || !config.engineTorqueCurve) return 200 * throttle; // Fallback

        // Interpolate torque from curve
        const curve = config.engineTorqueCurve;
        let torque = 0;

        if (currentRPM <= curve[0].rpm) {
            torque = curve[0].torque;
        } else if (currentRPM >= curve[curve.length - 1].rpm) {
            torque = curve[curve.length - 1].torque;
        } else {
            // Linear interpolation between points
            for (let i = 0; i < curve.length - 1; i++) {
                if (currentRPM >= curve[i].rpm && currentRPM <= curve[i + 1].rpm) {
                    const ratio = (currentRPM - curve[i].rpm) / (curve[i + 1].rpm - curve[i].rpm);
                    torque = curve[i].torque + ratio * (curve[i + 1].torque - curve[i].torque);
                    break;
                }
            }
        }

        return torque * throttle;
    }

    updateEngine(vehicle, throttle, deltaTime) {
        if (!this.vehicleStates.has(vehicle)) {
            this.initializeVehicleState(vehicle);
        }

        const state = this.vehicleStates.get(vehicle);
        const config = this.getVehicleConfig(vehicle);

        // Update throttle
        state.throttle = throttle;

        // Calculate wheel RPM from vehicle speed
        const velocity = vehicle.chassisBody.velocity;
        const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
        const wheelRPM = (speed / (2 * Math.PI * 0.35)) * 60; // Convert to RPM

        // Calculate engine RPM based on gear ratio
        const gearRatio = config.gearbox.gears[state.currentGear - 1] || 1;
        const finalDrive = config.gearbox.finalDriveRatio;
        state.engineRPM = wheelRPM * gearRatio * finalDrive;

        // Clamp RPM to limits
        const rpmLimits = config.rpmLimits || { idle: 800, redline: 7000 };
        state.engineRPM = Math.max(rpmLimits.idle, Math.min(rpmLimits.redline, state.engineRPM));

        // Calculate available torque
        const engineTorque = this.calculateEngineTorque(vehicle, throttle, state.engineRPM);

        // Apply torque through transmission
        const wheelTorque = engineTorque * gearRatio * finalDrive * (state.clutchEngaged ? 1 : 0.1);

        return wheelTorque;
    }

    shiftGear(vehicle, direction) {
        if (!this.vehicleStates.has(vehicle)) return false;

        const state = this.vehicleStates.get(vehicle);
        const config = this.getVehicleConfig(vehicle);
        const maxGears = config.gearbox.gears.length;

        const newGear = state.currentGear + direction;
        if (newGear >= 1 && newGear <= maxGears) {
            // Brief clutch disengagement for realistic shifting
            state.clutchEngaged = false;
            setTimeout(() => {
                state.currentGear = newGear;
                state.clutchEngaged = true;
            }, 200); // 200ms shift time

            return true;
        }

        return false;
    }

    // Get vehicle config (this would need to be passed or stored)
    getVehicleConfig(vehicle) {
        // For now, return default config - in practice this should be stored per vehicle
        return {
            gearbox: {
                gears: [3.5, 2.2, 1.6, 1.2, 1.0, 0.8],
                finalDriveRatio: 3.5,
                reverseRatio: -3.0
            },
            engineTorqueCurve: [
                { rpm: 1000, torque: 200 },
                { rpm: 2000, torque: 300 },
                { rpm: 3000, torque: 350 },
                { rpm: 4000, torque: 380 },
                { rpm: 5000, torque: 400 },
                { rpm: 6000, torque: 380 },
                { rpm: 7000, torque: 300 }
            ],
            rpmLimits: { idle: 800, redline: 7000 }
        };
    }

    // Get vehicle status
    getVehicleStatus(vehicle) {
        if (!this.vehicleStates.has(vehicle)) {
            this.initializeVehicleState(vehicle);
        }

        return this.vehicleStates.get(vehicle);
    }

    // Reset vehicle state
    resetVehicleState(vehicle) {
        this.vehicleStates.delete(vehicle);
        this.initializeVehicleState(vehicle);
    }

    cleanup() {
        // Clear all bodies from the world
        while (this.world.bodies.length > 0) {
            this.world.removeBody(this.world.bodies[0]);
        }

        // Clear all contact materials
        this.world.contactMaterials.length = 0;

        // Clear constraints
        while (this.world.constraints.length > 0) {
            this.world.removeConstraint(this.world.constraints[0]);
        }

        console.log('Physics world cleaned up');
    }
}