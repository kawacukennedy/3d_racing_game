export class UIManager {
    constructor(game) {
        this.game = game;
        this.menuVisible = false;
        this.customizationVisible = false;
        this.selectedColor = null;
    }

    init() {
        // Menu controls
        document.getElementById('startRace').addEventListener('click', () => {
            this.startQuickRace();
        });

        document.getElementById('customize').addEventListener('click', () => {
            this.showCustomization();
        });

        document.getElementById('store').addEventListener('click', () => {
            this.showStore();
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

        // Initialize HUD
        this.updateHUD();

        // Show menu initially
        this.showMenu();
    }

    startQuickRace() {
        console.log('🏁 Starting quick race...');
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
        alert('Settings panel coming soon! This will include graphics, audio, and gameplay options.');
    }

    openTrackEditor() {
        console.log('🛠️ Opening track editor...');
        alert('Track Editor coming soon! Create and customize your own racing tracks.');
    }

    enterSpectatorMode() {
        console.log('👁️ Entering spectator mode...');
        alert('Spectator Mode coming soon! Watch other players race in real-time.');
    }

    startMultiplayer() {
        console.log('🎮 Starting multiplayer...');
        alert('Multiplayer coming soon! Join online races with players from around the world.');
    }

    openAccessibilitySettings() {
        console.log('♿ Opening accessibility settings...');
        alert('Accessibility Settings coming soon! Customize controls, text size, and more.');
    }

    toggleVoiceChat() {
        console.log('🎤 Toggling voice chat...');
        alert('Voice Chat coming soon! Communicate with other racers during multiplayer games.');
    }

    toggleStreaming() {
        console.log('📺 Toggling streaming...');
        alert('Streaming coming soon! Broadcast your races to viewers and earn rewards.');
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

        if (this.game.raceActive) {
            // Calculate speed (simplified)
            speed = Math.floor(Math.random() * 200); // Placeholder - would calculate from velocity

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

    showCustomization() {
        this.hideMenu();
        this.populateVehicleTypes();
        document.getElementById('customization').style.display = 'block';
        this.customizationVisible = true;
    }

    hideCustomization() {
        document.getElementById('customization').style.display = 'none';
        this.customizationVisible = false;
        this.showMenu();
    }

    setupColorGrid() {
        const colorGrid = document.getElementById('colorGrid');
        const colors = this.game.vehicleCustomization.getAvailableColors();

        colors.forEach(color => {
            const colorElement = document.createElement('div');
            colorElement.className = 'color-option';
            colorElement.style.backgroundColor = `#${color.value.toString(16).padStart(6, '0')}`;
            colorElement.addEventListener('click', () => {
                this.selectColor(color.value);
            });
            colorGrid.appendChild(colorElement);
        });
    }

    selectColor(colorValue) {
        // Update UI
        document.querySelectorAll('.color-option').forEach(el => {
            el.classList.remove('selected');
        });
        event.target.classList.add('selected');

        // Apply color
        this.game.vehicleCustomization.setPaint(colorValue);
        this.game.vehicleCustomization.applyCustomization(this.game.sceneManager.playerVehicle);
    }

    populateVehicleTypes() {
        const select = document.getElementById('vehicleTypeSelect');
        select.innerHTML = '';

        const vehicles = this.game.sceneManager.vehicleConfigManager.getAllVehicles();
        vehicles.forEach(vehicle => {
            const option = document.createElement('option');
            option.value = vehicle.type;
            option.textContent = vehicle.unlocked ?
                `${vehicle.name} - ${vehicle.description}` :
                `${vehicle.name} (Locked - ${vehicle.price.credits} credits)`;
            option.disabled = !vehicle.unlocked;
            select.appendChild(option);
        });

        // Set current selection
        select.value = this.game.sceneManager.currentVehicleType;
    }

    setupPresetControls() {
        // Vehicle type change handler
        document.getElementById('vehicleTypeSelect').addEventListener('change', (e) => {
            const newType = e.target.value;
            if (this.game.sceneManager.changePlayerVehicle(newType)) {
                // Reapply customization with new base color
                const vehicleConfig = this.game.sceneManager.vehicleConfigManager.getVehicleConfig(newType);
                this.game.vehicleCustomization.applyCustomization(
                    this.game.sceneManager.playerVehicle,
                    null,
                    vehicleConfig.color
                );
                // Save the new vehicle type
                localStorage.setItem('current_vehicle_type', newType);
            }
        });

        document.getElementById('applyPreset').addEventListener('click', () => {
            const preset = document.getElementById('presetSelect').value;
            if (this.game.vehicleCustomization.loadPreset(preset)) {
                const vehicleConfig = this.game.sceneManager.vehicleConfigManager.getVehicleConfig(
                    this.game.sceneManager.currentVehicleType
                );
                this.game.vehicleCustomization.applyCustomization(
                    this.game.sceneManager.playerVehicle,
                    null,
                    vehicleConfig.color
                );
            }
        });
    }

    startMultiplayer() {
        this.hideMenu();
        this.game.networkManager.connect();
        this.game.networkManager.joinMatchmaking({
            name: 'Player', // Could be customizable
            customization: this.game.vehicleCustomization.getCurrentCustomization()
        });
        // Show matchmaking UI or status
        console.log('Joining multiplayer matchmaking...');
    }

    openTrackEditor() {
        this.hideMenu();
        this.game.trackEditor.enterEditMode();
    }

    enterSpectatorMode() {
        this.hideMenu();
        this.game.spectatorMode.enterSpectatorMode();
    }

    openAccessibilitySettings() {
        this.hideMenu();
        this.game.accessibilityManager.showAccessibilityPanel();
    }

    toggleVoiceChat() {
        const status = this.game.voiceChatManager.getVoiceChatStatus();

        if (!status.enabled) {
            // Enable voice chat
            this.game.voiceChatManager.enableVoiceChat();
            alert('Voice chat enabled. Press M to mute/unmute, T to push-to-talk.');
        } else {
            // Disable voice chat
            this.game.voiceChatManager.disableVoiceChat();
            alert('Voice chat disabled.');
        }
    }

    toggleStreaming() {
        const status = this.game.streamingManager.getStreamingStats();

        if (!status.isStreaming) {
            // Enable streaming
            this.game.streamingManager.enableStreaming();
            alert('Streaming overlay enabled. Use OBS or streaming software to capture the overlay.');
        } else {
            // Disable streaming
            this.game.streamingManager.disableStreaming();
            alert('Streaming overlay disabled.');
        }
    }

    showStore() {
        this.hideMenu();
        this.updateStoreDisplay();
        document.getElementById('store').style.display = 'block';
    }

    hideStore() {
        document.getElementById('store').style.display = 'none';
        this.showMenu();
    }

    updateStoreDisplay() {
        // Update currency display
        const currency = this.game.storeManager.getCurrency();
        document.getElementById('currencyDisplay').textContent =
            `Credits: ${currency.credits} | Gems: ${currency.gems}`;

        // Update store items
        const storeItemsDiv = document.getElementById('storeItems');
        storeItemsDiv.innerHTML = '';

        const availableItems = this.game.storeManager.getAvailableItems();
        availableItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = `store-item ${item.rarity}`;
            itemDiv.innerHTML = `
                <strong>${item.name}</strong><br>
                <small>${this.formatPrice(item.price)}</small>
            `;
            itemDiv.addEventListener('click', () => {
                this.purchaseItem(item.id);
            });
            storeItemsDiv.appendChild(itemDiv);
        });

        // Add close button handler
        document.getElementById('closeStore').addEventListener('click', () => {
            this.hideStore();
        });
    }

    formatPrice(price) {
        const parts = [];
        if (price.credits) parts.push(`${price.credits} credits`);
        if (price.gems) parts.push(`${price.gems} gems`);
        return parts.join(', ');
    }

    purchaseItem(itemId) {
        const result = this.game.storeManager.purchaseItem(itemId);
        if (result.success) {
            // Handle vehicle unlocks
            if (result.item.type === 'vehicle') {
                this.game.sceneManager.vehicleConfigManager.unlockVehicle(result.item.vehicleType);
                alert(`Unlocked ${result.item.name}!`);
                this.populateVehicleTypes(); // Refresh vehicle list
            } else {
                alert(`Purchased ${result.item.name}!`);
            }
            this.updateStoreDisplay();
        } else {
            alert(`Purchase failed: ${result.reason}`);
        }
    }

    update() {
        // Update UI elements if needed
    }
}