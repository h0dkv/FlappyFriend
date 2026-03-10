const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// --- Full Screen Setup ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Reposition bird to center-left on resize if game hasn't started
    if (!bird.gameStarted) {
        bird.y = canvas.height / 2;
    }
}
window.addEventListener('resize', resize);

let bird = {
    x: 100, // Move bird a bit further from the edge
    y: window.innerHeight / 2,
    w: 42,
    h: 42,
    gravity: 0,
    lift: -8,
    velocity: 0,
    gameStarted: false
};

let pipes = [];
let particles = [];
let clouds = [];
let frame = 0;
let score = 0;
let highScore = localStorage.getItem("flappyHighScore") || 0;
let isGameOver = false;

const birdImg = new Image();
birdImg.src = "assets/friend.png";

// Initialize clouds based on screen width
for (let i = 0; i < 8; i++) {
    clouds.push({ x: Math.random() * window.innerWidth, y: Math.random() * 250, s: 0.5 + Math.random() });
}

// Support for both Keyboard and Touch/Click
function handleInput(e) {
    if (e.type === "keydown" && e.code !== "Space") return;

    if (isGameOver) return resetGame();

    if (!bird.gameStarted) {
        bird.gameStarted = true;
        bird.gravity = 0.35;
    }

    bird.velocity = bird.lift;
    createParticles(bird.x, bird.y + bird.h / 2);
}

document.addEventListener("keydown", handleInput);
document.addEventListener("touchstart", (e) => {
    e.preventDefault(); // Prevents zooming/scrolling on mobile
    handleInput(e);
}, { passive: false });

function createParticles(x, y) {
    for (let i = 0; i < 5; i++) {
        particles.push({
            x: x, y: y,
            vx: -Math.random() * 2,
            vy: Math.random() * 2 - 1,
            life: 20
        });
    }
}

function resetGame() {
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    bird.gravity = 0;
    bird.gameStarted = false;
    pipes = [];
    particles = [];
    score = 0;
    frame = 0;
    isGameOver = false;
    loop();
}

function update() {
    clouds.forEach(c => {
        c.x -= c.s;
        if (c.x < -150) c.x = canvas.width + 100;
    });

    particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    });

    if (bird.gameStarted) {
        bird.velocity += bird.gravity;
        bird.y += bird.velocity;

        if (frame % 80 === 0) {
            let gap = 180; // More forgiving gap for full screen
            let top = Math.random() * (canvas.height - gap - 200) + 100;
            pipes.push({ x: canvas.width, top: top, bottom: top + gap, passed: false });
        }

        pipes.forEach((p, i) => {
            p.x -= 4.5; // Slightly faster for wider screens
            if (bird.x + bird.w > p.x && bird.x < p.x + 60 && (bird.y < p.top || bird.y + bird.h > p.bottom)) {
                isGameOver = true;
            }
            if (!p.passed && bird.x > p.x + 60) {
                score++;
                p.passed = true;
                if (score > highScore) {
                    highScore = score;
                    localStorage.setItem("flappyHighScore", highScore);
                }
            }
            if (p.x < -100) pipes.splice(i, 1);
        });
    } else {
        bird.y = (canvas.height / 2) + Math.sin(frame * 0.1) * 10;
    }

    if (bird.y + bird.h > canvas.height || bird.y < 0) isGameOver = true;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    clouds.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 30, 0, Math.PI * 2);
        ctx.arc(c.x + 35, c.y - 15, 40, 0, Math.PI * 2);
        ctx.arc(c.x + 70, c.y, 30, 0, Math.PI * 2);
        ctx.fill();
    });

    // Pipes
    pipes.forEach(p => {
        let grad = ctx.createLinearGradient(p.x, 0, p.x + 60, 0);
        grad.addColorStop(0, "#2e7d32");
        grad.addColorStop(1, "#81c784");
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, 0, 60, p.top);
        ctx.fillRect(p.x, p.bottom, 60, canvas.height);
        ctx.strokeStyle = "#1b5e20";
        ctx.lineWidth = 3;
        ctx.strokeRect(p.x, 0, 60, p.top);
        ctx.strokeRect(p.x, p.bottom, 60, canvas.height);
    });

    // Bird
    ctx.save();
    ctx.translate(bird.x + bird.w / 2, bird.y + bird.h / 2);
    let rotation = bird.gameStarted ? Math.min(Math.PI / 4, Math.max(-Math.PI / 4, bird.velocity * 0.1)) : 0;
    ctx.rotate(rotation);
    if (birdImg.complete) {
        ctx.drawImage(birdImg, -bird.w / 2, -bird.h / 2, bird.w, bird.h);
    } else {
        ctx.fillStyle = "gold";
        ctx.fillRect(-bird.w / 2, -bird.h / 2, bird.w, bird.h);
    }
    ctx.restore();

    // UI Overlay
    ctx.fillStyle = "white";
    ctx.font = "bold 30px Courier New";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 5;
    ctx.fillText(`SCORE: ${score}`, 30, 50);
    ctx.font = "18px Courier New";
    ctx.fillText(`BEST: ${highScore}`, 30, 80);
    ctx.shadowBlur = 0;

    if (!bird.gameStarted && !isGameOver) {
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "bold 24px Courier New";
        ctx.fillText("PRESS SPACE OR TAP TO FLY", canvas.width / 2, canvas.height / 2 + 60);
        ctx.textAlign = "left";
    }

    if (isGameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "bold 50px Courier New";
        ctx.fillText("CRASHED!", canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = "20px Courier New";
        ctx.fillText("SPACE or TAP to try again", canvas.width / 2, canvas.height / 2 + 40);
        ctx.textAlign = "left";
    }
}

function loop() {
    update();
    draw();
    frame++;
    if (!isGameOver) requestAnimationFrame(loop);
}

resize();
birdImg.onload = loop;