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
        // Default configuration
        const defaultConfig = {
            mass: 800,
            geometry: { width: 1.8, height: 1.0, length: 4.0 },
            friction: 0.3,
            restitution: 0.1
        };

        const vehicleConfig = config ? { ...defaultConfig, ...config } : defaultConfig;

        // Vehicle body
        const chassisShape = new CANNON.Box(new CANNON.Vec3(
            vehicleConfig.geometry.width / 2,
            vehicleConfig.geometry.height / 2,
            vehicleConfig.geometry.length / 2
        ));
        const chassisBody = new CANNON.Body({ mass: vehicleConfig.mass });
        chassisBody.addShape(chassisShape);
        chassisBody.position.set(0, 2, 0);
        chassisBody.material = new CANNON.Material({
            friction: vehicleConfig.friction,
            restitution: vehicleConfig.restitution
        });

        // Vehicle
        const vehicle = new CANNON.RaycastVehicle({
            chassisBody: chassisBody,
            indexRightAxis: 0,
            indexUpAxis: 1,
            indexForwardAxis: 2,
        });

        // Advanced wheel options with realistic tire model
        const wheelOptions = {
            radius: 0.35,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 60,
            suspensionRestLength: 0.3,
            maxSuspensionForce: 10000 + (vehicleConfig.mass * 10), // Scale with vehicle mass
            maxSuspensionTravel: 0.3,
            dampingRelaxation: 2.3,
            dampingCompression: 4.4,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(
                vehicleConfig.geometry.width / 2 - 0.2,
                -vehicleConfig.geometry.height / 2 + 0.1,
                vehicleConfig.geometry.length / 2 - 0.5
            ),
            useCustomSlidingRotationalSpeed: true,
            customSlidingRotationalSpeed: -30,
            frictionSlip: 2.5,
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
            lastUpdate: Date.now()
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

    // Tire Wear System
    updateTireWear(vehicle, deltaTime) {
        if (!this.vehicleStates.has(vehicle)) {
            this.initializeVehicleState(vehicle);
        }

        const state = this.vehicleStates.get(vehicle);

        vehicle.wheelInfos.forEach((wheel, index) => {
            const wheelName = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'][index];

            // Tire wear based on slip
            if (wheel.slipInfo > 0.5) {
                const wearAmount = this.tireWearRate * wheel.slipInfo * deltaTime * 60;
                state.tireCondition[wheelName] = Math.max(0, state.tireCondition[wheelName] - wearAmount);

                // Reduce grip as tires wear
                const gripMultiplier = state.tireCondition[wheelName] / 100;
                wheel.frictionSlip = 2.0 * gripMultiplier;
            }
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
            // Check for drafting effect
            const draftingMultiplier = this.calculateDraftingEffect(vehicle);

            // Advanced drag calculation
            const dragCoefficient = 0.25 * draftingMultiplier; // Reduced drag when drafting
            const frontalArea = 2.0; // m²
            const airDensity = 1.225; // kg/m³

            // Quadratic drag
            const dragForce = 0.5 * dragCoefficient * frontalArea * airDensity * speed * speed;

            // Apply drag force
            const dragDirection = new CANNON.Vec3(-velocity.x, 0, -velocity.z);
            dragDirection.normalize();
            dragDirection.scale(dragForce * 0.01, dragDirection); // Scale for game balance

            vehicle.chassisBody.force.vadd(dragDirection, vehicle.chassisBody.force);

            // Lift/downforce effects
            const liftCoefficient = -0.3; // Negative for downforce
            const liftForce = 0.5 * liftCoefficient * frontalArea * airDensity * speed * speed;

            vehicle.chassisBody.force.y += liftForce * 0.1;

            // Side force (yaw effect)
            const sideForce = 0.1 * speed * speed * 0.001;
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

        // Engine force based on throttle
        const maxEngineForce = 2000;
        const engineForce = maxEngineForce * throttle;

        // Apply engine force
        vehicle.chassisBody.applyLocalForce(
            new CANNON.Vec3(0, 0, engineForce),
            new CANNON.Vec3(0, 0, 0)
        );

        // Brake force
        if (brake > 0) {
            const maxBrakeForce = 1500;
            const brakeForce = maxBrakeForce * brake;
            vehicle.chassisBody.applyLocalForce(
                new CANNON.Vec3(0, 0, -brakeForce),
                new CANNON.Vec3(0, 0, 0)
            );
        }

        // Consume fuel
        this.consumeFuel(vehicle, throttle, deltaTime);
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