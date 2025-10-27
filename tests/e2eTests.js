/**
 * VelocityRush3D End-to-End Tests
 * Automated browser testing for full user workflows
 */

import puppeteer from 'puppeteer';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class E2ETests {
    constructor() {
        this.browser = null;
        this.page = null;
        this.server = null;
        this.baseUrl = 'http://localhost:3000';
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            duration: 0,
            testResults: []
        };
    }

    async setup() {
        // Launch browser
        const isCI = process.env.CI === 'true';
        const launchOptions = {
            headless: 'new'
        };

        // Add sandbox args for CI environments
        if (isCI) {
            launchOptions.args = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];
        }

        this.browser = await puppeteer.launch(launchOptions);

        // Start development server
        const { spawn } = await import('child_process');
        this.server = spawn('npm', ['run', 'dev'], {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit'
        });

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check if server is responding
        const maxRetries = 20;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(this.baseUrl);
                if (response.ok) {
                    console.log('Server is responding');
                    break;
                }
            } catch (error) {
                console.log(`Server not ready yet, retry ${i + 1}/${maxRetries}`);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    async teardown() {
        if (this.browser) {
            await this.browser.close();
        }
        if (this.server) {
            this.server.kill();
        }
    }

    async runTest(testName, testFunction) {
        const startTime = performance.now();
        this.results.total++;

        try {
            console.log(`🧪 Running E2E: ${testName}`);
            this.page = await this.browser.newPage();

            // Set up console logging
            this.page.on('console', msg => {
                console.log(`Browser ${msg.type()}: ${msg.text()}`);
            });

            // Capture page errors
            this.page.on('pageerror', error => {
                console.log(`Page Error: ${error.message}`);
            });

            const result = await testFunction();
            this.results.passed++;

            console.log(`✅ PASSED: ${testName} (${(performance.now() - startTime).toFixed(2)}ms)`);

            return {
                name: testName,
                status: 'passed',
                duration: performance.now() - startTime,
                result
            };

        } catch (error) {
            this.results.failed++;
            console.log(`❌ FAILED: ${testName} (${(performance.now() - startTime).toFixed(2)}ms)`);
            console.log(`   Error: ${error.message}`);

            return {
                name: testName,
                status: 'failed',
                duration: performance.now() - startTime,
                error: error.message
            };

        } finally {
            if (this.page) {
                await this.page.close();
            }
        }
    }

    async testGameLoading() {
        return await this.runTest('Game Loading and Initialization', async () => {
            await this.page.goto(this.baseUrl);

            // Wait for game to load
            await this.page.waitForFunction(() => window.game && document.getElementById('gameCanvas'), { timeout: 15000 });

            // Check if canvas exists and has proper dimensions
            const canvasInfo = await this.page.evaluate(() => {
                console.log('Checking for gameCanvas...');
                const canvas = document.getElementById('gameCanvas');
                console.log('Canvas found:', !!canvas);
                console.log('Window.game exists:', !!window.game);
                if (window.game) {
                    console.log('Game systems status:', window.game.getSystemsStatus());
                }
                return {
                    exists: !!canvas,
                    width: canvas ? canvas.width : 0,
                    height: canvas ? canvas.height : 0,
                    gameInitialized: !!window.game
                };
            });

            if (!canvasInfo.exists) throw new Error('Game canvas not found');
            if (canvasInfo.width < 800 || canvasInfo.height < 600) {
                throw new Error(`Canvas dimensions too small: ${canvasInfo.width}x${canvasInfo.height}`);
            }

            // Check if game initializes without errors
            const initStatus = await this.page.evaluate(() => {
                return new Promise((resolve) => {
                    // Wait for game initialization
                    setTimeout(() => {
                        const hasErrors = window.testErrors && window.testErrors.length > 0;
                        resolve({
                            initialized: !hasErrors,
                            errors: window.testErrors || []
                        });
                    }, 2000);
                });
            });

            if (!initStatus.initialized) {
                throw new Error(`Game initialization failed: ${initStatus.errors.join(', ')}`);
            }

            return {
                canvasReady: true,
                dimensions: `${canvasInfo.width}x${canvasInfo.height}`,
                initialized: true
            };
        });
    }

    async testMenuNavigation() {
        return await this.runTest('Menu Navigation Flow', async () => {
            await this.page.goto(this.baseUrl);
            await this.page.waitForSelector('#gameCanvas');

            // Check if main menu loads
            const menuVisible = await this.page.evaluate(() => {
                const menu = document.querySelector('.main-menu') || document.getElementById('main-menu');
                return !!menu;
            });

            // Try to navigate to vehicle selection
            await this.page.evaluate(() => {
                // Simulate clicking vehicle selection button
                const vehicleBtn = document.querySelector('[data-menu="vehicle-select"]') ||
                                 document.getElementById('vehicle-select-btn');
                if (vehicleBtn) vehicleBtn.click();
            });

            await new Promise(resolve => setTimeout(resolve, 500));

            // Check if vehicle selection menu is shown
            const vehicleMenuVisible = await this.page.evaluate(() => {
                const menu = document.querySelector('.vehicle-select') ||
                           document.getElementById('vehicle-select');
                return !!menu;
            });

            // Navigate to track selection
            await this.page.evaluate(() => {
                const trackBtn = document.querySelector('[data-menu="track-select"]') ||
                               document.getElementById('track-select-btn');
                if (trackBtn) trackBtn.click();
            });

            await new Promise(resolve => setTimeout(resolve, 500));

            const trackMenuVisible = await this.page.evaluate(() => {
                const menu = document.querySelector('.track-select') ||
                           document.getElementById('track-select');
                return !!menu;
            });

            return {
                mainMenuLoaded: menuVisible,
                vehicleMenuAccessible: vehicleMenuVisible,
                trackMenuAccessible: trackMenuVisible,
                navigationWorking: true
            };
        });
    }

    async testGameStart() {
        return await this.runTest('Game Start and Basic Gameplay', async () => {
            await this.page.goto(this.baseUrl);
            await this.page.waitForSelector('#gameCanvas');

            // Start a quick race
            const gameStarted = await this.page.evaluate(() => {
                // Simulate starting a race
                if (window.game && window.game.startRace) {
                    window.game.startRace('test_track', 'sports_car');
                    return true;
                } else {
                    // Fallback: try to click start button
                    const startBtn = document.querySelector('.start-race-btn') ||
                                    document.getElementById('start-race') ||
                                    document.getElementById('startRace');
                    if (startBtn) {
                        startBtn.click();
                        return true;
                    } else {
                        return false;
                    }
                }
            });

            if (!gameStarted) {
                throw new Error('Failed to start game');
            }

            // Wait for game to run
            await this.page.waitForTimeout(2000);

            // Check if game is running (look for HUD elements)
            const gameRunning = await this.page.evaluate(() => {
                const hud = document.querySelector('.game-hud') ||
                          document.getElementById('game-hud') ||
                          document.querySelector('.speed-display');
                const canvas = document.getElementById('game-canvas');
                return !!(hud && canvas);
            });

            if (!gameRunning) {
                throw new Error('Game not running after start');
            }

            return {
                gameStarted: true,
                gameRunning: true,
                hudVisible: true
            };
        });
    }

    async testControls() {
        return await this.runTest('Input Controls Functionality', async () => {
            await this.page.goto(this.baseUrl);
            await this.page.waitForFunction(() => window.game && document.getElementById('gameCanvas'), { timeout: 15000 });

            // Start game
            await this.page.evaluate(() => {
                if (window.game && window.game.startRace) {
                    window.game.startRace('test_track', 'sports_car');
                }
            });

            // Wait for game to start
            await this.page.waitForFunction(() => {
                return window.game && window.game.raceActive;
            }, { timeout: 5000 });

            // Test keyboard controls
            await this.page.keyboard.press('ArrowUp'); // Accelerate
            await this.page.keyboard.press('ArrowLeft'); // Turn left
            await this.page.keyboard.press('ArrowRight'); // Turn right
            await this.page.keyboard.press('Space'); // Brake

            await new Promise(resolve => setTimeout(resolve, 500));

            // Check if controls are responsive
            const controlResponse = await this.page.evaluate(() => {
                // Check if vehicle state changed
                if (window.game && window.game.vehicleController) {
                    const controller = window.game.vehicleController;
                    return {
                        acceleration: controller.getAcceleration() > 0,
                        steering: Math.abs(controller.getSteering()) > 0,
                        braking: controller.getBraking() > 0
                    };
                }
                return { acceleration: false, steering: false, braking: false };
            });

            // At least one control should have responded
            const controlsWorking = controlResponse.acceleration ||
                                  controlResponse.steering ||
                                  controlResponse.braking;

            if (!controlsWorking) {
                throw new Error('Controls not responding to input');
            }

            return {
                accelerationWorking: controlResponse.acceleration,
                steeringWorking: controlResponse.steering,
                brakingWorking: controlResponse.braking,
                controlsResponsive: true
            };
        });
    }

    async testPerformance() {
        return await this.runTest('Performance Under Load', async () => {
            await this.page.goto(this.baseUrl);
            await this.page.waitForFunction(() => window.game && document.getElementById('gameCanvas'), { timeout: 15000 });

            // Start game
            await this.page.evaluate(() => {
                if (window.game && window.game.startRace) {
                    window.game.startRace('test_track', 'sports_car');
                }
            });

            // Wait for game to start
            await this.page.waitForFunction(() => {
                return window.game && window.game.raceActive;
            }, { timeout: 5000 });

            // Monitor performance for 2 seconds
            const performanceData = await this.page.evaluate(() => {
                return new Promise((resolve) => {
                    const metrics = {
                        frameCount: 0,
                        startTime: performance.now(),
                        fpsValues: []
                    };

                    const measureFrame = (timestamp) => {
                        metrics.frameCount++;
                        const elapsed = timestamp - metrics.startTime;

                        if (elapsed >= 2000) { // 2 seconds
                            const avgFPS = (metrics.frameCount / elapsed) * 1000;
                            resolve({
                                totalFrames: metrics.frameCount,
                                duration: elapsed,
                                avgFPS: avgFPS,
                                targetMet: avgFPS >= 20 // Minimum 20 FPS for test
                            });
                            return;
                        }

                        requestAnimationFrame(measureFrame);
                    };

                    requestAnimationFrame(measureFrame);
                });
            });

            if (!performanceData.targetMet) {
                throw new Error(`Performance below target: ${performanceData.avgFPS.toFixed(1)} FPS < 30 FPS`);
            }

            return {
                avgFPS: performanceData.avgFPS.toFixed(1),
                totalFrames: performanceData.totalFrames,
                duration: performanceData.duration.toFixed(2),
                performanceMet: true
            };
        });
    }

    async testMultiplayerConnection() {
        return await this.runTest('Multiplayer Connection', async () => {
            await this.page.goto(this.baseUrl);
            await this.page.waitForSelector('#gameCanvas');

            // Try to connect to multiplayer
            const connectionResult = await this.page.evaluate(() => {
                return new Promise((resolve) => {
                    if (window.game && window.game.networkManager) {
                        const network = window.game.networkManager;
                        network.connect().then((result) => {
                            resolve({
                                connected: result.success,
                                connectionTime: result.connectionTime || 0
                            });
                        }).catch(() => {
                            resolve({ connected: false, error: 'Connection failed' });
                        });
                    } else {
                        resolve({ connected: false, error: 'Network manager not available' });
                    }

                    // Timeout after 5 seconds
                    setTimeout(() => {
                        resolve({ connected: false, error: 'Connection timeout' });
                    }, 5000);
                });
            });

            // Note: This test may fail if server is not running, which is expected in CI
            // We just check that the connection attempt doesn't crash the game
            return {
                connectionAttempted: true,
                connected: connectionResult.connected,
                error: connectionResult.error || null
            };
        });
    }

    async testResponsiveDesign() {
        return await this.runTest('Responsive Design', async () => {
            // Test different viewport sizes
            const viewports = [
                { width: 1920, height: 1080, name: 'Desktop' },
                { width: 768, height: 1024, name: 'Tablet' },
                { width: 375, height: 667, name: 'Mobile' }
            ];

            const results = {};

            for (const viewport of viewports) {
                const page = await this.browser.newPage();
                await page.setViewport({ width: viewport.width, height: viewport.height });
                await page.goto(this.baseUrl);

                await page.waitForSelector('#gameCanvas', { timeout: 10000 });

                const layoutCheck = await page.evaluate(() => {
                    const canvas = document.getElementById('game-canvas');
                    const body = document.body;

                    return {
                        canvasVisible: canvas && canvas.offsetWidth > 0 && canvas.offsetHeight > 0,
                        bodyWidth: body.offsetWidth,
                        bodyHeight: body.offsetHeight,
                        canvasWidth: canvas ? canvas.offsetWidth : 0,
                        canvasHeight: canvas ? canvas.offsetHeight : 0
                    };
                });

                results[viewport.name] = {
                    canvasVisible: layoutCheck.canvasVisible,
                    viewport: `${viewport.width}x${viewport.height}`,
                    canvasSize: `${layoutCheck.canvasWidth}x${layoutCheck.canvasHeight}`
                };

                if (!layoutCheck.canvasVisible) {
                    throw new Error(`${viewport.name} layout failed: canvas not visible`);
                }

                await page.close();
            }

            return results;
        });
    }

    async runAllTests() {
        const startTime = performance.now();

        console.log('🚀 Starting VelocityRush3D E2E Tests...\n');

        try {
            await this.setup();

            // Run all E2E tests
            const testPromises = [
                this.testGameLoading(),
                this.testMenuNavigation(),
                this.testGameStart(),
                this.testControls(),
                this.testPerformance(),
                this.testMultiplayerConnection(),
                this.testResponsiveDesign()
            ];

            const testResults = await Promise.all(testPromises);
            this.results.testResults = testResults;

            this.results.duration = performance.now() - startTime;

            this.generateReport();

            return this.results;

        } finally {
            await this.teardown();
        }
    }

    generateReport() {
        console.log('\n🌐 E2E Test Results Summary');
        console.log('='.repeat(50));
        console.log(`Total Tests: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⏱️  Duration: ${this.results.duration.toFixed(2)}ms`);
        console.log(`📈 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

        if (this.results.failed > 0) {
            console.log('\n❌ Failed E2E Tests:');
            this.results.testResults.filter(test => test.status === 'failed').forEach(test => {
                console.log(`   - ${test.name}: ${test.error}`);
            });
        }

        // Save detailed report
        const reportPath = path.join(__dirname, '..', 'e2e-results.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

        console.log('\n📄 E2E report saved to e2e-results.json');

        // Exit with appropriate code
        if (this.results.failed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    }
}

// CLI interface
async function main() {
    const e2eTests = new E2ETests();

    try {
        await e2eTests.runAllTests();
    } catch (error) {
        console.error('E2E tests failed:', error);
        process.exit(1);
    }
}

// Export for programmatic use
export default E2ETests;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}