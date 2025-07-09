// Cargo Current - A Mini Metro inspired shipping logistics game

// Game constants
const GAME_CONFIG = {
    // Time settings
    REAL_SECONDS_PER_DAY: 60, // 60 seconds = 1 in-game day
    DAYS_OF_WEEK: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    OVERFLOW_DAYS_UNTIL_GAME_OVER: 3,

    // Ship settings
    SHIP_BASE_CAPACITY: 6,
    SHIP_CAPACITY_UPGRADE: 6,
    SHIP_SPEED: 100, // pixels per second
    SHIP_DOCK_TIME: 2, // seconds

    // Port settings
    PORT_BASE_CAPACITY: 30,
    PORT_SPAWN_INTERVAL: 60, // seconds
    PORT_RADIUS: 12, // Size of ports

    // Cargo shapes - Using geometric shapes with colors like Mini Metro
    CARGO_SHAPES: {
        CIRCLE: { name: 'Circle', shape: 'circle', color: '#FF5252', rarity: 'common' },
        SQUARE: { name: 'Square', shape: 'square', color: '#448AFF', rarity: 'common' },
        TRIANGLE: { name: 'Triangle', shape: 'triangle', color: '#4CAF50', rarity: 'common' },
        DIAMOND: { name: 'Diamond', shape: 'diamond', color: '#FFC107', rarity: 'uncommon' },
        PENTAGON: { name: 'Pentagon', shape: 'pentagon', color: '#9C27B0', rarity: 'rare' },
        HEXAGON: { name: 'Hexagon', shape: 'hexagon', color: '#00BCD4', rarity: 'rare' }
    },

    // Line colors - More muted, Mini Metro-like colors
    LINE_COLORS: [
        '#E53935', // Red
        '#1E88E5', // Blue
        '#43A047', // Green
        '#FFB300', // Amber
        '#8E24AA', // Purple
        '#00ACC1', // Cyan
        '#F4511E', // Deep Orange
        '#546E7A'  // Blue Grey
    ],

    // UI settings
    LINE_WIDTH: 6, // Thicker lines like Mini Metro
    LINE_CORNER_RADIUS: 10, // Rounded corners for lines
    ANIMATION_SPEED: 0.3 // Animation speed in seconds
};

    // Game state
window.gameState = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    islands: [],
    ports: [],
    lines: [],
    ships: [],
    cargo: [],

    // Game time tracking
    gameTime: 0,
    dayTime: 0,
    currentDay: 0,

    // Game stats
    cargoDelivered: 0,

    // Game status
    isGameOver: false,
    isPaused: false,
    isWeekendModalOpen: false,

    // Selection modes
    isPortSelectionMode: false,
    selectionModeType: null,

    // Mouse interaction
    mouse: { x: 0, y: 0, isDown: false },
    selectedLine: null,
    selectedPort: null,
    drawingLine: null,

    // Initialization function
    init() {
        // Set up canvas
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        // Generate initial game world
        this.generateIslands();
        this.generateInitialPorts();

        // Set up event listeners
        this.setupEventListeners();

        // Start game loop
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
    },

    // Resize canvas to window size
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    },

    // Generate random islands on the map
    generateIslands() {
        const numIslands = 10 + Math.floor(Math.random() * 10); // 10-19 islands

        for (let i = 0; i < numIslands; i++) {
            const island = {
                x: Math.random() * this.width * 0.8 + this.width * 0.1, // Keep away from edges
                y: Math.random() * this.height * 0.8 + this.height * 0.1,
                radius: 30 + Math.random() * 50, // Island size
                shape: this.generateIslandShape()
            };

            // Ensure islands don't overlap
            let overlaps = false;
            for (const existingIsland of this.islands) {
                const distance = Math.sqrt(
                    Math.pow(island.x - existingIsland.x, 2) + 
                    Math.pow(island.y - existingIsland.y, 2)
                );

                if (distance < island.radius + existingIsland.radius + 50) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                this.islands.push(island);
            } else {
                i--; // Try again
            }
        }
    },

    // Generate a random shape for an island
    generateIslandShape() {
        // Generate points around a circle to create irregular island shapes
        const numPoints = 5 + Math.floor(Math.random() * 5);
        const points = [];

        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const variance = 0.7 + Math.random() * 0.6; // 0.7 to 1.3

            points.push({
                x: Math.cos(angle) * variance,
                y: Math.sin(angle) * variance
            });
        }

        return points;
    },

    // Generate the initial 3 ports with unique cargo shapes
    generateInitialPorts() {
        // Get the first three common cargo shapes
        const initialShapes = Object.values(GAME_CONFIG.CARGO_SHAPES)
            .filter(shape => shape.rarity === 'common')
            .slice(0, 3);

        // Randomly select 3 different islands for the initial ports
        const islandIndices = [];
        while (islandIndices.length < 3) {
            const index = Math.floor(Math.random() * this.islands.length);
            if (!islandIndices.includes(index)) {
                islandIndices.push(index);
            }
        }

        // Create ports on the selected islands
        for (let i = 0; i < 3; i++) {
            const island = this.islands[islandIndices[i]];
            const shape = initialShapes[i];

            // Calculate port position on the island edge
            const angle = Math.random() * Math.PI * 2;
            const x = island.x + Math.cos(angle) * island.radius;
            const y = island.y + Math.sin(angle) * island.radius;

            this.ports.push({
                id: this.generateId(),
                x,
                y,
                island: islandIndices[i],
                cargoShape: shape,
                capacity: GAME_CONFIG.PORT_BASE_CAPACITY,
                cargo: [],
                overflowTimer: 0,
                isOverflowing: false,
                exchangeSpeed: 1.0 // Base exchange speed
            });
        }
    },

    // Generate a new port during gameplay
    generateNewPort() {
        // Find islands without ports
        const islandsWithoutPorts = this.islands.filter((island, index) => 
            !this.ports.some(port => port.island === index)
        );

        if (islandsWithoutPorts.length === 0) return; // No available islands

        // Select a random island without a port
        const islandIndex = this.islands.indexOf(
            islandsWithoutPorts[Math.floor(Math.random() * islandsWithoutPorts.length)]
        );
        const island = this.islands[islandIndex];

        // Determine cargo shape for the new port
        let shape;
        const gameProgress = this.currentDay / 30; // Rough estimate of game progress (0-1)

        if (gameProgress > 0.7 && Math.random() < 0.3) {
            // Late game: chance for rare shapes
            const rareShapes = Object.values(GAME_CONFIG.CARGO_SHAPES)
                .filter(shape => shape.rarity === 'rare');
            shape = rareShapes[Math.floor(Math.random() * rareShapes.length)];
        } else if (gameProgress > 0.3 && Math.random() < 0.5) {
            // Mid game: chance for uncommon shapes
            const uncommonShapes = Object.values(GAME_CONFIG.CARGO_SHAPES)
                .filter(shape => shape.rarity === 'uncommon');
            shape = uncommonShapes[Math.floor(Math.random() * uncommonShapes.length)];
        } else {
            // Early game or fallback: use common shapes
            const commonShapes = Object.values(GAME_CONFIG.CARGO_SHAPES)
                .filter(shape => shape.rarity === 'common');
            shape = commonShapes[Math.floor(Math.random() * commonShapes.length)];
        }

        // Calculate port position on the island edge
        const angle = Math.random() * Math.PI * 2;
        const x = island.x + Math.cos(angle) * island.radius;
        const y = island.y + Math.sin(angle) * island.radius;

        // Create the new port
        this.ports.push({
            id: this.generateId(),
            x,
            y,
            island: islandIndex,
            cargoShape: shape,
            capacity: GAME_CONFIG.PORT_BASE_CAPACITY,
            cargo: [],
            overflowTimer: 0,
            isOverflowing: false,
            exchangeSpeed: 1.0
        });
    },

    // Generate cargo at ports
    generateCargo() {
        for (const port of this.ports) {
            // Don't generate cargo if port is at capacity
            if (port.cargo.length >= port.capacity) continue;

            // Random chance to generate cargo
            if (Math.random() < 0.05) {
                // Find other ports that can accept this cargo shape
                const destinationPorts = this.ports.filter(p => 
                    p.id !== port.id && p.cargoShape.shape === port.cargoShape.shape
                );

                // Only generate cargo if there's at least one destination
                if (destinationPorts.length > 0) {
                    const destination = destinationPorts[Math.floor(Math.random() * destinationPorts.length)];

                    port.cargo.push({
                        id: this.generateId(),
                        shape: port.cargoShape,
                        originPort: port.id,
                        destinationPort: destination.id,
                        x: port.x,
                        y: port.y
                    });
                }
            }
        }
    },

    // Create a new shipping line
    createLine(ports, color) {
        if (ports.length < 2) return null;

        // Generate path that avoids islands
        const path = this.generateShippingLanePath(ports);

        const line = {
            id: this.generateId(),
            ports: [...ports],
            color: color || GAME_CONFIG.LINE_COLORS[this.lines.length % GAME_CONFIG.LINE_COLORS.length],
            ships: [],
            path: path
        };

        // Add initial ship to the line
        this.addShipToLine(line);

        this.lines.push(line);
        return line;
    },

    // Add a ship to a shipping line
    addShipToLine(line) {
        // Position the ship at the first point of the path
        const start = line.path[0];

        const ship = {
            id: this.generateId(),
            x: start.x,
            y: start.y,
            line: line.id,
            capacity: GAME_CONFIG.SHIP_BASE_CAPACITY,
            cargo: [],
            pathIndex: 0,
            progress: 0,
            isDocked: false,
            dockTime: 0,
            upgradeLevel: 0,
            direction: 1 // 1 = forward, -1 = backward
        };

        line.ships.push(ship.id);
        this.ships.push(ship);

        return ship;
    },

    // Calculate a point on a bezier curve at a given t (0-1)
    calculateBezierPoint(t, p0, p1, p2, p3) {
        const cX = 3 * (p1.x - p0.x);
        const bX = 3 * (p2.x - p1.x) - cX;
        const aX = p3.x - p0.x - cX - bX;

        const cY = 3 * (p1.y - p0.y);
        const bY = 3 * (p2.y - p1.y) - cY;
        const aY = p3.y - p0.y - cY - bY;

        const x = aX * Math.pow(t, 3) + bX * Math.pow(t, 2) + cX * t + p0.x;
        const y = aY * Math.pow(t, 3) + bY * Math.pow(t, 2) + cY * t + p0.y;

        return { x, y };
    },

    // Calculate the tangent (direction) at a point on a bezier curve
    calculateBezierTangent(t, p0, p1, p2, p3) {
        const cX = 3 * (p1.x - p0.x);
        const bX = 3 * (p2.x - p1.x) - cX;
        const aX = p3.x - p0.x - cX - bX;

        const cY = 3 * (p1.y - p0.y);
        const bY = 3 * (p2.y - p1.y) - cY;
        const aY = p3.y - p0.y - cY - bY;

        // Derivative of the bezier curve
        const dx = 3 * aX * Math.pow(t, 2) + 2 * bX * t + cX;
        const dy = 3 * aY * Math.pow(t, 2) + 2 * bY * t + cY;

        return Math.atan2(dy, dx);
    },

    // Update ship positions and handle cargo loading/unloading
    updateShips(deltaTime) {
        for (const ship of this.ships) {
            const line = this.lines.find(l => l.id === ship.line);
            if (!line || !line.path || line.path.length < 2) continue;

            if (ship.isDocked) {
                // Handle docking time
                ship.dockTime += deltaTime;

                // Find the port we're docked at
                const currentPort = this.ports.find(p => p.id === ship.dockedPortId);

                if (currentPort && ship.dockTime >= GAME_CONFIG.SHIP_DOCK_TIME / currentPort.exchangeSpeed) {
                    // Finished docking, continue journey
                    ship.isDocked = false;
                    ship.dockTime = 0;
                    ship.progress = 0;
                    // No need to update pathIndex here, it's already at the port
                }

                // While docked, handle cargo exchange
                if (currentPort) {
                    this.handleCargoExchange(ship, currentPort);
                }
            } else {
                // Move along the path in current direction
                const path = line.path;
                let idx = ship.pathIndex;
                let nextIdx = idx + ship.direction;
                // Check for end of path
                if (nextIdx < 0 || nextIdx >= path.length) {
                    // Reverse direction
                    ship.direction *= -1;
                    nextIdx = idx + ship.direction;
                    // Clamp to valid range
                    nextIdx = Math.max(0, Math.min(path.length - 1, nextIdx));
                }
                const from = path[idx];
                const to = path[nextIdx];
                const segLen = Math.hypot(to.x - from.x, to.y - from.y);
                const speed = GAME_CONFIG.SHIP_SPEED * deltaTime;
                ship.progress += speed / segLen;

                if (ship.progress >= 1) {
                    ship.x = to.x;
                    ship.y = to.y;
                    ship.pathIndex = nextIdx;
                    ship.progress = 0;

                    // If at a port, dock
                    const port = this.ports.find(p => Math.hypot(p.x - ship.x, p.y - ship.y) < GAME_CONFIG.PORT_RADIUS + 2);
                    if (port) {
                        ship.isDocked = true;
                        ship.dockTime = 0;
                        ship.dockedPortId = port.id;
                    }
                } else {
                    ship.x = from.x + (to.x - from.x) * ship.progress;
                    ship.y = from.y + (to.y - from.y) * ship.progress;
                }
            }
        }
    },

    // Handle cargo loading and unloading at ports
    handleCargoExchange(ship, port) {
        // Unload cargo destined for this port
        const cargoToUnload = ship.cargo.filter(cargo => 
            cargo.destinationPort === port.id
        );

        for (const cargo of cargoToUnload) {
            const index = ship.cargo.indexOf(cargo);
            if (index !== -1) {
                ship.cargo.splice(index, 1);
                this.cargoDelivered++;

                // Update UI
                document.getElementById('cargo-delivered').textContent = this.cargoDelivered;
            }
        }

        // Load cargo from this port
        if (ship.cargo.length < ship.capacity && port.cargo.length > 0) {
            // Sort cargo by destination to prioritize loading
            const availableCargo = [...port.cargo].sort((a, b) => {
                // Prioritize cargo that can be delivered on this line
                const linePortIds = this.lines.find(l => l.id === ship.line).ports;
                const aCanDeliver = linePortIds.includes(a.destinationPort);
                const bCanDeliver = linePortIds.includes(b.destinationPort);

                if (aCanDeliver && !bCanDeliver) return -1;
                if (!aCanDeliver && bCanDeliver) return 1;
                return 0;
            });

            // Load as much cargo as possible
            while (ship.cargo.length < ship.capacity && availableCargo.length > 0) {
                const cargo = availableCargo.shift();
                const index = port.cargo.indexOf(cargo);

                if (index !== -1) {
                    port.cargo.splice(index, 1);
                    ship.cargo.push(cargo);
                }
            }
        }
    },

    // Update port overflow timers
    updatePorts(deltaTime) {
        for (const port of this.ports) {
            // Check for overflow
            const isCurrentlyOverflowing = port.cargo.length > port.capacity;

            if (isCurrentlyOverflowing) {
                if (!port.isOverflowing) {
                    // Port just started overflowing
                    port.isOverflowing = true;
                    port.overflowTimer = 0;
                } else {
                    // Port continues to overflow
                    port.overflowTimer += deltaTime;

                    // Check for game over
                    if (port.overflowTimer >= GAME_CONFIG.OVERFLOW_DAYS_UNTIL_GAME_OVER * GAME_CONFIG.REAL_SECONDS_PER_DAY) {
                        this.gameOver();
                    }
                }
            } else if (port.isOverflowing) {
                // Port is no longer overflowing
                port.isOverflowing = false;
                port.overflowTimer = 0;
            }
        }
    },

    // Update game time and day tracking (Mini Metro style)
    updateGameTime(deltaTime) {
        this.gameTime += deltaTime;
        this.dayTime += deltaTime;

        // Check for day change
        if (this.dayTime >= GAME_CONFIG.REAL_SECONDS_PER_DAY) {
            // Animate day transition
            this.animateDayTransition();

            this.dayTime = 0;
            this.currentDay++;

            // Update UI with Mini Metro style animation
            const dayOfWeek = GAME_CONFIG.DAYS_OF_WEEK[this.currentDay % 7];
            const dayElement = document.getElementById('current-day');

            // Animate day change
            dayElement.style.opacity = 0;
            setTimeout(() => {
                dayElement.textContent = dayOfWeek;
                dayElement.style.opacity = 1;
            }, 300);

            // Check for weekend (Saturday)
            if (dayOfWeek === 'Saturday') {
                this.handleWeekendEvent();
            }

            // Chance to spawn a new port every day
            if (Math.random() < 0.3) {
                this.generateNewPort();
            }
        }

        // Update day progress clock with smoother animation
        const progressPercent = (this.dayTime / GAME_CONFIG.REAL_SECONDS_PER_DAY) * 100;
        const dayProgress = document.getElementById('day-progress');

        // Use a more Mini Metro color scheme
        const progressColor = this.getTimeOfDayColor(this.dayTime / GAME_CONFIG.REAL_SECONDS_PER_DAY);
        dayProgress.style.background = `conic-gradient(${progressColor} ${progressPercent}%, rgba(0,0,0,0.05) ${progressPercent}%)`;

        // Update day label color based on time of day
        const dayLabel = document.getElementById('day-label');
        if (dayLabel) {
            // Subtle color change based on time of day
            const brightness = 30 + Math.floor(progressPercent * 0.3);
            dayLabel.style.color = `rgb(${brightness}, ${brightness}, ${brightness})`;
        }
    },

    // Get color based on time of day (Mini Metro style)
    getTimeOfDayColor(progress) {
        // Morning: blue-ish, Afternoon: green-ish, Evening: orange-ish, Night: purple-ish
        if (progress < 0.25) {
            return '#4FC3F7'; // Morning - light blue
        } else if (progress < 0.5) {
            return '#66BB6A'; // Afternoon - green
        } else if (progress < 0.75) {
            return '#FFA726'; // Evening - orange
        } else {
            return '#7E57C2'; // Night - purple
        }
    },

    // Animate day transition (Mini Metro style)
    animateDayTransition() {
        // Create a flash effect overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        overlay.style.zIndex = '1000';
        overlay.style.pointerEvents = 'none';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s ease';

        document.getElementById('game-container').appendChild(overlay);

        // Flash effect
        setTimeout(() => { overlay.style.opacity = '1'; }, 10);
        setTimeout(() => { overlay.style.opacity = '0'; }, 300);
        setTimeout(() => { overlay.remove(); }, 800);
    },

    // Handle weekend events (upgrades)
    handleWeekendEvent() {
        // Pause the game
        this.isPaused = true;
        this.isWeekendModalOpen = true;

        // Show the weekend modal
        document.getElementById('weekend-modal').classList.remove('hidden');

        // Add event listeners for upgrade options
        document.getElementById('megaport-option').onclick = () => this.selectUpgrade('megaport');
        document.getElementById('new-line-option').onclick = () => this.selectUpgrade('new-line');
        document.getElementById('ship-upgrade-option').onclick = () => this.selectUpgrade('ship-upgrade');
    },

    // Enter port selection mode for upgrades
    enterPortSelectionMode(type) {
        this.isPortSelectionMode = true;
        this.selectionModeType = type;

        // Hide the weekend modal temporarily
        document.getElementById('weekend-modal').classList.add('hidden');

        // Show instruction message
        const instructionMsg = document.createElement('div');
        instructionMsg.id = 'selection-instruction';
        instructionMsg.style.position = 'absolute';
        instructionMsg.style.top = '20px';
        instructionMsg.style.left = '50%';
        instructionMsg.style.transform = 'translateX(-50%)';
        instructionMsg.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        instructionMsg.style.padding = '10px 20px';
        instructionMsg.style.borderRadius = '4px';
        instructionMsg.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        instructionMsg.style.zIndex = '100';
        instructionMsg.style.fontWeight = '400';
        instructionMsg.style.fontSize = '14px';

        if (type === 'megaport') {
            instructionMsg.textContent = 'Click on a port to upgrade it to a Megaport (+50% capacity and exchange speed). Press ESC to cancel.';
        }

        document.getElementById('game-container').appendChild(instructionMsg);

        // Change cursor to indicate selection mode
        this.canvas.style.cursor = 'pointer';
    },

    // Exit port selection mode
    exitPortSelectionMode() {
        this.isPortSelectionMode = false;
        this.selectionModeType = null;

        // Remove instruction message
        const instructionMsg = document.getElementById('selection-instruction');
        if (instructionMsg) {
            instructionMsg.remove();
        }

        // Reset cursor
        this.canvas.style.cursor = 'default';

        // Show the weekend modal again
        document.getElementById('weekend-modal').classList.remove('hidden');
    },

    // Handle port selection for upgrades
    handlePortSelection(port) {
        if (!this.isPortSelectionMode) return;

        if (this.selectionModeType === 'megaport') {
            // Upgrade the selected port to a megaport
            port.capacity = Math.floor(port.capacity * 1.5);
            port.exchangeSpeed = port.exchangeSpeed * 1.5;

            // Visual feedback for the upgrade
            this.animatePortUpgrade(port);

            // Add a new ship to a random line (as part of weekend upgrade)
            if (this.lines.length > 0) {
                const randomLine = this.lines[Math.floor(Math.random() * this.lines.length)];
                this.addShipToLine(randomLine);
            }

            // Exit selection mode and close weekend modal
            this.exitPortSelectionMode();
            document.getElementById('weekend-modal').classList.add('hidden');
            this.isPaused = false;
            this.isWeekendModalOpen = false;
        }
    },

    // Animate port upgrade with a special effect
    animatePortUpgrade(port) {
        // Store the original radius if not already stored
        if (!port.originalRadius) {
            port.originalRadius = GAME_CONFIG.PORT_RADIUS;
        }

        // Create a more dramatic pulse effect for upgrade
        port.pulseEffect = {
            startTime: this.gameTime,
            duration: 1.0, // longer duration for upgrade animation
            isUpgrade: true
        };

        // Create a flash effect overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        overlay.style.zIndex = '1000';
        overlay.style.pointerEvents = 'none';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s ease';

        document.getElementById('game-container').appendChild(overlay);

        // Flash effect
        setTimeout(() => { overlay.style.opacity = '1'; }, 10);
        setTimeout(() => { overlay.style.opacity = '0'; }, 500);
        setTimeout(() => { overlay.remove(); }, 1000);
    },

    // Handle upgrade selection
    selectUpgrade(upgradeType) {
        switch (upgradeType) {
            case 'megaport':
                // Enter port selection mode
                this.enterPortSelectionMode('megaport');
                return; // Exit early, don't close modal yet
                break;

            case 'new-line':
                // Create a new line with two random ports
                if (this.ports.length >= 2) {
                    const availablePorts = [...this.ports];
                    const port1 = availablePorts.splice(Math.floor(Math.random() * availablePorts.length), 1)[0];
                    const port2 = availablePorts.splice(Math.floor(Math.random() * availablePorts.length), 1)[0];

                    this.createLine([port1.id, port2.id]);
                }
                break;

            case 'ship-upgrade':
                // Upgrade a random ship
                if (this.ships.length > 0) {
                    const randomShip = this.ships[Math.floor(Math.random() * this.ships.length)];
                    randomShip.capacity += GAME_CONFIG.SHIP_CAPACITY_UPGRADE;
                    randomShip.upgradeLevel++;
                }
                break;
        }

        // Add a new ship to a random line
        if (this.lines.length > 0) {
            const randomLine = this.lines[Math.floor(Math.random() * this.lines.length)];
            this.addShipToLine(randomLine);
        }

        // Close the weekend modal and resume the game
        document.getElementById('weekend-modal').classList.add('hidden');
        this.isPaused = false;
        this.isWeekendModalOpen = false;
    },

    // Game over function
    gameOver() {
        this.isGameOver = true;
        this.isPaused = true;

        // Display game over message
        alert(`Game Over!\nYou survived for ${this.currentDay} days and delivered ${this.cargoDelivered} cargo units.`);
    },

    // Set up event listeners for user interaction (Mini Metro style)
    setupEventListeners() {
        // Mouse move
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;

            // If drawing a line, update the last point
            if (this.mouse.isDown && this.drawingLine) {
                const hoveredPort = this.getPortAtPosition(this.mouse.x, this.mouse.y);

                if (hoveredPort && !this.drawingLine.ports.includes(hoveredPort.id)) {
                    // Add port to the drawing line
                    this.drawingLine.ports.push(hoveredPort.id);

                    // Add subtle animation effect when connecting to a port
                    this.animatePortConnection(hoveredPort);
                }
            }
        });

        // Keyboard events for canceling selection modes
        window.addEventListener('keydown', (e) => {
            // ESC key to cancel port selection mode
            if (e.key === 'Escape' && this.isPortSelectionMode) {
                this.exitPortSelectionMode();
            }
        });

        // Mouse down
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.isDown = true;

            // Check if clicked on a port
            const clickedPort = this.getPortAtPosition(e.clientX, e.clientY);

            if (clickedPort) {
                // Check if in port selection mode
                if (this.isPortSelectionMode) {
                    // Handle port selection for upgrades
                    this.handlePortSelection(clickedPort);
                    return;
                }

                // Start drawing a new line
                this.drawingLine = {
                    ports: [clickedPort.id],
                    color: GAME_CONFIG.LINE_COLORS[this.lines.length % GAME_CONFIG.LINE_COLORS.length]
                };

                // Add subtle animation effect when starting a line
                this.animatePortConnection(clickedPort);
            }
        });

        // Mouse up
        this.canvas.addEventListener('mouseup', () => {
            this.mouse.isDown = false;

            // If drawing a line, finalize it
            if (this.drawingLine && this.drawingLine.ports.length >= 2) {
                this.createLine(this.drawingLine.ports, this.drawingLine.color);
            }

            this.drawingLine = null;
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.resize();
        });

        // Game control buttons
        const pauseButton = document.querySelector('.control-button[data-tooltip="Pause Game"]');
        if (pauseButton) {
            pauseButton.addEventListener('click', () => {
                this.isPaused = !this.isPaused;

                // Update button icon based on game state
                if (this.isPaused) {
                    pauseButton.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="5,4 19,12 5,20"></polygon>
                        </svg>
                    `;
                    pauseButton.setAttribute('data-tooltip', 'Resume Game');
                } else {
                    pauseButton.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="6" y="4" width="4" height="16"></rect>
                            <rect x="14" y="4" width="4" height="16"></rect>
                        </svg>
                    `;
                    pauseButton.setAttribute('data-tooltip', 'Pause Game');
                }
            });
        }

        // Speed up button
        const speedButton = document.querySelector('.control-button[data-tooltip="Speed Up"]');
        if (speedButton) {
            speedButton.addEventListener('click', () => {
                // Toggle between normal and fast speed
                if (GAME_CONFIG.REAL_SECONDS_PER_DAY === 60) {
                    GAME_CONFIG.REAL_SECONDS_PER_DAY = 20; // Fast mode
                    speedButton.style.backgroundColor = '#f0f0f0';
                } else {
                    GAME_CONFIG.REAL_SECONDS_PER_DAY = 60; // Normal mode
                    speedButton.style.backgroundColor = 'white';
                }
            });
        }
    },

    // Add subtle animation when connecting to a port (Mini Metro style)
    animatePortConnection(port) {
        // Store the original radius
        if (!port.originalRadius) {
            port.originalRadius = GAME_CONFIG.PORT_RADIUS;
        }

        // Create a pulse effect
        port.pulseEffect = {
            startTime: this.gameTime,
            duration: 0.3 // seconds
        };
    },

    // Get port at mouse position
    getPortAtPosition(x, y) {
        const clickRadius = 20; // Detection radius

        for (const port of this.ports) {
            const distance = Math.sqrt(
                Math.pow(x - port.x, 2) + 
                Math.pow(y - port.y, 2)
            );

            if (distance <= clickRadius) {
                return port;
            }
        }

        return null;
    },

    // Generate a unique ID
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },

    // --- Generate a path for a shipping lane that avoids islands using A* pathfinding ---
    generateShippingLanePath(portIds) {
        // Only connect ports in the given order, do not loop back to the start
        const path = [];
        for (let i = 0; i < portIds.length - 1; i++) {
            const fromPort = this.ports.find(p => p.id === portIds[i]);
            const toPort = this.ports.find(p => p.id === portIds[i + 1]);
            const segment = this.findAStarPath(fromPort, toPort);
            if (segment.length === 0) continue;
            if (i === 0) path.push(...segment);
            else path.push(...segment.slice(1)); // Avoid duplicate points
        }
        // Path smoothing for visual appeal
        return this.smoothPath(path, 2.5);
    },

    // --- New: Grid-based A* pathfinding between two points, avoiding islands ---
    findAStarPath(from, to) {
        // Grid settings
        const gridSize = 24; // pixels per cell
        const cols = Math.ceil(this.width / gridSize);
        const rows = Math.ceil(this.height / gridSize);

        // Build grid: 0 = free, 1 = blocked
        const grid = [];
        for (let y = 0; y < rows; y++) {
            grid[y] = [];
            for (let x = 0; x < cols; x++) {
                const cx = x * gridSize + gridSize / 2;
                const cy = y * gridSize + gridSize / 2;
                grid[y][x] = this.isPointInIsland(cx, cy) ? 1 : 0;
            }
        }

        // Convert world coordinates to grid
        const toGrid = (pt) => ({
            x: Math.floor(pt.x / gridSize),
            y: Math.floor(pt.y / gridSize)
        });
        const toWorld = (cell) => ({
            x: cell.x * gridSize + gridSize / 2,
            y: cell.y * gridSize + gridSize / 2
        });

        const start = toGrid(from);
        const end = toGrid(to);

        // Clamp to grid
        start.x = Math.max(0, Math.min(cols - 1, start.x));
        start.y = Math.max(0, Math.min(rows - 1, start.y));
        end.x = Math.max(0, Math.min(cols - 1, end.x));
        end.y = Math.max(0, Math.min(rows - 1, end.y));

        // If start or end is blocked, find nearest free cell
        if (grid[start.y][start.x] === 1) {
            const free = this.findNearestFreeCell(grid, start.x, start.y);
            if (!free) return [];
            start.x = free.x; start.y = free.y;
        }
        if (grid[end.y][end.x] === 1) {
            const free = this.findNearestFreeCell(grid, end.x, end.y);
            if (!free) return [];
            end.x = free.x; end.y = free.y;
        }

        // A* search
        const open = [];
        const closed = new Set();
        const nodeKey = (x, y) => `${x},${y}`;
        open.push({
            x: start.x, y: start.y, g: 0,
            h: Math.abs(end.x - start.x) + Math.abs(end.y - start.y),
            f: 0, parent: null
        });

        let found = null;
        while (open.length > 0) {
            // Get node with lowest f
            open.sort((a, b) => (a.g + a.h) - (b.g + b.h));
            const current = open.shift();
            if (current.x === end.x && current.y === end.y) {
                found = current;
                break;
            }
            closed.add(nodeKey(current.x, current.y));
            // 8 directions
            for (const [dx, dy] of [
                [1,0], [-1,0], [0,1], [0,-1],
                [1,1], [-1,1], [1,-1], [-1,-1]
            ]) {
                const nx = current.x + dx, ny = current.y + dy;
                if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
                if (grid[ny][nx] === 1) continue;
                if (closed.has(nodeKey(nx, ny))) continue;
                // Diagonal move: check for corner cutting
                if (dx !== 0 && dy !== 0) {
                    if (grid[current.y][nx] === 1 || grid[ny][current.x] === 1) continue;
                }
                const g = current.g + ((dx === 0 || dy === 0) ? 1 : 1.414);
                const h = Math.abs(end.x - nx) + Math.abs(end.y - ny);
                // If already in open with lower g, skip
                const existing = open.find(n => n.x === nx && n.y === ny);
                if (existing && existing.g <= g) continue;
                open.push({ x: nx, y: ny, g, h, f: g + h, parent: current });
            }
        }

        // Reconstruct path
        const path = [];
        let node = found;
        while (node) {
            path.push(toWorld(node));
            node = node.parent;
        }
        path.reverse();
        // Ensure start and end are exact
        if (path.length > 0) {
            path[0] = { x: from.x, y: from.y };
            path[path.length - 1] = { x: to.x, y: to.y };
        }
        return path;
    },

    // --- Helper: Is a point inside any island? ---
    isPointInIsland(x, y) {
        for (const island of this.islands) {
            const dx = x - island.x;
            const dy = y - island.y;
            if (Math.sqrt(dx * dx + dy * dy) < island.radius + 12) return true;
        }
        return false;
    },

    // --- Helper: Find nearest free cell in grid ---
    findNearestFreeCell(grid, x, y) {
        const rows = grid.length, cols = grid[0].length;
        const visited = new Set();
        const queue = [{ x, y }];
        while (queue.length > 0) {
            const { x: cx, y: cy } = queue.shift();
            if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
            if (visited.has(`${cx},${cy}`)) continue;
            visited.add(`${cx},${cy}`);
            if (grid[cy][cx] === 0) return { x: cx, y: cy };
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                queue.push({ x: cx + dx, y: cy + dy });
            }
        }
        return null;
    },

    // --- Helper: Path smoothing using Ramer-Douglas-Peucker ---
    smoothPath(path, epsilon = 2.5) {
        if (path.length < 3) return path;
        // RDP algorithm
        const rdp = (pts, eps) => {
            let dmax = 0, index = 0;
            for (let i = 1; i < pts.length - 1; i++) {
                const d = this.perpendicularDistance(pts[i], pts[0], pts[pts.length - 1]);
                if (d > dmax) {
                    index = i;
                    dmax = d;
                }
            }
            if (dmax > eps) {
                const rec1 = rdp(pts.slice(0, index + 1), eps);
                const rec2 = rdp(pts.slice(index), eps);
                return rec1.slice(0, -1).concat(rec2);
            } else {
                return [pts[0], pts[pts.length - 1]];
            }
        };
        return rdp(path, epsilon);
    },

    // --- Helper: Perpendicular distance from point to line segment ---
    perpendicularDistance(pt, lineStart, lineEnd) {
        const x = pt.x, y = pt.y, x1 = lineStart.x, y1 = lineStart.y, x2 = lineEnd.x, y2 = lineEnd.y;
        const dx = x2 - x1, dy = y2 - y1;
        if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
        const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
        const projX = x1 + t * dx, projY = y1 + t * dy;
        return Math.hypot(x - projX, y - projY);
    },

    // Main game loop
    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = (timestamp - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = timestamp;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw background
        this.drawBackground();

        // Draw islands
        this.drawIslands();

        // Draw shipping lines
        this.drawLines();

        // Draw ports
        this.drawPorts();

        // Draw ships
        this.drawShips();

        // Draw cargo
        this.drawCargo();

        // Draw UI overlays
        this.drawUI();

        // Draw line being created
        if (this.drawingLine) {
            this.drawDrawingLine();
        }

        // Update game state if not paused
        if (!this.isPaused && !this.isGameOver) {
            this.updateGameTime(deltaTime);
            this.updateShips(deltaTime);
            this.updatePorts(deltaTime);
            this.generateCargo();
        }

        // Continue game loop
        requestAnimationFrame(this.gameLoop.bind(this));
    },

    // Draw background in Mini Metro style
    drawBackground() {
        // Fill with slightly darker background color for better contrast
        this.ctx.fillStyle = '#f0f0f0'; // Slightly darker background for better contrast
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw subtle grid pattern like Mini Metro
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.02)';
        this.ctx.lineWidth = 1;

        // Draw larger grid for main sections
        const mainGridSize = 100;
        for (let x = 0; x < this.width; x += mainGridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        for (let y = 0; y < this.height; y += mainGridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        // Draw smaller grid for subdivisions (more subtle)
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.01)';
        const subGridSize = 25;
        for (let x = 0; x < this.width; x += subGridSize) {
            if (x % mainGridSize !== 0) { // Skip lines that are part of the main grid
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.height);
                this.ctx.stroke();
            }
        }

        for (let y = 0; y < this.height; y += subGridSize) {
            if (y % mainGridSize !== 0) { // Skip lines that are part of the main grid
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.width, y);
                this.ctx.stroke();
            }
        }
    },

    // Draw islands in Mini Metro style (more subtle)
    drawIslands() {
        for (const island of this.islands) {
            this.ctx.save();
            this.ctx.translate(island.x, island.y);
            this.ctx.scale(island.radius, island.radius);

            // Draw with smoother edges
            this.ctx.beginPath();

            // Use bezier curves for smoother island shapes
            const points = island.shape;
            this.ctx.moveTo(points[0].x, points[0].y);

            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length];

                // Calculate control points for the curve
                const cp1x = p1.x + (p2.x - p1.x) * 0.3;
                const cp1y = p1.y + (p2.y - p1.y) * 0.1;
                const cp2x = p1.x + (p2.x - p1.x) * 0.7;
                const cp2y = p1.y + (p2.y - p1.y) * 0.9;

                this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
            }

            this.ctx.closePath();

            // More visible fill with Mini Metro style
            this.ctx.fillStyle = 'rgba(220, 220, 220, 0.6)'; // More visible light gray for islands
            this.ctx.fill();

            // Add a more visible border
            this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
            this.ctx.lineWidth = 0.1;
            this.ctx.stroke();

            this.ctx.restore();
        }
    },

    // Draw shipping lines in Mini Metro style (smoother curves, more elegant)
    drawLines() {
        for (const line of this.lines) {
            if (!line.path || line.path.length < 2) continue;
            this.ctx.save();
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            this.ctx.shadowBlur = 4;
            this.ctx.strokeStyle = line.color;
            this.ctx.lineWidth = GAME_CONFIG.LINE_WIDTH + 1;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(line.path[0].x, line.path[0].y);
            for (let i = 1; i < line.path.length; i++) {
                this.ctx.lineTo(line.path[i].x, line.path[i].y);
            }
            this.ctx.stroke();
            this.ctx.shadowColor = 'transparent';
            this.ctx.restore();
        }
    },

    // Draw the line being created (Mini Metro style with smoother curves)
    drawDrawingLine() {
        if (!this.drawingLine || this.drawingLine.ports.length === 0) return;

        // Get all ports in the drawing line
        const drawingPorts = this.drawingLine.ports.map(portId =>
            this.ports.find(p => p.id === portId)
        );

        this.ctx.save();

        // Add more pronounced shadow for better visibility (matching shipping lanes)
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 4;

        this.ctx.strokeStyle = this.drawingLine.color;
        this.ctx.lineWidth = GAME_CONFIG.LINE_WIDTH + 1; // Increase line width for better visibility
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.setLineDash([15, 10]); // Dashed line with larger segments

        this.ctx.beginPath();

        if (drawingPorts.length === 1) {
            // Just one port and mouse - draw straight line
            this.ctx.moveTo(drawingPorts[0].x, drawingPorts[0].y);
            this.ctx.lineTo(this.mouse.x, this.mouse.y);
        } else if (drawingPorts.length === 2) {
            // Two ports - draw straight line between them and then to mouse
            this.ctx.moveTo(drawingPorts[0].x, drawingPorts[0].y);
            this.ctx.lineTo(drawingPorts[1].x, drawingPorts[1].y);
            this.ctx.lineTo(this.mouse.x, this.mouse.y);
        } else {
            // Multiple ports - use bezier curves for smoother connections
            this.ctx.moveTo(drawingPorts[0].x, drawingPorts[0].y);

            // Draw smooth curves between ports
            for (let i = 0; i < drawingPorts.length - 1; i++) {
                const current = drawingPorts[i];
                const next = drawingPorts[i + 1];

                // Calculate control points for smoother curves
                const dx = next.x - current.x;
                const dy = next.y - current.y;
                const distance = Math.sqrt(dx*dx + dy*dy);

                // Control point distance (adjust for smoother curves)
                const cpDistance = Math.min(distance * 0.4, 50);

                // Calculate direction vectors
                const toNext = { x: dx / distance, y: dy / distance };

                // Control points
                const cp1x = current.x + toNext.x * cpDistance;
                const cp1y = current.y + toNext.y * cpDistance;
                const cp2x = next.x - toNext.x * cpDistance;
                const cp2y = next.y - toNext.y * cpDistance;

                // Draw the curve
                this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, next.x, next.y);
            }

            // Draw line to mouse position with a smooth curve
            const lastPort = drawingPorts[drawingPorts.length - 1];
            const dx = this.mouse.x - lastPort.x;
            const dy = this.mouse.y - lastPort.y;
            const distance = Math.sqrt(dx*dx + dy*dy);

            if (distance > 0) {
                const toMouse = { x: dx / distance, y: dy / distance };
                const cpDistance = Math.min(distance * 0.4, 50);

                const cp1x = lastPort.x + toMouse.x * cpDistance;
                const cp1y = lastPort.y + toMouse.y * cpDistance;

                this.ctx.bezierCurveTo(cp1x, cp1y, this.mouse.x, this.mouse.y, this.mouse.x, this.mouse.y);
            }
        }

        this.ctx.stroke();
        this.ctx.setLineDash([]); // Reset to solid line
        this.ctx.shadowColor = 'transparent'; // Reset shadow
        this.ctx.restore();
    },

    // Draw ports in Mini Metro style (cleaner, more geometric, with animations)
    drawPorts() {
        for (const port of this.ports) {
            // Calculate radius with pulse effect if active
            let radius = GAME_CONFIG.PORT_RADIUS;

            // Handle pulse animation if active
            if (port.pulseEffect) {
                const elapsedTime = this.gameTime - port.pulseEffect.startTime;
                const progress = Math.min(elapsedTime / port.pulseEffect.duration, 1);

                // Check if this is an upgrade pulse (more dramatic)
                if (port.pulseEffect.isUpgrade) {
                    // More dramatic pulse for upgrades
                    if (progress < 0.5) {
                        // Growing phase
                        radius = port.originalRadius * (1 + progress * 0.5);
                    } else {
                        // Shrinking phase
                        radius = port.originalRadius * (1.25 - (progress - 0.5) * 0.5);
                    }
                } else {
                    // Normal pulse effect
                    if (progress < 0.5) {
                        // Growing phase
                        radius = port.originalRadius * (1 + progress * 0.3);
                    } else {
                        // Shrinking phase
                        radius = port.originalRadius * (1.15 - (progress - 0.5) * 0.3);
                    }
                }

                // Remove pulse effect when animation is complete
                if (progress >= 1) {
                    delete port.pulseEffect;
                }
            }

            // Add subtle shadow for depth (very Mini Metro-like)
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
            this.ctx.shadowBlur = 4;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 1;

            // Check if in port selection mode for megaport
            if (this.isPortSelectionMode && this.selectionModeType === 'megaport') {
                // Draw selection indicator (pulsing glow)
                const time = this.gameTime % 2; // 2-second cycle
                const glowIntensity = 0.3 + 0.2 * Math.sin(time * Math.PI); // Oscillate between 0.3 and 0.5

                // Draw outer glow
                this.ctx.beginPath();
                this.ctx.arc(port.x, port.y, radius + 6, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 215, 0, ${glowIntensity})`; // Golden glow
                this.ctx.fill();
            }

            // Draw port base (white circle with more visible border)
            this.ctx.beginPath();
            this.ctx.arc(port.x, port.y, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fill();

            // Keep shadow for the border to make it more visible
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            this.ctx.shadowBlur = 5;

            this.ctx.strokeStyle = '#333333';
            this.ctx.lineWidth = 2; // Thicker, more visible border
            this.ctx.stroke();

            this.ctx.shadowColor = 'transparent'; // Reset shadow after drawing the border

            // Draw cargo shape based on port type (slightly smaller for cleaner look)
            this.drawPortShape(port.x, port.y, port.cargoShape, radius * 0.55);

            // Draw overflow timer if port is overflowing (more elegant)
            if (port.isOverflowing) {
                const progress = port.overflowTimer / (GAME_CONFIG.OVERFLOW_DAYS_UNTIL_GAME_OVER * GAME_CONFIG.REAL_SECONDS_PER_DAY);
                const color = this.getOverflowColor(progress);

                // Draw timer arc with rounded ends
                this.ctx.beginPath();
                this.ctx.arc(port.x, port.y, radius + 4, -Math.PI/2, Math.PI * 2 * progress - Math.PI/2);
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 2;
                this.ctx.lineCap = 'round';
                this.ctx.stroke();
                this.ctx.lineCap = 'butt'; // Reset line cap
            }

            // Draw cargo count indicator (Mini Metro style pill-shaped indicator)
            const fillPercentage = port.cargo.length / port.capacity;
            const barWidth = radius * 1.8; // Slightly narrower
            const barHeight = 3; // Thinner bar
            const barY = port.y + radius + 7;
            const cornerRadius = barHeight / 2; // Rounded ends

            // Background bar (pill shape)
            this.ctx.beginPath();
            this.ctx.moveTo(port.x - barWidth/2 + cornerRadius, barY);
            this.ctx.lineTo(port.x + barWidth/2 - cornerRadius, barY);
            this.ctx.arc(port.x + barWidth/2 - cornerRadius, barY + cornerRadius, cornerRadius, -Math.PI/2, Math.PI/2);
            this.ctx.lineTo(port.x - barWidth/2 + cornerRadius, barY + barHeight);
            this.ctx.arc(port.x - barWidth/2 + cornerRadius, barY + cornerRadius, cornerRadius, Math.PI/2, -Math.PI/2);
            this.ctx.closePath();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
            this.ctx.fill();

            // Fill bar (pill shape, only if there's cargo)
            if (fillPercentage > 0) {
                const fillWidth = barWidth * fillPercentage;

                // Determine if we need to draw rounded ends based on fill percentage
                if (fillPercentage >= 1) {
                    // Full pill shape
                    this.ctx.beginPath();
                    this.ctx.moveTo(port.x - barWidth/2 + cornerRadius, barY);
                    this.ctx.lineTo(port.x + barWidth/2 - cornerRadius, barY);
                    this.ctx.arc(port.x + barWidth/2 - cornerRadius, barY + cornerRadius, cornerRadius, -Math.PI/2, Math.PI/2);
                    this.ctx.lineTo(port.x - barWidth/2 + cornerRadius, barY + barHeight);
                    this.ctx.arc(port.x - barWidth/2 + cornerRadius, barY + cornerRadius, cornerRadius, Math.PI/2, -Math.PI/2);
                    this.ctx.closePath();
                } else {
                    // Partial pill shape
                    const endX = port.x - barWidth/2 + fillWidth;

                    this.ctx.beginPath();
                    this.ctx.moveTo(port.x - barWidth/2 + cornerRadius, barY);
                    this.ctx.lineTo(endX, barY);
                    this.ctx.lineTo(endX, barY + barHeight);
                    this.ctx.lineTo(port.x - barWidth/2 + cornerRadius, barY + barHeight);
                    this.ctx.arc(port.x - barWidth/2 + cornerRadius, barY + cornerRadius, cornerRadius, Math.PI/2, -Math.PI/2);
                    this.ctx.closePath();
                }

                // Color based on fill percentage (more subtle gradient)
                let fillColor;
                if (fillPercentage > 0.9) {
                    fillColor = '#E53935'; // Red for critical
                } else if (fillPercentage > 0.7) {
                    fillColor = '#FB8C00'; // Orange for warning
                } else {
                    fillColor = '#424242'; // Dark gray for normal
                }

                this.ctx.fillStyle = fillColor;
                this.ctx.fill();
            }
        }
    },

    // Draw a specific shape for port or cargo
    drawPortShape(x, y, shapeInfo, size) {
        this.ctx.fillStyle = shapeInfo.color;

        switch(shapeInfo.shape) {
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
                break;

            case 'square':
                this.ctx.fillRect(x - size, y - size, size * 2, size * 2);
                break;

            case 'triangle':
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - size);
                this.ctx.lineTo(x + size, y + size);
                this.ctx.lineTo(x - size, y + size);
                this.ctx.closePath();
                this.ctx.fill();
                break;

            case 'diamond':
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - size);
                this.ctx.lineTo(x + size, y);
                this.ctx.lineTo(x, y + size);
                this.ctx.lineTo(x - size, y);
                this.ctx.closePath();
                this.ctx.fill();
                break;

            case 'pentagon':
                this.ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
                    const px = x + size * Math.cos(angle);
                    const py = y + size * Math.sin(angle);
                    if (i === 0) this.ctx.moveTo(px, py);
                    else this.ctx.lineTo(px, py);
                }
                this.ctx.closePath();
                this.ctx.fill();
                break;

            case 'hexagon':
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i * 2 * Math.PI / 6);
                    const px = x + size * Math.cos(angle);
                    const py = y + size * Math.sin(angle);
                    if (i === 0) this.ctx.moveTo(px, py);
                    else this.ctx.lineTo(px, py);
                }
                this.ctx.closePath();
                this.ctx.fill();
                break;
        }
    },

    // Get color for overflow timer based on progress
    getOverflowColor(progress) {
        if (progress < 0.5) {
            return '#FFC107'; // Amber
        } else if (progress < 0.75) {
            return '#FF9800'; // Orange
        } else {
            return '#F44336'; // Red
        }
    },

    // Draw ships with more ship-like appearance
    drawShips() {
        for (const ship of this.ships) {
            this.ctx.save();
            this.ctx.translate(ship.x, ship.y);

            // Rotate ship to face direction of travel
            let angle = 0;
            const line = this.lines.find(l => l.id === ship.line);
            if (line && line.path && line.path.length > 1 && !ship.isDocked) {
                const idx = ship.pathIndex;
                const nextIdx = (idx + 1) % line.path.length;
                const from = line.path[idx];
                const to = line.path[nextIdx];
                angle = Math.atan2(to.y - from.y, to.x - from.x);
                this.ctx.rotate(angle);
            }

            // Get line color for ship
            const shipColor = line ? line.color : '#888888';

            // Add subtle shadow for depth
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            this.ctx.shadowBlur = 4;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 2;

            // Ship dimensions
            const shipWidth = 14;
            const shipHeight = 7;

            // Draw ship hull (boat shape)
            this.ctx.beginPath();
            // Bottom of hull (curved)
            this.ctx.moveTo(-shipWidth/2, 0);
            this.ctx.bezierCurveTo(
                -shipWidth/2, shipHeight/2,
                shipWidth/2, shipHeight/2,
                shipWidth/2, 0
            );
            // Top of hull (straight with pointed bow)
            this.ctx.lineTo(shipWidth/2 - 1, -shipHeight/3);
            this.ctx.lineTo(shipWidth/3, -shipHeight/2);
            this.ctx.lineTo(-shipWidth/2, -shipHeight/3);
            this.ctx.closePath();

            // Fill hull with ship color
            this.ctx.fillStyle = shipColor;
            this.ctx.fill();

            // Draw cabin/bridge
            this.ctx.beginPath();
            this.ctx.rect(-shipWidth/4, -shipHeight/2, shipWidth/3, shipHeight/3);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fill();
            this.ctx.strokeStyle = shipColor;
            this.ctx.lineWidth = 0.5;
            this.ctx.stroke();

            // Draw smokestack/funnel
            this.ctx.beginPath();
            this.ctx.rect(-shipWidth/10, -shipHeight/2 - shipHeight/4, shipWidth/5, shipHeight/4);
            this.ctx.fillStyle = shipColor;
            this.ctx.fill();

            // Reset shadow for other elements
            this.ctx.shadowColor = 'transparent';

            // Draw cargo capacity indicator (Mini Metro style pill)
            const fillPercentage = ship.cargo.length / ship.capacity;
            const indicatorWidth = shipWidth - 2;
            const indicatorHeight = 1.5;
            const indicatorY = shipHeight/2 + 2;
            const indicatorRadius = indicatorHeight / 2;

            // Background pill
            this.ctx.beginPath();
            this.ctx.moveTo(-indicatorWidth/2 + indicatorRadius, indicatorY);
            this.ctx.lineTo(indicatorWidth/2 - indicatorRadius, indicatorY);
            this.ctx.arc(indicatorWidth/2 - indicatorRadius, indicatorY + indicatorRadius, indicatorRadius, -Math.PI/2, Math.PI/2);
            this.ctx.lineTo(-indicatorWidth/2 + indicatorRadius, indicatorY + indicatorHeight);
            this.ctx.arc(-indicatorWidth/2 + indicatorRadius, indicatorY + indicatorRadius, indicatorRadius, Math.PI/2, -Math.PI/2);
            this.ctx.closePath();
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.fill();

            // Fill pill (only if there's cargo)
            if (fillPercentage > 0) {
                const fillWidth = indicatorWidth * fillPercentage;

                // Determine if we need rounded ends based on fill percentage
                if (fillPercentage >= 1) {
                    // Full pill
                    this.ctx.beginPath();
                    this.ctx.moveTo(-indicatorWidth/2 + indicatorRadius, indicatorY);
                    this.ctx.lineTo(indicatorWidth/2 - indicatorRadius, indicatorY);
                    this.ctx.arc(indicatorWidth/2 - indicatorRadius, indicatorY + indicatorRadius, indicatorRadius, -Math.PI/2, Math.PI/2);
                    this.ctx.lineTo(-indicatorWidth/2 + indicatorRadius, indicatorY + indicatorHeight);
                    this.ctx.arc(-indicatorWidth/2 + indicatorRadius, indicatorY + indicatorRadius, indicatorRadius, Math.PI/2, -Math.PI/2);
                    this.ctx.closePath();
                } else {
                    // Partial pill
                    const endX = -indicatorWidth/2 + fillWidth;

                    this.ctx.beginPath();
                    this.ctx.moveTo(-indicatorWidth/2 + indicatorRadius, indicatorY);
                    this.ctx.lineTo(endX, indicatorY);
                    this.ctx.lineTo(endX, indicatorY + indicatorHeight);
                    this.ctx.lineTo(-indicatorWidth/2 + indicatorRadius, indicatorY + indicatorHeight);
                    this.ctx.arc(-indicatorWidth/2 + indicatorRadius, indicatorY + indicatorRadius, indicatorRadius, Math.PI/2, -Math.PI/2);
                    this.ctx.closePath();
                }

                // Color based on fill percentage
                let fillColor;
                if (fillPercentage > 0.9) {
                    fillColor = '#424242'; // Dark gray for full
                } else {
                    fillColor = '#666666'; // Medium gray for partial
                }

                this.ctx.fillStyle = fillColor;
                this.ctx.fill();
            }

            // Add upgrade indicators for upgraded ships
            if (ship.upgradeLevel > 0) {
                const dotSize = 1;
                const dotSpacing = 2.5;
                const startX = -((ship.upgradeLevel - 1) * dotSpacing) / 2;

                for (let i = 0; i < ship.upgradeLevel; i++) {
                    this.ctx.beginPath();
                    this.ctx.arc(startX + i * dotSpacing, -shipHeight/2 - 2, dotSize, 0, Math.PI * 2);
                    this.ctx.fillStyle = 'white';
                    this.ctx.fill();
                }
            }

            this.ctx.restore();
        }
    },

    // Draw cargo at ports in Mini Metro style
    drawCargo() {
        for (const port of this.ports) {
            if (port.cargo.length === 0) continue;

            // Arrange cargo in a circle around the port
            const radius = GAME_CONFIG.PORT_RADIUS + 15;
            const cargoSize = 4;

            for (let i = 0; i < port.cargo.length; i++) {
                const cargo = port.cargo[i];
                const angle = (i / port.cargo.length) * Math.PI * 2;

                const x = port.x + radius * Math.cos(angle);
                const y = port.y + radius * Math.sin(angle);

                // Draw small colored shape based on cargo type
                this.drawPortShape(x, y, cargo.shape, cargoSize);
            }
        }
    },

    // Draw UI elements
    drawUI() {
        // Update line management UI
        this.updateLineManagementUI();
    },

    // Update the line management UI in Mini Metro style
    updateLineManagementUI() {
        const linesList = document.getElementById('lines-list');
        linesList.innerHTML = '';

        for (const line of this.lines) {
            // Create line item container
            const lineElement = document.createElement('div');
            lineElement.className = 'line-item';

            // Line color indicator
            const colorIndicator = document.createElement('div');
            colorIndicator.className = 'line-color';
            colorIndicator.style.backgroundColor = line.color;

            // Line info with ship count
            const lineInfo = document.createElement('div');
            lineInfo.className = 'line-info';

            // Get ships on this line
            const shipCount = line.ships.length;
            const shipText = shipCount === 1 ? '1 ship' : `${shipCount} ships`;

            // Get port count
            const portCount = line.ports.length;
            const portText = portCount === 1 ? '1 port' : `${portCount} ports`;

            lineInfo.textContent = `${shipText} · ${portText}`;

            // Add to line element
            lineElement.appendChild(colorIndicator);
            lineElement.appendChild(lineInfo);
            linesList.appendChild(lineElement);
        }
    }
};

// Initialize the game when the window loads
window.addEventListener('load', () => {
    window.gameState.init();
});

