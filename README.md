# Singularity Shield

A minimalist, fast-paced arcade game where you protect the core from an endless barrage of geometric enemies.

## How to Play
- **The Core** is in the center of the screen. Enemies spawn from the edges and move inwards.
- **The Shield** rotates around the core automatically.
- Your goal is to intercept the enemies with the shield before they hit the core.

## Controls
- **Desktop**: Press <kbd>SPACE</kbd> to reverse the shield's rotation direction.
- **Mobile / Mouse**: <kbd>TAP</kbd> or <kbd>CLICK</kbd> anywhere on the screen to reverse the shield.

## Tech Stack
- HTML5 Canvas
- Vanilla JavaScript
- CSS3

## Project Structure
- `index.html`: The main entry point containing the game canvas and UI elements.
- `style.css`: Styles for the UI, fonts, glowing effects, and responsive layout.
- `game.js`: The complete game loop, rendering logic, entities (Core, Shield, Enemy, Particles), and collision detection.

## How to run
1. Clone this repository.
2. Open `index.html` in any modern web browser.
3. No build tools or local servers are strictly required!

## Development
To run a local server for testing:
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000`.
