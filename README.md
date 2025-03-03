# Plant Life Simulator

A web-based plant life simulator that features a day-night cycle and different types of ground tiles (dirt, stone, minerals, and water).

## Features

- **Dynamic Day-Night Cycle**: Watch as the sun and moon traverse the sky, changing the lighting and affecting plant growth.
- **Diverse Ground Types**: The world contains different tile types:
  - Dirt: The primary growing medium for plants
  - Stone: Hard material that plants cannot grow through
  - Minerals: Provides extra nutrients for plants
  - Water: Provides moisture to nearby soil
- **Plant Growth Simulation**: Plants grow realistically through various stages:
  - Seed/Germination
  - Sapling
  - Juvenile
  - Mature
  - Advanced
- **Environmental Factors**: Plant growth is affected by:
  - Moisture levels in soil
  - Nutrient availability
  - Sunlight based on time of day

## How to Use

1. Open `index.html` in a web browser
2. Click the "Plant Seed" button
3. Click on the ground (dirt tiles) to plant a seed
4. Watch as your plant grows over time

## Controls

- **Plant Seed Button**: Activates planting mode
- **Keyboard Controls**:
  - `1`: Normal speed (1x)
  - `2`: Double speed (2x)
  - `3`: Fast speed (5x)
  - `0`: Slow speed (0.5x)

## Plant Growth Mechanics

Plants in the simulator grow based on several factors:

1. **Moisture**: Plants need water to grow. Soil near water tiles will have higher moisture.
2. **Nutrients**: Plants absorb nutrients from the soil. Mineral tiles provide extra nutrients.
3. **Sunlight**: Plants grow faster during daylight hours, with peak growth at noon.
4. **Growth Stages**: Plants progress through different growth stages, developing roots, stems, branches, and leaves.

## Development

This simulator is built using HTML5 Canvas and JavaScript. The main components are:

- `Tile.js`: Handles the different types of ground tiles
- `Plant.js`: Manages plant growth and rendering
- `World.js`: Controls world generation and the day-night cycle
- `Main.js`: Initializes the game and handles user input

## Future Enhancements

- Add more plant varieties
- Implement weather effects (rain, wind)
- Add insects and other organisms
- Expand the growth mechanics with more complex patterns 