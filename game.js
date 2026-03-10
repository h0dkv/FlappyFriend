const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let bird = {
    x: 80,
    y: 200,
    gravity: 0.5,
    lift: -8,
    velocity: 0
};

let pipes = [];
let frame = 0;
let score = 0;

const birdImg = new Image();
birdImg.src = "assets/friend.png";

document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        bird.velocity = bird.lift;
    }
});

function drawBird() {
    ctx.drawImage(birdImg, bird.x, bird.y, 60, 60);
}

function updateBird() {
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;
}

function drawPipes() {
    pipes.forEach(pipe => {
        ctx.fillStyle = "green";
        ctx.fillRect(pipe.x, 0, 50, pipe.top);
        ctx.fillRect(pipe.x, pipe.bottom, 50, canvas.height);
    });
}

function updatePipes() {

    if (frame % 100 === 0) {

        let top = Math.random() * 300;

        pipes.push({
            x: canvas.width,
            top: top,
            bottom: top + 150
        });

        score++;
    }

    pipes.forEach(pipe => {
        pipe.x -= 2;
    });
}

function drawScore() {
    ctx.fillStyle = "black";
    ctx.font = "30px Arial";
    ctx.fillText("Score: " + score, 10, 40);
}

function loop() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updateBird();
    updatePipes();

    drawBird();
    drawPipes();
    drawScore();

    frame++;

    requestAnimationFrame(loop);
}

birdImg.onload = loop;