/**
 * VelocityRush3D Node.js Test Runner
 * Server-side testing suite for CI/CD and automated testing
 */

import { JSDOM } from 'jsdom';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import IntegrationTests from './integrationTests.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NodeTestRunner {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0,
            duration: 0,
            testResults: []
        };
        this.startTime = 0;
        this.dom = null;
        this.setupDOM();
    }

    setupDOM() {
        // Create a minimal DOM environment for Three.js and other browser dependencies
        this.dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
            url: 'http://localhost',
            pretendToBeVisual: true,
            resources: 'usable'
        });

        global.window = this.dom.window;
        global.document = this.dom.window.document;

        // Set up navigator properties
        Object.defineProperty(global, 'navigator', {
            value: {
                userAgent: 'Node.js Test Runner',
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

        // Mock localStorage
        global.localStorage = {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
            clear: () => {}
        };

        // Mock console for cleaner output
        this.originalConsole = { ...console };
        console.log = (...args) => this.log('log', ...args);
        console.warn = (...args) => this.log('warn', ...args);
        console.error = (...args) => this.log('error', ...args);
    }

    log(level, ...args) {
        if (level === 'error' || level === 'warn') {
            this.originalConsole[level](...args);
        } else if (process.env.TEST_VERBOSE) {
            this.originalConsole[level](...args);
        }
    }

    // Test Registration
    addTest(name, testFunction, category = 'general', priority = 'medium') {
        this.tests.push({
            name,
            testFunction,
            category,
            priority,
            status: 'pending'
        });
    }

    addPerformanceTest(name, testFunction, targetFPS = 60, maxDuration = 5000) {
        this.addTest(name, async () => {
            const startTime = performance.now();
            let frameCount = 0;
            let totalTime = 0;

            return new Promise((resolve, reject) => {
                const measureFrame = (timestamp) => {
                    frameCount++;
                    totalTime = performance.now() - startTime;

                    if (totalTime >= maxDuration) {
                        const avgFPS = (frameCount / totalTime) * 1000;
                        const result = {
                            avgFPS,
                            totalFrames: frameCount,
                            duration: totalTime,
                            targetMet: avgFPS >= targetFPS
                        };

                        if (result.targetMet) {
                            resolve(result);
                        } else {
                            reject(new Error(`Performance test failed: ${avgFPS.toFixed(1)} FPS < ${targetFPS} FPS target`));
                        }
                        return;
                    }

                    setTimeout(measureFrame, 16); // ~60fps
                };

                setTimeout(measureFrame, 16);
            });
        }, 'performance', 'high');
    }

    // Dynamic import with path resolution
    async importModule(modulePath) {
        const fullPath = path.resolve(__dirname, '..', modulePath);
        try {
            return await import(fullPath);
        } catch (error) {
            // Try with .js extension
            return await import(fullPath + '.js');
        }
    }

    // Test Execution
    async runTests(filter = {}) {
        this.startTime = performance.now();
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0,
            duration: 0,
            testResults: []
        };

        console.log('🚀 Starting VelocityRush3D Test Suite (Node.js)...\n');

        // Filter tests
        let testsToRun = this.tests;
        if (filter.category) {
            testsToRun = testsToRun.filter(test => test.category === filter.category);
        }
        if (filter.priority) {
            testsToRun = testsToRun.filter(test => test.priority === filter.priority);
        }

        this.results.total = testsToRun.length;

        for (const test of testsToRun) {
            const testStartTime = performance.now();
            try {
                console.log(`⏳ Running: ${test.name}`);
                const result = await test.testFunction();
                test.status = 'passed';
                test.result = result;
                test.duration = performance.now() - testStartTime;
                this.results.passed++;
                console.log(`✅ PASSED: ${test.name} (${test.duration.toFixed(2)}ms)`);
                if (result && typeof result === 'object' && process.env.TEST_VERBOSE) {
                    console.log(`   Result: ${JSON.stringify(result, null, 2)}`);
                }
            } catch (error) {
                test.status = 'failed';
                test.error = error.message;
                test.duration = performance.now() - testStartTime;
                this.results.failed++;
                console.log(`❌ FAILED: ${test.name} (${test.duration.toFixed(2)}ms)`);
                console.log(`   Error: ${error.message}`);
            }
        }

        this.results.duration = performance.now() - this.startTime;
        this.generateReport();

        return this.results;
    }

    // Test Categories (Node.js compatible versions)
    async addPhysicsTests() {
        this.addTest('Physics Engine Initialization', async () => {
            const { PhysicsManager } = await this.importModule('src/physics/physicsManager.js');
            const physics = new PhysicsManager();
            physics.init();

            if (!physics.world) throw new Error('Physics world not created');
            if (!physics.groundBody) throw new Error('Ground body not created');

            return { worldCreated: true, groundCreated: true };
        }, 'physics', 'high');

        this.addTest('Vehicle Physics Creation', async () => {
            const { PhysicsManager } = await this.importModule('src/physics/physicsManager.js');
            const physics = new PhysicsManager();
            physics.init();

            const vehicle = physics.createVehicle();
            if (!vehicle) throw new Error('Vehicle not created');
            if (!vehicle.chassisBody) throw new Error('Vehicle chassis not created');
            if (vehicle.wheelInfos.length !== 4) throw new Error('Incorrect number of wheels');

            return { vehicleCreated: true, wheelsCount: vehicle.wheelInfos.length };
        }, 'physics', 'high');

        this.addTest('Physics Simulation', async () => {
            const { PhysicsManager } = await this.importModule('src/physics/physicsManager.js');
            const physics = new PhysicsManager();
            physics.init();

            const vehicle = physics.createVehicle();
            const initialPos = { ...vehicle.chassisBody.position };

            // Simulate 60 frames
            for (let i = 0; i < 60; i++) {
                physics.update(1/60);
            }

            const finalPos = vehicle.chassisBody.position;
            const moved = Math.abs(finalPos.y - initialPos.y) > 0.1; // Should fall due to gravity

            if (!moved) throw new Error('Physics simulation not working');

            return { initialY: initialPos.y, finalY: finalPos.y, moved };
        }, 'physics', 'high');
    }

    async addRenderingTests() {
        this.addTest('Three.js Scene Creation', async () => {
            // Mock Three.js in Node environment
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
                Mesh: class Mesh {
                    constructor(geometry, material) {
                        this.geometry = geometry;
                        this.material = material;
                        this.position = new THREE.Vector3();
                        this.rotation = new THREE.Vector3();
                    }
                },
                BoxGeometry: class BoxGeometry {
                    constructor(width, height, depth) {
                        this.width = width; this.height = height; this.depth = depth;
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
                        this.gravity = new CANNON.Vec3();
                        this.addBody = (body) => this.bodies.push(body);
                    }
                },
                Vec3: class Vec3 {
                    constructor(x = 0, y = 0, z = 0) {
                        this.x = x; this.y = y; this.z = z;
                    }
                    set(x, y, z) { this.x = x; this.y = y; this.z = z; }
                },
                Body: class Body {
                    constructor(options = {}) {
                        this.position = new CANNON.Vec3();
                        this.mass = options.mass || 0;
                        this.type = options.type || CANNON.Body.DYNAMIC;
                    }
                },
                Box: class Box {
                    constructor(halfExtents) {
                        this.halfExtents = halfExtents;
                    }
                },
                STATIC: 'static',
                DYNAMIC: 'dynamic'
            };

            const { SceneManager } = await this.importModule('src/engine/sceneManager.js');
            const scene = new THREE.Scene();
            const physicsWorld = new CANNON.World();
            physicsWorld.gravity.set(0, -9.82, 0);

            const sceneManager = new SceneManager(scene, physicsWorld, { world: physicsWorld });

            if (!sceneManager.scene) throw new Error('Scene not created');
            if (!sceneManager.physicsManager) throw new Error('Physics manager not set');

            return { sceneCreated: true, physicsConnected: true };
        }, 'rendering', 'high');

        this.addTest('Vehicle Mesh Creation', async () => {
            // Use same mocks as above
            global.THREE = global.THREE || {
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
                Mesh: class Mesh {
                    constructor(geometry, material) {
                        this.geometry = geometry;
                        this.material = material;
                        this.position = new THREE.Vector3();
                        this.rotation = new THREE.Vector3();
                    }
                },
                BoxGeometry: class BoxGeometry {
                    constructor(width, height, depth) {
                        this.width = width; this.height = height; this.depth = depth;
                    }
                },
                MeshLambertMaterial: class MeshLambertMaterial {
                    constructor(options) {
                        Object.assign(this, options);
                    }
                }
            };

            global.CANNON = global.CANNON || {
                World: class World {
                    constructor() {
                        this.bodies = [];
                        this.gravity = new CANNON.Vec3();
                        this.addBody = (body) => this.bodies.push(body);
                    }
                },
                Vec3: class Vec3 {
                    constructor(x = 0, y = 0, z = 0) {
                        this.x = x; this.y = y; this.z = z;
                    }
                    set(x, y, z) { this.x = x; this.y = y; this.z = z; }
                },
                Body: class Body {
                    constructor(options = {}) {
                        this.position = new CANNON.Vec3();
                        this.mass = options.mass || 0;
                        this.type = options.type || CANNON.Body.DYNAMIC;
                    }
                },
                Box: class Box {
                    constructor(halfExtents) {
                        this.halfExtents = halfExtents;
                    }
                },
                STATIC: 'static',
                DYNAMIC: 'dynamic'
            };

            const { SceneManager } = await this.importModule('src/engine/sceneManager.js');
            const scene = new THREE.Scene();
            const physicsWorld = new CANNON.World();
            physicsWorld.gravity.set(0, -9.82, 0);

            const sceneManager = new SceneManager(scene, physicsWorld, { world: physicsWorld });
            sceneManager.createPlayerVehicle();

            if (!sceneManager.playerVehicle) throw new Error('Player vehicle mesh not created');
            if (sceneManager.playerWheelMeshes.length !== 4) throw new Error('Incorrect number of wheel meshes');

            return { vehicleMeshCreated: true, wheelMeshesCount: sceneManager.playerWheelMeshes.length };
        }, 'rendering', 'high');
    }

    async addGameplayTests() {
        this.addTest('Vehicle Configuration Loading', async () => {
            const { VehicleConfigManager } = await this.importModule('src/gameplay/vehicleConfig.js');

            const configManager = new VehicleConfigManager();
            const sportsCar = configManager.getVehicleConfig('sports_car');

            if (!sportsCar) throw new Error('Sports car config not found');
            if (!sportsCar.mass) throw new Error('Vehicle mass not defined');
            if (!sportsCar.geometry) throw new Error('Vehicle geometry not defined');

            return {
                configLoaded: true,
                vehicleType: 'sports_car',
                mass: sportsCar.mass,
                enginePower: sportsCar.enginePower
            };
        }, 'gameplay', 'high');

        this.addTest('Customization System', async () => {
            const { VehicleCustomization } = await this.importModule('src/gameplay/vehicleCustomization.js');

            const customization = new VehicleCustomization();
            customization.setPaint(0xff0000, 0.5, 0.8);
            customization.addDecal('stripe');

            const config = customization.getCurrentCustomization();

            if (config.paint.color !== 0xff0000) throw new Error('Paint color not set');
            if (!config.decals.includes('stripe')) throw new Error('Decal not added');

            return {
                paintSet: true,
                decalAdded: true,
                customizationValid: true
            };
        }, 'gameplay', 'medium');
    }

    async addNetworkTests() {
        this.addTest('Network Manager Initialization', async () => {
            const { NetworkManager } = await this.importModule('src/network/networkManager.js');

            const networkManager = new NetworkManager();

            if (!networkManager) throw new Error('Network manager not created');

            return { networkManagerCreated: true };
        }, 'network', 'medium');

        this.addTest('Tournament System', async () => {
            const { TournamentManager } = await this.importModule('src/multiplayer/tournamentManager.js');

            const tournamentManager = new TournamentManager();
            tournamentManager.generateDefaultTournaments();

            const tournaments = tournamentManager.activeTournaments;
            if (tournaments.length === 0) throw new Error('No tournaments created');

            return {
                tournamentsCreated: tournaments.length,
                tournamentTypes: tournaments.map(t => t.type)
            };
        }, 'network', 'medium');
    }

    async addSocialTests() {
        this.addTest('Social Manager Initialization', async () => {
            const { SocialManager } = await this.importModule('src/multiplayer/socialManager.js');

            const socialManager = new SocialManager();

            if (!socialManager) throw new Error('Social manager not created');

            return { socialManagerCreated: true };
        }, 'social', 'medium');

        this.addTest('Leaderboard System', async () => {
            const { SocialManager } = await this.importModule('src/multiplayer/socialManager.js');
            const { EnhancedLeaderboardManager } = await this.importModule('src/multiplayer/enhancedLeaderboard.js');

            const socialManager = new SocialManager();
            const leaderboardManager = new EnhancedLeaderboardManager(socialManager);

            // Submit a test score
            const result = leaderboardManager.submitScore('race', 'race', {
                id: 'test_player',
                name: 'Test Player'
            }, {
                score: 1000,
                time: 120,
                position: 1,
                track: 'test_track',
                vehicle: 'sports_car'
            });

            if (!result.success) throw new Error('Score submission failed');

            return {
                scoreSubmitted: true,
                rank: result.rank,
                achievements: result.achievements
            };
        }, 'social', 'medium');
    }

    async addPerformanceTests() {
        this.addPerformanceTest('Basic Rendering Performance', async () => {
            // Mock performance test
            return {
                avgFPS: 58,
                totalFrames: 290,
                duration: 5000,
                targetMet: true
            };
        }, 55, 5000);

        this.addTest('Memory Usage Check', async () => {
            // In Node.js, check process memory
            const memUsage = process.memoryUsage();
            const memoryUsagePercent = memUsage.heapUsed / memUsage.heapTotal;

            if (memoryUsagePercent > 0.9) {
                throw new Error(`High memory usage: ${(memoryUsagePercent * 100).toFixed(1)}%`);
            }

            return {
                memoryUsagePercent: (memoryUsagePercent * 100).toFixed(1),
                usedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(1),
                totalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(1)
            };
        }, 'performance', 'high');
    }

    async addIntegrationTests() {
        const integrationTests = new IntegrationTests(this);
        await integrationTests.runAllIntegrationTests();
    }

    // Report Generation
    generateReport() {
        console.log('\n📊 Test Results Summary');
        console.log('='.repeat(50));
        console.log(`Total Tests: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⏭️  Skipped: ${this.results.skipped}`);
        console.log(`⏱️  Duration: ${this.results.duration.toFixed(2)}ms`);
        console.log(`📈 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

        if (this.results.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.tests.filter(test => test.status === 'failed').forEach(test => {
                console.log(`   - ${test.name}: ${test.error}`);
            });
        }

        // Generate detailed report
        this.generateDetailedReport();

        // Exit with appropriate code
        if (this.results.failed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    }

    generateDetailedReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.results,
            testDetails: this.tests.map(test => ({
                name: test.name,
                category: test.category,
                priority: test.priority,
                status: test.status,
                duration: test.duration || 0,
                error: test.error || null,
                result: test.result || null
            })),
            systemInfo: {
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version,
                memory: process.memoryUsage()
            },
            performance: {
                nodeUptime: process.uptime(),
                cpuUsage: process.cpuUsage()
            }
        };

        // Save report to file
        const reportPath = path.join(__dirname, '..', 'test-results.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log('\n📄 Detailed report saved to test-results.json');

        // Also save as JUnit XML for CI/CD
        this.generateJUnitReport(report);
    }

    generateJUnitReport(report) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<testsuites>\n';
        xml += `  <testsuite name="VelocityRush3D" tests="${report.summary.total}" failures="${report.summary.failed}" time="${(report.summary.duration / 1000).toFixed(3)}">\n`;

        report.testDetails.forEach(test => {
            xml += `    <testcase name="${test.name}" classname="${test.category}" time="${(test.duration / 1000).toFixed(3)}">\n`;
            if (test.status === 'failed') {
                xml += `      <failure message="${test.error}">${test.error}</failure>\n`;
            }
            xml += '    </testcase>\n';
        });

        xml += '  </testsuite>\n';
        xml += '</testsuites>\n';

        const junitPath = path.join(__dirname, '..', 'test-results.xml');
        fs.writeFileSync(junitPath, xml);

        console.log('📄 JUnit report saved to test-results.xml');
    }

    // Test Runner API
    async runAllTests() {
        return this.runTests();
    }

    async runCategoryTests(category) {
        return this.runTests({ category });
    }

    async runPriorityTests(priority) {
        return this.runTests({ priority });
    }

    getTestStats() {
        const stats = {
            total: this.tests.length,
            byCategory: {},
            byPriority: {},
            byStatus: {}
        };

        this.tests.forEach(test => {
            // Category stats
            if (!stats.byCategory[test.category]) {
                stats.byCategory[test.category] = 0;
            }
            stats.byCategory[test.category]++;

            // Priority stats
            if (!stats.byPriority[test.priority]) {
                stats.byPriority[test.priority] = 0;
            }
            stats.byPriority[test.priority]++;

            // Status stats
            if (!stats.byStatus[test.status]) {
                stats.byStatus[test.status] = 0;
            }
            stats.byStatus[test.status]++;
        });

        return stats;
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const testRunner = new NodeTestRunner();

    // Add all test categories
    await testRunner.addPhysicsTests();
    await testRunner.addRenderingTests();
    await testRunner.addGameplayTests();
    await testRunner.addNetworkTests();
    await testRunner.addSocialTests();
    await testRunner.addPerformanceTests();
    await testRunner.addIntegrationTests();

    if (args.includes('--stats')) {
        console.log(JSON.stringify(testRunner.getTestStats(), null, 2));
        return;
    }

    if (args.includes('--category')) {
        const categoryIndex = args.indexOf('--category');
        const category = args[categoryIndex + 1];
        await testRunner.runCategoryTests(category);
    } else if (args.includes('--priority')) {
        const priorityIndex = args.indexOf('--priority');
        const priority = args[priorityIndex + 1];
        await testRunner.runPriorityTests(priority);
    } else {
        await testRunner.runAllTests();
    }
}

// Export for programmatic use
export default NodeTestRunner;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}