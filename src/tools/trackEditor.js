import * as THREE from 'three';
import { ProceduralTrackGenerator } from './proceduralTrackGenerator.js';

export class TrackEditor {
    constructor(scene, physicsWorld) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.isEditing = false;
        this.trackPoints = [];
        this.trackMeshes = [];
        this.controlPoints = [];
        this.selectedPoint = null;
        this.trackWidth = 8;
        this.trackLength = 0;
        this.proceduralGenerator = new ProceduralTrackGenerator();

        this.initializeEditor();
    }

    initializeEditor() {
        // Create editor UI elements
        this.createEditorUI();

        // Set up mouse controls for track editing
        this.setupMouseControls();
    }

    createEditorUI() {
        // Create editor panel
        this.editorPanel = document.createElement('div');
        this.editorPanel.id = 'trackEditor';
        this.editorPanel.innerHTML = `
            <h3>Track Editor</h3>
            <div class="editor-controls">
                <button id="addPoint">Add Point</button>
                <button id="removePoint">Remove Point</button>
                <button id="clearTrack">Clear Track</button>
                <button id="generateProcedural">Generate Track</button>
                <button id="saveTrack">Save Track</button>
                <button id="loadTrack">Load Track</button>
                <button id="testTrack">Test Track</button>
                <button id="exitEditor">Exit Editor</button>
            </div>
            <div class="procedural-controls" style="margin: 10px 0;">
                <label>Difficulty: <input type="range" id="difficultySlider" min="0" max="1" step="0.1" value="0.5"></label>
                <span id="difficultyValue">0.5</span><br>
                <label>Seed: <input type="number" id="seedInput" value="${this.proceduralGenerator.seed}"></label>
            </div>
            <div class="track-info">
                <span>Points: <span id="pointCount">0</span></span>
                <span>Length: <span id="trackLength">0</span>m</span>
            </div>
        `;
        this.editorPanel.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            padding: 15px;
            border-radius: 10px;
            color: white;
            display: none;
            z-index: 1000;
        `;

        document.body.appendChild(this.editorPanel);
        this.setupEditorControls();
    }

    setupEditorControls() {
        document.getElementById('addPoint').addEventListener('click', () => this.addTrackPoint());
        document.getElementById('removePoint').addEventListener('click', () => this.removeSelectedPoint());
        document.getElementById('clearTrack').addEventListener('click', () => this.clearTrack());
        document.getElementById('generateProcedural').addEventListener('click', () => this.generateProceduralTrack());
        document.getElementById('saveTrack').addEventListener('click', () => this.saveTrack());
        document.getElementById('loadTrack').addEventListener('click', () => this.loadTrack());
        document.getElementById('testTrack').addEventListener('click', () => this.testTrack());
        document.getElementById('exitEditor').addEventListener('click', () => this.exitEditor());

        // Procedural generation controls
        const difficultySlider = document.getElementById('difficultySlider');
        const difficultyValue = document.getElementById('difficultyValue');
        const seedInput = document.getElementById('seedInput');

        difficultySlider.addEventListener('input', (e) => {
            difficultyValue.textContent = e.target.value;
            this.proceduralGenerator.setDifficulty(parseFloat(e.target.value));
        });

        seedInput.addEventListener('change', (e) => {
            this.proceduralGenerator.setSeed(parseInt(e.target.value));
        });
    }

    setupMouseControls() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Mouse move for hovering
        document.addEventListener('mousemove', (event) => {
            if (!this.isEditing) return;

            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.updateHoverHighlight();
        });

        // Click for selecting/adding points
        document.addEventListener('click', (event) => {
            if (!this.isEditing) return;

            if (event.target.closest('#trackEditor')) return; // Don't place points on UI

            this.handleMouseClick();
        });
    }

    enterEditMode() {
        this.isEditing = true;
        this.editorPanel.style.display = 'block';
        this.showExistingTrack();
        console.log('Entered track editor mode');
    }

    exitEditor() {
        this.isEditing = false;
        this.editorPanel.style.display = 'none';
        this.hideControlPoints();
        console.log('Exited track editor mode');
    }

    addTrackPoint(position = null) {
        if (!position) {
            // Add point at camera target or default position
            position = new THREE.Vector3(0, 0, 0);
        }

        const point = {
            position: position.clone(),
            id: Date.now(),
            index: this.trackPoints.length
        };

        this.trackPoints.push(point);
        this.createControlPoint(point);
        this.updateTrackVisualization();
        this.updateTrackInfo();

        console.log(`Added track point at (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
    }

    createControlPoint(point) {
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7 });
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.copy(point.position);
        mesh.userData.trackPoint = point;

        this.scene.add(mesh);
        this.controlPoints.push(mesh);
    }

    removeSelectedPoint() {
        if (!this.selectedPoint) return;

        const index = this.trackPoints.findIndex(p => p.id === this.selectedPoint.userData.trackPoint.id);
        if (index !== -1) {
            this.trackPoints.splice(index, 1);
            this.scene.remove(this.selectedPoint);
            this.controlPoints.splice(this.controlPoints.indexOf(this.selectedPoint), 1);
            this.selectedPoint = null;
            this.updateTrackVisualization();
            this.updateTrackInfo();
        }
    }

    generateProceduralTrack() {
        // Clear existing track
        this.clearTrack();

        // Generate new procedural track
        const trackData = this.proceduralGenerator.generateTrack(800, 16); // 800 units, 16 segments

        // Convert procedural segments to track points
        this.trackPoints = [];
        trackData.segments.forEach((segment, index) => {
            // Add start point
            if (index === 0) {
                this.trackPoints.push({
                    position: new THREE.Vector3(segment.startPos.x, segment.startPos.y, segment.startPos.z),
                    id: index * 2,
                    index: index * 2
                });
            }

            // Add end point
            this.trackPoints.push({
                position: new THREE.Vector3(segment.endPos.x, segment.endPos.y, segment.endPos.z),
                id: index * 2 + 1,
                index: index * 2 + 1
            });
        });

        // Create control points and visualize track
        this.trackPoints.forEach(point => {
            this.createControlPoint(point);
        });

        this.updateTrackVisualization();
        this.updateTrackInfo();

        console.log('Procedural track generated:', this.proceduralGenerator.getTrackStats());
    }

    clearTrack() {
        // Remove all track meshes
        this.trackMeshes.forEach(mesh => this.scene.remove(mesh));
        this.trackMeshes = [];

        // Remove control points
        this.controlPoints.forEach(point => this.scene.remove(point));
        this.controlPoints = [];

        this.trackPoints = [];
        this.selectedPoint = null;
        this.updateTrackInfo();
    }

    updateTrackVisualization() {
        // Clear existing track meshes
        this.trackMeshes.forEach(mesh => this.scene.remove(mesh));
        this.trackMeshes = [];

        if (this.trackPoints.length < 2) return;

        // Create track surface using extruded geometry
        const shape = new THREE.Shape();
        shape.moveTo(-this.trackWidth / 2, 0);
        shape.lineTo(this.trackWidth / 2, 0);
        shape.lineTo(this.trackWidth / 2, 0.1);
        shape.lineTo(-this.trackWidth / 2, 0.1);
        shape.lineTo(-this.trackWidth / 2, 0);

        // Create path from track points
        const path = new THREE.CatmullRomCurve3(
            this.trackPoints.map(p => p.position),
            false,
            'catmullrom',
            0.5
        );

        const extrudeSettings = {
            steps: 200,
            bevelEnabled: false,
            extrudePath: path
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const material = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const trackMesh = new THREE.Mesh(geometry, material);

        this.scene.add(trackMesh);
        this.trackMeshes.push(trackMesh);

        // Calculate track length
        this.trackLength = path.getLength();
    }

    updateHoverHighlight() {
        // Reset all control points
        this.controlPoints.forEach(point => {
            point.material.color.setHex(0xff0000);
            point.material.opacity = 0.7;
        });

        // Highlight hovered point
        this.raycaster.setFromCamera(this.mouse, this.scene.children.find(c => c.isCamera));
        const intersects = this.raycaster.intersectObjects(this.controlPoints);

        if (intersects.length > 0) {
            const hoveredPoint = intersects[0].object;
            hoveredPoint.material.color.setHex(0x00ff00);
            hoveredPoint.material.opacity = 1.0;
        }
    }

    handleMouseClick() {
        this.raycaster.setFromCamera(this.mouse, this.scene.children.find(c => c.isCamera));

        // Check for ground intersection
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectionPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(groundPlane, intersectionPoint);

        if (intersectionPoint) {
            // Check if clicking on existing control point
            const controlIntersects = this.raycaster.intersectObjects(this.controlPoints);
            if (controlIntersects.length > 0) {
                this.selectPoint(controlIntersects[0].object);
            } else {
                // Add new point
                this.addTrackPoint(intersectionPoint);
            }
        }
    }

    selectPoint(pointMesh) {
        // Deselect previous
        if (this.selectedPoint) {
            this.selectedPoint.material.color.setHex(0xff0000);
        }

        this.selectedPoint = pointMesh;
        this.selectedPoint.material.color.setHex(0xffff00);
        console.log('Selected track point');
    }

    hideControlPoints() {
        this.controlPoints.forEach(point => {
            point.visible = false;
        });
    }

    showExistingTrack() {
        this.controlPoints.forEach(point => {
            point.visible = true;
        });
        this.updateTrackVisualization();
    }

    updateTrackInfo() {
        document.getElementById('pointCount').textContent = this.trackPoints.length;
        document.getElementById('trackLength').textContent = this.trackLength.toFixed(1);
    }

    saveTrack() {
        const trackData = {
            points: this.trackPoints.map(p => ({
                x: p.position.x,
                y: p.position.y,
                z: p.position.z
            })),
            width: this.trackWidth,
            length: this.trackLength,
            timestamp: Date.now()
        };

        localStorage.setItem('custom_track', JSON.stringify(trackData));
        console.log('Track saved!');
    }

    loadTrack() {
        const savedData = localStorage.getItem('custom_track');
        if (savedData) {
            const trackData = JSON.parse(savedData);
            this.clearTrack();

            trackData.points.forEach(point => {
                this.addTrackPoint(new THREE.Vector3(point.x, point.y, point.z));
            });

            this.trackWidth = trackData.width || this.trackWidth;
            console.log('Track loaded!');
        }
    }

    testTrack() {
        if (this.trackPoints.length < 2) {
            alert('Track needs at least 2 points to test!');
            return;
        }

        // Switch to test mode (would integrate with game mode switching)
        console.log('Testing track...');
        this.exitEditor();
        // Here you would trigger a race on the custom track
    }

    getTrackData() {
        return {
            points: this.trackPoints.map(p => p.position),
            width: this.trackWidth,
            length: this.trackLength
        };
    }

    isActive() {
        return this.isEditing;
    }
}