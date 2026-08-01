
const SPRITE = {
  frameWidth:  32,
  frameHeight: 48,
  numFrames:   4,
  animSpeed:   8,
  scale:       1.2,

  rows: {
    down:  0,
    left:  1,
    right: 2,
    up:    3,
  },

  offsets: {
    down:  { x: 0, y: 0 },
    left:  { x: 0, y: 0 },
    right: { x: 0, y: 0 },
    up:    { x: 0, y: 0 },
  },
};


const COIN = {
  frameWidth:  32,
  frameHeight: 32,
  numFrames:   6,
  animSpeed:   6,
  scale:       1.3,
};


const TILE_SIZE = 50;


const MAZE = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 0, 0, 1, 0, 3, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 3, 1, 1],
  [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 3, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 4, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];


// Mario-world palette: sky-blue paths, brick-red walls, gold exit once unlocked
const TILE_COLORS = {
  0: [92,  148, 252],  // path / sky
  1: [200,  76,  12],  // brick wall
  2: [92,  148, 252],  // spawn floor
  3: [92,  148, 252],  // coin floor
  4: [120, 120, 120],  // flagpole tile (locked)
};

let player = {
  x: 0,
  y: 0,
  speed: 2,


  currentFrame: 0,
  frameTimer:   0,
  direction:    "down",
  isMoving:     false,


  hw: 12, 
  hh: 12, 
};


let coins = [];
let coinsCollected = 0;


let gameWon = false;


let characterSheet;
let coinSheet;
let winScreen;


function preload() {
  characterSheet = loadImage("assets/images/hero_walk.png");
  coinSheet      = loadImage("assets/images/gold_coin.png");
  winScreen      = loadImage("assets/images/mario_winscreen.png");
}


function setup() {
  createCanvas(TILE_SIZE * MAZE[0].length, TILE_SIZE * MAZE.length);
  imageMode(CENTER);


  for (let row = 0; row < MAZE.length; row++) {
    for (let col = 0; col < MAZE[row].length; col++) {
      let tile = MAZE[row][col];


      if (tile === 2) {
        player.x = col * TILE_SIZE + TILE_SIZE / 2;
        player.y = row * TILE_SIZE + TILE_SIZE / 2;
      }


      if (tile === 3) {
      
        coins.push({
          x:          col * TILE_SIZE + TILE_SIZE / 2,
          y:          row * TILE_SIZE + TILE_SIZE / 2,
          frame:      floor(random(COIN.numFrames)),
          frameTimer: 0,
          collected:  false,
        });
      }
    }
  }
}


function draw() {
  background(20);


  drawMaze();
  updateCoins();
  drawCoins();
  handleInput();
  resolveWallCollisions();
  checkCoinCollection();
  checkExit();
  animateSprite();
  drawCharacter();
  drawHUD();


  if (gameWon) {
    drawWinScreen();
  }
}


function drawMaze() {
  rectMode(CORNER);
  noStroke();


  for (let row = 0; row < MAZE.length; row++) {
    for (let col = 0; col < MAZE[row].length; col++) {
      let tile = MAZE[row][col];


      if (tile === 4) {
        if (coinsCollected === coins.length) {
          fill(255, 205, 40); // gold flagpole tile once unlocked
        } else {
          fill(120, 120, 120);
        }
      } else {
        let c = TILE_COLORS[tile];
        fill(c[0], c[1], c[2]);
      }


      rect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      // brick seams on wall tiles for a block-y look
      if (tile === 1) {
        stroke(150, 50, 5);
        strokeWeight(1);
        line(col * TILE_SIZE, row * TILE_SIZE + TILE_SIZE / 2, col * TILE_SIZE + TILE_SIZE, row * TILE_SIZE + TILE_SIZE / 2);
        line(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE, col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);
        noStroke();
      }
    }
  }
}


function updateCoins() {
  for (let i = 0; i < coins.length; i++) {
    if (coins[i].collected) continue; // skip collected coins


    coins[i].frameTimer++;
    if (coins[i].frameTimer >= COIN.animSpeed) {
      coins[i].frameTimer = 0;
      coins[i].frame = (coins[i].frame + 1) % COIN.numFrames;
    }
  }
}

function drawCoins() {
  for (let i = 0; i < coins.length; i++) {
    if (coins[i].collected) continue; // skip collected coins


    let coin = coins[i];


    let sx = coin.frame * COIN.frameWidth;
    let dw = COIN.frameWidth  * COIN.scale;
    let dh = COIN.frameHeight * COIN.scale;


    image(coinSheet, coin.x, coin.y, dw, dh, sx, 0, COIN.frameWidth, COIN.frameHeight);
  }
}

function handleInput() {
  if (gameWon) return;


  player.isMoving = false;


  if (keyIsDown(87)) { // W — up
    player.y -= player.speed;
    player.direction = "up";
    player.isMoving = true;
  }
  if (keyIsDown(83)) { // S — down
    player.y += player.speed;
    player.direction = "down";
    player.isMoving = true;
  }
  if (keyIsDown(65)) { // A — left
    player.x -= player.speed;
    player.direction = "left";
    player.isMoving = true;
  }
  if (keyIsDown(68)) { // D — right
    player.x += player.speed;
    player.direction = "right";
    player.isMoving = true;
  }
}


function resolveWallCollisions() {
  let corners = [
    { x: player.x - player.hw, y: player.y - player.hh }, // top left
    { x: player.x + player.hw, y: player.y - player.hh }, // top right
    { x: player.x - player.hw, y: player.y + player.hh }, // bottom left
    { x: player.x + player.hw, y: player.y + player.hh }, // bottom right
  ];


  for (let i = 0; i < corners.length; i++) {
    let c = corners[i];


    let col = floor(c.x / TILE_SIZE);
    let row = floor(c.y / TILE_SIZE);


    if (row < 0 || row >= MAZE.length || col < 0 || col >= MAZE[0].length) continue;


    if (MAZE[row][col] === 1) {
      let tileLeft   = col * TILE_SIZE;
      let tileRight  = tileLeft + TILE_SIZE;
      let tileTop    = row * TILE_SIZE;
      let tileBottom = tileTop + TILE_SIZE;


      let overlapLeft   = (player.x + player.hw) - tileLeft;
      let overlapRight  = tileRight  - (player.x - player.hw);
      let overlapTop    = (player.y + player.hh) - tileTop;
      let overlapBottom = tileBottom - (player.y - player.hh);


      let minOverlap = min(overlapLeft, overlapRight, overlapTop, overlapBottom);


      if      (minOverlap === overlapLeft)   player.x -= overlapLeft;
      else if (minOverlap === overlapRight)  player.x += overlapRight;
      else if (minOverlap === overlapTop)    player.y -= overlapTop;
      else if (minOverlap === overlapBottom) player.y += overlapBottom;
    }
  }
}


function checkCoinCollection() {
  for (let i = 0; i < coins.length; i++) {
    if (coins[i].collected) continue;


    let d = dist(player.x, player.y, coins[i].x, coins[i].y);
    if (d < TILE_SIZE * 0.6) {
      coins[i].collected = true;
      coinsCollected++;
    }
  }
}



function checkExit() {
  if (coinsCollected < coins.length) return;


  for (let row = 0; row < MAZE.length; row++) {
    for (let col = 0; col < MAZE[row].length; col++) {
      if (MAZE[row][col] === 4) {
        let exitX = col * TILE_SIZE + TILE_SIZE / 2;
        let exitY = row * TILE_SIZE + TILE_SIZE / 2;
        if (dist(player.x, player.y, exitX, exitY) < TILE_SIZE * 0.6) {
          gameWon = true;
        }
      }
    }
  }
}


function animateSprite() {
  if (player.isMoving) {
    player.frameTimer++;


   
    if (player.frameTimer >= SPRITE.animSpeed) {
      player.frameTimer = 0;
      player.currentFrame = (player.currentFrame + 1) % SPRITE.numFrames;
    }
  } else {
    // Reset to standing frame when not moving
    player.currentFrame = 0;
    player.frameTimer   = 0;
  }
}



function drawCharacter() {
  let row    = SPRITE.rows[player.direction];
  let offset = SPRITE.offsets[player.direction];


  let sx = (player.currentFrame * SPRITE.frameWidth)  + offset.x;
  let sy = (row                 * SPRITE.frameHeight) + offset.y;


  let dw = SPRITE.frameWidth  * SPRITE.scale;
  let dh = SPRITE.frameHeight * SPRITE.scale;


  image(characterSheet, player.x, player.y, dw, dh, sx, sy, SPRITE.frameWidth, SPRITE.frameHeight);
}

function drawHUD() {
  noStroke();
  fill(255, 220, 40);
  textSize(16);
  textAlign(LEFT);
  textFont("monospace");
  text("COINS: " + coinsCollected + " / " + coins.length, 10, 22);


  // Show exit hint once all coins are collected
  if (coinsCollected === coins.length) {
    fill(255, 220, 40);
    text("Flagpole unlocked! Get to it!", 10, 42);
  }
}


function drawWinScreen() {
  rectMode(CORNER);
  image(winScreen, width / 2, height / 2, width, height);

  fill(0, 0, 0, 130);
  rect(0, 0, width, height);

  fill(255, 220, 40);
  textAlign(CENTER);
  textSize(40);
  textFont("monospace");
  text("LEVEL CLEAR!", width / 2, height / 2 - 20);


  textSize(16);
  fill(255);
  text("All coins collected — nice run!", width / 2, height / 2 + 20);
}
