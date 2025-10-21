export class ProceduralTrackGenerator {
    constructor() {
        this.seed = Date.now();
        this.random = this.createSeededRandom(this.seed);
        this.trackSegments = [];
        this.checkpoints = [];
        this.trackLength = 0;
        this.difficulty = 0.5; // 0-1
    }

    createSeededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    setSeed(seed) {
        this.seed = seed;
        this.random = this.createSeededRandom(seed);
    }

    setDifficulty(difficulty) {
        this.difficulty = Math.max(0, Math.min(1, difficulty));
    }

    generateTrack(length = 1000, segments = 20) {
        this.trackSegments = [];
        this.checkpoints = [];
        this.trackLength = length;

        const segmentLength = length / segments;
        let currentPos = { x: 0, y: 0, z: 0 };
        let currentDirection = { x: 0, y: 0, z: 1 }; // Facing positive Z

        for (let i = 0; i < segments; i++) {
            const segment = this.generateSegment(currentPos, currentDirection, segmentLength, i);
            this.trackSegments.push(segment);

            // Update position and direction for next segment
            currentPos = segment.endPos;
            currentDirection = segment.endDirection;
        }

        // Create checkpoints
        this.generateCheckpoints();

        // Add decorations and features
        this.addTrackFeatures();

        return {
            segments: this.trackSegments,
            checkpoints: this.checkpoints,
            length: this.trackLength,
            seed: this.seed,
            difficulty: this.difficulty
        };
    }

    generateSegment(startPos, startDirection, length, index) {
        const segmentType = this.chooseSegmentType(index);

        switch (segmentType) {
            case 'straight':
                return this.generateStraightSegment(startPos, startDirection, length);
            case 'corner':
                return this.generateCornerSegment(startPos, startDirection, length);
            case 'hill':
                return this.generateHillSegment(startPos, startDirection, length);
            case 'chicane':
                return this.generateChicaneSegment(startPos, startDirection, length);
            case 'jump':
                return this.generateJumpSegment(startPos, startDirection, length);
            case 'banked_corner':
                return this.generateBankedCornerSegment(startPos, startDirection, length);
            case 'tunnel':
                return this.generateTunnelSegment(startPos, startDirection, length);
            case 'hairpin':
                return this.generateHairpinSegment(startPos, startDirection, length);
            case 'downhill':
                return this.generateDownhillSegment(startPos, startDirection, length);
            case 'uphill':
                return this.generateUphillSegment(startPos, startDirection, length);
            case 'speed_bump':
                return this.generateSpeedBumpSegment(startPos, startDirection, length);
            case 'offroad':
                return this.generateOffroadSegment(startPos, startDirection, length);
            case 'bridge':
                return this.generateBridgeSegment(startPos, startDirection, length);
            case 'split':
                return this.generateSplitSegment(startPos, startDirection, length);
            default:
                return this.generateStraightSegment(startPos, startDirection, length);
        }
    }

    chooseSegmentType(index) {
        const rand = this.random();

        // Adjust probabilities based on difficulty
        const straightProb = 0.30 + (this.difficulty * 0.10); // Easier tracks have more straights
        const cornerProb = 0.20 + (this.difficulty * 0.20);   // Harder tracks have more corners
        const hillProb = 0.10 + (this.difficulty * 0.15);     // Harder tracks have more hills
        const chicaneProb = 0.10 + (this.difficulty * 0.20);  // Harder tracks have more chicanes
        const jumpProb = 0.06 + (this.difficulty * 0.10);     // Harder tracks have more jumps
        const bankedProb = 0.04 + (this.difficulty * 0.05);   // Banked corners for high speeds
        const tunnelProb = 0.03 + (this.difficulty * 0.05);   // Tunnels for atmosphere
        const hairpinProb = 0.03 + (this.difficulty * 0.10);  // Hairpins for technical driving
        const downhillProb = 0.02 + (this.difficulty * 0.08); // Downhill sections
        const uphillProb = 0.02 + (this.difficulty * 0.08);   // Uphill sections
        const speedBumpProb = 0.02 + (this.difficulty * 0.05); // Speed bumps for caution
        const offroadProb = 0.02 + (this.difficulty * 0.10);   // Offroad sections
        const bridgeProb = 0.01 + (this.difficulty * 0.05);    // Bridges for elevation
        const splitProb = 0.01 + (this.difficulty * 0.05);     // Split paths for choices

        let cumulative = 0;
        if (rand < (cumulative += straightProb)) return 'straight';
        if (rand < (cumulative += cornerProb)) return 'corner';
        if (rand < (cumulative += hillProb)) return 'hill';
        if (rand < (cumulative += chicaneProb)) return 'chicane';
        if (rand < (cumulative += jumpProb)) return 'jump';
        if (rand < (cumulative += bankedProb)) return 'banked_corner';
        if (rand < (cumulative += tunnelProb)) return 'tunnel';
        if (rand < (cumulative += hairpinProb)) return 'hairpin';
        if (rand < (cumulative += downhillProb)) return 'downhill';
        if (rand < (cumulative += uphillProb)) return 'uphill';
        if (rand < (cumulative += speedBumpProb)) return 'speed_bump';
        if (rand < (cumulative += offroadProb)) return 'offroad';
        if (rand < (cumulative += bridgeProb)) return 'bridge';
        if (rand < (cumulative += splitProb)) return 'split';
        return 'straight'; // fallback
    }

    generateStraightSegment(startPos, startDirection, length) {
        const endPos = {
            x: startPos.x + startDirection.x * length,
            y: startPos.y,
            z: startPos.z + startDirection.z * length
        };

        return {
            type: 'straight',
            startPos: { ...startPos },
            endPos: endPos,
            startDirection: { ...startDirection },
            endDirection: { ...startDirection },
            length: length,
            width: 8 + (this.random() - 0.5) * 2, // Slight width variation
            features: this.generateStraightFeatures(length)
        };
    }

    generateCornerSegment(startPos, startDirection, length) {
        const cornerRadius = 15 + this.random() * 20; // 15-35 units radius
        const cornerAngle = (Math.PI / 4) + (this.random() * Math.PI / 4); // 45-90 degrees

        // Choose turn direction
        const turnDirection = this.random() > 0.5 ? 1 : -1;

        // Calculate corner center
        const perpendicular = {
            x: -startDirection.z * turnDirection,
            y: 0,
            z: startDirection.x * turnDirection
        };

        const centerPos = {
            x: startPos.x + perpendicular.x * cornerRadius,
            y: startPos.y,
            z: startPos.z + perpendicular.z * cornerRadius
        };

        // Calculate end position on the circle
        const endAngle = cornerAngle;
        const endPos = {
            x: centerPos.x + Math.cos(endAngle - Math.PI/2 * turnDirection) * cornerRadius,
            y: startPos.y,
            z: centerPos.z + Math.sin(endAngle - Math.PI/2 * turnDirection) * cornerRadius
        };

        // Calculate end direction
        const endDirection = {
            x: Math.cos(endAngle) * startDirection.x - Math.sin(endAngle) * startDirection.z * turnDirection,
            y: 0,
            z: Math.sin(endAngle) * startDirection.x + Math.cos(endAngle) * startDirection.z * turnDirection
        };

        return {
            type: 'corner',
            startPos: { ...startPos },
            endPos: endPos,
            startDirection: { ...startDirection },
            endDirection: endDirection,
            length: length,
            radius: cornerRadius,
            angle: cornerAngle,
            direction: turnDirection,
            features: this.generateCornerFeatures(cornerRadius, cornerAngle)
        };
    }

    generateHillSegment(startPos, startDirection, length) {
        const hillHeight = 3 + this.random() * 5; // 3-8 units high
        const hillShape = this.random() > 0.5 ? 'crest' : 'valley';

        const endPos = {
            x: startPos.x + startDirection.x * length,
            y: startPos.y + (hillShape === 'crest' ? hillHeight : -hillHeight),
            z: startPos.z + startDirection.z * length
        };

        return {
            type: 'hill',
            startPos: { ...startPos },
            endPos: endPos,
            startDirection: { ...startDirection },
            endDirection: { ...startDirection },
            length: length,
            height: hillHeight,
            shape: hillShape,
            features: this.generateHillFeatures(length, hillHeight, hillShape)
        };
    }

    generateChicaneSegment(startPos, startDirection, length) {
        // Create a series of quick direction changes
        const chicaneCount = 2 + Math.floor(this.random() * 3); // 2-4 chicanes
        const chicaneSpacing = length / (chicaneCount * 2);

        const points = [startPos];
        let currentPos = { ...startPos };
        let currentDirection = { ...startDirection };

        for (let i = 0; i < chicaneCount * 2; i++) {
            const turnAngle = (Math.PI / 6) * (i % 2 === 0 ? 1 : -1); // 30 degree turns
            const turnDirection = i % 4 < 2 ? 1 : -1;

            // Rotate direction
            const newDirection = {
                x: currentDirection.x * Math.cos(turnAngle) - currentDirection.z * Math.sin(turnAngle) * turnDirection,
                y: 0,
                z: currentDirection.x * Math.sin(turnAngle) * turnDirection + currentDirection.z * Math.cos(turnAngle)
            };

            currentPos = {
                x: currentPos.x + newDirection.x * chicaneSpacing,
                y: currentPos.y,
                z: currentPos.z + newDirection.z * chicaneSpacing
            };

            points.push({ ...currentPos });
            currentDirection = newDirection;
        }

        return {
            type: 'chicane',
            startPos: { ...startPos },
            endPos: points[points.length - 1],
            startDirection: { ...startDirection },
            endDirection: currentDirection,
            length: length,
            points: points,
            features: this.generateChicaneFeatures(points)
        };
    }

    generateStraightFeatures(length) {
        const features = [];

        // Add random decorations
        if (this.random() > 0.7) {
            features.push({
                type: 'billboard',
                position: { x: 0, y: 2, z: length / 2 },
                content: this.getRandomBillboardContent()
            });
        }

        // Add tire marks occasionally
        if (this.random() > 0.8) {
            features.push({
                type: 'tire_marks',
                position: { x: 0, y: 0, z: length / 2 },
                length: length * 0.3
            });
        }

        return features;
    }

    generateCornerFeatures(radius, angle) {
        const features = [];

        // Add corner workers or spectators
        if (this.random() > 0.6) {
            features.push({
                type: 'spectators',
                position: { x: 0, y: 0, z: 0 }, // Relative to corner center
                count: Math.floor(this.random() * 10) + 5
            });
        }

        return features;
    }

    generateHillFeatures(length, height, shape) {
        const features = [];

        // Add jump ramps on hills
        if (shape === 'crest' && this.random() > 0.7) {
            features.push({
                type: 'jump_ramp',
                position: { x: 0, y: height / 2, z: length / 2 },
                height: height * 0.8
            });
        }

        return features;
    }

    generateChicaneFeatures(points) {
        const features = [];

        // Add warning signs
        points.forEach((point, index) => {
            if (index > 0 && this.random() > 0.8) {
                features.push({
                    type: 'warning_sign',
                    position: { ...point, y: 1 },
                    signType: 'chicane'
                });
            }
        });

        return features;
    }

    generateCheckpoints() {
        this.checkpoints = [];

        // Place checkpoints at regular intervals
        const checkpointInterval = this.trackLength / 8; // 8 checkpoints
        let distance = 0;

        this.trackSegments.forEach((segment, index) => {
            if (distance >= checkpointInterval * this.checkpoints.length) {
                const progress = (checkpointInterval * this.checkpoints.length - (distance - segment.length)) / segment.length;
                const position = this.interpolatePosition(segment.startPos, segment.endPos, progress);

                this.checkpoints.push({
                    id: this.checkpoints.length,
                    position: position,
                    segmentIndex: index,
                    distance: distance + segment.length * progress
                });
            }

            distance += segment.length;
        });

        // Ensure we have at least start and finish
        if (this.checkpoints.length === 0) {
            this.checkpoints.push({
                id: 0,
                position: { ...this.trackSegments[0].startPos },
                segmentIndex: 0,
                distance: 0
            });
        }

        // Add finish line
        const lastSegment = this.trackSegments[this.trackSegments.length - 1];
        this.checkpoints.push({
            id: this.checkpoints.length,
            position: { ...lastSegment.endPos },
            segmentIndex: this.trackSegments.length - 1,
            distance: this.trackLength,
            isFinish: true
        });
    }

    addTrackFeatures() {
        // Add global track features like pit lane, grandstands, etc.
        this.trackFeatures = [];

        // Add pit lane entrance
        if (this.random() > 0.3) {
            const pitPosition = this.trackLength * 0.7; // 70% around track
            this.trackFeatures.push({
                type: 'pit_entrance',
                position: this.getPositionAtDistance(pitPosition),
                length: 20
            });
        }

        // Add grandstands at random positions
        for (let i = 0; i < 3; i++) {
            if (this.random() > 0.6) {
                const position = this.trackLength * this.random();
                this.trackFeatures.push({
                    type: 'grandstand',
                    position: this.getPositionAtDistance(position),
                    capacity: Math.floor(this.random() * 1000) + 500
                });
            }
        }
    }

    interpolatePosition(startPos, endPos, progress) {
        return {
            x: startPos.x + (endPos.x - startPos.x) * progress,
            y: startPos.y + (endPos.y - startPos.y) * progress,
            z: startPos.z + (endPos.z - startPos.z) * progress
        };
    }

    getPositionAtDistance(distance) {
        let currentDistance = 0;

        for (const segment of this.trackSegments) {
            if (currentDistance + segment.length >= distance) {
                const progress = (distance - currentDistance) / segment.length;
                return this.interpolatePosition(segment.startPos, segment.endPos, progress);
            }
            currentDistance += segment.length;
        }

        // Fallback to end position
        return this.trackSegments[this.trackSegments.length - 1].endPos;
    }

    getRandomBillboardContent() {
        const contents = [
            'SpeedRacer Pro',
            'TurboBoost Energy',
            'RaceTech Tires',
            'Velocity Motors',
            'Adrenaline Racing',
            'Thunder Racing League'
        ];
        return contents[Math.floor(this.random() * contents.length)];
    }

    exportTrackData() {
        return {
            seed: this.seed,
            difficulty: this.difficulty,
            segments: this.trackSegments,
            checkpoints: this.checkpoints,
            features: this.trackFeatures,
            metadata: {
                length: this.trackLength,
                segmentCount: this.trackSegments.length,
                checkpointCount: this.checkpoints.length,
                featureCount: this.trackFeatures.length
            }
        };
    }

    generateTrackWithSeed(seed, difficulty = 0.5) {
        this.setSeed(seed);
        this.setDifficulty(difficulty);
        return this.generateTrack();
    }

    getTrackStats() {
        const stats = {
            straightSegments: 0,
            cornerSegments: 0,
            hillSegments: 0,
            chicaneSegments: 0,
            totalLength: this.trackLength,
            averageCornerRadius: 0,
            maxElevation: 0,
            minElevation: 0
        };

        let totalCornerRadius = 0;
        let cornerCount = 0;

        this.trackSegments.forEach(segment => {
            switch (segment.type) {
                case 'straight':
                    stats.straightSegments++;
                    break;
                case 'corner':
                    stats.cornerSegments++;
                    totalCornerRadius += segment.radius;
                    cornerCount++;
                    break;
                case 'hill':
                    stats.hillSegments++;
                    stats.maxElevation = Math.max(stats.maxElevation, segment.height);
                    stats.minElevation = Math.min(stats.minElevation, -segment.height);
                    break;
                case 'chicane':
                    stats.chicaneSegments++;
                    break;
            }
        });

        stats.averageCornerRadius = cornerCount > 0 ? totalCornerRadius / cornerCount : 0;

        return stats;
    }

    generateJumpSegment(startPos, startDirection, length) {
        const jumpHeight = 3 + this.random() * 4; // 3-7 units high
        const jumpLength = length * 0.8; // Jump takes most of segment
        const landingLength = length * 0.2; // Landing area

        // Create parabolic jump path
        const midPoint = {
            x: startPos.x + startDirection.x * (jumpLength / 2),
            y: jumpHeight,
            z: startPos.z + startDirection.z * (jumpLength / 2)
        };

        const endPos = {
            x: startPos.x + startDirection.x * length,
            y: 0,
            z: startPos.z + startDirection.z * length
        };

        return {
            type: 'jump',
            startPos: { ...startPos },
            endPos: endPos,
            startDirection: { ...startDirection },
            endDirection: { ...startDirection },
            length: length,
            jumpHeight: jumpHeight,
            controlPoint: midPoint,
            features: this.generateJumpFeatures(jumpHeight)
        };
    }

    generateBankedCornerSegment(startPos, startDirection, length) {
        const cornerRadius = 15 + this.random() * 20; // 15-35 units
        const turnAngle = (Math.PI / 3) + (this.random() * Math.PI / 6); // 60-90 degrees
        const bankAngle = Math.PI / 6; // 30 degrees banking

        // Calculate corner center and end position
        const turnDirection = this.random() > 0.5 ? 1 : -1; // Left or right turn
        const centerOffset = {
            x: -startDirection.z * cornerRadius * turnDirection,
            y: 0,
            z: startDirection.x * cornerRadius * turnDirection
        };

        const centerPos = {
            x: startPos.x + centerOffset.x,
            y: startPos.y,
            z: startPos.z + centerOffset.z
        };

        const endPos = {
            x: centerPos.x + Math.cos(turnAngle * turnDirection) * cornerRadius * startDirection.x - Math.sin(turnAngle * turnDirection) * cornerRadius * startDirection.z,
            y: startPos.y,
            z: centerPos.z + Math.sin(turnAngle * turnDirection) * cornerRadius * startDirection.x + Math.cos(turnAngle * turnDirection) * cornerRadius * startDirection.z
        };

        const endDirection = {
            x: startDirection.x * Math.cos(turnAngle) - startDirection.z * Math.sin(turnAngle) * turnDirection,
            y: 0,
            z: startDirection.x * Math.sin(turnAngle) * turnDirection + startDirection.z * Math.cos(turnAngle)
        };

        return {
            type: 'banked_corner',
            startPos: { ...startPos },
            endPos: endPos,
            startDirection: { ...startDirection },
            endDirection: endDirection,
            length: length,
            radius: cornerRadius,
            turnAngle: turnAngle,
            bankAngle: bankAngle,
            turnDirection: turnDirection,
            centerPos: centerPos,
            features: this.generateBankedCornerFeatures(cornerRadius, turnAngle)
        };
    }

    generateTunnelSegment(startPos, startDirection, length) {
        const tunnelHeight = 8 + this.random() * 4; // 8-12 units high
        const tunnelWidth = 10 + this.random() * 4; // 10-14 units wide

        const endPos = {
            x: startPos.x + startDirection.x * length,
            y: startPos.y,
            z: startPos.z + startDirection.z * length
        };

        return {
            type: 'tunnel',
            startPos: { ...startPos },
            endPos: endPos,
            startDirection: { ...startDirection },
            endDirection: { ...startDirection },
            length: length,
            height: tunnelHeight,
            width: tunnelWidth,
            features: this.generateTunnelFeatures(length, tunnelHeight, tunnelWidth)
        };
    }

    generateJumpFeatures(jumpHeight) {
        const features = [];

        // Add landing zone markers
        features.push({
            type: 'landing_zone',
            position: { x: 0, y: 0, z: 0 }, // Relative to segment
            size: jumpHeight > 5 ? 'large' : 'small'
        });

        // Add speed boost after jump if high enough
        if (jumpHeight > 4 && this.random() > 0.6) {
            features.push({
                type: 'speed_boost',
                position: { x: 0, y: 0, z: 0.8 }, // 80% along segment
                multiplier: 1.2
            });
        }

        return features;
    }

    generateBankedCornerFeatures(radius, turnAngle) {
        const features = [];

        // Add banking indicators
        features.push({
            type: 'banking_sign',
            position: { x: 0, y: 2, z: 0 },
            bankAngle: Math.PI / 6
        });

        // Add apex markers for high-speed corners
        if (radius < 20) {
            features.push({
                type: 'apex_marker',
                position: { x: 0, y: 0, z: 0.5 }, // Middle of corner
                optimalLine: 'inside'
            });
        }

        return features;
    }

    generateTunnelFeatures(length, height, width) {
        const features = [];

        // Add tunnel lighting
        const lightSpacing = 5;
        for (let i = 0; i < length; i += lightSpacing) {
            features.push({
                type: 'tunnel_light',
                position: { x: 0, y: height * 0.8, z: i / length },
                intensity: 0.8
            });
        }

        // Add tunnel entrance/exit effects
        features.push({
            type: 'tunnel_entrance',
            position: { x: 0, y: height / 2, z: 0 },
            effect: 'fade_in'
        });

        features.push({
            type: 'tunnel_exit',
            position: { x: 0, y: height / 2, z: 1 },
            effect: 'fade_out'
        });

        return features;
    }

    // New segment generation methods
    generateHairpinSegment(startPos, startDirection, length) {
        // Hairpins are tight 180-degree turns
        const hairpinRadius = 8 + this.random() * 4; // Very tight radius
        const hairpinAngle = Math.PI; // 180 degrees

        const turnDirection = this.random() > 0.5 ? 1 : -1;

        // Calculate hairpin center
        const perpendicular = {
            x: -startDirection.z * turnDirection,
            y: 0,
            z: startDirection.x * turnDirection
        };

        const centerPos = {
            x: startPos.x + perpendicular.x * hairpinRadius,
            y: startPos.y,
            z: startPos.z + perpendicular.z * hairpinRadius
        };

        // Calculate end position
        const endPos = {
            x: centerPos.x + Math.cos(hairpinAngle - Math.PI/2 * turnDirection) * hairpinRadius,
            y: startPos.y,
            z: centerPos.z + Math.sin(hairpinAngle - Math.PI/2 * turnDirection) * hairpinRadius
        };

        // Calculate end direction (reversed)
        const endDirection = {
            x: -startDirection.x,
            y: 0,
            z: -startDirection.z
        };

        return {
            type: 'hairpin',
            startPos: { ...startPos },
            endPos: endPos,
            startDirection: { ...startDirection },
            endDirection: endDirection,
            length: length,
            width: 6, // Narrower for technical driving
            radius: hairpinRadius,
            turnAngle: hairpinAngle,
            features: this.generateHairpinFeatures(hairpinRadius, hairpinAngle)
        };
    }

    generateDownhillSegment(startPos, startDirection, length) {
        const downhillAngle = -0.15 - (this.random() * 0.1); // -15 to -25 degrees
        const endHeight = length * Math.sin(Math.abs(downhillAngle));

        const endPos = {
            x: startPos.x + startDirection.x * length,
            y: startPos.y + endHeight, // Downhill so Y decreases
            z: startPos.z + startDirection.z * length
        };

        return {
            type: 'downhill',
            startPos: { ...startPos },
            endPos: endPos,
            startDirection: { ...startDirection },
            endDirection: { ...startDirection },
            length: length,
            width: 8,
            slopeAngle: downhillAngle,
            heightChange: endHeight,
            features: this.generateDownhillFeatures(length, downhillAngle)
        };
    }

    generateUphillSegment(startPos, startDirection, length) {
        const uphillAngle = 0.15 + (this.random() * 0.1); // 15 to 25 degrees
        const endHeight = length * Math.sin(uphillAngle);

        const endPos = {
            x: startPos.x + startDirection.x * length,
            y: startPos.y + endHeight, // Uphill so Y increases
            z: startPos.z + startDirection.z * length
        };

        return {
            type: 'uphill',
            startPos: { ...startPos },
            endPos: endPos,
            startDirection: { ...startDirection },
            endDirection: { ...startDirection },
            length: length,
            width: 8,
            slopeAngle: uphillAngle,
            heightChange: endHeight,
            features: this.generateUphillFeatures(length, uphillAngle)
        };
    }

    generateSpeedBumpSegment(startPos, startDirection, length) {
        const bumpHeight = 0.5 + this.random() * 0.5; // 0.5-1.0 units high
        const bumpWidth = 2 + this.random() * 2; // 2-4 units wide

        const endPos = {
            x: startPos.x + startDirection.x * length,
            y: startPos.y,
            z: startPos.z + startDirection.z * length
        };

        return {
            type: 'speed_bump',
            startPos: { ...startPos },
            endPos: endPos,
            startDirection: { ...startDirection },
            endDirection: { ...startDirection },
            length: length,
            width: 8,
            bumpHeight: bumpHeight,
            bumpWidth: bumpWidth,
            features: this.generateSpeedBumpFeatures(bumpHeight, bumpWidth)
        };
    }

    generateOffroadSegment(startPos, startDirection, length) {
        const roughness = 0.3 + this.random() * 0.4; // Surface roughness
        const mudLevel = this.random() * 0.8; // Mud accumulation

        const endPos = {
            x: startPos.x + startDirection.x * length,
            y: startPos.y,
            z: startPos.z + startDirection.z * length
        };

        return {
            type: 'offroad',
            startPos: { ...startPos },
            endPos: endPos,
            startDirection: { ...startDirection },
            endDirection: { ...startDirection },
            length: length,
            width: 10, // Wider for offroad
            roughness: roughness,
            mudLevel: mudLevel,
            features: this.generateOffroadFeatures(length, roughness, mudLevel)
        };
    }

    generateBridgeSegment(startPos, startDirection, length) {
        const bridgeHeight = 3 + this.random() * 4; // 3-7 units above ground
        const bridgeWidth = 6 + this.random() * 2; // Bridge width

        const endPos = {
            x: startPos.x + startDirection.x * length,
            y: startPos.y + bridgeHeight, // Bridge elevation
            z: startPos.z + startDirection.z * length
        };

        return {
            type: 'bridge',
            startPos: { ...startPos },
            endPos: endPos,
            startDirection: { ...startDirection },
            endDirection: { ...startDirection },
            length: length,
            width: bridgeWidth,
            bridgeHeight: bridgeHeight,
            features: this.generateBridgeFeatures(length, bridgeHeight, bridgeWidth)
        };
    }

    generateSplitSegment(startPos, startDirection, length) {
        // Split path with two possible routes
        const splitAngle = (Math.PI / 6) + (this.random() * Math.PI / 6); // 30-60 degrees
        const splitDistance = length * 0.6; // Split occurs 60% through segment

        // Calculate split point
        const splitPoint = {
            x: startPos.x + startDirection.x * splitDistance,
            y: startPos.y,
            z: startPos.z + startDirection.z * splitDistance
        };

        // Left path
        const leftDirection = {
            x: startDirection.x * Math.cos(splitAngle) - startDirection.z * Math.sin(splitAngle),
            y: 0,
            z: startDirection.x * Math.sin(splitAngle) + startDirection.z * Math.cos(splitAngle)
        };

        const leftEnd = {
            x: splitPoint.x + leftDirection.x * (length - splitDistance),
            y: splitPoint.y,
            z: splitPoint.z + leftDirection.z * (length - splitDistance)
        };

        // Right path
        const rightDirection = {
            x: startDirection.x * Math.cos(-splitAngle) - startDirection.z * Math.sin(-splitAngle),
            y: 0,
            z: startDirection.x * Math.sin(-splitAngle) + startDirection.z * Math.cos(-splitAngle)
        };

        const rightEnd = {
            x: splitPoint.x + rightDirection.x * (length - splitDistance),
            y: splitPoint.y,
            z: splitPoint.z + rightDirection.z * (length - splitDistance)
        };

        return {
            type: 'split',
            startPos: { ...startPos },
            endPos: leftEnd, // Primary end position
            startDirection: { ...startDirection },
            endDirection: leftDirection,
            length: length,
            width: 8,
            splitPoint: splitPoint,
            leftPath: { endPos: leftEnd, direction: leftDirection },
            rightPath: { endPos: rightEnd, direction: rightDirection },
            splitAngle: splitAngle,
            features: this.generateSplitFeatures(splitPoint, leftEnd, rightEnd)
        };
    }

    // Feature generation methods for new segments
    generateHairpinFeatures(radius, turnAngle) {
        const features = [];

        // Add hairpin warning signs
        features.push({
            type: 'hairpin_sign',
            position: { x: 0, y: 2, z: 0 },
            warning: 'Tight Turn Ahead'
        });

        // Add run-off area markers
        features.push({
            type: 'runoff_area',
            position: { x: radius * 1.5, y: 0, z: 0.5 },
            size: 'large'
        });

        // Add braking zone markers
        features.push({
            type: 'braking_zone',
            position: { x: 0, y: 0, z: 0.2 },
            intensity: 'heavy'
        });

        return features;
    }

    generateDownhillFeatures(length, slopeAngle) {
        const features = [];

        // Add slope warning signs
        features.push({
            type: 'slope_sign',
            position: { x: 0, y: 2, z: 0 },
            angle: slopeAngle,
            direction: 'downhill'
        });

        // Add speed control markers
        const markerSpacing = 0.2;
        for (let i = 0; i < 1; i += markerSpacing) {
            features.push({
                type: 'speed_marker',
                position: { x: 0, y: 0, z: i },
                recommendedSpeed: Math.max(50, 100 - Math.abs(slopeAngle) * 500)
            });
        }

        // Add drainage features for wet conditions
        if (this.random() > 0.7) {
            features.push({
                type: 'drainage',
                position: { x: 0, y: -0.1, z: 0.5 },
                width: 2
            });
        }

        return features;
    }

    generateUphillFeatures(length, slopeAngle) {
        const features = [];

        // Add slope warning signs
        features.push({
            type: 'slope_sign',
            position: { x: 0, y: 2, z: 0 },
            angle: slopeAngle,
            direction: 'uphill'
        });

        // Add gear change markers
        const markerSpacing = 0.15;
        for (let i = 0; i < 1; i += markerSpacing) {
            features.push({
                type: 'gear_marker',
                position: { x: 0, y: 0, z: i },
                recommendedGear: Math.min(3, Math.max(1, Math.floor(3 - slopeAngle * 10)))
            });
        }

        // Add switchback markers for steep climbs
        if (slopeAngle > 0.2) {
            features.push({
                type: 'switchback_marker',
                position: { x: 0, y: 0, z: 0.8 }
            });
        }

        return features;
    }

    generateSpeedBumpFeatures(bumpHeight, bumpWidth) {
        const features = [];

        // Add speed bump warning signs
        features.push({
            type: 'speed_bump_sign',
            position: { x: 0, y: 2, z: 0 },
            height: bumpHeight
        });

        // Add reflective markers
        features.push({
            type: 'reflective_marker',
            position: { x: -bumpWidth/2, y: 0, z: 0.5 },
            color: 'white'
        });
        features.push({
            type: 'reflective_marker',
            position: { x: bumpWidth/2, y: 0, z: 0.5 },
            color: 'white'
        });

        // Add speed reduction zone
        features.push({
            type: 'speed_zone',
            position: { x: 0, y: 0, z: 0.3 },
            maxSpeed: 30,
            zoneLength: bumpWidth * 2
        });

        return features;
    }

    generateOffroadFeatures(length, roughness, mudLevel) {
        const features = [];

        // Add surface condition indicators
        features.push({
            type: 'surface_sign',
            position: { x: 0, y: 2, z: 0 },
            condition: mudLevel > 0.5 ? 'mud' : 'rough'
        });

        // Add traction markers
        const markerSpacing = 0.1;
        for (let i = 0; i < 1; i += markerSpacing) {
            if (this.random() > 0.7) {
                features.push({
                    type: 'traction_marker',
                    position: { x: (this.random() - 0.5) * 6, y: 0, z: i }
                });
            }
        }

        // Add mud accumulation areas
        if (mudLevel > 0.3) {
            features.push({
                type: 'mud_pool',
                position: { x: 0, y: -0.05, z: 0.6 },
                depth: mudLevel * 0.2,
                size: 3
            });
        }

        // Add recovery points
        features.push({
            type: 'recovery_point',
            position: { x: 0, y: 0, z: 0.9 }
        });

        return features;
    }

    generateBridgeFeatures(length, bridgeHeight, bridgeWidth) {
        const features = [];

        // Add bridge approach warnings
        features.push({
            type: 'bridge_sign',
            position: { x: 0, y: 2, z: 0 },
            height: bridgeHeight
        });

        // Add bridge railings
        features.push({
            type: 'bridge_railing',
            position: { x: -bridgeWidth/2, y: bridgeHeight/2, z: 0.5 },
            length: length * 0.8
        });
        features.push({
            type: 'bridge_railing',
            position: { x: bridgeWidth/2, y: bridgeHeight/2, z: 0.5 },
            length: length * 0.8
        });

        // Add bridge supports
        const supportSpacing = 0.2;
        for (let i = 0; i < 1; i += supportSpacing) {
            features.push({
                type: 'bridge_support',
                position: { x: 0, y: -bridgeHeight/2, z: i },
                height: bridgeHeight
            });
        }

        // Add wind warning for high bridges
        if (bridgeHeight > 5) {
            features.push({
                type: 'wind_warning',
                position: { x: 0, y: bridgeHeight + 1, z: 0.3 },
                intensity: 'moderate'
            });
        }

        return features;
    }

    generateSplitFeatures(splitPoint, leftEnd, rightEnd) {
        const features = [];

        // Add split path indicators
        features.push({
            type: 'split_sign',
            position: { x: 0, y: 2, z: 0 },
            options: ['left', 'right']
        });

        // Add path markers
        features.push({
            type: 'path_marker',
            position: { x: -2, y: 0, z: 0.1 },
            path: 'left',
            color: 'blue'
        });
        features.push({
            type: 'path_marker',
            position: { x: 2, y: 0, z: 0.1 },
            path: 'right',
            color: 'red'
        });

        // Add merge point warnings
        features.push({
            type: 'merge_warning',
            position: { x: 0, y: 2, z: 0.9 }
        });

        // Add shortcut indicators
        const leftLength = Math.sqrt(
            Math.pow(leftEnd.x - splitPoint.x, 2) +
            Math.pow(leftEnd.z - splitPoint.z, 2)
        );
        const rightLength = Math.sqrt(
            Math.pow(rightEnd.x - splitPoint.x, 2) +
            Math.pow(rightEnd.z - splitPoint.z, 2)
        );

        if (leftLength < rightLength) {
            features.push({
                type: 'shortcut_hint',
                position: { x: -2, y: 1, z: 0.05 },
                path: 'left'
            });
        } else {
            features.push({
                type: 'shortcut_hint',
                position: { x: 2, y: 1, z: 0.05 },
                path: 'right'
            });
        }

        return features;
    }
}