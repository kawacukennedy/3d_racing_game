import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AIController } from './aiController.js';
import { VehicleConfigManager, VEHICLE_TYPES } from '../gameplay/vehicleConfig.js';

export class SceneManager {
    constructor(scene, world, physicsManager, camera) {
        this.scene = scene;
        this.world = world;
        this.physicsManager = physicsManager;
        this.camera = camera;
        this.loader = new GLTFLoader();
        this.track = null;
        this.playerVehicle = null;
        this.playerVehicleBody = null;
        this.playerWheelMeshes = [];
        this.aiVehicles = [];
        this.aiControllers = [];
        this.vehicleConfigManager = new VehicleConfigManager();
        this.currentVehicleType = VEHICLE_TYPES.SPORTS_CAR;
    }

    init() {
        this.setupLighting();
        this.loadTrack();
        this.loadVehicle();
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 25);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
    }

    loadTrack() {
        // For now, create a simple ground plane as placeholder
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // TODO: Load actual track model
        // this.loader.load('assets/models/sample_track.glb', (gltf) => {
        //     this.track = gltf.scene;
        //     this.scene.add(this.track);
        // });
    }

    loadVehicle() {
        // Create player vehicle
        this.createPlayerVehicle();

        // Create AI vehicles
        this.createAIVehicles(3); // Create 3 AI opponents
    }

    createPlayerVehicle(vehicleType = null) {
        const config = this.vehicleConfigManager.getVehicleConfig(vehicleType || this.currentVehicleType);

        // Create physics vehicle with config
        this.physicsManager.createVehicle({
            mass: config.mass,
            geometry: config.geometry,
            friction: 0.3,
            restitution: 0.1
        });

        // Create player vehicle mesh
        const vehicleGeometry = new THREE.BoxGeometry(
            config.geometry.width,
            config.geometry.height,
            config.geometry.length
        );
        const vehicleMaterial = new THREE.MeshLambertMaterial({ color: config.color });
        this.playerVehicle = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
        this.playerVehicle.castShadow = true;
        this.scene.add(this.playerVehicle);

        // Create wheel meshes
        for (let i = 0; i < 4; i++) {
            const wheelGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
            const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
            const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheelMesh.castShadow = true;
            this.playerWheelMeshes.push(wheelMesh);
            this.scene.add(wheelMesh);
        }
    }

    changePlayerVehicle(vehicleType) {
        if (!this.vehicleConfigManager.isUnlocked(vehicleType)) {
            return false;
        }

        // Remove current vehicle
        if (this.playerVehicle) {
            this.scene.remove(this.playerVehicle);
        }
        this.playerWheelMeshes.forEach(mesh => {
            this.scene.remove(mesh);
        });

        // Clear physics
        this.physicsManager.vehicles.length = 0;

        // Create new vehicle
        this.currentVehicleType = vehicleType;
        this.createPlayerVehicle(vehicleType);

        return true;
    }

    createAIVehicles(count) {
        for (let i = 0; i < count; i++) {
            // Create AI vehicle in the shared physics world
            const aiVehiclePhysics = this.physicsManager.createVehicle();

            // Position AI vehicle
            const angle = (i / count) * Math.PI * 2;
            const radius = 25;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            aiVehiclePhysics.chassisBody.position.set(x, 2, z);

            // Create AI vehicle mesh
            const vehicleGeometry = new THREE.BoxGeometry(2, 1, 4);
            const vehicleMaterial = new THREE.MeshLambertMaterial({
                color: 0x00ff00 + (i * 0x001100) // Different green shades
            });
            const aiVehicle = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
            aiVehicle.castShadow = true;
            this.scene.add(aiVehicle);

            // Create AI wheel meshes
            const aiWheelMeshes = [];
            for (let j = 0; j < 4; j++) {
                const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
                const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
                const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
                wheelMesh.castShadow = true;
                aiWheelMeshes.push(wheelMesh);
                this.scene.add(wheelMesh);
            }

            // Create AI controller
            const aiController = new AIController();
            aiController.setVehicle(aiVehicle);
            aiController.setPhysicsVehicle(aiVehiclePhysics);
            aiController.setSkillLevel(0.6 + (i * 0.1)); // Varying skill levels

            this.aiVehicles.push({
                mesh: aiVehicle,
                physicsVehicle: aiVehiclePhysics,
                wheelMeshes: aiWheelMeshes,
                controller: aiController
            });
            this.aiControllers.push(aiController);
        }
    }

    update(deltaTime) {
        // Sync player vehicle mesh with physics body
        if (this.playerVehicle && this.playerVehicleBody) {
            this.playerVehicle.position.copy(this.playerVehicleBody.position);
            this.playerVehicle.quaternion.copy(this.playerVehicleBody.quaternion);
        }

        // Sync player wheel meshes with physics
        const playerVehicle = this.physicsManager.getVehicle(0);
        if (playerVehicle) {
            playerVehicle.wheelInfos.forEach((wheel, index) => {
                if (this.playerWheelMeshes[index]) {
                    this.playerWheelMeshes[index].position.copy(wheel.worldTransform.position);
                    this.playerWheelMeshes[index].quaternion.copy(wheel.worldTransform.quaternion);
                }
            });
        }

        // Update AI vehicles
        this.aiVehicles.forEach((aiVehicle) => {
            // Update AI controller
            aiVehicle.controller.update(deltaTime);

            // Sync mesh with physics (physics is updated centrally)
            if (aiVehicle.mesh && aiVehicle.physicsVehicle) {
                aiVehicle.mesh.position.copy(aiVehicle.physicsVehicle.chassisBody.position);
                aiVehicle.mesh.quaternion.copy(aiVehicle.physicsVehicle.chassisBody.quaternion);

                // Sync wheel meshes
                aiVehicle.physicsVehicle.wheelInfos.forEach((wheel, index) => {
                    if (aiVehicle.wheelMeshes[index]) {
                        aiVehicle.wheelMeshes[index].position.copy(wheel.worldTransform.position);
                        aiVehicle.wheelMeshes[index].quaternion.copy(wheel.worldTransform.quaternion);
                    }
                });
            }
        });
    }

    // Settings methods
    setShadows(enabled) {
        const directionalLight = this.scene.children.find(child => child.type === 'DirectionalLight');
        if (directionalLight) {
            directionalLight.castShadow = enabled;
            // Update shadow map if needed
            if (enabled && !directionalLight.shadow.map) {
                directionalLight.shadow.mapSize.width = 2048;
                directionalLight.shadow.mapSize.height = 2048;
                directionalLight.shadow.camera.near = 0.5;
                directionalLight.shadow.camera.far = 500;
                directionalLight.shadow.camera.left = -100;
                directionalLight.shadow.camera.right = 100;
                directionalLight.shadow.camera.top = 100;
                directionalLight.shadow.camera.bottom = -100;
            }
        }
    }

    setParticles(enabled) {
        // Toggle particle systems if any
        this.particlesEnabled = enabled;
        // Implementation would depend on particle systems in the scene
    }

    setRenderDistance(distance) {
        // Adjust camera far plane or LOD
        if (this.camera) {
            this.camera.far = distance;
            this.camera.updateProjectionMatrix();
        }
    }
}