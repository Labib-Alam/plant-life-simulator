class Tile {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.moisture = type === TILE_TYPES.WATER ? 100 : (type === TILE_TYPES.DIRT ? 50 : 0);
        this.nutrients = type === TILE_TYPES.DIRT ? 70 : (type === TILE_TYPES.MINERAL ? 100 : 0);
        this.hasPlant = false;
    }

    draw(ctx) {
        let color;
        switch (this.type) {
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
            case TILE_TYPES.ROOT:
                color = '#8B0000'; // Dark red for noticeable roots
                break;
            default:
                return; // Don't draw air tiles
        }

        ctx.fillStyle = color;
        ctx.fillRect(this.x * TILE_SIZE, this.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        
        // Add texture/detail to tiles
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x * TILE_SIZE, this.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        
        // Add specific details based on tile type
        if (this.type === TILE_TYPES.DIRT) {
            this.drawDirtDetails(ctx);
        } else if (this.type === TILE_TYPES.MINERAL) {
            this.drawMineralDetails(ctx);
        } else if (this.type === TILE_TYPES.WATER) {
            this.drawWaterDetails(ctx);
        }
    }
    
    drawDirtDetails(ctx) {
        ctx.fillStyle = 'rgba(101, 67, 33, 0.5)';
        const x = this.x * TILE_SIZE;
        const y = this.y * TILE_SIZE;
        
        // Draw some random specs
        for (let i = 0; i < 5; i++) {
            const dotX = x + Math.random() * TILE_SIZE;
            const dotY = y + Math.random() * TILE_SIZE;
            const dotSize = 1 + Math.random() * 2;
            
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawMineralDetails(ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        const x = this.x * TILE_SIZE;
        const y = this.y * TILE_SIZE;
        
        // Draw some sparkles
        for (let i = 0; i < 3; i++) {
            const sparkX = x + 5 + Math.random() * (TILE_SIZE - 10);
            const sparkY = y + 5 + Math.random() * (TILE_SIZE - 10);
            
            ctx.beginPath();
            ctx.moveTo(sparkX - 2, sparkY);
            ctx.lineTo(sparkX + 2, sparkY);
            ctx.moveTo(sparkX, sparkY - 2);
            ctx.lineTo(sparkX, sparkY + 2);
            ctx.stroke();
        }
    }
    
    drawWaterDetails(ctx) {
        // Add a slight wave effect
        ctx.fillStyle = 'rgba(173, 216, 230, 0.5)';
        const x = this.x * TILE_SIZE;
        const y = this.y * TILE_SIZE;
        
        ctx.beginPath();
        ctx.moveTo(x, y + TILE_SIZE * 0.8);
        ctx.bezierCurveTo(
            x + TILE_SIZE * 0.25, y + TILE_SIZE * 0.7,
            x + TILE_SIZE * 0.75, y + TILE_SIZE * 0.9,
            x + TILE_SIZE, y + TILE_SIZE * 0.8
        );
        ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
        ctx.lineTo(x, y + TILE_SIZE);
        ctx.closePath();
        ctx.fill();
    }
    
    update(neighbors) {
        // Water spreads moisture to adjacent dirt tiles
        if (this.type === TILE_TYPES.DIRT) {
            let waterNearby = neighbors.some(n => n && n.type === TILE_TYPES.WATER);
            if (waterNearby && this.moisture < 90) {
                this.moisture += 0.5;
            } else if (this.moisture > 30) {
                // Slowly dry out if not near water
                this.moisture -= 0.1;
            }
        }
    }
} 