// Main game class
class Game {
    constructor() {
        try {
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.lastTime = 0;
            this.timeSpeed = 1; // Time multiplier (1 = normal speed)
            this.plantMode = false;
            this.keysPressed = {}; // Track pressed keys for camera movement
            
            // Resize canvas to fit container
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            
            // Initialize world with error handling
            console.log("Initializing world...");
            try {
                this.world = new World(GRID_WIDTH, GRID_HEIGHT);
                console.log("World initialization successful");
            } catch (error) {
                console.error("Error creating world:", error);
                // Set up a basic world if creation fails
                alert("There was an error creating the world. Using simplified version.");
                this.initializeBasicWorld();
            }
            
            // Ensure world is properly initialized
            if (this.world) {
                console.log("World initialized with camera at:", 
                    this.world.cameraX, this.world.cameraY, 
                    "zoom:", this.world.zoom);
                
                // Set safe default values if any are NaN
                if (!Number.isFinite(this.world.cameraX)) this.world.cameraX = 0;
                if (!Number.isFinite(this.world.cameraY)) this.world.cameraY = 0;
                if (!Number.isFinite(this.world.zoom)) this.world.zoom = 1.0;
            } else {
                throw new Error("World initialization failed");
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start game loop
            requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
            
            // Debug message to confirm initialization
            console.log("Game initialized with grid size:", GRID_WIDTH, "x", GRID_HEIGHT);
            console.log("Ground level is at row:", GROUND_LEVEL);
        } catch (error) {
            console.error("Error in game initialization:", error);
            this.showErrorMessage("Failed to initialize game. Please refresh and try again.");
        }
    }
    
    // Initialize a basic world if the complex one fails
    initializeBasicWorld() {
        this.world = {
            width: GRID_WIDTH,
            height: GRID_HEIGHT,
            tiles: [],
            plants: [],
            gameTime: 0,
            currentDay: 1,
            currentHour: STARTING_HOUR,
            skyColor: COLORS.SKY_DAY,
            cameraX: 0,
            cameraY: 0,
            zoom: 1.0,
            cameraWidth: Math.ceil(this.canvas.width / TILE_SIZE),
            cameraHeight: Math.ceil(this.canvas.height / TILE_SIZE)
        };
        
        // Initialize a basic tile grid with just dirt at ground level
        for (let y = 0; y < GRID_HEIGHT; y++) {
            this.world.tiles[y] = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                let tileType = TILE_TYPES.AIR;
                
                if (y === GROUND_LEVEL - 1) {
                    // Planting level
                    tileType = TILE_TYPES.DIRT;
                } else if (y >= GROUND_LEVEL) {
                    // Ground and below
                    tileType = TILE_TYPES.DIRT;
                }
                
                this.world.tiles[y][x] = new Tile(x, y, tileType);
            }
        }
        
        // Provide simplified methods if they're missing
        this.world.moveCamera = this.world.moveCamera || function(dx, dy) {
            this.cameraX = Math.max(0, Math.min(this.width - this.cameraWidth, this.cameraX + dx));
            this.cameraY = Math.max(0, Math.min(this.height - this.cameraHeight, this.cameraY + dy));
        };
        
        this.world.zoomCamera = this.world.zoomCamera || function(delta) {
            this.zoom = Math.max(0.5, Math.min(2, this.zoom + delta));
        };
        
        this.world.update = this.world.update || function(deltaTime) {
            // Basic update function
            this.gameTime += deltaTime;
        };
        
        this.world.draw = this.world.draw || function(ctx, canvas) {
            // Basic draw function
            ctx.fillStyle = this.skyColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw dirt at ground level
            ctx.fillStyle = COLORS.DIRT;
            for (let x = 0; x < this.width; x++) {
                ctx.fillRect(
                    (x - this.cameraX) * TILE_SIZE * this.zoom,
                    (GROUND_LEVEL - this.cameraY) * TILE_SIZE * this.zoom,
                    TILE_SIZE * this.zoom,
                    TILE_SIZE * this.zoom
                );
            }
        };
        
        this.world.plantSeed = this.world.plantSeed || function(x, y) {
            // Simplified plant seed function
            return false;
        };
        
        this.world.screenToWorld = this.world.screenToWorld || function(screenX, screenY) {
            return {
                x: Math.floor(screenX / (TILE_SIZE * this.zoom) + this.cameraX),
                y: Math.floor(screenY / (TILE_SIZE * this.zoom) + this.cameraY)
            };
        };
        
        this.world.worldToScreen = this.world.worldToScreen || function(worldX, worldY) {
            return {
                x: (worldX - this.cameraX) * TILE_SIZE * this.zoom,
                y: (worldY - this.cameraY) * TILE_SIZE * this.zoom
            };
        };
        
        this.world.getTile = this.world.getTile || function(x, y) {
            if (y < 0 || y >= this.height || x < 0 || x >= this.width) {
                return null;
            }
            return this.tiles[y][x];
        };
    }
    
    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'absolute';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '20px';
        errorDiv.style.borderRadius = '5px';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.zIndex = '1000';
        errorDiv.innerHTML = `<p>${message}</p><button onclick="location.reload()">Reload</button>`;
        document.body.appendChild(errorDiv);
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight - document.querySelector('h1').offsetHeight 
            - document.querySelector('.instructions').offsetHeight 
            - document.querySelector('.controls').offsetHeight;
        
        console.log("Canvas resized to:", this.canvas.width, "x", this.canvas.height);
        
        // Update camera view dimensions
        if (this.world) {
            this.world.cameraWidth = Math.ceil(this.canvas.width / (TILE_SIZE * this.world.zoom));
            this.world.cameraHeight = Math.ceil(this.canvas.height / (TILE_SIZE * this.world.zoom));
        }
    }
    
    setupEventListeners() {
        // Plant seed button
        const plantSeedButton = document.getElementById('plantSeed');
        if (plantSeedButton) {
            plantSeedButton.addEventListener('click', () => {
                this.plantMode = !this.plantMode; // Toggle plant mode
                this.canvas.style.cursor = this.plantMode ? 'crosshair' : 'default';
                
                // Update button text to indicate mode
                plantSeedButton.textContent = this.plantMode ? 'Cancel Planting' : 'Plant Seed';
                
                // Add visual indicator for plant mode
                if (this.plantMode) {
                    plantSeedButton.style.backgroundColor = '#ff6347'; // Tomato red for active mode
                    console.log("Planting mode activated");
                } else {
                    plantSeedButton.style.backgroundColor = '#4CAF50'; // Original green
                    console.log("Planting mode deactivated");
                }
            });
            console.log("Plant seed button event listener set up");
        } else {
            console.error("Plant seed button not found!");
        }
        
        // Branch growth rate slider
        const branchGrowthSlider = document.getElementById('branchGrowthRate');
        const branchGrowthValue = document.getElementById('branchGrowthValue');
        if (branchGrowthSlider && branchGrowthValue) {
            // Initialize the growth rate
            this.branchGrowthRate = parseFloat(branchGrowthSlider.value);
            
            branchGrowthSlider.addEventListener('input', (event) => {
                this.branchGrowthRate = parseFloat(event.target.value);
                branchGrowthValue.textContent = this.branchGrowthRate.toFixed(1);
                
                // Update the growth rate in the world if it exists
                if (this.world) {
                    this.world.branchGrowthRate = this.branchGrowthRate;
                }
            });
            console.log("Branch growth rate slider event listener set up");
        } else {
            console.error("Branch growth rate slider or value display not found!");
        }
        
        // Canvas click for planting
        this.canvas.addEventListener('click', (event) => {
            console.log("Canvas clicked, plant mode:", this.plantMode);
            
            if (this.plantMode) {
                const rect = this.canvas.getBoundingClientRect();
                const clickX = event.clientX - rect.left;
                const clickY = event.clientY - rect.top;
                
                // Convert screen coordinates to world coordinates
                const worldCoords = this.world.screenToWorld(clickX, clickY);
                const x = worldCoords.x;
                const y = worldCoords.y;
                
                console.log("Click position:", clickX, clickY);
                console.log("World position:", x, y);
                console.log("Target planting position:", x, GROUND_LEVEL - 1);
                
                // Try to plant at ground level
                let planted = false;
                
                // Check if the tile at the planting position is valid
                const tile = this.world.getTile(x, GROUND_LEVEL - 1);
                if (tile) {
                    console.log("Target tile type:", tile.type === TILE_TYPES.DIRT ? "DIRT" : 
                                                   tile.type === TILE_TYPES.WATER ? "WATER" : 
                                                   tile.type === TILE_TYPES.STONE ? "STONE" : 
                                                   tile.type === TILE_TYPES.MINERAL ? "MINERAL" : "AIR");
                    console.log("Tile already has plant:", tile.hasPlant);
                } else {
                    console.log("Target tile is null or undefined");
                }
                
                // Try planting
                planted = this.world.plantSeed(x, GROUND_LEVEL - 1);
                
                if (planted) {
                    console.log(`Plant seed placed at x:${x}, y:${GROUND_LEVEL - 1}`);
                    
                    // Don't exit plant mode, allow multiple plantings
                    // Just provide visual feedback
                    const plantSeedButton = document.getElementById('plantSeed');
                    if (plantSeedButton) {
                        plantSeedButton.style.backgroundColor = '#32CD32'; // Lighter green for success
                        setTimeout(() => {
                            if (this.plantMode) {
                                plantSeedButton.style.backgroundColor = '#ff6347'; // Back to red if still in plant mode
                            }
                        }, 300);
                    }
                } else {
                    console.log(`Could not plant at x:${x}, y:${GROUND_LEVEL - 1}. Try clicking on dirt at ground level.`);
                    
                    // Try planting directly at the clicked position as a fallback
                    if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
                        const clickedTile = this.world.getTile(x, y);
                        if (clickedTile && clickedTile.type === TILE_TYPES.DIRT && !clickedTile.hasPlant) {
                            console.log("Attempting to plant at clicked position instead");
                            planted = this.world.plantSeed(x, y);
                            if (planted) {
                                console.log(`Plant seed placed at clicked position x:${x}, y:${y}`);
                                
                                // Provide visual feedback
                                const plantSeedButton = document.getElementById('plantSeed');
                                if (plantSeedButton) {
                                    plantSeedButton.style.backgroundColor = '#32CD32'; // Lighter green for success
                                    setTimeout(() => {
                                        if (this.plantMode) {
                                            plantSeedButton.style.backgroundColor = '#ff6347'; // Back to red if still in plant mode
                                        }
                                    }, 300);
                                }
                            }
                        }
                    }
                }
            }
        });
        console.log("Canvas click event listener set up");
        
        // Canvas hover for planting preview
        this.canvas.addEventListener('mousemove', (event) => {
            if (this.plantMode) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;
                
                // Convert screen coordinates to world coordinates
                const worldCoords = this.world.screenToWorld(mouseX, mouseY);
                this.hoverX = worldCoords.x;
                
                // Allow hovering at the actual mouse position for better feedback
                const hoverY = worldCoords.y;
                
                // Check if the hovered tile is dirt
                const hoveredTile = this.world.getTile(this.hoverX, hoverY);
                if (hoveredTile && hoveredTile.type === TILE_TYPES.DIRT && !hoveredTile.hasPlant) {
                    // If it's a valid dirt tile, use that position
                    this.hoverY = hoverY;
                } else {
                    // Otherwise default to ground level
                    this.hoverY = GROUND_LEVEL - 1;
                }
            } else {
                this.hoverX = null;
                this.hoverY = null;
            }
        });
        console.log("Canvas mousemove event listener set up");
        
        // Add camera controls with mouse
        this.canvas.addEventListener('wheel', (event) => {
            // Zoom with mouse wheel
            const delta = event.deltaY > 0 ? -CAMERA_ZOOM_STEP : CAMERA_ZOOM_STEP;
            this.world.zoomCamera(delta);
            event.preventDefault(); // Prevent page scrolling
        });
        
        let isDragging = false;
        let lastMouseX = 0;
        let lastMouseY = 0;
        
        this.canvas.addEventListener('mousedown', (event) => {
            // Middle button or right button for camera panning
            if (event.button === 1 || event.button === 2) {
                isDragging = true;
                lastMouseX = event.clientX;
                lastMouseY = event.clientY;
                this.canvas.style.cursor = 'move';
                event.preventDefault();
            }
        });
        
        window.addEventListener('mousemove', (event) => {
            if (isDragging) {
                const dx = (lastMouseX - event.clientX) / (TILE_SIZE * this.world.zoom);
                const dy = (lastMouseY - event.clientY) / (TILE_SIZE * this.world.zoom);
                this.world.moveCamera(dx, dy);
                lastMouseX = event.clientX;
                lastMouseY = event.clientY;
            }
        });
        
        window.addEventListener('mouseup', (event) => {
            if (event.button === 1 || event.button === 2) {
                isDragging = false;
                this.canvas.style.cursor = this.plantMode ? 'crosshair' : 'default';
            }
        });
        
        // Prevent context menu on right-click
        this.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        
        // Keyboard controls
        window.addEventListener('keydown', (event) => {
            this.keysPressed[event.key] = true;
            
            // Speed controls
            if (event.key === '1') {
                this.timeSpeed = 1; // Normal speed
                console.log("Game speed set to 1x");
            } else if (event.key === '2') {
                this.timeSpeed = 2; // 2x speed
                console.log("Game speed set to 2x");
            } else if (event.key === '3') {
                this.timeSpeed = 5; // 5x speed
                console.log("Game speed set to 5x");
            } else if (event.key === '0') {
                this.timeSpeed = 0.5; // 0.5x speed
                console.log("Game speed set to 0.5x");
            } else if (event.key === 'Escape' && this.plantMode) {
                // Exit plant mode with Escape key
                this.plantMode = false;
                this.canvas.style.cursor = 'default';
                const plantSeedButton = document.getElementById('plantSeed');
                if (plantSeedButton) {
                    plantSeedButton.textContent = 'Plant Seed';
                    plantSeedButton.style.backgroundColor = '#4CAF50';
                }
                console.log("Planting mode exited with ESC key");
            }
        });
        
        window.addEventListener('keyup', (event) => {
            this.keysPressed[event.key] = false;
        });
        
        console.log("Keyboard event listener set up");
    }
    
    handleCameraControls() {
        // Camera movement speed (adjusted by zoom level)
        const moveSpeed = CAMERA_SPEED / this.world.zoom;
        
        // Arrow keys for camera movement
        if (this.keysPressed['ArrowUp'] || this.keysPressed['w']) {
            this.world.moveCamera(0, -moveSpeed / 10);
        }
        if (this.keysPressed['ArrowDown'] || this.keysPressed['s']) {
            this.world.moveCamera(0, moveSpeed / 10);
        }
        if (this.keysPressed['ArrowLeft'] || this.keysPressed['a']) {
            this.world.moveCamera(-moveSpeed / 10, 0);
        }
        if (this.keysPressed['ArrowRight'] || this.keysPressed['d']) {
            this.world.moveCamera(moveSpeed / 10, 0);
        }
        
        // Page Up/Down for zooming
        if (this.keysPressed['PageUp'] || this.keysPressed['+']) {
            this.world.zoomCamera(CAMERA_ZOOM_STEP / 10);
        }
        if (this.keysPressed['PageDown'] || this.keysPressed['-']) {
            this.world.zoomCamera(-CAMERA_ZOOM_STEP / 10);
        }
        
        // Home key to reset camera to ground level
        if (this.keysPressed['Home']) {
            this.world.cameraX = 0;
            this.world.cameraY = Math.max(0, GROUND_LEVEL - 10);
            this.world.zoom = 1;
        }
    }
    
    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = this.lastTime ? (timestamp - this.lastTime) * this.timeSpeed : 0;
        this.lastTime = timestamp;
        
        // Handle camera movement
        this.handleCameraControls();
        
        // Update world
        this.world.update(deltaTime);
        
        // Draw world
        this.world.draw(this.ctx, this.canvas);
        
        // Draw planting preview if in plant mode
        if (this.plantMode && this.hoverX !== null && this.hoverY !== null) {
            this.drawPlantingPreview();
        }
        
        // Draw camera controls help
        this.drawControlsHelp();
        
        // Continue game loop
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
    
    drawPlantingPreview() {
        // Draw a preview of where the plant will be placed
        const screenPos = this.world.worldToScreen(this.hoverX, this.hoverY);
        const x = screenPos.x;
        const y = screenPos.y;
        const effectiveTileSize = TILE_SIZE * this.world.zoom;
        
        // Check if this is a valid planting spot
        const tile = this.world.getTile(this.hoverX, this.hoverY);
        const canPlant = tile && tile.type === TILE_TYPES.DIRT && !tile.hasPlant;
        
        // Draw indicator
        this.ctx.strokeStyle = canPlant ? 'rgba(0, 255, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 3]);
        this.ctx.strokeRect(x, y, effectiveTileSize, effectiveTileSize);
        this.ctx.setLineDash([]);
        
        // Draw seed icon
        if (canPlant) {
            this.ctx.fillStyle = 'rgba(139, 69, 19, 0.7)';
            this.ctx.beginPath();
            this.ctx.ellipse(
                x + effectiveTileSize/2, 
                y + effectiveTileSize/2, 
                5 * this.world.zoom, 
                7 * this.world.zoom, 
                0, 0, Math.PI * 2
            );
            this.ctx.fill();
        }
        
        // Add text indicator
        this.ctx.fillStyle = canPlant ? 'rgba(0, 255, 0, 0.9)' : 'rgba(255, 0, 0, 0.9)';
        this.ctx.font = `${12 * this.world.zoom}px Arial`;
        this.ctx.fillText(canPlant ? 'Click to Plant' : 'Cannot Plant Here', x + 5, y - 5);
    }
    
    drawControlsHelp() {
        // Draw controls help in the bottom left
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, this.canvas.height - 100, 250, 90);
        this.ctx.strokeStyle = 'white';
        this.ctx.strokeRect(10, this.canvas.height - 100, 250, 90);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('Camera Controls:', 20, this.canvas.height - 80);
        this.ctx.fillText('• Arrow Keys / WASD: Move Camera', 20, this.canvas.height - 65);
        this.ctx.fillText('• +/- or Page Up/Down: Zoom', 20, this.canvas.height - 50);
        this.ctx.fillText('• Middle/Right Mouse: Pan Camera', 20, this.canvas.height - 35);
        this.ctx.fillText('• Mouse Wheel: Zoom In/Out', 20, this.canvas.height - 20);
        this.ctx.fillText('• Home: Reset Camera', 20, this.canvas.height - 5);
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing game");
    
    // Store game instance globally for debugging
    try {
        // Clear any existing game instance
        if (window.game) {
            console.log("Replacing existing game instance");
        }
        
        window.game = new Game();
        console.log("Game instance created and stored in window.game");
        
        // Verify that camera values are valid
        if (window.game && window.game.world) {
            const cameraX = window.game.world.cameraX;
            const cameraY = window.game.world.cameraY;
            const zoom = window.game.world.zoom;
            
            console.log("Camera values after initialization:", 
                Number.isFinite(cameraX) ? cameraX : "NaN(fixed to 0)", 
                Number.isFinite(cameraY) ? cameraY : "NaN(fixed to 0)",
                Number.isFinite(zoom) ? zoom : "NaN(fixed to 1.0)");
        }
    } catch (error) {
        console.error("Error initializing game:", error);
    }
}); 