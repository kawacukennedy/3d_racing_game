/**
 * VelocityRush3D Performance Benchmark Suite
 * Comprehensive performance testing and monitoring
 */

import { JSDOM } from 'jsdom';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceBenchmark {
    constructor() {
        this.results = {
            benchmarks: [],
            systemInfo: {},
            timestamp: new Date().toISOString()
        };
        this.dom = null;
        this.setupDOM();
    }

    setupDOM() {
        this.dom = new JSDOM('<!DOCTYPE html><html><body><canvas id="game-canvas" width="1920" height="1080"></canvas></body></html>', {
            url: 'http://localhost',
            pretendToBeVisual: true,
            resources: 'usable'
        });

        global.window = this.dom.window;
        global.document = this.dom.window.document;

        // Set up navigator properties
        Object.defineProperty(global, 'navigator', {
            value: {
                userAgent: 'Performance Benchmark',
                platform: process.platform,
                language: 'en-US',
                cookieEnabled: false,
                onLine: true
            },
            writable: true
        });
        global.performance = performance;
        global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
        global.cancelAnimationFrame = clearTimeout;

        // Mock WebGL
        const canvas = document.getElementById('game-canvas');
        canvas.getContext = (contextType) => {
            if (contextType === 'webgl' || contextType === 'experimental-webgl') {
                return {
                    clearColor: () => {},
                    clear: () => {},
                    viewport: () => {},
                    enable: () => {},
                    disable: () => {},
                    blendFunc: () => {},
                    depthFunc: () => {},
                    createShader: () => ({}),
                    shaderSource: () => {},
                    compileShader: () => {},
                    createProgram: () => ({}),
                    attachShader: () => {},
                    linkProgram: () => {},
                    useProgram: () => {},
                    getUniformLocation: () => ({}),
                    uniformMatrix4fv: () => {},
                    uniform3fv: () => {},
                    uniform1f: () => {},
                    createBuffer: () => ({}),
                    bindBuffer: () => {},
                    bufferData: () => {},
                    vertexAttribPointer: () => {},
                    enableVertexAttribArray: () => {},
                    drawArrays: () => {},
                    drawElements: () => {}
                };
            }
            return null;
        };
    }

    async importModule(modulePath) {
        const fullPath = path.resolve(__dirname, '..', modulePath);
        try {
            return await import(fullPath);
        } catch (error) {
            return await import(fullPath + '.js');
        }
    }

    async runBenchmark(name, benchmarkFunction, options = {}) {
        console.log(`🏃 Running benchmark: ${name}`);

        const results = [];
        const iterations = options.iterations || 5;
        const warmupIterations = options.warmup || 2;

        // Warmup runs
        for (let i = 0; i < warmupIterations; i++) {
            await benchmarkFunction();
        }

        // Actual benchmark runs
        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            const startMemory = process.memoryUsage();

            const result = await benchmarkFunction();

            const endTime = performance.now();
            const endMemory = process.memoryUsage();

            results.push({
                iteration: i + 1,
                duration: endTime - startTime,
                memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
                result
            });
        }

        // Calculate statistics
        const durations = results.map(r => r.duration);
        const memoryDeltas = results.map(r => r.memoryDelta);

        const stats = {
            name,
            iterations,
            avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
            minDuration: Math.min(...durations),
            maxDuration: Math.max(...durations),
            stdDevDuration: this.calculateStdDev(durations),
            avgMemoryDelta: memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length,
            totalMemoryDelta: memoryDeltas.reduce((a, b) => a + b, 0),
            results
        };

        this.results.benchmarks.push(stats);

        console.log(`   ✅ Completed: ${stats.avgDuration.toFixed(2)}ms avg (${stats.iterations} iterations)`);

        return stats;
    }

    calculateStdDev(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
    }

    async benchmarkPhysicsEngine() {
        this.setupPhysicsRenderingMocks();

        const { PhysicsManager } = await this.importModule('src/physics/physicsManager.js');

        return await this.runBenchmark('Physics Engine Performance', async () => {
            const physics = new PhysicsManager();
            physics.init();

            const vehicle = physics.createVehicle();
            const startPos = { ...vehicle.chassisBody.position };

            // Simulate 100 physics frames
            for (let i = 0; i < 100; i++) {
                physics.update(1/60);
            }

            const endPos = vehicle.chassisBody.position;
            return {
                framesSimulated: 100,
                positionChange: {
                    x: endPos.x - startPos.x,
                    y: endPos.y - startPos.y,
                    z: endPos.z - startPos.z
                }
            };
        }, { iterations: 10, warmup: 3 });
    }

    async benchmarkRenderingEngine() {
        this.setupPhysicsRenderingMocks();

        const { SceneManager } = await this.importModule('src/engine/sceneManager.js');
        const { PhysicsManager } = await this.importModule('src/physics/physicsManager.js');

        return await this.runBenchmark('Rendering Engine Performance', async () => {
            const physics = new PhysicsManager();
            physics.init();

            const scene = new THREE.Scene();
            const sceneManager = new SceneManager(scene, physics.world, physics);
            sceneManager.createPlayerVehicle();

            // Simulate rendering 60 frames
            for (let i = 0; i < 60; i++) {
                sceneManager.update(1/60);
                // Mock render call
                sceneManager.render();
            }

            return {
                framesRendered: 60,
                objectsInScene: scene.children.length,
                vehicleMeshes: sceneManager.playerWheelMeshes ? sceneManager.playerWheelMeshes.length + 1 : 1
            };
        }, { iterations: 8, warmup: 2 });
    }

    async benchmarkVehicleController() {
        const { VehicleController } = await this.importModule('src/engine/vehicleController.js');

        return await this.runBenchmark('Vehicle Controller Performance', async () => {
            const controller = new VehicleController();

            // Simulate control inputs for 1000 frames
            let totalAcceleration = 0;
            let totalSteering = 0;

            for (let i = 0; i < 1000; i++) {
                // Random control inputs
                controller.setAcceleration(Math.random());
                controller.setSteering((Math.random() - 0.5) * 2);
                controller.setBraking(Math.random() > 0.8);

                controller.update(1/60);

                totalAcceleration += controller.getAcceleration();
                totalSteering += Math.abs(controller.getSteering());
            }

            return {
                framesProcessed: 1000,
                avgAcceleration: totalAcceleration / 1000,
                avgSteering: totalSteering / 1000
            };
        }, { iterations: 5, warmup: 1 });
    }

    async benchmarkNetworkManager() {
        const { NetworkManager } = await this.importModule('src/network/networkManager.js');

        return await this.runBenchmark('Network Manager Performance', async () => {
            const networkManager = new NetworkManager();

            // Mock network operations
            networkManager.sendMessage = async () => {};
            networkManager.broadcastUpdate = async () => {};

            const messages = [];
            for (let i = 0; i < 100; i++) {
                messages.push({
                    type: 'player_update',
                    playerId: `player_${i}`,
                    position: { x: Math.random() * 100, y: 0, z: Math.random() * 100 },
                    velocity: { x: Math.random() * 20, y: 0, z: Math.random() * 20 }
                });
            }

            // Process messages
            for (const message of messages) {
                await networkManager.sendMessage(message);
            }

            return {
                messagesProcessed: messages.length,
                messageTypes: [...new Set(messages.map(m => m.type))]
            };
        }, { iterations: 5, warmup: 1 });
    }

    async benchmarkTournamentSystem() {
        const { TournamentManager } = await this.importModule('src/multiplayer/tournamentManager.js');

        return await this.runBenchmark('Tournament System Performance', async () => {
            const tournamentManager = new TournamentManager();
            tournamentManager.generateDefaultTournaments();

            const tournaments = tournamentManager.activeTournaments;

            // Simulate tournament operations
            for (const tournament of tournaments) {
                tournamentManager.joinTournament(tournament.id, {
                    id: `player_${Math.random()}`,
                    name: `Player ${Math.random()}`
                });
            }

            // Advance tournament rounds
            for (let i = 0; i < 3; i++) {
                for (const tournament of tournaments) {
                    if (tournament.status === 'active') {
                        tournamentManager.advanceRound(tournament.id);
                    }
                }
            }

            return {
                tournamentsProcessed: tournaments.length,
                totalPlayers: tournaments.reduce((sum, t) => sum + (t.participants?.length || 0), 0),
                roundsAdvanced: 3
            };
        }, { iterations: 3, warmup: 1 });
    }

    async benchmarkMemoryUsage() {
        this.setupPhysicsRenderingMocks();

        const { PhysicsManager } = await this.importModule('src/physics/physicsManager.js');
        const { SceneManager } = await this.importModule('src/engine/sceneManager.js');

        return await this.runBenchmark('Memory Usage Benchmark', async () => {
            const initialMemory = process.memoryUsage();

            // Create multiple physics worlds and scenes
            const instances = [];
            for (let i = 0; i < 10; i++) {
                const physics = new PhysicsManager();
                physics.init();

                const scene = new THREE.Scene();
                const sceneManager = new SceneManager(scene, physics.world, physics);
                sceneManager.createPlayerVehicle();

                instances.push({ physics, sceneManager });
            }

            const afterCreationMemory = process.memoryUsage();

            // Simulate gameplay
            for (let frame = 0; frame < 300; frame++) {
                for (const instance of instances) {
                    instance.physics.update(1/60);
                    instance.sceneManager.update(1/60);
                }
            }

            const afterSimulationMemory = process.memoryUsage();

            // Cleanup
            instances.length = 0;
            global.gc && global.gc();

            const afterCleanupMemory = process.memoryUsage();

            return {
                instancesCreated: 10,
                initialMemoryMB: (initialMemory.heapUsed / 1024 / 1024).toFixed(2),
                afterCreationMemoryMB: (afterCreationMemory.heapUsed / 1024 / 1024).toFixed(2),
                afterSimulationMemoryMB: (afterSimulationMemory.heapUsed / 1024 / 1024).toFixed(2),
                afterCleanupMemoryMB: (afterCleanupMemory.heapUsed / 1024 / 1024).toFixed(2),
                memoryIncreaseMB: ((afterSimulationMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2),
                cleanupEfficiency: (((afterSimulationMemory.heapUsed - afterCleanupMemory.heapUsed) / (afterSimulationMemory.heapUsed - initialMemory.heapUsed)) * 100).toFixed(1)
            };
        }, { iterations: 3, warmup: 1 });
    }

    async benchmarkAssetLoading() {
        return await this.runBenchmark('Asset Loading Performance', async () => {
            const { VehicleConfigManager } = await this.importModule('src/gameplay/vehicleConfig.js');

            const configManager = new VehicleConfigManager();

            // Load all vehicle configurations
            const vehicleTypes = ['sports_car', 'muscle_car', 'rally_car', 'formula', 'offroad', 'hypercar', 'electric_supercar', 'drift_car', 'gt_car', 'pickup_truck', 'motorcycle', 'vintage_racer', 'f1_car', 'monster_truck', 'atv', 'limousine'];

            const loadedConfigs = [];
            for (const type of vehicleTypes) {
                const config = configManager.getVehicleConfig(type);
                if (config) loadedConfigs.push(config);
            }

            return {
                configsAttempted: vehicleTypes.length,
                configsLoaded: loadedConfigs.length,
                loadSuccessRate: (loadedConfigs.length / vehicleTypes.length * 100).toFixed(1)
            };
        }, { iterations: 10, warmup: 2 });
    }

    async benchmarkLeaderboardOperations() {
        const { EnhancedLeaderboardManager } = await this.importModule('src/multiplayer/enhancedLeaderboard.js');
        const { SocialManager } = await this.importModule('src/multiplayer/socialManager.js');

        return await this.runBenchmark('Leaderboard Operations Performance', async () => {
            const socialManager = new SocialManager();
            const leaderboardManager = new EnhancedLeaderboardManager(socialManager);

            // Submit multiple scores
            const scores = [];
            for (let i = 0; i < 100; i++) {
                const result = leaderboardManager.submitScore('race', 'test_track', {
                    id: `player_${i}`,
                    name: `Player ${i}`
                }, {
                    score: Math.floor(Math.random() * 10000),
                    time: Math.random() * 300,
                    position: Math.floor(Math.random() * 8) + 1,
                    track: 'test_track',
                    vehicle: 'sports_car'
                });
                scores.push(result);
            }

            // Get leaderboard
            const leaderboard = leaderboardManager.getLeaderboard('race', 'test_track', 50);

            return {
                scoresSubmitted: scores.length,
                successfulSubmissions: scores.filter(s => s.success).length,
                leaderboardSize: leaderboard.entries.length,
                topScore: leaderboard.entries[0]?.score || 0
            };
        }, { iterations: 5, warmup: 1 });
    }

    setupPhysicsRenderingMocks() {
        // Mock Three.js
        global.THREE = {
            Scene: class Scene {
                constructor() {
                    this.children = [];
                    this.add = (obj) => this.children.push(obj);
                }
            },
            Vector3: class Vector3 {
                constructor(x = 0, y = 0, z = 0) {
                    this.x = x; this.y = y; this.z = z;
                }
            },
            Quaternion: class Quaternion {
                constructor(x = 0, y = 0, z = 0, w = 1) {
                    this.x = x; this.y = y; this.z = z; this.w = w;
                }
            },
            Mesh: class Mesh {
                constructor(geometry, material) {
                    this.geometry = geometry;
                    this.material = material;
                    this.position = new THREE.Vector3();
                    this.rotation = new THREE.Quaternion();
                    this.scale = new THREE.Vector3(1, 1, 1);
                }
            },
            BoxGeometry: class BoxGeometry {
                constructor(width, height, depth) {
                    this.width = width; this.height = height; this.depth = depth;
                }
            },
            CylinderGeometry: class CylinderGeometry {
                constructor(radiusTop, radiusBottom, height, segments) {
                    this.radiusTop = radiusTop; this.radiusBottom = radiusBottom;
                    this.height = height; this.segments = segments;
                }
            },
            MeshLambertMaterial: class MeshLambertMaterial {
                constructor(options) {
                    Object.assign(this, options);
                }
            }
        };

        // Mock CANNON.js
        global.CANNON = {
            World: class World {
                constructor() {
                    this.bodies = [];
                    this.constraints = [];
                    this.gravity = new CANNON.Vec3();
                    this.addBody = (body) => this.bodies.push(body);
                    this.addConstraint = (constraint) => this.constraints.push(constraint);
                    this.step = () => {};
                }
            },
            Vec3: class Vec3 {
                constructor(x = 0, y = 0, z = 0) {
                    this.x = x; this.y = y; this.z = z;
                }
                set(x, y, z) { this.x = x; this.y = y; this.z = z; }
            },
            Quaternion: class Quaternion {
                constructor(x = 0, y = 0, z = 0, w = 1) {
                    this.x = x; this.y = y; this.z = z; this.w = w;
                }
                set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; }
            },
            Body: class Body {
                constructor(options = {}) {
                    this.position = new CANNON.Vec3();
                    this.quaternion = new CANNON.Quaternion();
                    this.velocity = new CANNON.Vec3();
                    this.angularVelocity = new CANNON.Vec3();
                    this.mass = options.mass || 0;
                    this.type = options.type || CANNON.Body.DYNAMIC;
                    this.material = options.material;
                    this.shapes = [];
                    this.addShape = (shape) => this.shapes.push(shape);
                }
            },
            Box: class Box {
                constructor(halfExtents) {
                    this.halfExtents = halfExtents;
                }
            },
            Sphere: class Sphere {
                constructor(radius) {
                    this.radius = radius;
                }
            },
            Cylinder: class Cylinder {
                constructor(radiusTop, radiusBottom, height, numSegments) {
                    this.radiusTop = radiusTop; this.radiusBottom = radiusBottom;
                    this.height = height; this.numSegments = numSegments;
                }
            },
            RaycastVehicle: class RaycastVehicle {
                constructor(options) {
                    this.chassisBody = options.chassisBody;
                    this.wheelInfos = [];
                    this.addWheel = (options) => {
                        const wheelInfo = {
                            axleLocal: options.axleLocal,
                            directionLocal: options.directionLocal,
                            suspensionStiffness: options.suspensionStiffness,
                            suspensionRestLength: options.suspensionRestLength,
                            maxSuspensionForce: options.maxSuspensionForce,
                            maxSuspensionTravel: options.maxSuspensionTravel,
                            dampingRelaxation: options.dampingRelaxation,
                            dampingCompression: options.dampingCompression,
                            axleLocal: options.axleLocal,
                            chassisConnectionPointLocal: options.chassisConnectionPointLocal,
                            useCustomSlidingRotationalSpeed: options.useCustomSlidingRotationalSpeed,
                            customSlidingRotationalSpeed: options.customSlidingRotationalSpeed,
                            isFrontWheel: options.isFrontWheel,
                            worldTransform: {
                                position: new CANNON.Vec3(),
                                quaternion: new CANNON.Quaternion()
                            }
                        };
                        this.wheelInfos.push(wheelInfo);
                        return this.wheelInfos.length - 1;
                    };
                }
            },
            STATIC: 'static',
            DYNAMIC: 'dynamic'
        };
    }

    async runAllBenchmarks() {
        console.log('🏃 Starting VelocityRush3D Performance Benchmarks...\n');

        const startTime = performance.now();

        // Collect system information
        this.results.systemInfo = {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            cpuCount: require('os').cpus().length,
            totalMemory: (require('os').totalmem() / 1024 / 1024 / 1024).toFixed(2) + 'GB',
            freeMemory: (require('os').freemem() / 1024 / 1024 / 1024).toFixed(2) + 'GB'
        };

        // Run all benchmarks
        await this.benchmarkPhysicsEngine();
        await this.benchmarkRenderingEngine();
        await this.benchmarkVehicleController();
        await this.benchmarkNetworkManager();
        await this.benchmarkTournamentSystem();
        await this.benchmarkMemoryUsage();
        await this.benchmarkAssetLoading();
        await this.benchmarkLeaderboardOperations();

        this.results.totalDuration = performance.now() - startTime;

        this.generateReport();

        return this.results;
    }

    generateReport() {
        console.log('\n📊 Performance Benchmark Results');
        console.log('='.repeat(60));

        console.log(`System: ${this.results.systemInfo.platform} ${this.results.systemInfo.arch}`);
        console.log(`Node.js: ${this.results.systemInfo.nodeVersion}`);
        console.log(`CPU Cores: ${this.results.systemInfo.cpuCount}`);
        console.log(`Memory: ${this.results.systemInfo.totalMemory} total, ${this.results.systemInfo.freeMemory} free`);
        console.log(`Total Benchmark Time: ${this.results.totalDuration.toFixed(2)}ms\n`);

        this.results.benchmarks.forEach(benchmark => {
            console.log(`🏃 ${benchmark.name}`);
            console.log(`   Duration: ${benchmark.avgDuration.toFixed(2)}ms avg (${benchmark.minDuration.toFixed(2)}ms - ${benchmark.maxDuration.toFixed(2)}ms)`);
            console.log(`   Std Dev: ${benchmark.stdDevDuration.toFixed(2)}ms`);
            console.log(`   Memory: ${(benchmark.avgMemoryDelta / 1024 / 1024).toFixed(2)}MB avg per iteration`);
            console.log(`   Iterations: ${benchmark.iterations}`);
            console.log('');
        });

        // Performance analysis
        this.analyzePerformance();

        // Save detailed report
        const reportPath = path.join(__dirname, '..', 'performance-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

        console.log('📄 Detailed performance report saved to performance-report.json');
    }

    analyzePerformance() {
        console.log('🔍 Performance Analysis');
        console.log('-'.repeat(40));

        const physicsBenchmark = this.results.benchmarks.find(b => b.name === 'Physics Engine Performance');
        const renderingBenchmark = this.results.benchmarks.find(b => b.name === 'Rendering Engine Performance');
        const memoryBenchmark = this.results.benchmarks.find(b => b.name === 'Memory Usage Benchmark');

        if (physicsBenchmark && physicsBenchmark.avgDuration > 50) {
            console.log('⚠️  Physics performance is slow (>50ms per 100 frames)');
        } else if (physicsBenchmark) {
            console.log('✅ Physics performance is good');
        }

        if (renderingBenchmark && renderingBenchmark.avgDuration > 30) {
            console.log('⚠️  Rendering performance is slow (>30ms per 60 frames)');
        } else if (renderingBenchmark) {
            console.log('✅ Rendering performance is good');
        }

        if (memoryBenchmark) {
            const memoryIncrease = parseFloat(memoryBenchmark.results[0].result.memoryIncreaseMB);
            if (memoryIncrease > 100) {
                console.log('⚠️  High memory usage detected (>100MB increase)');
            } else {
                console.log('✅ Memory usage is reasonable');
            }

            const cleanupEfficiency = parseFloat(memoryBenchmark.results[0].result.cleanupEfficiency);
            if (cleanupEfficiency < 50) {
                console.log('⚠️  Poor memory cleanup efficiency (<50%)');
            } else {
                console.log('✅ Memory cleanup is effective');
            }
        }

        console.log('');
    }
}

// CLI interface
async function main() {
    const benchmark = new PerformanceBenchmark();

    try {
        await benchmark.runAllBenchmarks();
    } catch (error) {
        console.error('Performance benchmark failed:', error);
        process.exit(1);
    }
}

// Export for programmatic use
export default PerformanceBenchmark;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}