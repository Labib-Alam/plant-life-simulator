class Plant {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.stage = PLANT_STAGES.SEED;
        this.age = 0; // Age in game days
        this.health = 100;
        this.height = 1;
        this.rootDepth = 1;
        this.lastGrowthCheck = 0;
        this.growthRate = 0.4; // Increased growth rate from 0.2 to 0.4
        this.waterAbsorption = 0.5; // How much water the plant absorbs
        this.nutrientAbsorption = 0.3; // How much nutrients the plant absorbs
        this.lastUpdateTime = 0; // Track last update time
        this.branchCount = 0; // Track number of branches
        this.leafCount = 0; // Track number of leaves
        this.growthCheckInterval = HOUR_LENGTH; // Check growth every hour
        
        // Track branch angles for 90-degree rotation
        this.lastBranchSide = 1; // 1 for right, -1 for left
        
        // Parts of the plant that have grown
        this.parts = {
            roots: [{ x: 0, y: 0, type: PLANT_PARTS.ROOT, size: 5, absorption: [] }],
            stem: [{ x: 0, y: 0, type: PLANT_PARTS.STEM, size: 5, color: '#228B22', branchConnectionPoints: [] }],
            leaves: [],
            branches: [],
            connectors: []
        };
        
        // Immediately grow to make seed visible - make it more prominent
        this.growStem(0, -1, { size: 6, color: '#32CD32' }); // Brighter green and larger
        
        // Add a visible seed structure
        this.parts.connectors.push({
            x: 0, 
            y: -1, 
            type: PLANT_PARTS.CONNECTOR, 
            radius: 5, 
            color: '#8B4513', 
            connections: []
        });
        
        this.stemLeafSide = 1; // Track which side to place stem leaves on
        
        console.log("New plant created at", x, y, "with parts:", JSON.stringify(this.parts));
    }
    
    update(world, gameTime) {
        if (!world) {
            console.error("World object is missing in plant update");
            return false;
        }
        
        // Update plant age
        const daysPassed = Math.floor(gameTime / DAY_LENGTH);
        if (daysPassed > this.age) {
            this.age = daysPassed;
            
            // Force growth check on new day
            this.checkGrowth(world);
            console.log("Plant age updated to", this.age, "days");
        }
        
        // Check for growth based on time interval
        const timeSinceLastUpdate = gameTime - this.lastUpdateTime;
        if (timeSinceLastUpdate > this.growthCheckInterval) {
            this.lastUpdateTime = gameTime;
            
            // Increased chance to grow each hour from 0.2 to 0.5 for better visibility
            if (Math.random() < 0.5) {
                this.checkGrowth(world);
            }
        }
        
        // Check environmental factors
        this.checkEnvironment(world);
        
        // Update leaf orientations to ensure they point towards branches
        this.updateLeafOrientations();
        
        return this.health > 0; // Return true if plant is alive
    }
    
    checkGrowth(world) {
        if (!world) return;
        
        // Calculate growth factors
        const moistureFactor = this.calculateMoistureFactor(world);
        const nutrientFactor = this.calculateNutrientFactor(world);
        const sunlightFactor = this.calculateSunlightFactor(world);
        
        // Calculate overall growth potential
        const growthPotential = this.growthRate * moistureFactor * nutrientFactor * sunlightFactor;
        
        // Increase chance of growth for new plants
        let growthChance = growthPotential;
        if (this.stage === PLANT_STAGES.SEED || this.stage === PLANT_STAGES.GERMINATION) {
            growthChance = Math.max(0.8, growthChance); // Increased from 0.7 to 0.8 for early stages
        } else {
            // Ensure other stages also have reasonable growth chance
            growthChance = Math.max(0.5, growthChance); // Increased from 0.4 to 0.5
        }
        
        console.log(`Growth check: Potential=${growthPotential.toFixed(2)}, Chance=${growthChance.toFixed(2)}`);
        
        // Removed maximum size check to allow unlimited growth
        
        // Chance to grow based on potential - now almost guaranteed for testing
        if (Math.random() < growthChance) {
            this.grow(world); // Pass world to grow method
        }
        
        // Always grow at least one part to ensure visibility during testing
        if (this.parts.stem.length < 3 || this.parts.roots.length < 3) {
            this.grow(world);
        }
        
        // Absorb resources from soil
        this.absorbResources(world);
    }
    
    calculateMoistureFactor(world) {
        if (!world) return 0;
        
        // Check moisture in soil around roots
        let totalMoisture = 0;
        let tileCount = 0;
        
        for (const root of this.parts.roots) {
            const rootX = this.x + root.x;
            const rootY = this.y + root.y;
            const tile = world.getTile(rootX, rootY);
            
            if (tile && tile.type !== TILE_TYPES.AIR) {
                totalMoisture += tile.moisture;
                tileCount++;
            }
        }
        
        const avgMoisture = tileCount > 0 ? totalMoisture / tileCount : 0;
        return Math.min(avgMoisture / 50, 1); // Normalize to 0-1
    }
    
    calculateNutrientFactor(world) {
        if (!world) return 0;
        
        // Check nutrients in soil around roots
        let totalNutrients = 0;
        let tileCount = 0;
        
        for (const root of this.parts.roots) {
            const rootX = this.x + root.x;
            const rootY = this.y + root.y;
            const tile = world.getTile(rootX, rootY);
            
            if (tile && tile.type !== TILE_TYPES.AIR) {
                totalNutrients += tile.nutrients;
                tileCount++;
            }
        }
        
        const avgNutrients = tileCount > 0 ? totalNutrients / tileCount : 0;
        return Math.min(avgNutrients / 50, 1); // Normalize to 0-1
    }
    
    calculateSunlightFactor(world) {
        // Simple sunlight factor based on time of day
        const hour = world.currentHour;
        if (hour >= 6 && hour < 18) {
            // Daytime - more sunlight
            return 1 - Math.abs(12 - hour) / 12; // Peak at noon
        } else {
            // Nighttime - minimal growth
            return 0.1;
        }
    }
    
    absorbResources(world) {
        if (!world) return;
        
        // Absorb water and nutrients from surrounding tiles
        for (const root of this.parts.roots) {
            const rootX = this.x + root.x;
            const rootY = this.y + root.y;
            const tile = world.getTile(rootX, rootY);
            
            if (tile && (tile.type === TILE_TYPES.DIRT || tile.type === TILE_TYPES.WATER)) {
                // Absorb moisture
                const waterToAbsorb = Math.min(tile.moisture, this.waterAbsorption);
                tile.moisture = Math.max(0, tile.moisture - waterToAbsorb);
                
                // Absorb nutrients
                if (tile.type === TILE_TYPES.DIRT) {
                    const nutrientsToAbsorb = Math.min(tile.nutrients, this.nutrientAbsorption);
                    tile.nutrients = Math.max(0, tile.nutrients - nutrientsToAbsorb);
                }
            }
        }
    }
    
    grow(world) {
        // Determine what can grow based on plant stage
        if (this.stage === PLANT_STAGES.SEED) {
            // Initial root growth
            if (Math.random() < 0.9) {
                this.growRoot(0, 1, { world: world, size: 4 });
                this.stage = PLANT_STAGES.GERMINATION;
                console.log("Plant progressed to germination stage");
            }
        } else if (this.stage === PLANT_STAGES.GERMINATION) {
            const growth = Math.random();
            
            if (growth < 0.8) { // Increased from 0.7 to grow stem faster
                // Grow stem
                const stemY = -this.parts.stem.length - 1;
                this.growStem(0, stemY, { size: 4 });
                
                // Progress to sapling stage with just a few stem segments
                if (this.parts.stem.length >= 2) {
                    this.stage = PLANT_STAGES.SAPLING;
                    console.log("Plant progressed to sapling stage");
                }
            } else {
                // Grow more roots during germination
                const rootX = Math.round(Math.random() * 2 - 1);
                const rootY = Math.floor(Math.random() * 2) + 1;
                this.growRoot(rootX, rootY, { world: world, size: 4 });
            }
        } else if (this.stage === PLANT_STAGES.SAPLING) {
            const growth = Math.random();
            
            if (growth < 0.4) { // Increased stem growth chance
                // Continue stem growth
                const stemY = -this.parts.stem.length - 1;
                const stemSize = 4.5 + (this.age * 0.05); // Increased age multiplier
                this.growStem(0, stemY, { size: stemSize });
            } else { // Removed else-if to maximize branch growth chance
                // Grow branches if we have enough stem
                if (this.parts.stem.length >= 2) {
                    // Try to grow branches on both sides
                    const sides = [1, -1];
                    sides.forEach(side => {
                        if (Math.random() < 0.7) { // 70% chance for each side
                            const stemY = -Math.floor(Math.random() * this.parts.stem.length);
                            this.growBranch(side, stemY, {
                                size: 3.5,
                                color: '#3A5F0B'
                            });
                        }
                    });
                }
            }
            
            // Progress to juvenile stage with more relaxed conditions
            if (this.parts.stem.length >= 3 && this.parts.branches.length >= 2) {
                this.stage = PLANT_STAGES.JUVENILE;
                console.log("Plant progressed to juvenile stage");
            }
        } else if (this.stage === PLANT_STAGES.JUVENILE) {
            const growth = Math.random();
            
            if (growth < 0.3) { // Increased stem growth chance
                const stemY = -this.parts.stem.length - 1;
                const stemSize = 5 + (this.age * 0.08); // Increased age multiplier
                this.growStem(0, stemY, { size: stemSize });
            } else if (growth < 0.9) { // High chance for branches
                if (this.parts.branches.length > 0 && Math.random() < 0.3) { // Reduced sub-branch chance to 30%
                    // Add sub-branch to existing branch
                    const branchIndex = Math.floor(Math.random() * this.parts.branches.length);
                    const branch = this.parts.branches[branchIndex];
                    
                    if (branch) {
                        const side = Math.random() < 0.5 ? -1 : 1;
                        const angle = Math.PI/2 * (Math.random() < 0.5 ? 1 : -1);
                        
                        this.growSubBranch(side, branch.y, branch, {
                            angle: angle,
                            size: branch.size * 0.85
                        });
                    }
                } else {
                    // Try to grow branches on both sides
                    const sides = [1, -1];
                    sides.forEach(side => {
                        if (Math.random() < 0.6) { // 60% chance for each side
                            const stemY = -Math.floor(Math.random() * this.parts.stem.length);
                            this.growBranch(side, stemY, {
                                size: 4,
                                color: '#3A5F0B'
                            });
                        }
                    });
                }
            } else {
                // Grow roots
                const rootX = Math.round(Math.random() * 4 - 2);
                const rootY = Math.floor(Math.random() * 3) + this.rootDepth;
                this.growRoot(rootX, rootY, { world: world, advanced: true });
            }
        }
    }
    
    growStem(dx, dy, options = {}) {
        // Calculate new position
        const newX = this.parts.stem.length > 0 ? 0 : 0;
        const newY = dy;
        
        // Verify if we can grow here
        const existingStem = this.parts.stem.find(stem => stem.x === newX && stem.y === newY);
        if (existingStem) {
            console.log("Stem already exists at", newX, newY);
            return existingStem;
        }
        
        // Base stem color on plant stage
        let stemColor = '#32CD32'; // Bright green for young plants
        if (this.stage >= PLANT_STAGES.JUVENILE) {
            stemColor = '#228B22'; // Forest green for juvenile plants
        }
        if (this.stage >= PLANT_STAGES.ADVANCED) {
            stemColor = '#8B4513'; // Brown for mature/woody plants
        }
        if (options.color) {
            stemColor = options.color;
        }
        
        // Calculate stem thickness based on plant age and position
        // Stems get thicker with plant age, and lower segments are thicker than higher ones
        let stemSize = 4 + this.stage * 0.5;
        
        // Base segments (lower on plant) are thicker
        const segmentHeight = this.parts.stem.length;
        if (segmentHeight < 3) {
            stemSize += 1 + this.stage * 0.2; // Lower segments are thicker
        }
        
        // Apply user-provided size if specified
        if (options.size) {
            stemSize = options.size;
        }
        
        // Create stem segment
        const stem = {
            x: newX,
            y: newY,
            type: PLANT_PARTS.STEM,
            size: stemSize,
            color: stemColor,
            woody: options.woody || false,
            curved: options.curved || false,
            branchConnectionPoints: [] // Only branch connection points on stem
        };
        
        // Generate branch connection points for stem - left and right sides
        if (this.stage >= PLANT_STAGES.GERMINATION) {
            const pointCount = 2 + Math.floor(Math.random() * 2); // 2-3 connection points per stem segment
            
            for (let i = 0; i < pointCount; i++) {
                // Position along the stem segment
                const position = 0.3 + (i * 0.4); // Space them out: first at 30%, second at 70% if needed
                
                // Left side branch connection point
                stem.branchConnectionPoints.push({
                    side: -1, // -1 for left
                    position: position,
                    occupied: false,
                    branchId: null
                });
                
                // Right side branch connection point, at slightly different height
                stem.branchConnectionPoints.push({
                    side: 1, // 1 for right
                    position: position + 0.15, // Offset the right side points a bit
                    occupied: false, 
                    branchId: null
                });
            }
        }
        
        // Add to plant parts
        this.parts.stem.push(stem);
        
        // Update plant height
        if (newY < 0 && Math.abs(newY) > this.height) {
            this.height = Math.abs(newY);
        }
        
        console.log("Grew stem at", newX, newY, "with color", stemColor);
        
        return stem;
    }
    
    growRoot(dx, dy, options = {}) {
        // Check for world parameter
        const world = options.world;
        
        // Calculate world coordinates
        const worldX = this.x + dx;
        const worldY = this.y + dy;
        
        // Verify if we can grow here (check world bounds and tile type)
        if (world) {
            const tile = world.getTile(worldX, worldY);
            if (tile) {
                // If tile is stone, we can't grow there
                if (tile.type === TILE_TYPES.STONE) {
                    console.log("Cannot grow root in stone at", worldX, worldY);
                    return null;
                }
                
                // Set the tile to ROOT type to make it visually distinct in the world
                tile.type = TILE_TYPES.ROOT;
                console.log("Set tile type to ROOT at", worldX, worldY);
            }
        }
        
        // Get neighboring tiles to determine best growth direction
        const neighbors = this.getNeighbors(worldX, worldY, 1, world);
        
        // Score neighboring tiles based on moisture, nutrients, and distance from other roots
        const neighborScores = [];
        
        neighbors.forEach(neighbor => {
            if (!neighbor) return;
            
            let score = 0;
            
            // Prefer moist tiles
            if (neighbor.moisture > 50) {
                score += neighbor.moisture / 10;
            }
            
            // Prefer nutrient-rich tiles
            if (neighbor.nutrients > 50) {
                score += neighbor.nutrients / 10;
            }
            
            // Prefer tiles without existing roots
            if (neighbor.type !== TILE_TYPES.ROOT) {
                score += 5;
            }
            
            // Slightly prefer downward growth
            if (neighbor.y > worldY) {
                score += 3;
            }
            
            // Encourage spreading outward
            const distanceFromBase = Math.sqrt(
                Math.pow(neighbor.x - this.x, 2) + 
                Math.pow(neighbor.y - this.y, 2)
            );
            score += distanceFromBase * 2;
            
            neighborScores.push({
                x: neighbor.x - this.x,
                y: neighbor.y - this.y,
                score: score
            });
        });
        
        // Sort neighbors by score
        neighborScores.sort((a, b) => b.score - a.score);
        
        // Check if root already exists at this position
        const existingRoot = this.parts.roots.find(root => root.x === dx && root.y === dy);
        if (existingRoot) {
            // Root already exists, just update its properties
            if (options.size) {
                existingRoot.size = options.size;
            }
            if (options.color) {
                existingRoot.color = options.color;
            }
            console.log("Updated existing root at", dx, dy);
            return existingRoot;
        }
        
        // Create new root
        const rootSize = options.advanced ? 6 : (options.size || 4); // Larger roots
        const rootColor = options.advanced ? '#8B6914' : (options.color || COLORS.PLANT_ROOT);
        
        const root = {
            x: dx,
            y: dy,
            type: PLANT_PARTS.ROOT,
            size: rootSize,
            color: rootColor,
            absorption: []
        };
        
        // Add absorption zones for advanced roots
        if (options.advanced) {
            const zoneSize = 3 + Math.floor(Math.random() * 3); // 3-5 zones
            const zoneRadius = 1;
            
            for (let i = 0; i < zoneSize; i++) {
                const angle = (Math.PI * 2 / zoneSize) * i;
                const zoneX = Math.cos(angle) * zoneRadius;
                const zoneY = Math.sin(angle) * zoneRadius;
                
                root.absorption.push({
                    x: zoneX,
                    y: zoneY,
                    size: 4 + Math.random() * 2,
                    efficiency: 0.5 + Math.random() * 0.5
                });
            }
        }
        
        // Add to plant parts
        this.parts.roots.push(root);
        
        // Update root depth
        if (dy > 0 && dy > this.rootDepth) {
            this.rootDepth = dy;
        }
        
        console.log("Grew root at", dx, dy, "with color", rootColor);
        
        // Chance to grow another root in a different direction
        if (options.advanced && neighborScores.length > 0 && Math.random() < 0.6) {
            // Grow another root using one of the top 3 scored positions
            const nextIndex = Math.min(1, neighborScores.length - 1);
            const nextRoot = neighborScores[nextIndex];
            
            if (nextRoot && (nextRoot.x !== dx || nextRoot.y !== dy)) {
                setTimeout(() => {
                    this.growRoot(nextRoot.x, nextRoot.y, { 
                        world: world, 
                        advanced: Math.random() < 0.3,
                        size: rootSize - 1
                    });
                }, 0);
            }
        }
        
        // Chance to grow a third root for advanced root systems
        if (options.advanced && neighborScores.length > 2 && Math.random() < 0.4) {
            const thirdIndex = Math.min(2, neighborScores.length - 1);
            const thirdRoot = neighborScores[thirdIndex];
            
            if (thirdRoot && (thirdRoot.x !== dx || thirdRoot.y !== dy)) {
                setTimeout(() => {
                    this.growRoot(thirdRoot.x, thirdRoot.y, { 
                        world: world, 
                        advanced: false,
                        size: rootSize - 2
                    });
                }, 0);
            }
        }
        
        return root;
    }
    
    // Fix the getNeighbors method to properly accept world parameter
    getNeighbors(worldX, worldY, radius = 1, world) {
        if (!world) return [];
        
        const neighbors = [];
        
        // Check surrounding tiles in specified radius
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                // Skip the center tile
                if (dx === 0 && dy === 0) continue;
                
                const nx = worldX + dx;
                const ny = worldY + dy;
                
                const tile = world.getTile(nx, ny);
                if (tile) {
                    neighbors.push(tile);
                }
            }
        }
        
        return neighbors;
    }
    
    calculateLeafOrientation(leaf) {
        if (!leaf || !leaf.branchRef) return null;
        
        // Get branch and leaf positions
        const branch = leaf.branchRef;
        
        // For a branch with start and end positions
        if (branch.startX !== undefined && branch.x !== undefined) {
            // Calculate the branch direction vector
            const branchVectorX = branch.x - branch.startX;
            const branchVectorY = branch.y - branch.startY;
            
            // Calculate the angle perpendicular to the branch direction (pointing outward)
            // We add PI/2 to make the leaf point outward from the branch
            const branchAngle = Math.atan2(branchVectorY, branchVectorX);
            
            // Determine which side of the branch the leaf is on
            const leafToBranchX = leaf.x - (branch.startX + branchVectorX * 0.5);
            const leafToBranchY = leaf.y - (branch.startY + branchVectorY * 0.5);
            
            // Calculate the dot product of branchVector and leafToBranch to determine side
            const dotProduct = branchVectorX * leafToBranchX + branchVectorY * leafToBranchY;
            
            // Choose the angle based on which side of the branch the leaf is on
            return branchAngle + (dotProduct >= 0 ? Math.PI/2 : -Math.PI/2);
        }
        
        // For connection points along a branch with t value
        if (leaf.connectionPoint && leaf.connectionPoint.t !== undefined) {
            const connPoint = leaf.connectionPoint;
            
            // For branches with startX/Y and x/y endpoints
            if (branch.startX !== undefined && branch.x !== undefined) {
                // Calculate position based on connection point's t value
                const branchVectorX = branch.x - branch.startX;
                const branchVectorY = branch.y - branch.startY;
                
                // Calculate the perpendicular direction (pointing outward from the branch)
                const branchAngle = Math.atan2(branchVectorY, branchVectorX);
                return branchAngle + Math.PI/2;
            }
        }
        
        // If we don't have enough information, return a default orientation
        return Math.PI/4 * (branch.direction || 1);
    }
    
    growLeaf(dx, dy, options = {}) {
        // Determine if a leaf already exists near this position to avoid overlapping
        const nearbyLeaf = this.parts.leaves.find(existingLeaf => 
            Math.abs(existingLeaf.x - dx) < 0.5 && 
            Math.abs(existingLeaf.y - dy) < 0.5
        );
        
        // If there's already a leaf nearby, offset the position slightly
        if (nearbyLeaf) {
            // Randomize the position slightly to avoid perfect overlap
            dx += (Math.random() * 0.4 - 0.2);
            dy += (Math.random() * 0.4 - 0.2);
        }
        
        // Create new leaf with enhanced visual properties and clear branch attachment
        const leaf = {
            x: dx,
            y: dy,
            type: PLANT_PARTS.LEAF,
            leafType: options.leafType || 'simple',
            size: options.size || 1.0, // Reduced from 1.2 to make smaller
            advanced: options.advanced || false,
            color: options.color || '#32CD32', // Default to bright green
            angle: options.angle || (Math.random() * Math.PI - Math.PI/2), // Full range rotation for variety
            stemLength: options.stemLength || (0.3 + Math.random() * 0.2) // Add stem length for attachment
        };
        
        // If attached to a branch, store reference
        if (options.branch) {
            leaf.branchRef = options.branch;
            
            // If attached to a specific connection point, store that reference
            if (options.connectionPoint) {
                leaf.connectionPoint = options.connectionPoint;
            }
            
            // Add a visible leaf connector to the branch
            this.parts.connectors.push({
                x: dx,
                y: dy,
                color: '#3A5F0B',
                radius: leaf.size * 0.2,
                isLeafConnector: true,
                connections: [
                    { startX: -5, startY: 0, endX: 5, endY: 0 }
                ]
            });
            
            // Calculate the leaf angle to point towards the branch
            const orientationAngle = this.calculateLeafOrientation(leaf);
            if (orientationAngle !== null) {
                leaf.angle = orientationAngle;
            }
        }
        
        this.parts.leaves.push(leaf);
        this.leafCount += 1;
        
        console.log(`Grew ${leaf.leafType} leaf at (${dx}, ${dy})`);
        
        return leaf;
    }
    
    // Method to update orientation of all leaves
    updateLeafOrientations() {
        this.parts.leaves.forEach(leaf => {
            if (leaf.branchRef) {
                const newAngle = this.calculateLeafOrientation(leaf);
                if (newAngle !== null) {
                    leaf.angle = newAngle;
                }
            }
        });
    }
    
    growBranch(dx, dy, options = {}) {
        // Find the stem segment at this y position
        const stemSegment = this.parts.stem.find(segment => segment.y === dy);
        if (!stemSegment) {
            console.log("No stem segment found at y=", dy, "for branch attachment");
            return null;
        }
        
        // Find an available connection point on the stem
        const side = Math.sign(dx); // -1 for left, 1 for right
        
        // Get all existing branches at this height to check for overlaps
        const nearbyBranches = this.parts.branches.filter(b => 
            Math.abs(b.y - dy) < 2 && Math.sign(b.x) === side
        );
        
        // Find the best connection point that avoids overlaps
        let bestConnectionPoint = null;
        let bestAngle = 0;
        
        stemSegment.branchConnectionPoints.forEach(cp => {
            if (cp.side === side && !cp.occupied) {
                // Snap angle to right angle or half of the right angle
                const possibleAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4, -Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4];
                let angle = possibleAngles[0]; // Default to horizontal

                if (nearbyBranches.length > 0) {
                    // Adjust angle to avoid overlaps
                    const avgNearbyAngle = nearbyBranches.reduce((sum, b) => sum + (b.angle || 0), 0) / nearbyBranches.length;
                    angle = possibleAngles.reduce((closest, current) => 
                        Math.abs(current - avgNearbyAngle) < Math.abs(closest - avgNearbyAngle) ? current : closest
                    );
                }

                // Check if this angle would cause overlap
                const wouldOverlap = nearbyBranches.some(b => 
                    Math.abs(b.angle - angle) < Math.PI / 6
                );

                if (!wouldOverlap && (!bestConnectionPoint || cp.position > bestConnectionPoint.position)) {
                    bestConnectionPoint = cp;
                    bestAngle = angle;
                }
            }
        });
        
        const connectionPoint = bestConnectionPoint;
        
        if (!connectionPoint) {
            // If no connection point is available, try to extend an existing branch
            const existingBranch = this.parts.branches.find(b => 
                b.y === dy && Math.sign(b.x) === side && !b.extended
            );
            
            if (existingBranch) {
                // Extend the existing branch by a smaller amount
                const extensionLength = 0.5 + Math.random() * 0.3;
                existingBranch.x += side * extensionLength;
                existingBranch.extended = true;
                
                // Add new connection points for the extended section
                const newLeafPoints = 1 + Math.floor(Math.random() * 2);
                for (let i = 0; i < newLeafPoints; i++) {
                    const t = 0.8 + (i * 0.15);
                    existingBranch.leafConnectionPoints.push({
                        t: t,
                        occupied: false,
                        leafId: null
                    });
                }
                
                return existingBranch;
            }
            
            console.log("No available connection point found on stem at y=", dy, "side=", side);
            return null;
        }
        
        // Calculate branch position based on connection point and angle
        const branchLength = 1.5 + Math.random() * 0.5;
        const branchX = side * Math.cos(bestAngle) * branchLength;
        const branchY = dy + Math.sin(bestAngle) * branchLength;
        
        // Create branch with enhanced structure
        const branch = {
            stemRef: stemSegment,
            connectionPoint: connectionPoint,
            startX: side * 0.2, // Reduced from 0.5 to make connection tighter
            startY: dy + connectionPoint.position - 0.5,
            x: branchX,
            y: branchY,
            type: PLANT_PARTS.BRANCH,
            size: options.size || 4,
            subBranches: [],
            leafConnectionPoints: [],
            subBranchConnectionPoints: [],
            extended: false,
            angle: bestAngle,
            endLeafPoint: {
                t: 1.0,
                occupied: false,
                leafId: null,
                isEndPoint: true
            }
        };
        
        // Add properties based on options
        if (options.complex || options.advanced) {
            branch.complex = true;
        }
        if (options.color) {
            branch.color = options.color;
        } else {
            branch.color = this.stage >= PLANT_STAGES.ADVANCED ? '#8B4513' : '#3A5F0B';
        }
        
        // Generate more leaf connection points along the branch
        const leafPointCount = 4 + Math.floor(Math.random() * 3); // Increased from 3 + random * 2
        for (let i = 0; i < leafPointCount; i++) {
            const t = 0.2 + (i * (0.6 / (leafPointCount - 1)));
            const leafPoint = {
                t: t,
                occupied: false,
                leafId: null
            };
            branch.leafConnectionPoints.push(leafPoint);
        }
        
        // Generate more sub-branch connection points
        const subBranchPointCount = 3 + Math.floor(Math.random() * 2); // Increased from 2 + random * 2
        for (let i = 0; i < subBranchPointCount; i++) {
            const t = 0.3 + (i * (0.4 / subBranchPointCount));
            const subBranchPoint = {
                t: t,
                occupied: false,
                branchId: null,
                side: (i % 2 === 0) ? 1 : -1
            };
            branch.subBranchConnectionPoints.push(subBranchPoint);
        }
        
        // Store in the branches array
        this.parts.branches.push(branch);
        this.branchCount += 1;
        
        // Mark the stem connection point as occupied
        connectionPoint.occupied = true;
        connectionPoint.branchId = this.branchCount - 1;
        
        // Grow a leaf at the end point with no limit check
        if (options.addLeaf !== false) {
            setTimeout(() => {
                if (!branch.endLeafPoint.occupied) {
                    // End point leaf (at branch tip)
                    const leafX = branch.x;
                    const leafY = branch.y;
                    
                    // Choose leaf type based on plant stage
                    let leafType = 'simple';
                    if (this.stage >= PLANT_STAGES.JUVENILE) {
                        leafType = Math.random() < 0.6 ? 'detailed' : 'simple';
                    }
                    if (this.stage >= PLANT_STAGES.ADVANCED) {
                        leafType = Math.random() < 0.7 ? 'compound' : 'detailed';
                    }
                    
                    const leaf = this.growLeaf(leafX, leafY, { 
                        leafType: leafType,
                        size: 1.3,
                        angle: branch.angle + (Math.random() * 0.4 - 0.2),
                        branch: branch,
                        connectionPoint: branch.endLeafPoint,
                        isEndLeaf: true
                    });
                    
                    if (leaf) {
                        branch.endLeafPoint.occupied = true;
                        branch.endLeafPoint.leafId = this.leafCount - 1;
                    }
                }
                
                // Also try to grow a leaf on one of the middle connection points
                const leafPoint = branch.leafConnectionPoints.find(point => !point.occupied);
                if (leafPoint && Math.random() < 0.7) {
                    const t = leafPoint.t;
                    const leafX = branch.startX + (branch.x - branch.startX) * t;
                    const leafY = branch.startY + (branch.y - branch.startY) * t;
                    
                    let leafType = 'simple';
                    if (this.stage >= PLANT_STAGES.JUVENILE) {
                        leafType = Math.random() < 0.6 ? 'detailed' : 'simple';
                    }
                    if (this.stage >= PLANT_STAGES.ADVANCED) {
                        leafType = Math.random() < 0.7 ? 'compound' : 'detailed';
                    }
                    
                    const leaf = this.growLeaf(leafX, leafY, { 
                        leafType: leafType,
                        size: 1.2,
                        angle: branch.angle + (Math.random() * 0.4 - 0.2),
                        branch: branch,
                        connectionPoint: leafPoint
                    });
                    
                    if (leaf) {
                        leafPoint.occupied = true;
                        leafPoint.leafId = this.leafCount - 1;
                    }
                }
            }, 50);
        }
        
        return branch;
    }
    
    growSubBranch(dx, dy, parentBranch, options = {}) {
        if (!parentBranch) {
            console.log("No parent branch provided for sub-branch");
            return null;
        }
        
        // Find an available connection point on the parent branch
        const side = Math.sign(dx); // -1 for left, 1 for right
        
        // Check for nearby occupied connection points to ensure spacing
        const occupiedPoints = parentBranch.subBranchConnectionPoints.filter(cp => cp.occupied);
        let connectionPoint = parentBranch.subBranchConnectionPoints.find(cp => {
            if (cp.side === side && !cp.occupied) {
                // Check distance from occupied points
                return !occupiedPoints.some(ocp => Math.abs(ocp.t - cp.t) < 0.3); // Minimum spacing of 0.3
            }
            return false;
        });
        
        // If no connection points with good spacing found, try any available point
        if (!connectionPoint) {
            connectionPoint = parentBranch.subBranchConnectionPoints.find(cp => !cp.occupied);
        }
        
        if (!connectionPoint) {
            console.log("No available connection points on parent branch");
            return null;
        }
        
        // Calculate position along the parent branch using t value
        const positionX = parentBranch.startX + 
            (parentBranch.x - parentBranch.startX) * connectionPoint.t;
        const positionY = parentBranch.startY + 
            (parentBranch.y - parentBranch.startY) * connectionPoint.t;
        
        // Sub-branch size as a percentage of parent branch
        const subBranchSize = parentBranch.size * 0.75; // Reduced from 0.85
        
        // Calculate sub-branch length - shorter length
        const subBranchLength = 0.8 + Math.random() * 0.7; // Reduced from 1.5 + random * 1.5
        
        // Apply right-angle rotation if specified in options
        const angle = options.angle || (Math.random() < 0.5 ? Math.PI/2 : -Math.PI/2);
        
        // Calculate end position based on angle
        const subBranchX = positionX + Math.cos(angle) * subBranchLength;
        const subBranchY = positionY + Math.sin(angle) * subBranchLength;
        
        // Create sub-branch object with enhanced structure
        const subBranch = {
            parentBranch: parentBranch,
            connectionPoint: connectionPoint,
            startX: positionX,
            startY: positionY,
            x: subBranchX,
            y: subBranchY,
            type: PLANT_PARTS.SUB_BRANCH,
            size: subBranchSize,
            angle: angle,
            length: subBranchLength,
            leafConnectionPoints: [],
            endLeafPoint: {
                t: 1.0,
                occupied: false,
                leafId: null,
                isEndPoint: true
            }
        };
        
        // Generate fewer leaf connection points
        const leafPointCount = 2 + Math.floor(Math.random() * 2); // Reduced from 3-5 to 2-3
        for (let i = 0; i < leafPointCount; i++) {
            const t = 0.3 + (i * 0.4 / leafPointCount); // More concentrated distribution
            const leafPoint = {
                t: t,
                occupied: false,
                leafId: null
            };
            subBranch.leafConnectionPoints.push(leafPoint);
        }
        
        // Add to parent branch
        parentBranch.subBranches.push(subBranch);
        
        // Mark connection point as occupied
        connectionPoint.occupied = true;
        connectionPoint.branchId = parentBranch.subBranches.length - 1;
        
        // Higher chance to grow a leaf at the end point
        if (Math.random() < 0.8) {
            setTimeout(() => {
                if (!subBranch.endLeafPoint.occupied) {
                    const leafType = this.stage >= PLANT_STAGES.JUVENILE ? 'detailed' : 'simple';
                    
                    const leaf = this.growLeaf(subBranch.x, subBranch.y, {
                        leafType: leafType,
                        size: 1.2,
                        angle: subBranch.angle + (Math.random() * 0.4 - 0.2),
                        branch: subBranch,
                        connectionPoint: subBranch.endLeafPoint
                    });
                    
                    if (leaf) {
                        subBranch.endLeafPoint.occupied = true;
                        subBranch.endLeafPoint.leafId = this.leafCount - 1;
                    }
                }
            }, 50);
        }
        
        return subBranch;
    }
    
    growTertiaryBranch(dx, dy, parentSubBranch) {
        if (!parentSubBranch) return null;
        
        const tertiaryBranch = {
            startX: parentSubBranch.x,
            x: parentSubBranch.x + dx,
            y: dy,
            type: PLANT_PARTS.BRANCH,
            size: parentSubBranch.size * 0.6,
            direction: Math.sign(dx),
            connectionPoints: [] // Add connection points array
        };
        
        // Generate connection points along the tertiary branch
        const connectionPointCount = 1; // Just 1 connection point for tertiary branches
        for (let i = 0; i < connectionPointCount; i++) {
            const t = 0.6; // Position it at 60% along the branch
            const connectionPoint = {
                t: t,
                occupied: false,
                leafId: null
            };
            tertiaryBranch.connectionPoints.push(connectionPoint);
        }
        
        if (!parentSubBranch.tertiaryBranches) {
            parentSubBranch.tertiaryBranches = [];
        }
        parentSubBranch.tertiaryBranches.push(tertiaryBranch);
        
        // Have a chance to add a leaf at the connection point
        if (Math.random() < 0.8 && this.leafCount < 40) {
            const connectionPoint = tertiaryBranch.connectionPoints[0]; // Only one connection point
            
            if (connectionPoint) {
                // Calculate leaf position - linear interpolation for tertiary branch
                const leafX = parentSubBranch.x + dx * connectionPoint.t;
                const leafY = dy;
                
                const leaf = this.growLeaf(leafX, leafY, { 
                    leafType: 'simple',
                    size: 1.2,
                    angle: tertiaryBranch.x > tertiaryBranch.startX ? Math.PI/4 : -Math.PI/4,
                    branch: tertiaryBranch,
                    connectionPoint: connectionPoint
                });
                
                // Mark the connection point as occupied
                if (leaf) {
                    connectionPoint.occupied = true;
                    connectionPoint.leafId = this.leafCount - 1;
                }
            }
        }
        
        return tertiaryBranch;
    }
    
    checkEnvironment(world) {
        if (!world) return false;
        
        // Check if plant has enough water and nutrients
        const moistureFactor = this.calculateMoistureFactor(world);
        const nutrientFactor = this.calculateNutrientFactor(world);
        
        // Update health based on environmental factors
        if (moistureFactor < 0.3 || nutrientFactor < 0.3) {
            this.health = Math.max(0, this.health - 0.5); // Plant is suffering
        } else if (moistureFactor > 0.7 && nutrientFactor > 0.7) {
            this.health = Math.min(100, this.health + 0.2); // Plant is thriving
        }
        
        // Plant dies if health reaches 0
        if (this.health <= 0) {
            console.log("Plant has died due to poor environmental conditions");
            return false;
        }
        
        return true;
    }
    
    draw(ctx) {
        console.log("Drawing plant at", this.x, this.y, "with parts:", this.parts.stem.length, "stems,", this.parts.roots.length, "roots");
        
        // Draw roots first
        this.parts.roots.forEach((root, index) => {
            const isRootTip = index === this.parts.roots.length - 1;
            
            // Root color changes based on type and whether it's a tip
            const rootColor = root.color || (isRootTip ? COLORS.PLANT_ROOT_TIP : COLORS.PLANT_ROOT);
            const lineWidth = root.size || (isRootTip ? 6 : 5); // Increased line width for visibility
            
            // Find root parent (the previous root segment)
            const parentIndex = this.findRootParent(root, index);
            const parentRoot = parentIndex >= 0 ? this.parts.roots[parentIndex] : null;
            
            ctx.beginPath();
            ctx.strokeStyle = rootColor;
            ctx.lineWidth = lineWidth;
            
            if (parentRoot) {
                // Draw from parent to this root
                ctx.moveTo(
                    (this.x + parentRoot.x) * TILE_SIZE + TILE_SIZE/2, 
                    (this.y + parentRoot.y) * TILE_SIZE + TILE_SIZE/2
                );
            } else {
                // Draw from plant base
                ctx.moveTo(this.x * TILE_SIZE + TILE_SIZE/2, this.y * TILE_SIZE + TILE_SIZE/2);
            }
            
            // Draw to this root position
            ctx.lineTo(
                (this.x + root.x) * TILE_SIZE + TILE_SIZE/2, 
                (this.y + root.y) * TILE_SIZE + TILE_SIZE/2
            );
            ctx.stroke();
            
            // Draw absorption zones if present, represented as subtle lines instead of circles
            if (root.absorption && root.absorption.length > 0) {
                root.absorption.forEach(zone => {
                    // Calculate position
                    const zoneX = (this.x + root.x + zone.x) * TILE_SIZE + TILE_SIZE/2;
                    const zoneY = (this.y + root.y + zone.y) * TILE_SIZE + TILE_SIZE/2;
                    
                    // Draw small branch lines for absorption instead of circle
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(101, 67, 33, 0.5)'; // Subtle brown color
                    ctx.lineWidth = 1;
                    
                    // Draw 4-6 small branch lines from the zone position
                    const branchCount = 4 + Math.floor(Math.random() * 3);
                    for (let i = 0; i < branchCount; i++) {
                        const angle = (Math.PI * 2 / branchCount) * i;
                        const length = zone.size * 2 + Math.random() * 2;
                        
                        ctx.moveTo(zoneX, zoneY);
                        ctx.lineTo(
                            zoneX + Math.cos(angle) * length,
                            zoneY + Math.sin(angle) * length
                        );
                    }
                    ctx.stroke();
                });
            }
        });
        
        // Draw stem segments
        this.parts.stem.forEach((segment, index) => {
            ctx.beginPath();
            ctx.strokeStyle = segment.color || '#32CD32'; // Default to bright green if no color specified
            ctx.lineWidth = segment.size || 5; // Increased default size
            ctx.lineCap = 'round';
            
            // Calculate coordinates
            const stemX = (this.x + segment.x) * TILE_SIZE + TILE_SIZE/2;
            const stemY = (this.y + segment.y) * TILE_SIZE + TILE_SIZE/2;
            
            // Find next segment for end point (or use fixed distance if last segment)
            let endY;
            if (index + 1 < this.parts.stem.length) {
                // Connect to next segment
                endY = (this.y + this.parts.stem[index + 1].y) * TILE_SIZE + TILE_SIZE/2;
            } else {
                // Draw upward from last segment
                endY = stemY - TILE_SIZE;
            }
            
            // Draw stem segment
            ctx.moveTo(stemX, stemY);
            ctx.lineTo(stemX, endY);
            ctx.stroke();
            
            // Draw branch connection points
            if (segment.branchConnectionPoints && segment.branchConnectionPoints.length > 0) {
                segment.branchConnectionPoints.forEach(connectionPoint => {
                    // Calculate position
                    const segmentLength = Math.abs(endY - stemY);
                    const positionY = stemY + connectionPoint.position * segmentLength;
                    const sideOffset = connectionPoint.side * (segment.size * 0.5);
                    const cpX = stemX + sideOffset;
                    const cpY = positionY;
                    
                    // Draw connection point node with different colors based on occupancy
                    ctx.beginPath();
                    
                    if (connectionPoint.occupied) {
                        // Occupied - brown indicating branch connection
                        ctx.fillStyle = '#5D4037'; // Dark brown for occupied points
                        ctx.strokeStyle = '#8B4513'; // Brown outline
                    } else {
                        // Available - lighter color for available branch connection
                        ctx.fillStyle = '#8B7355'; // Light brown for available points
                        ctx.strokeStyle = segment.color; // Match stem color
                    }
                    
                    ctx.lineWidth = 1;
                    
                    // Use square shape for branch connection points to differentiate from leaf points
                    const pointSize = segment.size * 0.4;
                    ctx.rect(cpX - pointSize/2, cpY - pointSize/2, pointSize, pointSize);
                    ctx.fill();
                    ctx.stroke();
                    
                    // If woody stem, add additional detail to indicate strength
                    if (segment.woody && connectionPoint.occupied) {
                        // Add a small line connecting the point to the stem
                        ctx.beginPath();
                        ctx.strokeStyle = '#5D4037'; // Dark brown
                        ctx.lineWidth = segment.size * 0.2;
                        ctx.moveTo(stemX, cpY);
                        ctx.lineTo(cpX, cpY);
                        ctx.stroke();
                    }
                });
            }
            
            // If woody stem, add texture details
            if (segment.woody) {
                const segments = 4 + Math.floor(segment.size * 0.5);
                for (let i = 0; i < segments; i++) {
                    const t = i / segments;
                    const detailY = stemY + t * (endY - stemY);
                    
                    // Add bark texture only on thicker segments
                    if (segment.size > 5 && Math.random() < 0.7) {
                        const detailSize = segment.size * 0.15;
                        const offset = (Math.random() - 0.5) * segment.size * 0.5;
                        
                        ctx.beginPath();
                        ctx.fillStyle = '#5D4037'; // Dark brown bark detail
                        ctx.arc(stemX + offset, detailY, detailSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        });
        
        // Draw branches
        this.parts.branches.forEach(branch => {
            this.drawBranch(ctx, branch);
            
            // Draw sub-branches
            if (branch.subBranches) {
                branch.subBranches.forEach(subBranch => {
                    this.drawSubBranch(ctx, subBranch, branch);
                    
                    // Draw tertiary branches
                    if (subBranch.tertiaryBranches) {
                        subBranch.tertiaryBranches.forEach(tertiaryBranch => {
                            this.drawTertiaryBranch(ctx, tertiaryBranch, subBranch);
                        });
                    }
                });
            }
        });
        
        // Draw leaves
        this.parts.leaves.forEach(leaf => {
            switch (leaf.leafType) {
                case 'cotyledon':
                    this.drawCotyledon(ctx, leaf);
                    break;
                case 'simple':
                    this.drawSimpleLeaf(ctx, leaf);
                    break;
                case 'detailed':
                    this.drawDetailedLeaf(ctx, leaf);
                    break;
                case 'compound':
                    this.drawCompoundLeaf(ctx, leaf);
                    break;
            }
        });
        
        // Draw connectors
        this.parts.connectors.forEach(connector => {
            ctx.beginPath();
            ctx.fillStyle = connector.color;
            ctx.arc(
                (this.x + connector.x) * TILE_SIZE + TILE_SIZE/2,
                (this.y + connector.y) * TILE_SIZE + TILE_SIZE/2,
                connector.radius,
                0,
                Math.PI * 2
            );
            ctx.fill();
            
            // Draw connection lines
            connector.connections.forEach(connection => {
                ctx.beginPath();
                ctx.strokeStyle = connector.color;
                ctx.lineWidth = connector.radius * 0.5;
                ctx.moveTo(
                    (this.x + connector.x + connection.startX/TILE_SIZE) * TILE_SIZE + TILE_SIZE/2,
                    (this.y + connector.y + connection.startY/TILE_SIZE) * TILE_SIZE + TILE_SIZE/2
                );
                ctx.lineTo(
                    (this.x + connector.x + connection.endX/TILE_SIZE) * TILE_SIZE + TILE_SIZE/2,
                    (this.y + connector.y + connection.endY/TILE_SIZE) * TILE_SIZE + TILE_SIZE/2
                );
                ctx.stroke();
            });
        });
    }
    
    drawBranch(ctx, branch) {
        // Get screen coordinates
        const startX = (this.x + branch.startX) * TILE_SIZE + TILE_SIZE/2;
        const startY = (this.y + branch.startY) * TILE_SIZE + TILE_SIZE/2;
        const endX = (this.x + branch.x) * TILE_SIZE + TILE_SIZE/2;
        const endY = (this.y + branch.y) * TILE_SIZE + TILE_SIZE/2;
        
        // Draw branch outline for better visibility
        ctx.beginPath();
        ctx.strokeStyle = '#2D3319'; // Dark outline
        ctx.lineWidth = branch.size + 2;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Draw main branch
        ctx.beginPath();
        ctx.strokeStyle = branch.color || '#3A5F0B';
        ctx.lineWidth = branch.size;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Draw connection points
        branch.leafConnectionPoints.forEach((point, index) => {
            const t = point.t;
            const x = startX + (endX - startX) * t;
            const y = startY + (endY - startY) * t;
            
            // Draw larger, more visible connection points
            ctx.beginPath();
            ctx.fillStyle = point.occupied ? '#2D3319' : '#8B4513';
            ctx.arc(x, y, branch.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            
            // Add highlight for visibility
            ctx.beginPath();
            ctx.strokeStyle = point.occupied ? '#32CD32' : '#A0522D';
            ctx.lineWidth = 1;
            ctx.arc(x, y, branch.size * 0.4, 0, Math.PI * 2);
            ctx.stroke();
        });
        
        // Draw end point more prominently
        if (branch.endLeafPoint) {
            ctx.beginPath();
            ctx.fillStyle = branch.endLeafPoint.occupied ? '#2D3319' : '#8B4513';
            ctx.arc(endX, endY, branch.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Add highlight
            ctx.beginPath();
            ctx.strokeStyle = branch.endLeafPoint.occupied ? '#32CD32' : '#A0522D';
            ctx.lineWidth = 1.5;
            ctx.arc(endX, endY, branch.size * 0.5, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    drawSubBranch(ctx, subBranch, parentBranch) {
        // Get screen coordinates
        const startX = (this.x + subBranch.startX) * TILE_SIZE + TILE_SIZE/2;
        const startY = (this.y + subBranch.startY) * TILE_SIZE + TILE_SIZE/2;
        const endX = (this.x + subBranch.x) * TILE_SIZE + TILE_SIZE/2;
        const endY = (this.y + subBranch.y) * TILE_SIZE + TILE_SIZE/2;
        
        // Draw outline for better visibility
        ctx.beginPath();
        ctx.strokeStyle = '#2D3319'; // Dark outline
        ctx.lineWidth = subBranch.size + 2;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Draw main sub-branch
        ctx.beginPath();
        ctx.strokeStyle = subBranch.color || '#3A5F0B';
        ctx.lineWidth = subBranch.size;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Draw connection points
        subBranch.leafConnectionPoints.forEach((point, index) => {
            const t = point.t;
            const x = startX + (endX - startX) * t;
            const y = startY + (endY - startY) * t;
            
            // Draw larger, more visible connection points
            ctx.beginPath();
            ctx.fillStyle = point.occupied ? '#2D3319' : '#8B4513';
            ctx.arc(x, y, subBranch.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            
            // Add highlight for visibility
            ctx.beginPath();
            ctx.strokeStyle = point.occupied ? '#32CD32' : '#A0522D';
            ctx.lineWidth = 1;
            ctx.arc(x, y, subBranch.size * 0.4, 0, Math.PI * 2);
            ctx.stroke();
        });
        
        // Draw end point more prominently
        if (subBranch.endLeafPoint) {
            ctx.beginPath();
            ctx.fillStyle = subBranch.endLeafPoint.occupied ? '#2D3319' : '#8B4513';
            ctx.arc(endX, endY, subBranch.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Add highlight
            ctx.beginPath();
            ctx.strokeStyle = subBranch.endLeafPoint.occupied ? '#32CD32' : '#A0522D';
            ctx.lineWidth = 1.5;
            ctx.arc(endX, endY, subBranch.size * 0.5, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    drawTertiaryBranch(ctx, tertiaryBranch, parentSubBranch) {
        ctx.beginPath();
        ctx.strokeStyle = this.stage >= PLANT_STAGES.MATURE ? '#8B4513' : '#228B22';
        ctx.lineWidth = tertiaryBranch.size;
        
        // Start position
        const startX = (this.x + tertiaryBranch.startX) * TILE_SIZE + TILE_SIZE/2;
        const startY = (this.y + tertiaryBranch.y) * TILE_SIZE + TILE_SIZE/2;
        
        // End position
        const endX = (this.x + tertiaryBranch.x) * TILE_SIZE + TILE_SIZE/2;
        const endY = (this.y + tertiaryBranch.y) * TILE_SIZE + TILE_SIZE/2;
        
        // Draw tertiary branch
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Add node at the branch tip
        ctx.beginPath();
        ctx.fillStyle = this.stage >= PLANT_STAGES.MATURE ? '#8B4513' : '#228B22';
        ctx.arc(endX, endY, tertiaryBranch.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw connection points along the tertiary branch
        if (tertiaryBranch.connectionPoints && tertiaryBranch.connectionPoints.length > 0) {
            tertiaryBranch.connectionPoints.forEach(connectionPoint => {
                // Calculate position using t value (linear interpolation for tertiary branches)
                const t = connectionPoint.t;
                const cpX = startX + (endX - startX) * t;
                const cpY = startY + (endY - startY) * t;
                
                // Draw connection point node
                ctx.beginPath();
                
                // Use different colors and sizes based on whether point is occupied
                if (connectionPoint.occupied) {
                    // Occupied node - green/brown indicating leaf attachment
                    ctx.fillStyle = '#3A5F0B'; // Darker green for occupied points
                    ctx.strokeStyle = '#32CD32'; // Bright green outline
                    ctx.lineWidth = 1;
                    ctx.arc(cpX, cpY, tertiaryBranch.size * 0.5, 0, Math.PI * 2);
                } else {
                    // Available node - light colored to indicate available attachment point
                    ctx.fillStyle = '#8B7355'; // Light brown for available points
                    ctx.strokeStyle = this.stage >= PLANT_STAGES.MATURE ? '#8B4513' : '#228B22';
                    ctx.lineWidth = 1;
                    ctx.arc(cpX, cpY, tertiaryBranch.size * 0.4, 0, Math.PI * 2);
                }
                
                ctx.fill();
                ctx.stroke();
            });
        }
    }
    
    drawCotyledon(ctx, leaf) {
        ctx.beginPath();
        ctx.fillStyle = '#90EE90';
        
        // Draw simple oval shape
        const leafWidth = TILE_SIZE/2;
        const leafHeight = TILE_SIZE * 0.75;
        
        ctx.ellipse(
            (this.x + leaf.x) * TILE_SIZE + TILE_SIZE/2,
            (this.y + leaf.y) * TILE_SIZE + TILE_SIZE/2,
            leafWidth,
            leafHeight,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
    
    drawSimpleLeaf(ctx, leaf) {
        // Save context for rotation
        ctx.save();
        
        const leafSize = TILE_SIZE * 0.4; // Reduced from 0.6
        const x = (this.x + leaf.x) * TILE_SIZE + TILE_SIZE/2;
        const y = (this.y + leaf.y) * TILE_SIZE + TILE_SIZE/2;
        
        // Translate to leaf position and rotate
        ctx.translate(x, y);
        ctx.rotate(leaf.angle || 0);
        
        // Draw stem connecting to branch if there's a branch reference
        if (leaf.branchRef) {
            ctx.beginPath();
            ctx.strokeStyle = '#3A5F0B'; // Dark green for stem
            ctx.lineWidth = 1.5;
            ctx.moveTo(0, 0);
            
            // Draw stem in the opposite direction of the leaf orientation
            // This ensures it points back toward the branch
            ctx.lineTo(0, leafSize * 0.5); // Stem points back towards branch
            ctx.stroke();
        }
        
        // Draw teardrop shape at origin (0,0) after rotation
        ctx.beginPath();
        ctx.fillStyle = '#228B22';
        
        ctx.moveTo(0, -leafSize);
        ctx.quadraticCurveTo(
            leafSize * 0.7,
            0,
            0,
            leafSize * 0.7
        );
        ctx.quadraticCurveTo(
            -leafSize * 0.7,
            0,
            0,
            -leafSize
        );
        ctx.fill();
        
        // Draw central vein
        ctx.beginPath();
        ctx.strokeStyle = '#1B691B';
        ctx.lineWidth = 1;
        ctx.moveTo(0, -leafSize);
        ctx.lineTo(0, leafSize * 0.7);
        ctx.stroke();
        
        // Restore context to undo rotation and translation
        ctx.restore();
    }
    
    drawDetailedLeaf(ctx, leaf) {
        // Save context for rotation
        ctx.save();
        
        const leafSize = TILE_SIZE * 0.5; // Reduced from 0.75
        const x = (this.x + leaf.x) * TILE_SIZE + TILE_SIZE/2;
        const y = (this.y + leaf.y) * TILE_SIZE + TILE_SIZE/2;
        
        // Translate to leaf position and rotate
        ctx.translate(x, y);
        ctx.rotate(leaf.angle || 0);
        
        // Draw stem connecting to branch if there's a branch reference
        if (leaf.branchRef) {
            ctx.beginPath();
            ctx.strokeStyle = '#3A5F0B'; // Dark green for stem
            ctx.lineWidth = 1.5;
            ctx.moveTo(0, 0);
            
            // Draw stem in the opposite direction of the leaf orientation
            // This ensures it points back toward the branch
            ctx.lineTo(0, leafSize * 0.6); // Stem points back towards branch
            ctx.stroke();
        }
        
        // Main leaf shape at origin after rotation
        ctx.beginPath();
        ctx.fillStyle = '#228B22';
        
        // Main leaf shape
        ctx.moveTo(0, -leafSize);
        ctx.bezierCurveTo(
            leafSize * 0.7,
            -leafSize/2,
            leafSize * 0.7,
            leafSize/2,
            0,
            leafSize * 0.7
        );
        ctx.bezierCurveTo(
            -leafSize * 0.7,
            leafSize/2,
            -leafSize * 0.7,
            -leafSize/2,
            0,
            -leafSize
        );
        ctx.fill();
        
        // Draw veins
        ctx.beginPath();
        ctx.strokeStyle = '#1B691B';
        ctx.lineWidth = 1;
        
        // Main vein
        ctx.moveTo(0, -leafSize);
        ctx.lineTo(0, leafSize * 0.7);
        
        // Side veins
        for (let i = -2; i <= 2; i++) {
            const veinY = i * leafSize/4;
            ctx.moveTo(0, veinY);
            ctx.lineTo(leafSize/2 * Math.sign(i), veinY);
            ctx.moveTo(0, veinY);
            ctx.lineTo(-leafSize/2 * Math.sign(i), veinY);
        }
        ctx.stroke();
        
        // Restore context to undo rotation and translation
        ctx.restore();
    }
    
    drawCompoundLeaf(ctx, leaf) {
        // Save context for rotation
        ctx.save();
        
        // Make compound leaves even smaller to reduce overlap
        const leafletCount = leaf.advanced ? 5 : 3; // Reduced count
        const leafletSize = TILE_SIZE * (leaf.advanced ? 0.35 : 0.25); // Further reduced size
        const spacing = TILE_SIZE * 0.25; // Reduced spacing
        const x = (this.x + leaf.x) * TILE_SIZE + TILE_SIZE/2;
        const y = (this.y + leaf.y) * TILE_SIZE + TILE_SIZE/2;
        
        // Translate to leaf position and rotate the entire compound leaf
        ctx.translate(x, y);
        ctx.rotate(leaf.angle || 0);
        
        // Draw stem connecting to branch if there's a branch reference
        if (leaf.branchRef) {
            ctx.beginPath();
            ctx.strokeStyle = '#3A5F0B'; // Dark green for stem
            ctx.lineWidth = 1.5;
            ctx.moveTo(0, 0);
            
            // Draw stem in the opposite direction of the leaf petiole
            ctx.lineTo(leafletCount/2 * spacing * 0.5, 0); // Stem extends towards the branch
            ctx.stroke();
        }
        
        // Draw central leaflet
        this.drawLeaflet(ctx, 0, 0, leafletSize);
        
        // Draw side leaflets with increased angle to spread them out more
        for (let i = 1; i <= Math.floor(leafletCount/2); i++) {
            const offset = i * spacing;
            const angleOffset = Math.PI / 8 * i; // Increased angle for better spread
            
            // Left leaflet
            this.drawLeaflet(ctx, 
                -offset,
                -offset/2, // More vertical offset to spread out
                leafletSize * 0.8,
                -angleOffset // Angle for left side
            );
            // Right leaflet
            this.drawLeaflet(ctx,
                offset,
                -offset/2, // More vertical offset to spread out
                leafletSize * 0.8,
                angleOffset // Angle for right side
            );
        }
        
        // Draw stem connecting leaflets
        ctx.beginPath();
        ctx.strokeStyle = '#228B22';
        ctx.lineWidth = 1.5;
        ctx.moveTo(-leafletCount/2 * spacing, 0);
        ctx.lineTo(leafletCount/2 * spacing, 0);
        ctx.stroke();
        
        // Restore context to undo rotation and translation
        ctx.restore();
    }
    
    drawLeaflet(ctx, x, y, size, angleOffset = 0) {
        ctx.beginPath();
        ctx.fillStyle = '#32CD32'; // Brighter green for leaflets
        
        // Draw oval leaflet with better detail - small at attachment point, wider at opposite end
        ctx.ellipse(
            x,
            y,
            size * 0.5,
            size * 0.8,
            Math.PI / 4 + angleOffset, // Slightly angled
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Add more detailed vein details
        ctx.beginPath();
        ctx.strokeStyle = '#1B691B';
        ctx.lineWidth = 1.5;
        
        // Main vein
        const veinAngle = Math.PI / 4 + angleOffset; // Match the leaflet rotation
        const veinLength = size * 0.8;
        ctx.moveTo(
            x - Math.cos(veinAngle) * veinLength, 
            y - Math.sin(veinAngle) * veinLength
        );
        ctx.lineTo(
            x + Math.cos(veinAngle) * veinLength, 
            y + Math.sin(veinAngle) * veinLength
        );
        ctx.stroke();
    }
    
    // Helper method to find the parent root for a given root
    findRootParent(currentRoot, currentIndex) {
        if (currentIndex === 0) return -1; // Base root has no parent
        
        // Calculate the Manhattan distance to all previous roots
        const distances = [];
        for (let i = 0; i < currentIndex; i++) {
            const prev = this.parts.roots[i];
            const distance = Math.abs(prev.x - currentRoot.x) + Math.abs(prev.y - currentRoot.y);
            distances.push({ index: i, distance });
        }
        
        // Sort by distance (ascending)
        distances.sort((a, b) => a.distance - b.distance);
        
        // Return the index of the closest root
        return distances.length > 0 ? distances[0].index : -1;
    }
} 