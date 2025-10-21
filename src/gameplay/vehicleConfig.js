export const VEHICLE_TYPES = {
    SPORTS_CAR: 'sports_car',
    MUSCLE_CAR: 'muscle_car',
    RALLY_CAR: 'rally_car',
    FORMULA: 'formula',
    OFFROAD: 'offroad',
    HYPERCAR: 'hypercar',
    // New vehicles
    ELECTRIC_SUPERCAR: 'electric_supercar',
    DRIFT_CAR: 'drift_car',
    GT_CAR: 'gt_car',
    PICKUP_TRUCK: 'pickup_truck',
    MOTORCYCLE: 'motorcycle',
    VINTAGE_RACER: 'vintage_racer',
    F1_CAR: 'f1_car',
    TRUCK: 'truck',
    ATV: 'atv',
    LIMOUSINE: 'limousine'
};

export const VEHICLE_CONFIGS = {
    [VEHICLE_TYPES.SPORTS_CAR]: {
        name: 'Sports Car',
        description: 'Balanced performance with good handling',
        mass: 1200,
        enginePower: 250, // kW
        topSpeed: 280, // km/h
        acceleration: 0.8,
        handling: 0.7,
        durability: 0.6,
        geometry: {
            width: 1.8,
            height: 1.2,
            length: 4.2
        },
        color: 0xff0000,
        price: { credits: 0, gems: 0 } // Default vehicle
    },

    [VEHICLE_TYPES.MUSCLE_CAR]: {
        name: 'Muscle Car',
        description: 'Heavy and powerful with poor handling',
        mass: 1800,
        enginePower: 320,
        topSpeed: 240,
        acceleration: 0.9,
        handling: 0.3,
        durability: 0.9,
        geometry: {
            width: 2.0,
            height: 1.4,
            length: 4.8
        },
        color: 0x0000ff,
        price: { credits: 5000, gems: 0 }
    },

    [VEHICLE_TYPES.RALLY_CAR]: {
        name: 'Rally Car',
        description: 'Off-road capable with excellent traction',
        mass: 1300,
        enginePower: 220,
        topSpeed: 200,
        acceleration: 0.7,
        handling: 0.8,
        durability: 0.7,
        geometry: {
            width: 1.9,
            height: 1.8,
            length: 4.0
        },
        color: 0x8B4513,
        price: { credits: 7500, gems: 0 }
    },

    [VEHICLE_TYPES.FORMULA]: {
        name: 'Formula Car',
        description: 'Lightweight with incredible handling',
        mass: 600,
        enginePower: 550,
        topSpeed: 350,
        acceleration: 1.0,
        handling: 1.0,
        durability: 0.2,
        geometry: {
            width: 1.5,
            height: 0.8,
            length: 4.5
        },
        color: 0xffd700,
        price: { credits: 15000, gems: 50 }
    },

    [VEHICLE_TYPES.OFFROAD]: {
        name: 'Offroad Vehicle',
        description: 'Heavy-duty with poor road performance',
        mass: 2200,
        enginePower: 180,
        topSpeed: 160,
        acceleration: 0.4,
        handling: 0.2,
        durability: 1.0,
        geometry: {
            width: 2.2,
            height: 2.2,
            length: 4.5
        },
        color: 0x228B22,
        price: { credits: 8000, gems: 0 }
    },

    [VEHICLE_TYPES.HYPERCAR]: {
        name: 'Hypercar',
        description: 'Ultimate performance at any cost',
        mass: 1000,
        enginePower: 750,
        topSpeed: 400,
        acceleration: 1.0,
        handling: 0.9,
        durability: 0.3,
        geometry: {
            width: 1.7,
            height: 1.0,
            length: 4.8
        },
        color: 0x800080,
        price: { credits: 25000, gems: 100 }
    },

    // New vehicle configurations
    [VEHICLE_TYPES.ELECTRIC_SUPERCAR]: {
        name: 'Electric Supercar',
        description: 'Silent speed with instant torque',
        mass: 1400,
        enginePower: 670, // Electric equivalent
        topSpeed: 320,
        acceleration: 1.0,
        handling: 0.8,
        durability: 0.8,
        geometry: {
            width: 1.9,
            height: 1.1,
            length: 4.6
        },
        color: 0x00ffff,
        price: { credits: 30000, gems: 150 }
    },

    [VEHICLE_TYPES.DRIFT_CAR]: {
        name: 'Drift Car',
        description: 'Built for controlled slides and style',
        mass: 1100,
        enginePower: 280,
        topSpeed: 220,
        acceleration: 0.9,
        handling: 0.9,
        durability: 0.7,
        geometry: {
            width: 1.8,
            height: 1.3,
            length: 4.1
        },
        color: 0xff4500,
        price: { credits: 18000, gems: 75 }
    },

    [VEHICLE_TYPES.GT_CAR]: {
        name: 'GT Car',
        description: 'Grand touring excellence for long races',
        mass: 1500,
        enginePower: 350,
        topSpeed: 320,
        acceleration: 0.7,
        handling: 0.8,
        durability: 0.8,
        geometry: {
            width: 1.9,
            height: 1.3,
            length: 4.7
        },
        color: 0x4169e1,
        price: { credits: 22000, gems: 90 }
    },

    [VEHICLE_TYPES.PICKUP_TRUCK]: {
        name: 'Pickup Truck',
        description: 'Tough utility vehicle with surprising speed',
        mass: 2000,
        enginePower: 250,
        topSpeed: 180,
        acceleration: 0.6,
        handling: 0.4,
        durability: 1.0,
        geometry: {
            width: 2.1,
            height: 2.0,
            length: 5.5
        },
        color: 0x8b4513,
        price: { credits: 12000, gems: 25 }
    },

    [VEHICLE_TYPES.MOTORCYCLE]: {
        name: 'Motorcycle',
        description: 'Agile two-wheeler for tight racing',
        mass: 180,
        enginePower: 120,
        topSpeed: 280,
        acceleration: 0.9,
        handling: 1.0,
        durability: 0.4,
        geometry: {
            width: 0.8,
            height: 1.2,
            length: 2.1
        },
        color: 0xff1493,
        price: { credits: 15000, gems: 60 }
    },

    [VEHICLE_TYPES.VINTAGE_RACER]: {
        name: 'Vintage Racer',
        description: 'Classic beauty with retro charm',
        mass: 800,
        enginePower: 180,
        topSpeed: 220,
        acceleration: 0.6,
        handling: 0.7,
        durability: 0.5,
        geometry: {
            width: 1.6,
            height: 1.4,
            length: 3.8
        },
        color: 0xffd700,
        price: { credits: 25000, gems: 120 }
    },

    [VEHICLE_TYPES.F1_CAR]: {
        name: 'F1 Car',
        description: 'Formula 1 technology and aerodynamics',
        mass: 752,
        enginePower: 700,
        topSpeed: 380,
        acceleration: 1.0,
        handling: 1.0,
        durability: 0.1,
        geometry: {
            width: 1.4,
            height: 0.9,
            length: 5.0
        },
        color: 0xff0000,
        price: { credits: 50000, gems: 250 }
    },

    [VEHICLE_TYPES.TRUCK]: {
        name: 'Monster Truck',
        description: 'Massive vehicle for extreme terrain',
        mass: 3500,
        enginePower: 400,
        topSpeed: 120,
        acceleration: 0.3,
        handling: 0.1,
        durability: 1.0,
        geometry: {
            width: 2.5,
            height: 3.5,
            length: 6.0
        },
        color: 0x32cd32,
        price: { credits: 35000, gems: 180 }
    },

    [VEHICLE_TYPES.ATV]: {
        name: 'ATV',
        description: 'All-terrain vehicle for off-road fun',
        mass: 300,
        enginePower: 30,
        topSpeed: 100,
        acceleration: 0.8,
        handling: 0.6,
        durability: 0.9,
        geometry: {
            width: 1.2,
            height: 1.5,
            length: 2.5
        },
        color: 0x228b22,
        price: { credits: 8000, gems: 15 }
    },

    [VEHICLE_TYPES.LIMOUSINE]: {
        name: 'Limousine',
        description: 'Luxury cruiser with VIP treatment',
        mass: 2800,
        enginePower: 220,
        topSpeed: 160,
        acceleration: 0.4,
        handling: 0.3,
        durability: 0.9,
        geometry: {
            width: 2.0,
            height: 1.8,
            length: 6.5
        },
        color: 0x000000,
        price: { credits: 40000, gems: 200 }
    }
};

export class VehicleConfigManager {
    constructor() {
        this.unlockedVehicles = new Set([VEHICLE_TYPES.SPORTS_CAR]);
        this.loadUnlockedVehicles();
    }

    loadUnlockedVehicles() {
        try {
            const stored = localStorage.getItem('unlocked_vehicles');
            if (stored) {
                const unlocked = JSON.parse(stored);
                unlocked.forEach(vehicleType => this.unlockedVehicles.add(vehicleType));
            }
        } catch (error) {
            console.error('Failed to load unlocked vehicles:', error);
        }
    }

    saveUnlockedVehicles() {
        try {
            localStorage.setItem('unlocked_vehicles', JSON.stringify([...this.unlockedVehicles]));
        } catch (error) {
            console.error('Failed to save unlocked vehicles:', error);
        }
    }

    unlockVehicle(vehicleType) {
        if (VEHICLE_CONFIGS[vehicleType]) {
            this.unlockedVehicles.add(vehicleType);
            this.saveUnlockedVehicles();
            return true;
        }
        return false;
    }

    isUnlocked(vehicleType) {
        return this.unlockedVehicles.has(vehicleType);
    }

    getAvailableVehicles() {
        return Object.keys(VEHICLE_CONFIGS).filter(type => this.isUnlocked(type));
    }

    getVehicleConfig(vehicleType) {
        return VEHICLE_CONFIGS[vehicleType] || VEHICLE_CONFIGS[VEHICLE_TYPES.SPORTS_CAR];
    }

    getAllVehicles() {
        return Object.keys(VEHICLE_CONFIGS).map(type => ({
            type,
            ...VEHICLE_CONFIGS[type],
            unlocked: this.isUnlocked(type)
        }));
    }
}