// Game constants
const TILE_SIZE = 32;
const GRID_WIDTH = 1200;
const GRID_HEIGHT = 500;
const GROUND_LEVEL = 200; // Row where ground starts (adjusted for new height)

// Time constants
const DAY_LENGTH = 24000; // ms for a full day-night cycle
const HOUR_LENGTH = DAY_LENGTH / 24;
const STARTING_HOUR = 6; // Game starts at 6 AM

// Camera settings
const CAMERA_SPEED = 10; // Pixels per frame when moving camera
const CAMERA_ZOOM_STEP = 0.1; // Zoom increment/decrement

// Tile types
const TILE_TYPES = {
    AIR: 0,
    DIRT: 1,
    STONE: 2,
    MINERAL: 3,
    WATER: 4,
    ROOT: 5  // Add ROOT as a tile type
};

// Plant growth stages
const PLANT_STAGES = {
    SEED: 0,
    GERMINATION: 1,
    SAPLING: 2,
    JUVENILE: 3,
    MATURE: 4,
    ADVANCED: 5
};

// Plant parts
const PLANT_PARTS = {
    ROOT: 0,
    LEAF: 1,
    BRANCH: 2,
    STEM: 3,
    CONNECTOR: 4
};

// Colors
const COLORS = {
    SKY_DAY: '#87CEEB',
    SKY_NIGHT: '#0C1445',
    DIRT: '#8B4513',
    STONE: '#808080',
    MINERAL: '#FFD700',
    WATER: '#1E90FF',
    PLANT_STEM: '#228B22',
    PLANT_LEAF: '#32CD32',
    PLANT_ROOT: '#8B4513',
    PLANT_ROOT_TIP: '#654321',  // Changed from #A52A2A to a natural brown color
    PLANT_ROOT_ADVANCED: '#5D4037',  // Changed from #7E3517 to a medium brown color
    PLANT_BRANCH: '#5D4037',  // Medium brown for mature branches
    PLANT_BRANCH_YOUNG: '#3A5F0B',  // Dark green for young branches
    PLANT_BRANCH_CONNECTOR: '#8B4513', // Brown for branch connections
    PLANT_LEAF_BRIGHT: '#32CD32',  // Bright green for regular leaves
    PLANT_LEAF_VEIN: '#1B691B'  // Dark green for leaf veins
}; 