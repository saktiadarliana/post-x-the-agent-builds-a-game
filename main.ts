// Starfall Keeper — the game from one prompt, and the entry program for the make.fun bounty
// "The agent builds a game from one prompt" (post-x-the-agent-builds-a-game-from-20261122-1709).
//
// The one prompt: "Build a tiny browser game: a lighthouse keeper catching falling stars in a
// basket — arrow keys to move, 60 seconds, score for every star caught, storm clouds end a life."
//
// Two ways to run it (Node 22, standard library only, nothing to install):
//
//   node main.ts          Entry mode, the way the make.fun grader runs it: copies POST.json from
//                         the repository root (MAKEFUN_BOT_DIR, default /bot) to the output
//                         directory (MAKEFUN_OUTPUT_DIR, default /output) and prints nothing.
//                         POST.json names the X post that carries the video of this game.
//
//   node main.ts play     Play mode: serves the game at http://localhost:8077 — open it in a
//                         browser and play. Arrow keys (or A/D) move the keeper's basket.
//
// The game page is embedded below as a string, so the whole entry is this one file.

import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'node:http';

const GAME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Starfall Keeper</title>
<style>
  html, body { margin: 0; padding: 0; background: #070b1d; height: 100%; overflow: hidden; }
  body { display: flex; align-items: center; justify-content: center; font-family: Georgia, 'Times New Roman', serif; }
  #wrap { position: relative; width: 960px; height: 540px; max-width: 100vw; max-height: 100vh; }
  canvas { display: block; width: 100%; height: 100%; background: #0a1030; border-radius: 6px; }
</style>
</head>
<body>
<div id="wrap"><canvas id="game" width="960" height="540"></canvas></div>
<script>
'use strict';
// Starfall Keeper: catch falling stars in the keeper's basket. 60 seconds.
// Arrow keys / A,D move. A star caught is +10. A storm cloud that hits the basket costs a life.
var W = 960, H = 540, GROUND = 486;
var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');

var keeper = { x: W / 2, w: 92, h: 20, speed: 460 };
var stars = [], clouds = [], sparks = [];
var keys = {};
var state = {
  mode: 'title', // title | play | over
  score: 0, lives: 3, timeLeft: 60, elapsed: 0,
  starTimer: 0, cloudTimer: 2.2, invuln: 0, flash: 0,
  finalScore: 0, reason: ''
};
var bgStars = [];
for (var i = 0; i < 110; i++) bgStars.push({ x: Math.random() * W, y: Math.random() * 430, r: Math.random() * 1.4 + 0.4, p: Math.random() * 6.28 });

function reset() {
  stars = []; clouds = []; sparks = [];
  keeper.x = W / 2;
  state.score = 0; state.lives = 3; state.timeLeft = 60; state.elapsed = 0;
  state.starTimer = 0; state.cloudTimer = 2.6; state.invuln = 0; state.flash = 0;
}
function startGame() { reset(); state.mode = 'play'; }
function endGame(reason) {
  state.mode = 'over'; state.finalScore = state.score; state.reason = reason;
}

addEventListener('keydown', function (e) {
  keys[e.key] = true;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') e.preventDefault();
  if ((e.key === ' ' || e.key === 'Enter') && state.mode !== 'play') startGame();
});
addEventListener('keyup', function (e) { keys[e.key] = false; });
canvas.addEventListener('pointerdown', function () { if (state.mode !== 'play') startGame(); });

function spawnStar() {
  stars.push({ x: 30 + Math.random() * (W - 60), y: -16, vy: 150 + state.elapsed * 3.2 + Math.random() * 60, r: 11, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 2 });
}
function spawnCloud() {
  clouds.push({ x: 60 + Math.random() * (W - 120), y: -30, vy: 66 + Math.random() * 30, w: 96 + Math.random() * 40, drift: (Math.random() - 0.5) * 24 });
}
function burst(x, y, color) {
  for (var i = 0; i < 10; i++) sparks.push({ x: x, y: y, vx: (Math.random() - 0.5) * 190, vy: -Math.random() * 160 - 30, life: 0.55, color: color });
}

function update(dt) {
  var t = performance.now() / 1000;
  if (state.mode !== 'play') { draw(t); return; }
  state.elapsed += dt;
  state.timeLeft = Math.max(0, 60 - state.elapsed);
  if (state.timeLeft <= 0) { endGame('time'); draw(t); return; }
  if (state.invuln > 0) state.invuln -= dt;
  if (state.flash > 0) state.flash -= dt;

  var dir = 0;
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) dir -= 1;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) dir += 1;
  keeper.x += dir * keeper.speed * dt;
  keeper.x = Math.max(keeper.w / 2, Math.min(W - keeper.w / 2, keeper.x));

  state.starTimer -= dt;
  if (state.starTimer <= 0) { spawnStar(); state.starTimer = 0.42 + Math.random() * 0.3; }
  state.cloudTimer -= dt;
  if (state.cloudTimer <= 0 && state.elapsed > 5) { spawnCloud(); state.cloudTimer = 2.4 + Math.random() * 1.6; }

  var basketTop = GROUND - 34;
  var i, s, c;
  for (i = stars.length - 1; i >= 0; i--) {
    s = stars[i]; s.y += s.vy * dt; s.rot += s.vr * dt;
    if (s.y >= basketTop - 6 && s.y <= basketTop + 26 && Math.abs(s.x - keeper.x) < keeper.w / 2 + 4) {
      state.score += 10; burst(s.x, basketTop, '#ffd94d'); stars.splice(i, 1); continue;
    }
    if (s.y > GROUND + 8) { burst(s.x, GROUND, '#5f74c9'); stars.splice(i, 1); }
  }
  for (i = clouds.length - 1; i >= 0; i--) {
    c = clouds[i]; c.y += c.vy * dt; c.x += c.drift * dt;
    if (c.y + 22 >= basketTop - 8 && c.y <= basketTop + 30 && Math.abs(c.x - keeper.x) < keeper.w / 2 + c.w * 0.32) {
      clouds.splice(i, 1);
      if (state.invuln <= 0) {
        state.lives -= 1; state.invuln = 1.4; state.flash = 0.35; burst(keeper.x, basketTop, '#aab4d8');
        if (state.lives <= 0) { endGame('lives'); draw(t); return; }
      }
      continue;
    }
    if (c.y > GROUND + 26) clouds.splice(i, 1);
  }
  for (i = sparks.length - 1; i >= 0; i--) {
    var p = sparks[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.life -= dt;
    if (p.life <= 0) sparks.splice(i, 1);
  }
  draw(t);
}

function drawStarShape(x, y, r, rot) {
  ctx.beginPath();
  for (var i = 0; i < 10; i++) {
    var rad = i % 2 === 0 ? r : r * 0.45;
    var a = rot + i * Math.PI / 5 - Math.PI / 2;
    var px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
function drawCloudShape(x, y, w) {
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.5, 20, 0, 0, 6.29);
  ctx.ellipse(x - w * 0.28, y + 5, w * 0.3, 15, 0, 0, 6.29);
  ctx.ellipse(x + w * 0.28, y + 5, w * 0.32, 16, 0, 0, 6.29);
  ctx.ellipse(x + w * 0.05, y - 10, w * 0.3, 16, 0, 0, 6.29);
  ctx.fill();
}

function draw(t) {
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a1030'); g.addColorStop(0.75, '#131c4a'); g.addColorStop(1, '#1a2560');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  var i;
  for (i = 0; i < bgStars.length; i++) {
    var b = bgStars[i];
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 1.7 + b.p);
    ctx.fillStyle = '#cdd8ff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.29); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // moon
  ctx.fillStyle = '#f4ecd2'; ctx.beginPath(); ctx.arc(852, 66, 26, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#131c4a'; ctx.beginPath(); ctx.arc(838, 56, 22, 0, 6.29); ctx.fill();
  // lighthouse with a sweeping beam
  var beamA = Math.sin(t * 0.7) * 0.5;
  ctx.save();
  ctx.translate(86, 128); ctx.rotate(beamA);
  var bg2 = ctx.createLinearGradient(0, 0, 300, 0);
  bg2.addColorStop(0, 'rgba(255,236,170,0.35)'); bg2.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.fillStyle = bg2; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(300, -44); ctx.lineTo(300, 44); ctx.lineTo(0, 7); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#20264a'; ctx.fillRect(52, 330, 66, 156);
  ctx.fillStyle = '#e8e4da'; ctx.fillRect(64, 128, 42, 202);
  ctx.fillStyle = '#c33f4e'; ctx.fillRect(64, 168, 42, 26); ctx.fillRect(64, 232, 42, 26); ctx.fillRect(64, 296, 42, 26);
  ctx.fillStyle = '#ffd94d'; ctx.fillRect(70, 108, 30, 22);
  ctx.fillStyle = '#20264a'; ctx.fillRect(62, 100, 46, 9);
  ctx.fillStyle = '#ffeeb0'; ctx.beginPath(); ctx.arc(85, 119, 6, 0, 6.29); ctx.fill();
  // sea and shore
  ctx.fillStyle = '#0d2b4d'; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = 'rgba(160,200,255,0.25)';
  for (i = 0; i < 7; i++) { var wx = (i * 149 + (t * 22) % 149); ctx.fillRect(wx, GROUND + 12 + (i % 3) * 13, 44, 2); }
  ctx.fillStyle = '#2a2140'; ctx.fillRect(0, GROUND - 4, W, 5);
  // falling stars
  for (i = 0; i < stars.length; i++) {
    var s = stars[i];
    ctx.save(); ctx.shadowColor = '#ffd94d'; ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffd94d'; drawStarShape(s.x, s.y, s.r, s.rot); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#fff3c4'; drawStarShape(s.x, s.y, s.r * 0.45, s.rot); ctx.fill();
  }
  // storm clouds
  for (i = 0; i < clouds.length; i++) {
    var c = clouds[i];
    ctx.fillStyle = '#39406b'; drawCloudShape(c.x, c.y, c.w);
    ctx.fillStyle = '#4a5285'; drawCloudShape(c.x, c.y - 5, c.w * 0.8);
    ctx.strokeStyle = 'rgba(200,210,255,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(c.x - 12, c.y + 26); ctx.lineTo(c.x - 18, c.y + 38); ctx.moveTo(c.x + 10, c.y + 26); ctx.lineTo(c.x + 4, c.y + 38); ctx.stroke();
  }
  // sparks
  for (i = 0; i < sparks.length; i++) {
    var p = sparks[i];
    ctx.globalAlpha = Math.max(0, p.life / 0.55); ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
  // the keeper and the basket
  var kx = keeper.x, by = GROUND - 34;
  if (!(state.invuln > 0 && Math.floor(t * 14) % 2 === 0)) {
    ctx.fillStyle = '#f2c894'; ctx.beginPath(); ctx.arc(kx, by - 16, 8, 0, 6.29); ctx.fill(); // head
    ctx.fillStyle = '#e8b13c'; ctx.fillRect(kx - 9, by - 26, 18, 5); // hat brim
    ctx.fillRect(kx - 5, by - 31, 10, 6); // hat top
    ctx.fillStyle = '#28418c'; ctx.fillRect(kx - 7, by - 8, 14, 14); // coat
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(kx - keeper.w / 2, by + 8); ctx.lineTo(kx + keeper.w / 2, by + 8); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(kx - keeper.w / 2, by + 8); ctx.lineTo(kx - keeper.w / 2 + 7, by + 24); ctx.lineTo(kx + keeper.w / 2 - 7, by + 24); ctx.lineTo(kx + keeper.w / 2, by + 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(138,90,43,0.6)'; ctx.lineWidth = 1.5;
    for (i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(kx + i * 12, by + 9); ctx.lineTo(kx + i * 10, by + 23); ctx.stroke(); }
  }
  if (state.flash > 0) { ctx.fillStyle = 'rgba(190,200,255,' + (state.flash * 0.8) + ')'; ctx.fillRect(0, 0, W, H); }
  // HUD
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px Georgia, serif'; ctx.textAlign = 'left';
  ctx.fillText('Score ' + state.score, 18, 36);
  ctx.textAlign = 'center';
  ctx.fillText('Time ' + Math.ceil(state.timeLeft), W / 2, 36);
  ctx.textAlign = 'right'; ctx.fillStyle = '#ff7d92';
  var hearts = ''; for (i = 0; i < state.lives; i++) hearts += '\\u2665 ';
  ctx.fillText(hearts, W - 18, 36);
  ctx.fillStyle = '#ffffff';
  if (state.mode === 'title') {
    ctx.fillStyle = 'rgba(5,8,24,0.72)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 54px Georgia, serif'; ctx.fillText('STARFALL KEEPER', W / 2, 208);
    ctx.fillStyle = '#e8ecff'; ctx.font = '22px Georgia, serif';
    ctx.fillText('Catch the falling stars in your basket.', W / 2, 258);
    ctx.fillText('Arrow keys to move. 60 seconds. A storm cloud costs a life.', W / 2, 292);
    ctx.fillStyle = '#ffd94d'; ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText('Click or press Space to start', W / 2, 356);
  }
  if (state.mode === 'over') {
    ctx.fillStyle = 'rgba(5,8,24,0.72)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 48px Georgia, serif';
    ctx.fillText(state.reason === 'time' ? "TIME'S UP" : 'THE STORM WINS', W / 2, 220);
    ctx.fillStyle = '#e8ecff'; ctx.font = '26px Georgia, serif';
    ctx.fillText('Final score ' + state.finalScore, W / 2, 276);
    ctx.font = '20px Georgia, serif'; ctx.fillText('Press Space to play again', W / 2, 330);
  }
}

var last = performance.now();
function frame(now) {
  var dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// A small handle for scripted play (the bounty video records the real game being played).
window.__starfall = {
  start: startGame,
  state: function () {
    return {
      mode: state.mode, score: state.score, lives: state.lives, timeLeft: state.timeLeft,
      keeperX: keeper.x,
      stars: stars.map(function (s) { return { x: Math.round(s.x), y: Math.round(s.y) }; }),
      clouds: clouds.map(function (c) { return { x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.w) }; })
    };
  }
};
</script>
</body>
</html>`;

if (process.argv[2] === 'play') {
  const port = Number(process.env.PORT ?? 8077);
  const server = createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(GAME_HTML);
    } else {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    }
  });
  server.listen(port, () => {
    console.log(`Starfall Keeper is served at http://localhost:${port} — open it in a browser and play.`);
  });
} else {
  const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
  const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(OUTPUT_DIR, { recursive: true });
  try {
    copyFileSync(join(BOT_DIR, 'POST.json'), join(OUTPUT_DIR, 'POST.json'));
  } catch (err) {
    console.error(`POST.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
    process.exit(1);
  }
}
