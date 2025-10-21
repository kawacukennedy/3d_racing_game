import * as CANNON from 'cannon-es';

export class PhysicsManager {
    constructor() {
        this.world = new CANNON.World();
        this.vehicles = [];
        this.vehicle = null;
        this.groundBody = null;
        this.onCollisionCallback = null;
    }

    init() {
        // Set up physics world
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.defaultContactMaterial.friction = 0.4;
        this.world.defaultContactMaterial.restitution = 0.3;

        // Create contact material for vehicle-ground interaction
        const vehicleGroundContact = new CANNON.ContactMaterial(
            this.groundBody.material,
            new CANNON.Material({ friction: 0.3, restitution: 0.1 }),
            { friction: 0.9, restitution: 0.1 }
        );
        this.world.addContactMaterial(vehicleGroundContact);

        // Create ground
        const groundShape = new CANNON.Plane();
        const groundMaterial = new CANNON.Material({ friction: 0.8, restitution: 0.1 });
        this.groundBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: groundMaterial });
        this.groundBody.addShape(groundShape);
        this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(this.groundBody);

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
            vehicle.wheelInfos.forEach((wheel) => {
                vehicle.updateWheelTransform(wheel.index);
                wheel.wheelBody.position.copy(wheel.worldTransform.position);
                wheel.wheelBody.quaternion.copy(wheel.worldTransform.quaternion);
            });

            // Apply aerodynamic forces
            this.applyAerodynamicForces();

            // Update tire grip based on conditions
            this.updateTireConditions();

            // Check for collisions
            this.checkCollisions();
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