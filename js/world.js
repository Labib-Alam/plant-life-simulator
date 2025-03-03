class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.plants = [];
        this.gameTime = 0; // Time in milliseconds
        this.currentDay = 1;
        this.currentHour = STARTING_HOUR;
        this.skyColor = COLORS.SKY_DAY;
        
        // Camera properties - ensure they are properly initialized with numeric values
        this.cameraWidth = Math.min(width, Math.ceil(window.innerWidth / TILE_SIZE));
        this.cameraHeight = Math.min(height, Math.ceil(window.innerHeight / TILE_SIZE));
        this.zoom = 1.0;
        
        // Center camera on ground level by default
        this.cameraX = Math.max(0, Math.floor(width / 2 - this.cameraWidth / 2));
        this.cameraY = Math.max(0, GROUND_LEVEL - 10); // Show some sky above ground
        
        console.log("World constructor: Camera initialized at:", this.cameraX, this.cameraY, "with zoom:", this.zoom);
        
        this.generateWorld();
    }
    
    generateWorld() {
        console.log("Generating world with dimensions:", this.width, "x", this.height);
        console.log("Ground level set at row:", GROUND_LEVEL);
        
        // Initialize tiles array
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                // Determine tile type based on position
                let tileType = TILE_TYPES.AIR;
                
                if (y >= GROUND_LEVEL) {
                    // Use Perlin-like noise for more natural terrain generation
                    const noise = this.simplexNoise(x / 100, y / 50);
                    
                    if (y === GROUND_LEVEL) {
                        // Top soil layer - always dirt for planting
                        tileType = TILE_TYPES.DIRT;
                    } else if (y >= GROUND_LEVEL + 3) {
                        // Underground layers with natural formations
                        
                        // Create patches of stones and minerals using noise
                        const stoneNoise = this.simplexNoise(x / 30, y / 30);
                        const mineralNoise = this.simplexNoise(x / 20 + 500, y / 20 + 500);
                        
                        if (mineralNoise > 0.7) {
                            // Mineral patches - more common deeper
                            tileType = TILE_TYPES.MINERAL;
                        } else if (stoneNoise > 0.6) {
                            // Stone patches
                            tileType = TILE_TYPES.STONE;
                        } else {
                            // Mostly dirt
                            tileType = TILE_TYPES.DIRT;
                        }
                    } else {
                        // Dirt layer with occasional stone
                        const stoneNoise = this.simplexNoise(x / 40, y / 40);
                        tileType = stoneNoise > 0.8 ? TILE_TYPES.STONE : TILE_TYPES.DIRT;
                    }
                    
                    // Add water pools without y-level limit
                    const waterNoise = this.simplexNoise(x / 60 + 1000, y / 60 + 1000);
                    if (y > GROUND_LEVEL && waterNoise > 0.75) {
                        // Create water pools below the surface
                        tileType = TILE_TYPES.WATER;
                    }
                }
                
                // Create tile with enhanced moisture and nutrients
                this.tiles[y][x] = new Tile(x, y, tileType);
                
                // Set higher moisture and nutrient values for soil layers to encourage growth
                if (tileType === TILE_TYPES.DIRT) {
                    // Base moisture and nutrients for dirt
                    this.tiles[y][x].moisture = 50 + Math.random() * 30;
                    this.tiles[y][x].nutrients = 50 + Math.random() * 30;
                    
                    // Higher values near GROUND_LEVEL (topsoil is more fertile)
                    if (y <= GROUND_LEVEL + 3) {
                        this.tiles[y][x].moisture += 20;
                        this.tiles[y][x].nutrients += 20;
                    }
                } else if (tileType === TILE_TYPES.WATER) {
                    // Water tiles have high moisture
                    this.tiles[y][x].moisture = 90 + Math.random() * 10;
                    this.tiles[y][x].nutrients = 30 + Math.random() * 20;
                } else if (tileType === TILE_TYPES.MINERAL) {
                    // Mineral tiles have high nutrients
                    this.tiles[y][x].moisture = 20 + Math.random() * 20;
                    this.tiles[y][x].nutrients = 80 + Math.random() * 20;
                }
            }
        }
        
        // Create stone patches that cross layers
        this.createStoneMineralFormations();
        
        // Ensure the planting row (GROUND_LEVEL - 1) has some dirt tiles
        for (let x = 0; x < this.width; x++) {
            // Make all tiles at planting level dirt for easier planting
            if (!this.tiles[GROUND_LEVEL - 1] || !this.tiles[GROUND_LEVEL - 1][x]) {
                // Create tile array for this row if it doesn't exist
                if (!this.tiles[GROUND_LEVEL - 1]) {
                    this.tiles[GROUND_LEVEL - 1] = [];
                }
                this.tiles[GROUND_LEVEL - 1][x] = new Tile(x, GROUND_LEVEL - 1, TILE_TYPES.DIRT);
                
                // Set high moisture and nutrients for planting row
                this.tiles[GROUND_LEVEL - 1][x].moisture = 80;
                this.tiles[GROUND_LEVEL - 1][x].nutrients = 80;
            } else if (this.tiles[GROUND_LEVEL - 1][x].type !== TILE_TYPES.DIRT) {
                // Convert any non-dirt tiles to dirt for planting
                this.tiles[GROUND_LEVEL - 1][x].type = TILE_TYPES.DIRT;
                this.tiles[GROUND_LEVEL - 1][x].moisture = 80;
                this.tiles[GROUND_LEVEL - 1][x].nutrients = 80;
            }
        }
        
        // Add moisture gradient from water sources
        this.spreadMoistureFromWaterSources();
        
        console.log("Planting row initialized with dirt tiles");
        console.log("World generation complete");
    }
    
    // Create natural-looking stone and mineral formations that span multiple layers
    createStoneMineralFormations() {
        // Create large stone formations
        for (let i = 0; i < Math.floor(this.width / 100); i++) {
            const centerX = Math.floor(Math.random() * this.width);
            const centerY = Math.floor(GROUND_LEVEL + 10 + Math.random() * (this.height - GROUND_LEVEL - 20));
            const size = Math.floor(10 + Math.random() * 20);
            
            // Create a stone formation
            this.createFormation(centerX, centerY, size, TILE_TYPES.STONE);
            
            // Add mineral veins within some stone formations
            if (Math.random() < 0.4) {
                const mineralSize = Math.floor(size / 2);
                this.createFormation(centerX, centerY, mineralSize, TILE_TYPES.MINERAL);
            }
        }
        
        // Create mineral veins
        for (let i = 0; i < Math.floor(this.width / 150); i++) {
            const centerX = Math.floor(Math.random() * this.width);
            const centerY = Math.floor(GROUND_LEVEL + 15 + Math.random() * (this.height - GROUND_LEVEL - 30));
            const size = Math.floor(5 + Math.random() * 10);
            
            // Create a mineral vein
            this.createFormation(centerX, centerY, size, TILE_TYPES.MINERAL);
        }
    }
    
    // Create a natural-looking formation of a specific tile type
    createFormation(centerX, centerY, size, tileType) {
        for (let y = Math.floor(centerY - size); y <= Math.floor(centerY + size); y++) {
            for (let x = Math.floor(centerX - size); x <= Math.floor(centerX + size); x++) {
                if (y < 0 || y >= this.height || x < 0 || x >= this.width) continue;
                
                // Skip air tiles and surface layer
                if (y < GROUND_LEVEL) continue;
                
                // Calculate distance from center
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                
                // Add some noise to make formation look natural
                const noise = this.simplexNoise(x / 10, y / 10);
                const noiseSize = size * (0.8 + noise * 0.4);
                
                // Add tile if within formation radius
                if (distance <= noiseSize) {
                    // Probability decreases with distance from center
                    const probability = 1 - (distance / noiseSize);
                    if (Math.random() < probability) {
                        // Ensure we're using integer indices for the array access
                        const tileY = Math.floor(y);
                        const tileX = Math.floor(x);
                        this.tiles[tileY][tileX] = new Tile(tileX, tileY, tileType);
                    }
                }
            }
        }
    }
    
    // Simple noise function for terrain generation
    simplexNoise(x, y) {
        // Simple pseudo-random noise function
        const dot = x * 12.9898 + y * 78.233;
        const sin = Math.sin(dot) * 43758.5453123;
        return sin - Math.floor(sin);
    }
    
    update(deltaTime) {
        // Limit delta time to prevent large time jumps
        const maxDeltaTime = 1000; // 1 second maximum
        deltaTime = Math.min(deltaTime, maxDeltaTime);
        
        // Update game time
        this.gameTime += deltaTime;
        
        // Update day/night cycle
        this.updateDayNightCycle();
        
        // Update tiles
        this.updateTiles();
        
        // Update plants with a try-catch to prevent crashes
        try {
            this.updatePlants();
        } catch (error) {
            console.error("Error updating plants:", error);
        }
    }
    
    updateDayNightCycle() {
        // Calculate current hour based on game time
        const totalHours = (this.gameTime / HOUR_LENGTH) + STARTING_HOUR;
        this.currentHour = totalHours % 24;
        
        // Calculate current day
        this.currentDay = Math.floor(this.gameTime / DAY_LENGTH) + 1;
        
        // Update sky color based on time of day
        if (this.currentHour >= 6 && this.currentHour < 18) {
            // Daytime
            const dayProgress = (this.currentHour - 6) / 12; // 0 to 1 throughout the day
            
            if (dayProgress < 0.25) {
                // Sunrise: blend from dawn to day
                this.skyColor = this.blendColors('#FFA07A', COLORS.SKY_DAY, dayProgress * 4);
            } else if (dayProgress > 0.75) {
                // Sunset: blend from day to dusk
                this.skyColor = this.blendColors(COLORS.SKY_DAY, '#FF8C00', (dayProgress - 0.75) * 4);
            } else {
                // Full day
                this.skyColor = COLORS.SKY_DAY;
            }
        } else {
            // Nighttime
            const nightProgress = this.currentHour >= 18 ? 
                (this.currentHour - 18) / 12 : 
                (this.currentHour + 6) / 12;
            
            if (nightProgress < 0.25 && this.currentHour >= 18) {
                // Early night: blend from dusk to night
                this.skyColor = this.blendColors('#FF8C00', COLORS.SKY_NIGHT, nightProgress * 4);
            } else if (nightProgress > 0.75 && this.currentHour < 6) {
                // Pre-dawn: blend from night to dawn
                this.skyColor = this.blendColors(COLORS.SKY_NIGHT, '#FFA07A', (nightProgress - 0.75) * 4);
            } else {
                // Full night
                this.skyColor = COLORS.SKY_NIGHT;
            }
        }
        
        // Update day/night indicator
        const indicator = document.getElementById('dayNightIndicator');
        if (indicator) {
            if (this.currentHour >= 6 && this.currentHour < 18) {
                // Day - sun
                indicator.style.background = 'linear-gradient(to right, #FDB813, #F8F8FF)';
            } else {
                // Night - moon
                indicator.style.background = 'linear-gradient(to right, #F8F8FF, #C0C0C0)';
            }
        }
        
        // Update time display
        const timeDisplay = document.getElementById('timeDisplay');
        if (timeDisplay) {
            const hour = Math.floor(this.currentHour);
            const minute = Math.floor((this.currentHour - hour) * 60);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            timeDisplay.textContent = `Day ${this.currentDay}, ${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
        }
    }
    
    blendColors(color1, color2, ratio) {
        // Convert hex to RGB
        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);
        
        const r2 = parseInt(color2.substring(1, 3), 16);
        const g2 = parseInt(color2.substring(3, 5), 16);
        const b2 = parseInt(color2.substring(5, 7), 16);
        
        // Blend colors
        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    updateTiles() {
        // Update each tile based on its neighbors
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];
                
                // Get neighboring tiles
                const neighbors = this.getNeighbors(x, y);
                
                // Update tile
                tile.update(neighbors);
                
                // Slowly diffuse moisture between neighboring tiles
                if (tile && tile.type !== TILE_TYPES.AIR && tile.type !== TILE_TYPES.WATER) {
                    let totalMoisture = tile.moisture;
                    let tileCount = 1;
                    
                    for (const neighbor of neighbors) {
                        if (neighbor && neighbor.type !== TILE_TYPES.AIR) {
                            totalMoisture += neighbor.moisture;
                            tileCount++;
                        }
                    }
                    
                    // Gradually equalize moisture (slow diffusion)
                    const avgMoisture = totalMoisture / tileCount;
                    tile.moisture = tile.moisture * 0.9 + avgMoisture * 0.1;
                    
                    // Water tiles should always maintain high moisture
                    if (tile.type === TILE_TYPES.WATER) {
                        tile.moisture = 100;
                    }
                }
            }
        }
    }
    
    getNeighbors(x, y) {
        const neighbors = [];
        
        // Check all 8 surrounding tiles
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue; // Skip self
                
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    neighbors.push(this.tiles[ny][nx]);
                } else {
                    neighbors.push(null);
                }
            }
        }
        
        return neighbors;
    }
    
    updatePlants() {
        // Update each plant
        console.log(`Updating ${this.plants.length} plants`);
        
        for (let i = this.plants.length - 1; i >= 0; i--) {
            try {
                const plant = this.plants[i];
                if (!plant) {
                    console.warn("Skipping undefined plant at index", i);
                    continue;
                }
                
                console.log(`Updating plant at (${plant.x}, ${plant.y}), stage: ${plant.stage}`);
                
                // Pass the world object explicitly to the plant update method
                const isAlive = plant.update(this, this.gameTime);
                
                // Remove dead plants
                if (!isAlive) {
                    console.log("Removing dead plant at index", i);
                    this.plants.splice(i, 1);
                    
                    // Clear the hasPlant flag on the tile
                    const tile = this.getTile(plant.x, plant.y);
                    if (tile) {
                        tile.hasPlant = false;
                    }
                }
            } catch (error) {
                console.error("Error updating plant at index", i, ":", error);
                // Remove problematic plant to prevent further issues
                this.plants.splice(i, 1);
            }
        }
    }
    
    plantSeed(x, y) {
        // Check if position is valid for planting
        if (y < 0 || y >= this.height || x < 0 || x >= this.width) {
            console.log("Cannot plant: Position out of bounds");
            return false;
        }
        
        const tile = this.tiles[y][x];
        if (!tile) {
            console.log("Cannot plant: Invalid tile");
            return false;
        }
        
        // Can only plant on dirt
        if (tile.type !== TILE_TYPES.DIRT) {
            console.log("Cannot plant: Not a dirt tile");
            return false;
        }
        
        // Check if there's already a plant here
        if (tile.hasPlant) {
            console.log("Cannot plant: Tile already has a plant");
            return false;
        }
        
        try {
            console.log(`Creating new plant at (${x}, ${y})`);
            
            // Create new plant
            const plant = new Plant(x, y);
            this.plants.push(plant);
            
            // Mark tile as having a plant
            tile.hasPlant = true;
            
            // Initialize plant with a growth check
            plant.checkGrowth(this);
            
            console.log(`Successfully planted seed at (${x}, ${y}), total plants: ${this.plants.length}`);
            return true;
        } catch (error) {
            console.error("Error creating plant:", error);
            return false;
        }
    }
    
    getTile(x, y) {
        if (y < 0 || y >= this.height || x < 0 || x >= this.width) {
            return null;
        }
        return this.tiles[y][x];
    }
    
    draw(ctx, canvas) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw sky
        ctx.fillStyle = this.skyColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw sun or moon
        this.drawCelestialBody(ctx, canvas);
        
        // Calculate visible tiles based on camera position
        const startX = Math.floor(this.cameraX);
        const startY = Math.floor(this.cameraY);
        const endX = Math.min(this.width, startX + Math.ceil(canvas.width / (TILE_SIZE * this.zoom)) + 1);
        const endY = Math.min(this.height, startY + Math.ceil(canvas.height / (TILE_SIZE * this.zoom)) + 1);
        
        const effectiveTileSize = TILE_SIZE * this.zoom;
        
        // Draw only visible tiles
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                    const tile = this.tiles[y][x];
                    const screenPos = this.worldToScreen(x, y);
                    
                    // Draw tile with camera offset and zoom
                    if (tile) {
                        ctx.fillStyle = this.getTileColor(tile);
                        ctx.fillRect(
                            screenPos.x,
                            screenPos.y,
                            effectiveTileSize,
                            effectiveTileSize
                        );
                        
                        // Draw tile border
                        if (tile.type !== TILE_TYPES.AIR) {
                            ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
                            ctx.lineWidth = 1;
                            ctx.strokeRect(
                                screenPos.x,
                                screenPos.y,
                                effectiveTileSize,
                                effectiveTileSize
                            );
                        }
                        
                        // Draw special visual indicator for ROOT tiles
                        if (tile.type === TILE_TYPES.ROOT) {
                            // Remove the circular node and just draw subtle root tendrils
                            ctx.beginPath();
                            ctx.strokeStyle = 'rgba(101, 67, 33, 0.7)'; // Natural brown for root color
                            ctx.lineWidth = 2 * this.zoom;
                            
                            // Draw several tendrils radiating from center without the central circle
                            const centerX = screenPos.x + effectiveTileSize / 2;
                            const centerY = screenPos.y + effectiveTileSize / 2;
                            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
                                // Create a slight curve in the tendrils for more natural appearance
                                const midLength = effectiveTileSize / 3.5;
                                const endLength = effectiveTileSize / 2.2;
                                
                                const midX = centerX + Math.cos(angle) * midLength;
                                const midY = centerY + Math.sin(angle) * midLength;
                                
                                const endX = centerX + Math.cos(angle + Math.random() * 0.3) * endLength;
                                const endY = centerY + Math.sin(angle + Math.random() * 0.3) * endLength;
                                
                                ctx.moveTo(centerX, centerY);
                                ctx.quadraticCurveTo(midX, midY, endX, endY);
                            }
                            ctx.stroke();
                        }
                    }
                }
            }
        }
        
        // Draw ground level indicator
        this.drawGroundLevelIndicator(ctx);
        
        // Draw plants
        for (const plant of this.plants) {
            const screenX = (plant.x - this.cameraX) * TILE_SIZE * this.zoom;
            const screenY = (plant.y - this.cameraY) * TILE_SIZE * this.zoom;
            
            // Only draw plants that are on screen
            if (screenX >= -TILE_SIZE * 10 && screenX <= canvas.width + TILE_SIZE * 10 &&
                screenY >= -TILE_SIZE * 10 && screenY <= canvas.height + TILE_SIZE * 10) {
                // Save current transformation
                ctx.save();
                
                // Apply camera transformation
                ctx.translate(-this.cameraX * TILE_SIZE * this.zoom, -this.cameraY * TILE_SIZE * this.zoom);
                ctx.scale(this.zoom, this.zoom);
                
                plant.draw(ctx);
                
                // Restore transformation
                ctx.restore();
            }
        }
        
        // Draw camera position indicator (mini-map)
        this.drawMiniMap(ctx, canvas);
    }
    
    drawCelestialBody(ctx, canvas) {
        const hour = this.currentHour;
        let celestialX, celestialY, size, color, glowColor;
        
        if (hour >= 6 && hour < 18) {
            // Sun
            const dayProgress = (hour - 6) / 12; // 0 to 1 throughout the day
            celestialX = dayProgress * canvas.width;
            celestialY = 100 + Math.sin(Math.PI * dayProgress) * -80;
            size = 40;
            color = '#FDB813';
            glowColor = 'rgba(253, 184, 19, 0.3)';
        } else {
            // Moon
            const nightProgress = hour >= 18 ? 
                (hour - 18) / 12 : 
                (hour + 6) / 12;
            celestialX = nightProgress * canvas.width;
            celestialY = 100 + Math.sin(Math.PI * nightProgress) * -80;
            size = 30;
            color = '#F8F8FF';
            glowColor = 'rgba(248, 248, 255, 0.2)';
        }
        
        // Draw glow
        const gradient = ctx.createRadialGradient(
            celestialX, celestialY, size * 0.5,
            celestialX, celestialY, size * 2
        );
        gradient.addColorStop(0, glowColor);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(celestialX, celestialY, size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw celestial body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(celestialX, celestialY, size, 0, Math.PI * 2);
        ctx.fill();
        
        // If moon, add some craters
        if (hour < 6 || hour >= 18) {
            ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
            ctx.beginPath();
            ctx.arc(celestialX - 8, celestialY - 5, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(celestialX + 10, celestialY + 7, 7, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(celestialX + 5, celestialY - 10, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawGroundLevelIndicator(ctx) {
        // Draw a more visible indicator at ground level - 1 (where plants should be placed)
        const y = (GROUND_LEVEL - 1 - this.cameraY) * TILE_SIZE * this.zoom;
        
        // Only draw if visible on screen
        if (y >= 0 && y <= ctx.canvas.height) {
            // Draw a more visible line
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.setLineDash([8, 4]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(ctx.canvas.width, y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Add a more visible text indicator
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 14px Arial';
            ctx.fillText('Plant Here ↓', 10, y - 10);
            
            // Draw arrows pointing to dirt tiles
            for (let x = Math.floor(this.cameraX); x < Math.floor(this.cameraX + ctx.canvas.width / (TILE_SIZE * this.zoom)); x++) {
                if (x >= 0 && x < this.width) {
                    const tile = this.tiles[GROUND_LEVEL - 1][x];
                    if (tile && tile.type === TILE_TYPES.DIRT && !tile.hasPlant) {
                        // Draw arrow pointing to plantable dirt
                        const screenPos = this.worldToScreen(x, GROUND_LEVEL - 1);
                        const tileX = screenPos.x + (TILE_SIZE * this.zoom) / 2;
                        
                        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
                        ctx.beginPath();
                        ctx.moveTo(tileX, y - 15);
                        ctx.lineTo(tileX - 5, y - 25);
                        ctx.lineTo(tileX + 5, y - 25);
                        ctx.closePath();
                        ctx.fill();
                    }
                }
            }
        }
    }
    
    drawMiniMap(ctx, canvas) {
        // Parameters for mini-map
        const mapWidth = 150;
        const mapHeight = 100;
        const mapX = canvas.width - mapWidth - 10;
        const mapY = 10;
        const mapRatio = Math.min(mapWidth / this.width, mapHeight / this.height);
        
        // Draw mini-map background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(mapX, mapY, mapWidth, mapHeight);
        
        // Draw world representation on mini-map
        for (let y = 0; y < this.height; y += 5) {  // Sample every 5th tile for performance
            for (let x = 0; x < this.width; x += 5) {
                if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                    const tile = this.tiles[y][x];
                    if (tile && tile.type !== TILE_TYPES.AIR) {
                        let color;
                        switch (tile.type) {
                            case TILE_TYPES.DIRT:
                                color = COLORS.DIRT;
                                break;
                            case TILE_TYPES.STONE:
                                color = COLORS.STONE;
                                break;
                            case TILE_TYPES.MINERAL:
                                color = COLORS.MINERAL;
                                break;
                            case TILE_TYPES.WATER:
                                color = COLORS.WATER;
                                break;
                            default:
                                color = 'magenta';
                        }
                        
                        ctx.fillStyle = color;
                        ctx.fillRect(
                            mapX + (x * mapRatio),
                            mapY + (y * mapRatio),
                            Math.max(1, mapRatio * 5),
                            Math.max(1, mapRatio * 5)
                        );
                    }
                }
            }
        }
        
        // Draw camera viewport on mini-map
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            mapX + (this.cameraX * mapRatio),
            mapY + (this.cameraY * mapRatio),
            this.cameraWidth * mapRatio,
            this.cameraHeight * mapRatio
        );
        
        // Draw mini-map border
        ctx.strokeStyle = 'white';
        ctx.strokeRect(mapX, mapY, mapWidth, mapHeight);
        
        // Add mini-map label
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.fillText("Mini-Map", mapX + 5, mapY + 12);
    }
    
    // Camera movement methods
    moveCamera(dx, dy) {
        // Check for NaN and replace with default values if needed
        if (!Number.isFinite(this.cameraX)) this.cameraX = 0;
        if (!Number.isFinite(this.cameraY)) this.cameraY = 0;
        
        const newX = this.cameraX + dx;
        const newY = this.cameraY + dy;
        
        this.cameraX = Math.max(0, Math.min(this.width - this.cameraWidth, newX));
        this.cameraY = Math.max(0, Math.min(this.height - this.cameraHeight, newY));
    }
    
    zoomCamera(delta) {
        // Check for NaN and replace with default values if needed
        if (!Number.isFinite(this.zoom)) this.zoom = 1.0;
        
        const oldZoom = this.zoom;
        const newZoom = Math.max(0.5, Math.min(2, this.zoom + delta));
        this.zoom = newZoom;
        
        // Adjust camera position to keep center point consistent
        if (oldZoom !== this.zoom && Number.isFinite(oldZoom) && Number.isFinite(this.zoom)) {
            const zoomRatio = this.zoom / oldZoom;
            this.cameraWidth = Math.ceil(this.cameraWidth / zoomRatio);
            this.cameraHeight = Math.ceil(this.cameraHeight / zoomRatio);
            
            // Ensure camera doesn't exceed world boundaries
            this.cameraX = Math.max(0, Math.min(this.width - this.cameraWidth, this.cameraX));
            this.cameraY = Math.max(0, Math.min(this.height - this.cameraHeight, this.cameraY));
        } else {
            // If the calculations would result in NaN, reset to defaults
            this.cameraWidth = Math.min(this.width, Math.ceil(window.innerWidth / (TILE_SIZE * this.zoom)));
            this.cameraHeight = Math.min(this.height, Math.ceil(window.innerHeight / (TILE_SIZE * this.zoom)));
        }
    }
    
    worldToScreen(worldX, worldY) {
        // Check for NaN and replace with default values if needed
        if (!Number.isFinite(this.cameraX)) this.cameraX = 0;
        if (!Number.isFinite(this.cameraY)) this.cameraY = 0;
        if (!Number.isFinite(this.zoom)) this.zoom = 1.0;
        
        return {
            x: (worldX - this.cameraX) * TILE_SIZE * this.zoom,
            y: (worldY - this.cameraY) * TILE_SIZE * this.zoom
        };
    }
    
    screenToWorld(screenX, screenY) {
        // Check for NaN and replace with default values if needed
        if (!Number.isFinite(this.cameraX)) this.cameraX = 0;
        if (!Number.isFinite(this.cameraY)) this.cameraY = 0;
        if (!Number.isFinite(this.zoom)) this.zoom = 1.0;
        
        return {
            x: Math.floor(screenX / (TILE_SIZE * this.zoom) + this.cameraX),
            y: Math.floor(screenY / (TILE_SIZE * this.zoom) + this.cameraY)
        };
    }
    
    getTileColor(tile) {
        switch (tile.type) {
            case TILE_TYPES.AIR:
                return 'transparent';
            case TILE_TYPES.DIRT:
                // Add slight variation to dirt color
                const dirtVariation = Math.random() * 20 - 10;
                const baseColor = COLORS.DIRT;
                const r = parseInt(baseColor.substring(1, 3), 16);
                const g = parseInt(baseColor.substring(3, 5), 16);
                const b = parseInt(baseColor.substring(5, 7), 16);
                return `rgb(${r + dirtVariation}, ${g + dirtVariation}, ${b + dirtVariation})`;
            case TILE_TYPES.STONE:
                return COLORS.STONE;
            case TILE_TYPES.MINERAL:
                return COLORS.MINERAL;
            case TILE_TYPES.WATER:
                return COLORS.WATER;
            case TILE_TYPES.ROOT:
                // Make root tiles more noticeable with a vibrant color
                return 'rgba(165, 42, 42, 0.8)'; // More visible brownish-red
            default:
                return 'magenta'; // Debug color for unknown types
        }
    }
    
    // New method to spread moisture from water sources to nearby tiles
    spreadMoistureFromWaterSources() {
        // First pass - identify all water sources
        const waterSources = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tiles[y][x] && this.tiles[y][x].type === TILE_TYPES.WATER) {
                    waterSources.push({ x, y });
                }
            }
        }
        
        // Second pass - spread moisture from each water source
        for (const source of waterSources) {
            // Spread moisture in a radius around the water source
            const radius = 6;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const targetX = source.x + dx;
                    const targetY = source.y + dy;
                    
                    // Skip if out of bounds
                    if (targetX < 0 || targetX >= this.width || targetY < 0 || targetY >= this.height) {
                        continue;
                    }
                    
                    // Skip water and air tiles
                    const targetTile = this.tiles[targetY][targetX];
                    if (!targetTile || targetTile.type === TILE_TYPES.WATER || targetTile.type === TILE_TYPES.AIR) {
                        continue;
                    }
                    
                    // Calculate distance from water source
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance <= radius) {
                        // The closer to water source, the higher the moisture
                        const moistureBoost = 50 * (1 - distance / radius);
                        targetTile.moisture = Math.min(100, targetTile.moisture + moistureBoost);
                        
                        // Dirt near water has slightly higher nutrients too
                        if (targetTile.type === TILE_TYPES.DIRT) {
                            const nutrientBoost = 20 * (1 - distance / radius);
                            targetTile.nutrients = Math.min(100, targetTile.nutrients + nutrientBoost);
                        }
                    }
                }
            }
        }
    }
} 