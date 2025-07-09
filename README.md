# Cargo Current

A minimalist, real-time, shape-based shipping logistics game inspired by Mini Metro but set entirely at sea. Players draw color-coded shipping lines between ports, manage cargo flow, and optimize ships—all while avoiding port overcrowding.

## Game Objective

Create an efficient shipping network by:
- Drawing shipping routes between coastal ports
- Managing cargo flow between ports of matching shapes
- Upgrading ships and ports to handle increased demand
- Preventing ports from overflowing for 3 days (which causes game over)

## How to Play

1. **Setup**:
   - Run `npm install` to install dependencies
   - Run `npm start` to start the development server
   - Open your browser to the URL shown in the terminal (usually http://localhost:8080)

2. **Game Controls**:
   - Click and drag from one port to another to create a shipping line
   - Lines automatically form loops when you connect multiple ports
   - Each new line starts with one ship that follows the route automatically

3. **Game Mechanics**:
   - Ports generate cargo (shown as shapes) that need to be delivered to matching ports
   - Ships automatically pick up and deliver cargo along their routes
   - If a port gets too full (exceeds capacity), a timer appears
   - If a port remains overcrowded for 3 days, the game ends

4. **Weekend Upgrades**:
   - Every Saturday (7th day), you receive a new ship and can choose one upgrade:
     - Megaport: Increase a port's capacity and exchange speed by 50%
     - New Shipping Line: Add a new color-coded route with one ship
     - Ship Upgrade: Add +6 capacity to a ship

## Game Features

- **Ocean Environment**: Navigate between islands in an abstract ocean
- **Shape-based Cargo**: Different ports handle specific cargo shapes (●, ■, ▲, etc.)
- **Dynamic Port Generation**: New ports appear gradually on existing islands
- **Ship Management**: Ships follow routes and automatically handle cargo
- **Visual Feedback**: Overflow timers and cargo indicators help manage your network
- **Day/Night Cycle**: Track progress with the in-game clock and day counter

## Development

This game is built using vanilla JavaScript and HTML5 Canvas. The main components are:

- `index.html`: Game interface and UI elements
- `index.js`: Core game logic and rendering
- CSS styles are included in the HTML file for simplicity

## Credits

Created as a Mini Metro-inspired shipping logistics game. Enjoy!