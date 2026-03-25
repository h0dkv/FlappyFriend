const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// --- Audio ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playFlap() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    osc.start(); osc.stop(audioCtx.currentTime + 0.12);
}

function playScore() {
    [523, 659, 784].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = "triangle";
        osc.frequency.value = freq;
        const t = audioCtx.currentTime + i * 0.09;
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t); osc.stop(t + 0.15);
    });
}

function playMultiplierUp() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.start(); osc.stop(audioCtx.currentTime + 0.15);
}

function playCrash() {
    const bufferSize = audioCtx.sampleRate * 0.4;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gain = audioCtx.createGain();
    source.connect(gain); gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    source.start(); source.stop(audioCtx.currentTime + 0.4);
}

// --- Full Screen Setup ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (!bird.gameStarted) bird.y = canvas.height / 2;
}
window.addEventListener('resize', resize);

let bird = {
    x: 100,
    y: window.innerHeight / 2,
    w: 42,
    h: 42,
    gravity: 0,
    lift: -6.5,       // softer lift
    velocity: 0,
    gameStarted: false
};

let pipes = [];
let particles = [];
let clouds = [];
let stars = [];
let frame = 0;
let score = 0;
let highScore = localStorage.getItem("flappyHighScore") || 0;
let isGameOver = false;
let multiplier = 1;
let multiplierTimer = 0; // frames since last pipe passed (resets multiplier if too long)
let nightMode = false;
let pipeSpeed = 3.5;
let screenShake = 0;

const birdImg = new Image();
birdImg.src = "assets/friend.png";

// Stars for night mode
for (let i = 0; i < 120; i++) {
    stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight * 0.7,
        r: Math.random() * 1.5 + 0.3,
        twinkle: Math.random() * Math.PI * 2
    });
}

// Clouds
for (let i = 0; i < 8; i++) {
    clouds.push({ x: Math.random() * window.innerWidth, y: Math.random() * 250, s: 0.4 + Math.random() * 0.6 });
}

function handleInput(e) {
    if (e.type === "keydown" && e.code !== "Space") return;

    // Resume AudioContext on first interaction (required by browsers)
    if (audioCtx.state === "suspended") audioCtx.resume();

    if (isGameOver) return resetGame();

    if (!bird.gameStarted) {
        bird.gameStarted = true;
        bird.gravity = 0.28; // floaty gravity
    }

    bird.velocity = bird.lift;
    createParticles(bird.x, bird.y + bird.h / 2);
    playFlap();
}

document.addEventListener("keydown", handleInput);
document.addEventListener("touchstart", (e) => {
    e.preventDefault();
    handleInput(e);
}, { passive: false });

function createParticles(x, y) {
    for (let i = 0; i < 6; i++) {
        particles.push({
            x, y,
            vx: -Math.random() * 2,
            vy: Math.random() * 2 - 1,
            life: 22,
            maxLife: 22
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
    multiplier = 1;
    multiplierTimer = 0;
    nightMode = false;
    pipeSpeed = 3.5;
    screenShake = 0;
    loop();
}

function update() {
    // Night mode kicks in at score 10
    nightMode = score >= 10;

    // Speed ramp: every 5 points, nudge speed up (cap at 7)
    pipeSpeed = Math.min(7, 3.5 + score * 0.08);

    // Screen shake decay
    if (screenShake > 0) screenShake *= 0.8;

    clouds.forEach(c => {
        c.x -= c.s * (nightMode ? 0.5 : 1);
        if (c.x < -150) c.x = canvas.width + 100;
    });

    stars.forEach(s => { s.twinkle += 0.04; });

    particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    });

    if (bird.gameStarted) {
        bird.velocity += bird.gravity;
        // Terminal velocity cap — keeps it floaty
        bird.velocity = Math.min(bird.velocity, 9);
        bird.y += bird.velocity;

        multiplierTimer++;
        // If 4 seconds pass without scoring, reset multiplier
        if (multiplierTimer > 240) {
            multiplier = 1;
            multiplierTimer = 0;
        }

        if (frame % 80 === 0) {
            let gap = 195;
            let top = Math.random() * (canvas.height - gap - 200) + 100;
            pipes.push({ x: canvas.width, top, bottom: top + gap, passed: false });
        }

        pipes.forEach((p, i) => {
            p.x -= pipeSpeed;

            // Collision
            if (bird.x + bird.w > p.x + 5 && bird.x < p.x + 55 &&
                (bird.y < p.top || bird.y + bird.h > p.bottom)) {
                isGameOver = true;
                screenShake = 12;
                playCrash();
            }

            // Scored
            if (!p.passed && bird.x > p.x + 60) {
                p.passed = true;
                multiplierTimer = 0;

                // Increase multiplier every 3 pipes
                if (score > 0 && score % 3 === 0) {
                    multiplier = Math.min(multiplier + 1, 5);
                    playMultiplierUp();
                } else {
                    playScore();
                }

                score += multiplier;

                if (score > highScore) {
                    highScore = score;
                    localStorage.setItem("flappyHighScore", highScore);
                }
            }

            if (p.x < -100) pipes.splice(i, 1);
        });
    } else {
        bird.y = (canvas.height / 2) + Math.sin(frame * 0.07) * 10;
    }

    if (bird.y + bird.h > canvas.height || bird.y < 0) {
        if (!isGameOver) {
            isGameOver = true;
            screenShake = 12;
            playCrash();
        }
    }
}

function drawBackground() {
    // Gradient sky — transitions to night
    let grad;
    if (nightMode) {
        grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, "#0a0a2e");
        grad.addColorStop(1, "#1a1a4e");
    } else {
        grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, "#4facfe");
        grad.addColorStop(1, "#00f2fe");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars (night only)
    if (nightMode) {
        stars.forEach(s => {
            const alpha = 0.5 + 0.5 * Math.sin(s.twinkle);
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

function draw() {
    // Screen shake offset
    const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
    const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawBackground();

    // Clouds
    ctx.fillStyle = nightMode ? "rgba(100,100,160,0.25)" : "rgba(255,255,255,0.45)";
    clouds.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 30, 0, Math.PI * 2);
        ctx.arc(c.x + 35, c.y - 15, 40, 0, Math.PI * 2);
        ctx.arc(c.x + 70, c.y, 30, 0, Math.PI * 2);
        ctx.fill();
    });

    // Pipes
    pipes.forEach(p => {
        const pipeColor1 = nightMode ? "#1a3a4a" : "#2e7d32";
        const pipeColor2 = nightMode ? "#2a6a8a" : "#81c784";
        const pipeStroke = nightMode ? "#0a2030" : "#1b5e20";

        let grad = ctx.createLinearGradient(p.x, 0, p.x + 60, 0);
        grad.addColorStop(0, pipeColor1);
        grad.addColorStop(1, pipeColor2);
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, 0, 60, p.top);
        ctx.fillRect(p.x, p.bottom, 60, canvas.height);
        ctx.strokeStyle = pipeStroke;
        ctx.lineWidth = 3;
        ctx.strokeRect(p.x, 0, 60, p.top);
        ctx.strokeRect(p.x, p.bottom, 60, canvas.height);

        // Pipe cap
        ctx.fillStyle = grad;
        ctx.fillRect(p.x - 5, p.top - 18, 70, 18);
        ctx.fillRect(p.x - 5, p.bottom, 70, 18);
        ctx.strokeRect(p.x - 5, p.top - 18, 70, 18);
        ctx.strokeRect(p.x - 5, p.bottom, 70, 18);
    });

    // Particles
    particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = `rgba(255,220,80,${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * alpha, 0, Math.PI * 2);
        ctx.fill();
    });

    // Bird
    ctx.save();
    ctx.translate(bird.x + bird.w / 2, bird.y + bird.h / 2);
    let rotation = bird.gameStarted ? Math.min(Math.PI / 4, Math.max(-Math.PI / 4, bird.velocity * 0.09)) : 0;
    ctx.rotate(rotation);
    if (birdImg.complete && birdImg.naturalWidth > 0) {
        ctx.drawImage(birdImg, -bird.w / 2, -bird.h / 2, bird.w, bird.h);
    } else {
        ctx.fillStyle = "gold";
        ctx.beginPath();
        ctx.ellipse(0, 0, bird.w / 2, bird.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // HUD
    ctx.fillStyle = "white";
    ctx.font = "bold 30px 'Courier New'";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 6;
    ctx.fillText(`SCORE: ${score}`, 30, 50);
    ctx.font = "18px 'Courier New'";
    ctx.fillText(`BEST: ${highScore}`, 30, 78);
    ctx.shadowBlur = 0;

    // Multiplier badge
    if (multiplier > 1) {
        ctx.save();
        const badgeX = 30;
        const badgeY = 90;
        ctx.fillStyle = `rgba(255,${200 - multiplier * 30},0,0.85)`;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, 110, 32, 8);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 16px 'Courier New'";
        ctx.shadowBlur = 0;
        ctx.fillText(`x${multiplier} MULTIPLIER`, badgeX + 8, badgeY + 22);
        ctx.restore();
    }

    // Night mode indicator
    if (nightMode) {
        ctx.save();
        ctx.fillStyle = "rgba(100,150,255,0.7)";
        ctx.beginPath();
        ctx.roundRect(canvas.width - 130, 20, 110, 28, 8);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 13px 'Courier New'";
        ctx.fillText("🌙 NIGHT MODE", canvas.width - 122, 39);
        ctx.restore();
    }

    // Speed indicator
    if (bird.gameStarted && pipeSpeed > 4.5) {
        ctx.save();
        const spd = Math.round((pipeSpeed - 3.5) / 3.5 * 100);
        ctx.fillStyle = `rgba(255,80,80,0.75)`;
        ctx.beginPath();
        ctx.roundRect(canvas.width - 130, nightMode ? 56 : 20, 110, 28, 8);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 13px 'Courier New'";
        ctx.fillText(`⚡ SPEED +${spd}%`, canvas.width - 122, (nightMode ? 56 : 20) + 19);
        ctx.restore();
    }

    if (!bird.gameStarted && !isGameOver) {
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "bold 24px 'Courier New'";
        ctx.shadowBlur = 6;
        ctx.shadowColor = "black";
        ctx.fillText("PRESS SPACE OR TAP TO FLY", canvas.width / 2, canvas.height / 2 + 70);
        ctx.shadowBlur = 0;
        ctx.textAlign = "left";
    }

    if (isGameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.72)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "bold 52px 'Courier New'";
        ctx.shadowColor = "red";
        ctx.shadowBlur = 20;
        ctx.fillText("CRASHED!", canvas.width / 2, canvas.height / 2 - 30);
        ctx.shadowBlur = 0;
        ctx.font = "22px 'Courier New'";
        ctx.fillText(`Score: ${score}   Best: ${highScore}`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.font = "18px 'Courier New'";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText("SPACE or TAP to try again", canvas.width / 2, canvas.height / 2 + 55);
        ctx.textAlign = "left";
    }

    ctx.restore(); // end screen shake
}

function loop() {
    update();
    draw();
    frame++;
    if (!isGameOver) requestAnimationFrame(loop);
}

resize();
// Try loading image; fall back gracefully if missing
birdImg.onload = loop;
birdImg.onerror = loop;