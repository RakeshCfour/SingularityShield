const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const healthBarFill = document.getElementById('health-bar-fill');
const hud = document.getElementById('hud');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const highScoreEl = document.getElementById('high-score');

let cw, ch, cx, cy;
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let highScore = localStorage.getItem('singularity_highscore') || 0;
let lastTime = 0;

// Game constants and variables
const CORE_RADIUS = 30;
const SHIELD_RADIUS = 80;
const SHIELD_WIDTH = 15;
const SHIELD_ANGLE_SIZE = Math.PI / 3; // 60 degrees

let shieldAngle = 0;
let shieldDirection = 1; // 1 for clockwise, -1 for counter-clockwise
let shieldSpeed = 3; // Radians per second

let coreHealth = 100;
let maxCoreHealth = 100;

let enemies = [];
let particles = [];
let spawnTimer = 0;
let spawnInterval = 1000; // ms
let gameTime = 0;

function resize() {
    cw = canvas.width = window.innerWidth;
    ch = canvas.height = window.innerHeight;
    cx = cw / 2;
    cy = ch / 2;
}
window.addEventListener('resize', resize);
resize();

// Input handling
function handleInput(e) {
    if (e.type === 'keydown' && e.code !== 'Space') return;
    
    // Prevent default scrolling for spacebar
    if (e.type === 'keydown' && e.code === 'Space') {
        e.preventDefault();
    }

    if (gameState === 'START') {
        startGame();
    } else if (gameState === 'GAME_OVER') {
        startGame();
    } else if (gameState === 'PLAYING') {
        shieldDirection *= -1; // Reverse direction
    }
}

window.addEventListener('keydown', handleInput);
window.addEventListener('pointerdown', handleInput); // Works for mouse and touch

class Enemy {
    constructor(speedMult = 1) {
        this.angle = Math.random() * Math.PI * 2;
        // Spawn just outside the screen
        const spawnDist = Math.max(cw, ch) / 2 + 50;
        this.x = cx + Math.cos(this.angle) * spawnDist;
        this.y = cy + Math.sin(this.angle) * spawnDist;
        
        // Move towards center
        this.speed = (100 + Math.random() * 50) * speedMult; // Pixels per second
        this.radius = 8;
        this.color = '#ff00ff';
        if (Math.random() > 0.8) {
            // Fast enemy
            this.speed *= 1.5;
            this.color = '#ff3333';
            this.radius = 6;
        }
        this.markedForDeletion = false;
    }

    update(dt) {
        const dx = cx - this.x;
        const dy = cy - this.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 0) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 200 + 50;
        this.radius = Math.random() * 3 + 1;
        this.color = color;
        this.life = 1.0;
        this.decay = Math.random() * 1.5 + 0.5;
    }

    update(dt) {
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
        this.life -= this.decay * dt;
    }

    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

function spawnExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function startGame() {
    gameState = 'PLAYING';
    score = 0;
    coreHealth = maxCoreHealth;
    enemies = [];
    particles = [];
    gameTime = 0;
    spawnInterval = 1200;
    shieldAngle = 0;
    shieldSpeed = 3;
    
    updateHUD();
    
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    hud.classList.add('visible');
    document.body.classList.remove('shake');
}

function gameOver() {
    gameState = 'GAME_OVER';
    hud.classList.remove('visible');
    gameOverScreen.classList.add('active');
    finalScoreEl.innerText = score;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('singularity_highscore', highScore);
    }
    highScoreEl.innerText = highScore;
    
    document.body.classList.remove('shake'); // ensure it's removed
    spawnExplosion(cx, cy, '#00ffff', 50); // Core explosion
}

function updateHUD() {
    scoreEl.innerText = score;
    const hpPercent = Math.max(0, coreHealth / maxCoreHealth * 100);
    healthBarFill.style.width = hpPercent + '%';
    
    if (hpPercent > 50) {
        healthBarFill.style.backgroundColor = 'var(--primary-color)';
    } else if (hpPercent > 25) {
        healthBarFill.style.backgroundColor = '#ffaa00';
    } else {
        healthBarFill.style.backgroundColor = 'var(--danger-color)';
    }
}

function triggerShake() {
    document.body.classList.remove('shake');
    void document.body.offsetWidth; // trigger reflow
    document.body.classList.add('shake');
}

// Check if a point is within the shield arc
function isCollidingWithShield(enemy) {
    const dx = enemy.x - cx;
    const dy = enemy.y - cy;
    const dist = Math.hypot(dx, dy);
    
    // Check distance (is it crossing the shield ring?)
    if (Math.abs(dist - SHIELD_RADIUS) < (SHIELD_WIDTH / 2 + enemy.radius)) {
        // Calculate angle of enemy relative to center
        let enemyAngle = Math.atan2(dy, dx);
        if (enemyAngle < 0) enemyAngle += Math.PI * 2;
        
        // Normalize shield angle
        let normalizedShieldAngle = shieldAngle % (Math.PI * 2);
        if (normalizedShieldAngle < 0) normalizedShieldAngle += Math.PI * 2;
        
        // We have two shields opposite to each other.
        // Check shield 1
        let diff1 = Math.abs(enemyAngle - normalizedShieldAngle);
        if (diff1 > Math.PI) diff1 = Math.PI * 2 - diff1;
        
        // Check shield 2
        let shieldAngle2 = (normalizedShieldAngle + Math.PI) % (Math.PI * 2);
        let diff2 = Math.abs(enemyAngle - shieldAngle2);
        if (diff2 > Math.PI) diff2 = Math.PI * 2 - diff2;
        
        if (diff1 < SHIELD_ANGLE_SIZE / 2 || diff2 < SHIELD_ANGLE_SIZE / 2) {
            return true;
        }
    }
    return false;
}

function update(dt) {
    if (gameState !== 'PLAYING') {
        // Update particles even when game over
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update(dt);
            if (particles[i].life <= 0) particles.splice(i, 1);
        }
        return;
    }

    gameTime += dt;
    
    // Difficulty ramp
    const speedMult = 1 + (gameTime / 60); // 100% faster every 60s
    spawnInterval = Math.max(300, 1200 - (gameTime * 15)); // gets faster
    shieldSpeed = 3 + (gameTime / 120); // Shield gets slightly faster too

    // Rotate shield
    shieldAngle += shieldSpeed * shieldDirection * dt;

    // Spawning enemies
    spawnTimer += dt * 1000;
    if (spawnTimer >= spawnInterval) {
        enemies.push(new Enemy(speedMult));
        spawnTimer = 0;
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        e.update(dt);
        
        // Collision with shield
        if (isCollidingWithShield(e)) {
            spawnExplosion(e.x, e.y, e.color, 15);
            e.markedForDeletion = true;
            score += 10;
            updateHUD();
        }
        
        // Collision with core
        const dx = e.x - cx;
        const dy = e.y - cy;
        if (Math.hypot(dx, dy) < CORE_RADIUS + e.radius) {
            spawnExplosion(e.x, e.y, '#ff3333', 20);
            triggerShake();
            e.markedForDeletion = true;
            coreHealth -= 20;
            updateHUD();
            
            if (coreHealth <= 0) {
                gameOver();
            }
        }

        if (e.markedForDeletion) {
            enemies.splice(i, 1);
        }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(dt);
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function draw() {
    // Clear with trail effect
    ctx.fillStyle = 'rgba(5, 5, 5, 0.3)';
    ctx.fillRect(0, 0, cw, ch);

    // Draw grid background
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    
    // Move grid slowly for dynamic feel
    const offset = (performance.now() / 50) % gridSize;
    
    ctx.beginPath();
    for(let x = offset; x < cw; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ch);
    }
    for(let y = offset; y < ch; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y);
    }
    ctx.stroke();

    if (gameState === 'PLAYING' || gameState === 'START') {
        // Draw Core
        ctx.beginPath();
        ctx.arc(cx, cy, CORE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#050505';
        ctx.fill();
        
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#00ffff';
        
        // Core pulse effect based on health and time
        let pulse = Math.sin(performance.now() / 200) * 5;
        if (gameState !== 'PLAYING') pulse = 0; // Less pulse in menu
        
        ctx.shadowBlur = 20 + pulse;
        ctx.shadowColor = '#00ffff';
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset

        // Draw Shield
        ctx.lineWidth = SHIELD_WIDTH;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffffff';
        ctx.lineCap = 'round';
        
        // Shield 1
        ctx.beginPath();
        ctx.arc(cx, cy, SHIELD_RADIUS, shieldAngle - SHIELD_ANGLE_SIZE/2, shieldAngle + SHIELD_ANGLE_SIZE/2);
        ctx.stroke();
        
        // Shield 2 (opposite)
        ctx.beginPath();
        ctx.arc(cx, cy, SHIELD_RADIUS, shieldAngle + Math.PI - SHIELD_ANGLE_SIZE/2, shieldAngle + Math.PI + SHIELD_ANGLE_SIZE/2);
        ctx.stroke();
        
        ctx.shadowBlur = 0; // Reset
    }

    // Draw enemies
    enemies.forEach(e => e.draw(ctx));

    // Draw particles
    particles.forEach(p => p.draw(ctx));
}

function loop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    
    // Cap dt to prevent huge jumps if tab is inactive
    if (dt > 0.1) dt = 0.1;

    update(dt);
    draw();

    requestAnimationFrame(loop);
}

// Start loop
requestAnimationFrame(loop);
