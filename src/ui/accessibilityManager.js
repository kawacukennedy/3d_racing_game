export class AccessibilityManager {
    constructor() {
        this.settings = {
            colorblindMode: 'none', // none, protanopia, deuteranopia, tritanopia
            highContrast: false,
            largeText: false,
            subtitles: true,
            audioCues: true,
            motionReduction: false,
            uiScale: 1.0
        };

        this.colorblindFilters = {
            protanopia: `
                filter: url('#protanopia-filter');
            `,
            deuteranopia: `
                filter: url('#deuteranopia-filter');
            `,
            tritanopia: `
                filter: url('#tritanopia-filter');
            `
        };

        this.loadSettings();
        this.initializeAccessibilityFeatures();
    }

    initializeAccessibilityFeatures() {
        this.createColorblindFilters();
        this.createAccessibilityUI();
        this.applySettings();
        this.enableKeyboardNavigation();
    }

    createColorblindFilters() {
        // Create SVG filters for colorblind simulation
        const svgFilters = `
            <svg style="position: absolute; width: 0; height: 0;" aria-hidden="true">
                <defs>
                    <filter id="protanopia-filter">
                        <feColorMatrix type="matrix" values="
                            0.567, 0.433, 0, 0, 0,
                            0.558, 0.442, 0, 0, 0,
                            0, 0.242, 0.758, 0, 0,
                            0, 0, 0, 1, 0
                        "/>
                    </filter>
                    <filter id="deuteranopia-filter">
                        <feColorMatrix type="matrix" values="
                            0.625, 0.375, 0, 0, 0,
                            0.7, 0.3, 0, 0, 0,
                            0, 0.3, 0.7, 0, 0,
                            0, 0, 0, 1, 0
                        "/>
                    </filter>
                    <filter id="tritanopia-filter">
                        <feColorMatrix type="matrix" values="
                            0.95, 0.05, 0, 0, 0,
                            0, 0.433, 0.567, 0, 0,
                            0, 0.475, 0.525, 0, 0,
                            0, 0, 0, 1, 0
                        "/>
                    </filter>
                </defs>
            </svg>
        `;

        document.body.insertAdjacentHTML('afterbegin', svgFilters);
    }

    createAccessibilityUI() {
        // Create accessibility settings panel
        this.accessibilityPanel = document.createElement('div');
        this.accessibilityPanel.id = 'accessibilityPanel';
        this.accessibilityPanel.innerHTML = `
            <h3>Accessibility Settings</h3>
            <div class="accessibility-options" role="group" aria-labelledby="accessibility-heading">
                <div class="option-group">
                    <label for="colorblindSelect">Colorblind Mode:</label>
                    <select id="colorblindSelect" aria-describedby="colorblind-description">
                        <option value="none">None</option>
                        <option value="protanopia">Protanopia (Red-weak)</option>
                        <option value="deuteranopia">Deuteranopia (Green-weak)</option>
                        <option value="tritanopia">Tritanopia (Blue-weak)</option>
                    </select>
                    <div id="colorblind-description" class="sr-only">Select a colorblind filter to simulate different types of color vision deficiency</div>
                </div>

                <div class="option-group">
                    <label><input type="checkbox" id="highContrast" aria-describedby="high-contrast-description"> High Contrast</label>
                    <div id="high-contrast-description" class="sr-only">Enable high contrast mode for better visibility</div>
                </div>

                <div class="option-group">
                    <label><input type="checkbox" id="largeText" aria-describedby="large-text-description"> Large Text</label>
                    <div id="large-text-description" class="sr-only">Increase text size throughout the interface</div>
                </div>

                <div class="option-group">
                    <label><input type="checkbox" id="subtitles" aria-describedby="subtitles-description"> Subtitles</label>
                    <div id="subtitles-description" class="sr-only">Display text captions for audio content</div>
                </div>

                <div class="option-group">
                    <label><input type="checkbox" id="audioCues" aria-describedby="audio-cues-description"> Audio Cues</label>
                    <div id="audio-cues-description" class="sr-only">Enable additional audio feedback for game events</div>
                </div>

                <div class="option-group">
                    <label><input type="checkbox" id="motionReduction" aria-describedby="motion-reduction-description"> Reduce Motion</label>
                    <div id="motion-reduction-description" class="sr-only">Minimize animations and transitions</div>
                </div>

                <div class="option-group">
                    <label for="uiScale">UI Scale: <span id="scaleValue" aria-live="polite">1.0x</span></label>
                    <input type="range" id="uiScale" min="0.8" max="2.0" step="0.1" value="1.0" aria-describedby="ui-scale-description">
                    <div id="ui-scale-description" class="sr-only">Adjust the size of user interface elements</div>
                </div>

                <div class="option-group">
                    <button id="testAccessibility">Test Features</button>
                    <button id="resetAccessibility">Reset to Default</button>
                    <button id="closeAccessibility">Close</button>
                </div>
            </div>
        `;

        this.accessibilityPanel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.95);
            padding: 20px;
            border-radius: 10px;
            color: white;
            z-index: 2000;
            display: none;
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
        `;

        // Add screen reader only styles
        const srOnlyStyle = document.createElement('style');
        srOnlyStyle.textContent = `
            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            }
        `;
        document.head.appendChild(srOnlyStyle);

        document.body.appendChild(this.accessibilityPanel);
        this.setupAccessibilityControls();
    }

    setupAccessibilityControls() {
        // Colorblind mode
        document.getElementById('colorblindSelect').addEventListener('change', (e) => {
            this.setColorblindMode(e.target.value);
        });

        // Checkboxes
        document.getElementById('highContrast').addEventListener('change', (e) => {
            this.setHighContrast(e.target.checked);
        });

        document.getElementById('largeText').addEventListener('change', (e) => {
            this.setLargeText(e.target.checked);
        });

        document.getElementById('subtitles').addEventListener('change', (e) => {
            this.setSubtitles(e.target.checked);
        });

        document.getElementById('audioCues').addEventListener('change', (e) => {
            this.setAudioCues(e.target.checked);
        });

        document.getElementById('motionReduction').addEventListener('change', (e) => {
            this.setMotionReduction(e.target.checked);
        });

        // UI Scale
        document.getElementById('uiScale').addEventListener('input', (e) => {
            this.setUIScale(parseFloat(e.target.value));
        });

        // Buttons
        document.getElementById('testAccessibility').addEventListener('click', () => {
            this.testAccessibilityFeatures();
        });

        document.getElementById('resetAccessibility').addEventListener('click', () => {
            this.resetToDefaults();
        });

        document.getElementById('closeAccessibility').addEventListener('click', () => {
            this.hideAccessibilityPanel();
        });
    }

    setColorblindMode(mode) {
        this.settings.colorblindMode = mode;

        // Remove existing filters
        document.body.style.filter = '';

        // Apply new filter
        if (mode !== 'none') {
            document.body.style.filter = `url('#${mode}-filter')`;
        }

        this.saveSettings();
        console.log(`Colorblind mode set to: ${mode}`);
    }

    setHighContrast(enabled) {
        this.settings.highContrast = enabled;

        if (enabled) {
            document.body.classList.add('high-contrast');
            this.addHighContrastStyles();
        } else {
            document.body.classList.remove('high-contrast');
            this.removeHighContrastStyles();
        }

        this.saveSettings();
    }

    addHighContrastStyles() {
        const style = document.createElement('style');
        style.id = 'high-contrast-styles';
        style.textContent = `
            .high-contrast {
                --bg-color: #000000;
                --text-color: #ffffff;
                --button-bg: #ffffff;
                --button-text: #000000;
            }

            .high-contrast * {
                border: 1px solid white !important;
            }

            .high-contrast button {
                background: white !important;
                color: black !important;
                border: 2px solid black !important;
            }
        `;
        document.head.appendChild(style);
    }

    removeHighContrastStyles() {
        const style = document.getElementById('high-contrast-styles');
        if (style) {
            style.remove();
        }
    }

    setLargeText(enabled) {
        this.settings.largeText = enabled;

        const fontSize = enabled ? '1.2em' : '1em';
        document.body.style.fontSize = fontSize;

        this.saveSettings();
    }

    setSubtitles(enabled) {
        this.settings.subtitles = enabled;

        // This would integrate with audio system to show subtitles
        console.log(`Subtitles ${enabled ? 'enabled' : 'disabled'}`);
        this.saveSettings();
    }

    setAudioCues(enabled) {
        this.settings.audioCues = enabled;

        // This would integrate with audio manager
        console.log(`Audio cues ${enabled ? 'enabled' : 'disabled'}`);
        this.saveSettings();
    }

    setMotionReduction(enabled) {
        this.settings.motionReduction = enabled;

        if (enabled) {
            document.body.classList.add('reduce-motion');
            this.addMotionReductionStyles();
        } else {
            document.body.classList.remove('reduce-motion');
            this.removeMotionReductionStyles();
        }

        this.saveSettings();
    }

    addMotionReductionStyles() {
        const style = document.createElement('style');
        style.id = 'motion-reduction-styles';
        style.textContent = `
            .reduce-motion * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        `;
        document.head.appendChild(style);
    }

    removeMotionReductionStyles() {
        const style = document.getElementById('motion-reduction-styles');
        if (style) {
            style.remove();
        }
    }

    setUIScale(scale) {
        this.settings.uiScale = scale;

        document.getElementById('scaleValue').textContent = scale.toFixed(1) + 'x';
        document.body.style.transform = `scale(${scale})`;
        document.body.style.transformOrigin = 'top left';

        // Adjust viewport for scaled content
        const viewport = document.querySelector('meta[name=viewport]');
        if (viewport) {
            viewport.content = `width=device-width, initial-scale=${1/scale}, user-scalable=no`;
        }

        this.saveSettings();
    }

    testAccessibilityFeatures() {
        // Test colorblind filters
        const modes = ['none', 'protanopia', 'deuteranopia', 'tritanopia'];
        let testIndex = 0;

        const testInterval = setInterval(() => {
            if (testIndex >= modes.length) {
                clearInterval(testInterval);
                this.setColorblindMode(this.settings.colorblindMode);
                return;
            }

            this.setColorblindMode(modes[testIndex]);
            testIndex++;
        }, 2000);

        // Test other features
        this.setHighContrast(true);
        setTimeout(() => this.setHighContrast(this.settings.highContrast), 1000);

        console.log('Testing accessibility features...');
    }

    resetToDefaults() {
        this.settings = {
            colorblindMode: 'none',
            highContrast: false,
            largeText: false,
            subtitles: true,
            audioCues: true,
            motionReduction: false,
            uiScale: 1.0
        };

        this.applySettings();
        this.updateUI();
        console.log('Accessibility settings reset to defaults');
    }

    applySettings() {
        this.setColorblindMode(this.settings.colorblindMode);
        this.setHighContrast(this.settings.highContrast);
        this.setLargeText(this.settings.largeText);
        this.setSubtitles(this.settings.subtitles);
        this.setAudioCues(this.settings.audioCues);
        this.setMotionReduction(this.settings.motionReduction);
        this.setUIScale(this.settings.uiScale);
    }

    updateUI() {
        document.getElementById('colorblindSelect').value = this.settings.colorblindMode;
        document.getElementById('highContrast').checked = this.settings.highContrast;
        document.getElementById('largeText').checked = this.settings.largeText;
        document.getElementById('subtitles').checked = this.settings.subtitles;
        document.getElementById('audioCues').checked = this.settings.audioCues;
        document.getElementById('motionReduction').checked = this.settings.motionReduction;
        document.getElementById('uiScale').value = this.settings.uiScale;
        document.getElementById('scaleValue').textContent = this.settings.uiScale.toFixed(1) + 'x';
    }

    loadSettings() {
        try {
            const stored = localStorage.getItem('accessibility_settings');
            if (stored) {
                this.settings = { ...this.settings, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.error('Failed to load accessibility settings:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('accessibility_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save accessibility settings:', error);
        }
    }

    showAccessibilityPanel() {
        this.updateUI();
        this.accessibilityPanel.style.display = 'block';
    }

    hideAccessibilityPanel() {
        this.accessibilityPanel.style.display = 'none';
    }

    getSettings() {
        return { ...this.settings };
    }

    // Keyboard navigation support
    enableKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Tab navigation
            if (e.key === 'Tab') {
                const focusableElements = document.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        });
    }
}