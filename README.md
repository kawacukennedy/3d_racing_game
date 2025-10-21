# VelocityRush3D

A full-featured 3D multiplayer racing game built with Three.js and Cannon.js.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or pnpm

### Installation
```bash
npm install
# or
pnpm install
```

### Development
```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Multiplayer Development
To run with multiplayer support:
```bash
npm run dev:full
# or
pnpm dev:full
```

This starts both the client (port 3000) and server (port 3001).

For multiplayer testing, open multiple browser tabs/windows.

### Build
```bash
npm run build
# or
pnpm build
```

### Preview Production Build
```bash
npm run preview
# or
pnpm preview
```

## Project Structure

- `src/` - Source code
  - `engine/` - Core game engine components
  - `physics/` - Physics simulation
  - `ui/` - User interface components
  - `assets/` - Game assets (models, textures, etc.)
- `assets/` - Static assets
- `docs/` - Documentation

## Controls

### Racing Controls
- W/Arrow Up: Accelerate
- S/Arrow Down: Brake/Reverse
- A/Arrow Left: Turn Left
- D/Arrow Right: Turn Right
- Space: Brake

### Menu Navigation
- Start Race: Begin single-player race
- Multiplayer: Join online matchmaking
- Customize Vehicle: Access vehicle customization
- Store: Purchase cosmetics and upgrades
- Track Editor: Create custom race tracks
- Settings: Game configuration

### Multiplayer & Tournaments
- Automatic matchmaking when joining multiplayer
- Real-time synchronization with other players
- Ranked MMR system with seasonal progression
- Tournament brackets with prize pools
- Race results and leaderboards

### Track Editor (Press Track Editor button)
- Click ground to add track points
- Click existing points to select them
- Add/Remove buttons for point management
- Save/Load custom tracks
- Test tracks in-game

## Features Implemented

### Core Gameplay
- Realistic physics-based vehicle simulation with Cannon.js
- Advanced AI opponents with behavior trees and personality profiles
- Rubber banding system for competitive balance
- Keyboard controls (WASD + Space)
- HUD with speed, lap, and position indicators

### Advanced Physics
- Aerodynamic downforce calculations
- Tire grip simulation with weather effects
- Advanced suspension and wheel physics
- Realistic drag and momentum

### Audio System
- Dynamic engine sound effects with RPM-based pitch and gear simulation
- Spatial audio with doppler effects
- Collision and tire squeal audio effects
- Environmental audio (wind, crowd)
- Howler.js integration for cross-platform audio

### Visual Effects
- Bloom, depth of field, and film grain post-processing
- Dynamic weather systems (rain, snow, fog)
- Particle effects for weather and vehicle exhaust
- Advanced material shaders with PBR

### Multiplayer & Competition
- Socket.io-based server for matchmaking
- Real-time multiplayer races with 8+ players
- Client-side networking with position synchronization
- Server authoritative simulation
- Ranked MMR system with seasonal rewards
- Tournament brackets with prize pools
- Skill-based matchmaking

### Progression & Economy
- Leaderboards with persistent storage
- In-game store with cosmetic purchases
- Currency system (credits and gems)
- Race rewards and progression
- Achievement system
- Cloud save simulation with conflict resolution

### Tools & Creation
- Track editor for user-generated content
- Vehicle customization system
- Save/load functionality for tracks and setups
- Procedural track generation framework

### Analytics & Cloud Features
- Comprehensive analytics tracking
- Cloud save simulation with sync
- Local data persistence
- Performance metrics and telemetry
- Player statistics and history

### UI/UX
- Main menu with multiple options
- Vehicle customization interface
- Store interface
- Settings and configuration

## Advanced Features

### AI Behavior System
- **Personality Profiles**: Aggressive, Defensive, Balanced, and Erratic AI types
- **Behavior Trees**: Dynamic decision making based on race situation
- **Rubber Banding**: AI speed adjustment to maintain competitive balance
- **Adaptive Learning**: AI adjusts behavior based on player performance

### Weather & Environmental Effects
- **Dynamic Weather**: Rain, snow, fog with physics impact
- **Visual Effects**: Particle systems, lighting changes, visibility reduction
- **Audio Integration**: Weather-appropriate sound effects
- **Physics Interaction**: Tire grip and handling modifications

### Tournament System
- **Bracket Management**: Single-elimination tournaments
- **Prize Distribution**: Automated reward calculation
- **Player Statistics**: Tournament history and performance tracking
- **Entry Fees**: Competitive tournament economy

### Track Editor
- **Point-based Editing**: Click to add/remove track points
- **Real-time Visualization**: Live track preview
- **Save/Load System**: Persistent custom tracks
- **Physics Integration**: Automatic collision mesh generation

### Ranking & Progression
- **MMR System**: Elo-based skill rating
- **Seasonal Rewards**: Time-limited competitive seasons
- **Achievement System**: Milestone rewards and unlocks
- **Statistics Tracking**: Comprehensive player metrics

## Expansion Points

Additional features that could be implemented:

- Real 3D vehicle/track models with LOD system
- Voice chat integration with WebRTC
- Advanced game modes (drift challenges, elimination races)
- Mobile touch controls and responsive UI
- Cross-platform cloud saves with real backend
- Anti-cheat systems and server validation
- Live streaming and spectator modes

## Technologies Used

- Three.js - 3D rendering
- Cannon.js - Physics engine
- Vite - Build tool
- Howler.js - Audio (planned)

## License

MIT