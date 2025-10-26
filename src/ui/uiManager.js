export class UIManager {
    constructor(game) {
        this.game = game;
        this.menuVisible = false;
        this.customizationVisible = false;
        this.selectedColor = null;
        this.selectedGameMode = 'standard';
    }

    init() {
        // Menu controls
        document.getElementById('startRace').addEventListener('click', () => {
            this.startQuickRace();
        });

        document.getElementById('gameModeSelect').addEventListener('change', (e) => {
            this.selectedGameMode = e.target.value;
        });

        document.getElementById('customize').addEventListener('click', () => {
            this.showCustomization();
        });

        document.getElementById('store').addEventListener('click', () => {
            this.showStore();
        });

        document.getElementById('settings').addEventListener('click', () => {
            this.showSettings();
        });

        document.getElementById('trackEditor').addEventListener('click', () => {
            this.openTrackEditor();
        });

        document.getElementById('spectator').addEventListener('click', () => {
            this.enterSpectatorMode();
        });

        document.getElementById('accessibility').addEventListener('click', () => {
            this.openAccessibilitySettings();
        });

        document.getElementById('voiceChat').addEventListener('click', () => {
            this.toggleVoiceChat();
        });

        document.getElementById('streaming').addEventListener('click', () => {
            this.toggleStreaming();
        });

        document.getElementById('multiplayer').addEventListener('click', () => {
            this.startMultiplayer();
        });

        // Customization controls
        this.setupColorGrid();
        this.setupPresetControls();

        document.getElementById('saveCustomization').addEventListener('click', () => {
            this.game.vehicleCustomization.saveCustomization();
            this.game.analyticsManager.trackCustomization();
            alert('Customization saved!');
        });

        document.getElementById('closeCustomization').addEventListener('click', () => {
            this.hideCustomization();
        });

        document.getElementById('closeStore').addEventListener('click', () => {
            this.hideStore();
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            this.hideSettings();
        });

        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('resetSettings').addEventListener('click', () => {
            this.resetSettings();
        });

        document.getElementById('closeAccessibility').addEventListener('click', () => {
            this.hideAccessibilitySettings();
        });

        document.getElementById('saveAccessibility').addEventListener('click', () => {
            this.saveAccessibilitySettings();
        });

        document.getElementById('resetAccessibility').addEventListener('click', () => {
            this.resetAccessibilitySettings();
        });

        document.getElementById('sensitivity').addEventListener('input', (e) => {
            document.getElementById('sensitivityValue').textContent = e.target.value;
        });

        // Settings sliders
        document.getElementById('renderDistance').addEventListener('input', (e) => {
            document.getElementById('renderDistanceValue').textContent = e.target.value;
        });

        document.getElementById('masterVolume').addEventListener('input', (e) => {
            document.getElementById('masterVolumeValue').textContent = e.target.value;
        });

        document.getElementById('musicVolume').addEventListener('input', (e) => {
            document.getElementById('musicVolumeValue').textContent = e.target.value;
        });

        document.getElementById('sfxVolume').addEventListener('input', (e) => {
            document.getElementById('sfxVolumeValue').textContent = e.target.value;
        });

        // Initialize HUD
        this.updateHUD();

        // Show menu initially
        this.showMenu();
    }

    startQuickRace() {
        console.log('🏁 Starting quick race...');
        // Set selected game mode
        if (this.game.gameModeManager) {
            this.game.gameModeManager.setGameMode(this.selectedGameMode);
        }
        this.hideMenu();
        this.showHUD();
        this.game.startQuickRace();
        this.game.analyticsManager.startRace();
    }

    showCustomization() {
        console.log('🎨 Opening vehicle customization...');
        this.hideMenu();
        document.getElementById('customization').style.display = 'block';
        this.customizationVisible = true;
        this.populateVehicleTypes();
    }

    hideCustomization() {
        document.getElementById('customization').style.display = 'none';
        this.customizationVisible = false;
        this.showMenu();
    }

    showStore() {
        console.log('🛒 Opening store...');
        this.hideMenu();
        document.getElementById('store').style.display = 'block';
        this.updateStoreDisplay();
    }

    hideStore() {
        document.getElementById('store').style.display = 'none';
        this.showMenu();
    }

    updateStoreDisplay() {
        const storeItems = document.getElementById('storeItems');
        const currencyDisplay = document.getElementById('currencyDisplay');

        if (!storeItems || !currencyDisplay) return;

        // Update currency display
        currencyDisplay.textContent = 'Credits: 1000 | Gems: 50';

        // Clear existing items
        storeItems.innerHTML = '';

        // Add store items
        const items = [
            { id: 'paint_red', name: '🔴 Racing Red Paint', price: 200, currency: 'credits', type: 'cosmetic', rarity: 'common' },
            { id: 'paint_blue', name: '🔵 Electric Blue Paint', price: 250, currency: 'credits', type: 'cosmetic', rarity: 'common' },
            { id: 'wheels_gold', name: '🥇 Gold Wheels', price: 500, currency: 'credits', type: 'cosmetic', rarity: 'rare' },
            { id: 'spoiler_carbon', name: '🏁 Carbon Fiber Spoiler', price: 750, currency: 'credits', type: 'cosmetic', rarity: 'epic' },
            { id: 'engine_boost', name: '⚡ Engine Boost', price: 1000, currency: 'credits', type: 'upgrade', rarity: 'rare' },
            { id: 'nitro_boost', name: '🚀 Nitro Boost', price: 25, currency: 'gems', type: 'consumable', rarity: 'epic' },
            { id: 'sports_car', name: '🏎️ Sports Car Unlock', price: 50, currency: 'gems', type: 'vehicle', rarity: 'legendary' }
        ];

        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = `store-item ${item.rarity}`;
            itemDiv.innerHTML = `
                <div style="font-weight: bold;">${item.name}</div>
                <div style="font-size: 12px; opacity: 0.8;">${item.currency === 'credits' ? '💰' : '💎'} ${item.price}</div>
            `;
            itemDiv.onclick = () => this.purchaseItem(item);
            storeItems.appendChild(itemDiv);
        });
    }

    purchaseItem(item) {
        const confirmed = confirm(`Purchase ${item.name} for ${item.price} ${item.currency}?`);
        if (confirmed) {
            // Simulate purchase
            alert(`✅ Purchased ${item.name}!`);
            this.game.analyticsManager.trackPurchase(item.id, item.price, item.currency);
        }
    }

    showSettings() {
        console.log('⚙️ Opening settings...');
        this.hideMenu();
        document.getElementById('settings').style.display = 'block';
        this.loadSettings();
    }

    hideSettings() {
        document.getElementById('settings').style.display = 'none';
        this.showMenu();
    }

    loadSettings() {
        const settings = this.getSettings();
        document.getElementById('shadows').checked = settings.graphics.shadows;
        document.getElementById('particles').checked = settings.graphics.particles;
        document.getElementById('renderDistance').value = settings.graphics.renderDistance;
        document.getElementById('renderDistanceValue').textContent = settings.graphics.renderDistance;

        document.getElementById('masterVolume').value = settings.audio.master;
        document.getElementById('masterVolumeValue').textContent = settings.audio.master;
        document.getElementById('musicVolume').value = settings.audio.music;
        document.getElementById('musicVolumeValue').textContent = settings.audio.music;
        document.getElementById('sfxVolume').value = settings.audio.sfx;
        document.getElementById('sfxVolumeValue').textContent = settings.audio.sfx;

        document.getElementById('autoSave').checked = settings.gameplay.autoSave;
        document.getElementById('showFPS').checked = settings.gameplay.showFPS;
        document.getElementById('difficulty').value = settings.gameplay.difficulty;
    }

    saveSettings() {
        const settings = {
            graphics: {
                shadows: document.getElementById('shadows').checked,
                particles: document.getElementById('particles').checked,
                renderDistance: parseInt(document.getElementById('renderDistance').value)
            },
            audio: {
                master: parseInt(document.getElementById('masterVolume').value),
                music: parseInt(document.getElementById('musicVolume').value),
                sfx: parseInt(document.getElementById('sfxVolume').value)
            },
            gameplay: {
                autoSave: document.getElementById('autoSave').checked,
                showFPS: document.getElementById('showFPS').checked,
                difficulty: document.getElementById('difficulty').value
            }
        };
        localStorage.setItem('velocityRushSettings', JSON.stringify(settings));
        alert('Settings saved!');
        this.applySettings(settings);
    }

    resetSettings() {
        localStorage.removeItem('velocityRushSettings');
        this.loadSettings();
        alert('Settings reset to default!');
    }

    getSettings() {
        const defaultSettings = {
            graphics: { shadows: true, particles: true, renderDistance: 1000 },
            audio: { master: 80, music: 70, sfx: 90 },
            gameplay: { autoSave: true, showFPS: false, difficulty: 'normal' }
        };
        const saved = localStorage.getItem('velocityRushSettings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }

    applySettings(settings) {
        // Apply graphics settings
        if (this.game.sceneManager) {
            this.game.sceneManager.setShadows(settings.graphics.shadows);
            this.game.sceneManager.setParticles(settings.graphics.particles);
            this.game.sceneManager.setRenderDistance(settings.graphics.renderDistance);
        }

        // Apply audio settings
        if (this.game.audioManager) {
            this.game.audioManager.setMasterVolume(settings.audio.master / 100);
            this.game.audioManager.setMusicVolume(settings.audio.music / 100);
            this.game.audioManager.setSFXVolume(settings.audio.sfx / 100);
        }

        // Apply gameplay settings
        if (settings.gameplay.showFPS) {
            document.getElementById('debug').style.display = 'block';
        } else {
            document.getElementById('debug').style.display = 'none';
        }

        // Difficulty affects AI behavior, etc.
        if (this.game.gameplayManager) {
            this.game.gameplayManager.setDifficulty(settings.gameplay.difficulty);
        }
    }

    loadAccessibilitySettings() {
        const settings = this.getAccessibilitySettings();
        document.getElementById('controlScheme').value = settings.controls.scheme;
        document.getElementById('invertY').checked = settings.controls.invertY;
        document.getElementById('sensitivity').value = settings.controls.sensitivity;
        document.getElementById('sensitivityValue').textContent = settings.controls.sensitivity;

        document.getElementById('textSize').value = settings.display.textSize;
        document.getElementById('highContrast').checked = settings.display.highContrast;
        document.getElementById('reduceMotion').checked = settings.display.reduceMotion;

        document.getElementById('screenReader').checked = settings.audio.screenReader;
        document.getElementById('audioCues').checked = settings.audio.audioCues;
    }

    saveAccessibilitySettings() {
        const settings = {
            controls: {
                scheme: document.getElementById('controlScheme').value,
                invertY: document.getElementById('invertY').checked,
                sensitivity: parseFloat(document.getElementById('sensitivity').value)
            },
            display: {
                textSize: document.getElementById('textSize').value,
                highContrast: document.getElementById('highContrast').checked,
                reduceMotion: document.getElementById('reduceMotion').checked
            },
            audio: {
                screenReader: document.getElementById('screenReader').checked,
                audioCues: document.getElementById('audioCues').checked
            }
        };
        localStorage.setItem('velocityRushAccessibility', JSON.stringify(settings));
        alert('Accessibility settings saved!');
        this.applyAccessibilitySettings(settings);
    }

    resetAccessibilitySettings() {
        localStorage.removeItem('velocityRushAccessibility');
        this.loadAccessibilitySettings();
        alert('Accessibility settings reset to default!');
    }

    getAccessibilitySettings() {
        const defaultSettings = {
            controls: { scheme: 'keyboard', invertY: false, sensitivity: 1.0 },
            display: { textSize: 'medium', highContrast: false, reduceMotion: false },
            audio: { screenReader: false, audioCues: false }
        };
        const saved = localStorage.getItem('velocityRushAccessibility');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }

    applyAccessibilitySettings(settings) {
        // Apply text size
        document.body.style.fontSize = {
            'small': '14px',
            'medium': '16px',
            'large': '18px',
            'extra-large': '20px'
        }[settings.display.textSize] || '16px';

        // Apply high contrast
        if (settings.display.highContrast) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }

        // Apply reduce motion
        if (settings.display.reduceMotion) {
            document.body.style.setProperty('--animation-duration', '0s');
        } else {
            document.body.style.removeProperty('--animation-duration');
        }

        // Apply control scheme
        if (this.game.inputManager) {
            this.game.inputManager.setControlScheme(settings.controls.scheme);
            this.game.inputManager.setInvertY(settings.controls.invertY);
            this.game.inputManager.setSensitivity(settings.controls.sensitivity);
        }

        // Audio settings
        if (this.game.audioManager) {
            this.game.audioManager.setScreenReader(settings.audio.screenReader);
            this.game.audioManager.setAudioCues(settings.audio.audioCues);
        }
    }

    openTrackEditor() {
        console.log('🛠️ Opening track editor...');
        if (this.game.trackEditor) {
            this.game.trackEditor.enterEditMode();
        } else {
            alert('Track Editor not available.');
        }
    }

    enterSpectatorMode() {
        console.log('👁️ Entering spectator mode...');
        if (this.game.spectatorMode) {
            this.game.spectatorMode.activate();
        } else {
            alert('Spectator Mode not available in single-player.');
        }
    }

    startMultiplayer() {
        console.log('🎮 Starting multiplayer...');
        if (this.game.networkManager) {
            this.game.networkManager.connect();
            alert('Connecting to multiplayer server...');
        } else {
            alert('Multiplayer not available.');
        }
    }

    openAccessibilitySettings() {
        console.log('♿ Opening accessibility settings...');
        this.hideMenu();
        document.getElementById('accessibility').style.display = 'block';
        this.loadAccessibilitySettings();
    }

    hideAccessibilitySettings() {
        document.getElementById('accessibility').style.display = 'none';
        this.showMenu();
    }

    toggleVoiceChat() {
        console.log('🎤 Toggling voice chat...');
        if (this.game.voiceChatManager) {
            this.game.voiceChatManager.toggleVoiceChat();
        } else {
            alert('Voice Chat not available.');
        }
    }

    toggleStreaming() {
        console.log('📺 Toggling streaming...');
        if (this.game.streamingManager) {
            this.game.streamingManager.toggleStreaming();
        } else {
            alert('Streaming not available.');
        }
    }

    populateVehicleTypes() {
        const select = document.getElementById('vehicleTypeSelect');
        if (!select) return;

        // Clear existing options
        select.innerHTML = '';

        // Add vehicle types
        const vehicleTypes = [
            { value: 'sports_car', label: '🏎️ Sports Car' },
            { value: 'muscle_car', label: '🚗 Muscle Car' },
            { value: 'rally_car', label: '🚙 Rally Car' },
            { value: 'formula', label: '🏎️ Formula 1' },
            { value: 'offroad', label: '🚛 Offroad' },
            { value: 'hypercar', label: '🏎️ Hypercar' },
            { value: 'electric_supercar', label: '⚡ Electric Supercar' },
            { value: 'drift_car', label: '🏎️ Drift Car' },
            { value: 'gt_car', label: '🏎️ GT Car' },
            { value: 'pickup_truck', label: '🚚 Pickup Truck' },
            { value: 'motorcycle', label: '🏍️ Motorcycle' },
            { value: 'vintage_racer', label: '🏎️ Vintage Racer' },
            { value: 'f1_car', label: '🏎️ F1 Car' },
            { value: 'monster_truck', label: '🚛 Monster Truck' },
            { value: 'atv', label: '🏍️ ATV' },
            { value: 'limousine', label: '🚗 Limousine' }
        ];

        vehicleTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.value;
            option.textContent = type.label;
            select.appendChild(option);
        });
    }

    setupColorGrid() {
        const colorGrid = document.getElementById('colorGrid');
        if (!colorGrid) return;

        // Clear existing colors
        colorGrid.innerHTML = '';

        // Add color options
        const colors = [
            { name: 'Red', value: '#ff0000' },
            { name: 'Blue', value: '#0000ff' },
            { name: 'Green', value: '#00ff00' },
            { name: 'Yellow', value: '#ffff00' },
            { name: 'Purple', value: '#800080' },
            { name: 'Orange', value: '#ff8000' },
            { name: 'Pink', value: '#ff69b4' },
            { name: 'Cyan', value: '#00ffff' },
            { name: 'White', value: '#ffffff' },
            { name: 'Black', value: '#000000' },
            { name: 'Silver', value: '#c0c0c0' },
            { name: 'Gold', value: '#ffd700' }
        ];

        colors.forEach(color => {
            const colorOption = document.createElement('div');
            colorOption.className = 'color-option';
            colorOption.style.backgroundColor = color.value;
            colorOption.title = color.name;
            colorOption.onclick = () => this.selectColor(color);
            colorGrid.appendChild(colorOption);
        });
    }

    selectColor(color) {
        // Remove selected class from all options
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Add selected class to clicked option
        event.target.classList.add('selected');

        // Update vehicle customization
        this.game.vehicleCustomization.setPaint(color.value.replace('#', '0x'), 0.8, 0.9);
        console.log(`🎨 Selected color: ${color.name}`);
    }

    setupPresetControls() {
        const applyPresetBtn = document.getElementById('applyPreset');
        const presetSelect = document.getElementById('presetSelect');

        if (applyPresetBtn && presetSelect) {
            applyPresetBtn.addEventListener('click', () => {
                const preset = presetSelect.value;
                this.applyPreset(preset);
            });
        }
    }

    applyPreset(preset) {
        console.log(`🎨 Applying preset: ${preset}`);

        switch (preset) {
            case 'sport':
                this.game.vehicleCustomization.setPaint(0xff0000, 0.9, 1.0); // Red, glossy
                break;
            case 'luxury':
                this.game.vehicleCustomization.setPaint(0x000000, 1.0, 0.8); // Black, matte
                break;
            case 'offroad':
                this.game.vehicleCustomization.setPaint(0x8B4513, 0.7, 0.6); // Brown, rough
                break;
            default: // default
                this.game.vehicleCustomization.setPaint(0xff0000, 0.8, 0.9); // Red, semi-gloss
                break;
        }

        alert(`✅ Applied ${preset} preset!`);
    }

    showHUD() {
        const hudElement = document.getElementById('hud');
        if (hudElement) {
            hudElement.style.display = 'block';
        }
    }

    hideHUD() {
        const hudElement = document.getElementById('hud');
        if (hudElement) {
            hudElement.style.display = 'none';
        }
    }

    updateHUD() {
        const hudElement = document.getElementById('hud');
        if (!hudElement) return;

        let speed = 0;
        let position = '--';
        let lap = '--/--';

        if (this.game.raceActive && this.game.playerVehicleBody) {
            // Calculate speed from physics velocity
            const velocity = this.game.playerVehicleBody.velocity;
            speed = Math.floor(velocity.length() * 3.6); // m/s to km/h

            // Get race info
            position = this.game.playerPosition || 1;
            lap = `${this.game.currentLap || 1} / ${this.game.totalLaps || 3}`;

            // Calculate elapsed time
            const elapsed = this.game.raceStartTime ? Math.floor((Date.now() - this.game.raceStartTime) / 1000) : 0;
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;

            hudElement.innerHTML = `
                <div style="background: rgba(0,0,0,0.8); padding: 10px; border-radius: 5px; font-family: monospace;">
                    <div>Speed: ${speed} km/h</div>
                    <div>Position: ${position}st</div>
                    <div>Lap: ${lap}</div>
                    <div>Time: ${minutes}:${seconds.toString().padStart(2, '0')}</div>
                </div>
            `;
        } else {
            hudElement.innerHTML = 'HUD: Speed: 0 | Position: -- | Lap: --/--';
        }
    }

    showMenu() {
        this.hideHUD();
        document.getElementById('menu').style.display = 'block';
        this.menuVisible = true;
    }

    hideMenu() {
        document.getElementById('menu').style.display = 'none';
        this.menuVisible = false;
    }



    update() {
        // Update UI elements if needed
    }
}