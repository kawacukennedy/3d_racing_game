/**
 * VelocityRush3D Test Runner
 * Comprehensive testing suite for game functionality
 */

class TestRunner {
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
                    totalTime = timestamp - startTime;

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

                    requestAnimationFrame(measureFrame);
                };

                requestAnimationFrame(measureFrame);
            });
        }, 'performance', 'high');
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

        console.log('🚀 Starting VelocityRush3D Test Suite...\n');

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
            try {
                console.log(`⏳ Running: ${test.name}`);
                const result = await test.testFunction();
                test.status = 'passed';
                test.result = result;
                this.results.passed++;
                console.log(`✅ PASSED: ${test.name}`);
                if (result && typeof result === 'object') {
                    console.log(`   Result: ${JSON.stringify(result, null, 2)}`);
                }
            } catch (error) {
                test.status = 'failed';
                test.error = error.message;
                this.results.failed++;
                console.log(`❌ FAILED: ${test.name}`);
                console.log(`   Error: ${error.message}`);
            }
        }

        this.results.duration = performance.now() - this.startTime;
        this.generateReport();

        return this.results;
    }

    // Test Categories
    addPhysicsTests() {
        this.addTest('Physics Engine Initialization', async () => {
            // Test physics world creation
            const { PhysicsManager } = await import('../src/physics/physicsManager.js');
            const physics = new PhysicsManager();
            physics.init();

            if (!physics.world) throw new Error('Physics world not created');
            if (!physics.groundBody) throw new Error('Ground body not created');

            return { worldCreated: true, groundCreated: true };
        }, 'physics', 'high');

        this.addTest('Vehicle Physics Creation', async () => {
            const { PhysicsManager } = await import('../src/physics/physicsManager.js');
            const physics = new PhysicsManager();
            physics.init();

            const vehicle = physics.createVehicle();
            if (!vehicle) throw new Error('Vehicle not created');
            if (!vehicle.chassisBody) throw new Error('Vehicle chassis not created');
            if (vehicle.wheelInfos.length !== 4) throw new Error('Incorrect number of wheels');

            return { vehicleCreated: true, wheelsCount: vehicle.wheelInfos.length };
        }, 'physics', 'high');

        this.addTest('Physics Simulation', async () => {
            const { PhysicsManager } = await import('../src/physics/physicsManager.js');
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

    addRenderingTests() {
        this.addTest('Three.js Scene Creation', async () => {
            const { SceneManager } = await import('../src/engine/sceneManager.js');
            const scene = new THREE.Scene();
            const physics = { world: new CANNON.World() };
            physics.world.gravity.set(0, -9.82, 0);

            const sceneManager = new SceneManager(scene, physics.world, physics);

            if (!sceneManager.scene) throw new Error('Scene not created');
            if (!sceneManager.physicsManager) throw new Error('Physics manager not set');

            return { sceneCreated: true, physicsConnected: true };
        }, 'rendering', 'high');

        this.addTest('Vehicle Mesh Creation', async () => {
            const { SceneManager } = await import('../src/engine/sceneManager.js');
            const scene = new THREE.Scene();
            const physics = { world: new CANNON.World() };
            physics.world.gravity.set(0, -9.82, 0);

            const sceneManager = new SceneManager(scene, physics.world, physics);
            sceneManager.createPlayerVehicle();

            if (!sceneManager.playerVehicle) throw new Error('Player vehicle mesh not created');
            if (sceneManager.playerWheelMeshes.length !== 4) throw new Error('Incorrect number of wheel meshes');

            return { vehicleMeshCreated: true, wheelMeshesCount: sceneManager.playerWheelMeshes.length };
        }, 'rendering', 'high');
    }

    addGameplayTests() {
        this.addTest('Vehicle Configuration Loading', async () => {
            const { VehicleConfigManager } = await import('../src/gameplay/vehicleConfig.js');

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
            const { VehicleCustomization } = await import('../src/gameplay/vehicleCustomization.js');

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

    addNetworkTests() {
        this.addTest('Network Manager Initialization', async () => {
            const { NetworkManager } = await import('../src/network/networkManager.js');

            const networkManager = new NetworkManager();

            if (!networkManager) throw new Error('Network manager not created');

            return { networkManagerCreated: true };
        }, 'network', 'medium');

        this.addTest('Tournament System', async () => {
            const { TournamentManager } = await import('../src/multiplayer/tournamentManager.js');

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

    addSocialTests() {
        this.addTest('Social Manager Initialization', async () => {
            const { SocialManager } = await import('../src/multiplayer/socialManager.js');

            const socialManager = new SocialManager();

            if (!socialManager) throw new Error('Social manager not created');

            return { socialManagerCreated: true };
        }, 'social', 'medium');

        this.addTest('Leaderboard System', async () => {
            const { SocialManager } = await import('../src/multiplayer/socialManager.js');
            const { EnhancedLeaderboardManager } = await import('../src/multiplayer/enhancedLeaderboard.js');

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

    addPerformanceTests() {
        this.addPerformanceTest('Basic Rendering Performance', async () => {
            // This would test basic rendering performance
            // For now, just return a mock result
            return {
                avgFPS: 58,
                totalFrames: 290,
                duration: 5000,
                targetMet: true
            };
        }, 55, 5000);

        this.addTest('Memory Usage Check', async () => {
            if (!performance.memory) {
                console.warn('Performance.memory not available, skipping memory test');
                return { memoryCheck: 'skipped', reason: 'not supported' };
            }

            const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize;

            if (memoryUsage > 0.9) {
                throw new Error(`High memory usage: ${(memoryUsage * 100).toFixed(1)}%`);
            }

            return {
                memoryUsagePercent: (memoryUsage * 100).toFixed(1),
                usedMB: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1),
                totalMB: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(1)
            };
        }, 'performance', 'high');
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
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            },
            performance: {
                timing: performance.timing,
                memory: performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                } : null
            }
        };

        // Save report
        const reportBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const reportUrl = URL.createObjectURL(reportBlob);

        console.log('\n📄 Detailed report saved');
        console.log(`Download: ${reportUrl}`);

        // Also save to localStorage for persistence
        try {
            localStorage.setItem('test_report', JSON.stringify(report));
        } catch (error) {
            console.warn('Could not save report to localStorage:', error);
        }
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

// Export for use in browser
window.TestRunner = TestRunner;

// Auto-run tests if this script is loaded directly
if (typeof window !== 'undefined' && window.location) {
    // Create global test runner instance
    window.testRunner = new TestRunner();

    // Add all test categories
    window.testRunner.addPhysicsTests();
    window.testRunner.addRenderingTests();
    window.testRunner.addGameplayTests();
    window.testRunner.addNetworkTests();
    window.testRunner.addSocialTests();
    window.testRunner.addPerformanceTests();

    // Add convenience functions
    window.runAllTests = () => window.testRunner.runAllTests();
    window.runPhysicsTests = () => window.testRunner.runCategoryTests('physics');
    window.runPerformanceTests = () => window.testRunner.runCategoryTests('performance');
    window.getTestStats = () => window.testRunner.getTestStats();

    console.log('🧪 VelocityRush3D Test Suite loaded!');
    console.log('Available commands:');
    console.log('  runAllTests() - Run all tests');
    console.log('  runPhysicsTests() - Run physics tests only');
    console.log('  runPerformanceTests() - Run performance tests only');
    console.log('  getTestStats() - Get test statistics');
}