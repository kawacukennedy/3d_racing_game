import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class TrackElementsManager {
    constructor(scene, physicsWorld) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.elements = new Map(); // element id -> element data
        this.activeElements = new Set();

        // Element types and their properties
        this.elementTypes = {
            boost_pad: {
                geometry: new THREE.CylinderGeometry(2, 2, 0.1, 8),
                material: new THREE.MeshLambertMaterial({ color: 0x00ff00, emissive: 0x002200 }),
                physics: { boostForce: 5000, duration: 0.5 },
                visual: { color: 0x00ff00, emissive: 0x002200 }
            },
            speed_boost: {
                geometry: new THREE.CylinderGeometry(1.5, 1.5, 0.05, 6),
                material: new THREE.MeshLambertMaterial({ color: 0xffaa00, emissive: 0x442200 }),
                physics: { boostForce: 3000, duration: 0.3 },
                visual: { color: 0xffaa00, emissive: 0x442200 }
            },
            hazard: {
                geometry: new THREE.CylinderGeometry(1, 1, 0.1, 8),
                material: new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0x220000 }),
                physics: { slowForce: 2000, duration: 1.0 },
                visual: { color: 0xff0000, emissive: 0x220000 }
            },
            oil_spill: {
                geometry: new THREE.CircleGeometry(3, 16),
                material: new THREE.MeshLambertMaterial({ color: 0x000000, transparent: true, opacity: 0.7 }),
                physics: { frictionMultiplier: 0.3, duration: 5.0 },
                visual: { color: 0x000000, transparent: true, opacity: 0.7 }
            },
            jump_ramp: {
                geometry: new THREE.BoxGeometry(4, 1, 2),
                material: new THREE.MeshLambertMaterial({ color: 0x8B4513 }),
                physics: { jumpForce: 10000, duration: 0.2 },
                visual: { color: 0x8B4513 }
            }
        };
    }

    // Element Creation
    createElement(type, position, rotation = new THREE.Euler(), properties = {}) {
        const elementType = this.elementTypes[type];
        if (!elementType) {
            console.error(`Unknown element type: ${type}`);
            return null;
        }

        // Create visual mesh
        const mesh = new THREE.Mesh(elementType.geometry, elementType.material.clone());
        mesh.position.copy(position);
        mesh.rotation.copy(rotation);
        mesh.userData = { type, elementId: this.generateElementId() };

        // Create physics body
        const physicsBody = this.createPhysicsBody(type, position, rotation, properties);

        const element = {
            id: mesh.userData.elementId,
            type,
            mesh,
            physicsBody,
            position: position.clone(),
            rotation: rotation.clone(),
            properties: { ...elementType.physics, ...properties },
            active: true,
            lastActivation: 0,
            activationCount: 0
        };

        this.elements.set(element.id, element);
        this.scene.add(mesh);

        if (physicsBody) {
            this.physicsWorld.addBody(physicsBody);
        }

        return element;
    }

    createPhysicsBody(type, position, rotation, _properties) {
        let shape, body;

        switch (type) {
            case 'boost_pad':
            case 'speed_boost':
            case 'hazard':
                shape = new CANNON.Cylinder(2, 2, 0.1, 8);
                body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
                break;

            case 'oil_spill':
                shape = new CANNON.Cylinder(3, 3, 0.05, 16);
                body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
                break;

            case 'jump_ramp':
                shape = new CANNON.Box(new CANNON.Vec3(2, 0.5, 1));
                body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
                break;

            default:
                return null;
        }

        body.addShape(shape);
        body.position.set(position.x, position.y, position.z);
        body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);

        return body;
    }

    // Element Management
    removeElement(elementId) {
        const element = this.elements.get(elementId);
        if (!element) return;

        // Remove from scene
        this.scene.remove(element.mesh);

        // Remove from physics world
        if (element.physicsBody) {
            this.physicsWorld.removeBody(element.physicsBody);
        }

        this.elements.delete(elementId);
        this.activeElements.delete(elementId);
    }

    activateElement(elementId, vehicle) {
        const element = this.elements.get(elementId);
        if (!element || !element.active) return;

        const now = Date.now();
        const timeSinceLastActivation = now - element.lastActivation;

        // Prevent spam activation
        if (timeSinceLastActivation < 1000) return; // 1 second cooldown

        element.lastActivation = now;
        element.activationCount++;

        // Apply element effect
        this.applyElementEffect(element, vehicle);

        // Visual feedback
        this.showActivationEffect(element);

        // Deactivate temporarily if needed
        if (element.properties.cooldown) {
            element.active = false;
            setTimeout(() => {
                element.active = true;
            }, element.properties.cooldown);
        }
    }

    applyElementEffect(element, vehicle) {
        if (!vehicle || !vehicle.chassisBody) return;

        switch (element.type) {
            case 'boost_pad':
            case 'speed_boost': {
                // Apply forward boost
                const boostDirection = new CANNON.Vec3(0, 0, element.properties.boostForce);
                boostDirection.applyQuaternion(vehicle.chassisBody.quaternion);
                vehicle.chassisBody.applyImpulse(boostDirection, vehicle.chassisBody.position);
                console.log('Speed boost activated!');
                break;
            }

            case 'hazard': {
                // Apply braking force
                const brakeDirection = vehicle.chassisBody.velocity.clone();
                brakeDirection.normalize();
                brakeDirection.scale(-element.properties.slowForce);
                vehicle.chassisBody.applyImpulse(brakeDirection, vehicle.chassisBody.position);
                console.log('Hazard hit - slowing down!');
                break;
            }

            case 'oil_spill':
                // Reduce friction temporarily
                // This would need to be handled by the physics manager
                console.log('Oil spill - reduced traction!');
                break;

            case 'jump_ramp': {
                // Apply upward and forward force
                const jumpForce = new CANNON.Vec3(0, element.properties.jumpForce, element.properties.boostForce * 0.5);
                jumpForce.applyQuaternion(vehicle.chassisBody.quaternion);
                vehicle.chassisBody.applyImpulse(jumpForce, vehicle.chassisBody.position);
                console.log('Jump ramp activated!');
                break;
            }
        }
    }

    showActivationEffect(element) {
        // Create temporary visual effect
        const effectGeometry = new THREE.RingGeometry(0.5, 2, 16);
        const effectMaterial = new THREE.MeshBasicMaterial({
            color: element.type.includes('boost') ? 0x00ff00 : 0xff0000,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        const effect = new THREE.Mesh(effectGeometry, effectMaterial);
        effect.position.copy(element.position);
        effect.position.y += 0.1;
        effect.rotation.x = -Math.PI / 2;

        this.scene.add(effect);

        // Animate and remove
        let opacity = 0.8;
        const animate = () => {
            opacity -= 0.05;
            effect.material.opacity = opacity;

            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(effect);
            }
        };
        animate();
    }

    // Collision Detection
    checkCollisions(vehicle) {
        if (!vehicle || !vehicle.chassisBody) return;

        this.elements.forEach(element => {
            if (!element.active || !element.physicsBody) return;

            // Simple distance check (in a real implementation, you'd use proper collision detection)
            const distance = vehicle.chassisBody.position.distanceTo(element.physicsBody.position);

            if (distance < 3) { // Activation distance
                this.activateElement(element.id, vehicle);
            }
        });
    }

    // Track Generation Helpers
    generateRandomElements(trackLength = 1000, elementCount = 10) {
        const elements = [];

        for (let i = 0; i < elementCount; i++) {
            const position = Math.random() * trackLength;
            const side = Math.random() > 0.5 ? 1 : -1;
            const lateralOffset = (Math.random() * 4 + 2) * side; // 2-6 units from center

            // Random element type
            const types = Object.keys(this.elementTypes);
            const randomType = types[Math.floor(Math.random() * types.length)];

            elements.push({
                type: randomType,
                position: new THREE.Vector3(position, 0, lateralOffset),
                rotation: new THREE.Euler(0, 0, 0)
            });
        }

        return elements;
    }

    placeElementsOnTrack(trackData, elements) {
        elements.forEach(elementData => {
            this.createElement(
                elementData.type,
                elementData.position,
                elementData.rotation,
                elementData.properties || {}
            );
        });
    }

    // Utility Methods
    generateElementId() {
        return `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getElementById(elementId) {
        return this.elements.get(elementId);
    }

    getElementsByType(type) {
        return Array.from(this.elements.values()).filter(element => element.type === type);
    }

    getAllElements() {
        return Array.from(this.elements.values());
    }

    clearAllElements() {
        this.elements.forEach(element => {
            this.removeElement(element.id);
        });
    }

    // Update loop
    update(deltaTime) {
        // Update any animated elements
        this.elements.forEach(element => {
            if (element.type === 'oil_spill') {
                // Animate oil spill (subtle movement)
                element.mesh.rotation.z += deltaTime * 0.1;
            }
        });
    }
}