const W = 360, H = 480;
const REST_Y = 112, BOTTOM_Y = 440, WATER_Y = 120, LAKE_BOTTOM = 420;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;

let best = 0;
try { best = Number(localStorage.getItem('tadWalleyeBest')) || 0; } catch (e) { best = 0; }

let state = 'ready', score = 0, timeLeft = 60000, hookX = 180, hookY = REST_Y, mode = 'idle';
let fish = [], bag = [], popups = [], spawnTimer = 0, overAt = 0, newBest = false;
let lastTime = performance.now();

function reset() {
  score = 0; timeLeft = 60000; hookX = 180; hookY = REST_Y; mode = 'idle';
  fish = []; bag = []; popups = []; spawnTimer = 0; newBest = false; state = 'playing';
}

function spawn() {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const roll = Math.random();
  let f;
  if (roll < 0.6) f = { emoji: '🐟', value: 1 };
  else if (roll < 0.85) f = { emoji: '🐠', value: 3 };
  else f = { emoji: '🥾', value: -1 };
  f.x = dir > 0 ? -20 : W + 20;
  f.y = 150 + Math.random() * 250;
  f.vx = dir * (0.5 + Math.random());
  fish.push(f);
}

function toGameX(e) {
  const r = canvas.getBoundingClientRect();
  return (e.clientX - r.left) * W / r.width;
}

function clampX(x) {
  return Math.max(20, Math.min(W - 20, x));
}

canvas.addEventListener('pointermove', e => {
  hookX = clampX(toGameX(e));
});

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  hookX = clampX(toGameX(e));
  if (state === 'ready') reset();
  else if (state === 'playing') { if (mode === 'idle') mode = 'down'; }
  else if (performance.now() - overAt > 800) reset();
});

function endGame() {
  state = 'over';
  overAt = performance.now();
  if (score > best) {
    best = score;
    newBest = true;
    try { localStorage.setItem('tadWalleyeBest', String(best)); } catch (e) {}
  }
}

function bankBag() {
  for (const b of bag) {
    score += b.value;
    popups.push({ text: (b.value > 0 ? '+' : '') + b.value, x: hookX, y: REST_Y + 20, life: 700 });
  }
  bag = [];
  if (score < 0) score = 0;
}

function update(dt) {
  for (const p of popups) p.life -= dt;
  popups = popups.filter(p => p.life > 0);
  if (state !== 'playing') return;

  timeLeft -= dt;
  if (timeLeft <= 0) { timeLeft = 0; endGame(); return; }

  spawnTimer += dt;
  if (spawnTimer > 650) { spawnTimer = 0; spawn(); }

  for (const f of fish) f.x += f.vx * dt / 16;
  fish = fish.filter(f => f.x > -40 && f.x < W + 40);

  if (mode === 'down') {
    hookY += 0.25 * dt;
    if (hookY >= BOTTOM_Y) { hookY = BOTTOM_Y; mode = 'up'; }
  } else if (mode === 'up') {
    hookY -= 0.2 * dt;
    if (hookY <= REST_Y) { hookY = REST_Y; mode = 'idle'; bankBag(); }
  }

  if (mode !== 'idle') {
    for (let i = fish.length - 1; i >= 0; i--) {
      const f = fish[i];
      if (Math.abs(f.x - hookX) < 18 && Math.abs(f.y - hookY) < 18) {
        bag.push(f);
        fish.splice(i, 1);
      }
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  const sky = ctx.createLinearGradient(0, 0, 0, WATER_Y);
  sky.addColorStop(0, '#7cc6ee');
  sky.addColorStop(1, '#d7f0ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, WATER_Y);

  const water = ctx.createLinearGradient(0, WATER_Y, 0, LAKE_BOTTOM);
  water.addColorStop(0, '#3a7d9c');
  water.addColorStop(1, '#12374a');
  ctx.fillStyle = water;
  ctx.fillRect(0, WATER_Y, W, LAKE_BOTTOM - WATER_Y);

  ctx.fillStyle = '#5b4530';
  ctx.fillRect(0, LAKE_BOTTOM, W, H - LAKE_BOTTOM);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '40px sans-serif';
  ctx.fillText('🛶', 180, 88);

  ctx.strokeStyle = '#eeeeee';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(180, 92);
  ctx.lineTo(hookX, hookY);
  ctx.stroke();

  ctx.font = '26px sans-serif';
  for (const f of fish) ctx.fillText(f.emoji, f.x, f.y);

  ctx.font = '22px sans-serif';
  ctx.fillText('🪝', hookX, hookY);

  ctx.font = '18px sans-serif';
  bag.slice(0, 4).forEach((b, i) => ctx.fillText(b.emoji, hookX, hookY + 18 + i * 14));

  ctx.font = 'bold 20px sans-serif';
  for (const p of popups) {
    ctx.fillStyle = p.text.startsWith('-') ? '#ff8a80' : '#ffeb3b';
    ctx.fillText(p.text, p.x, p.y - (700 - p.life) / 30);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Score: ${score}`, 10, 8);
  ctx.fillText(`Best: ${best}`, 10, 28);
  ctx.textAlign = 'right';
  ctx.fillText(`Time: ${Math.ceil(timeLeft / 1000)}`, W - 10, 8);

  if (state !== 'playing') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(30, 160, W - 60, 170);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    if (state === 'ready') {
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(`Tad's Walleye Shack`, 180, 190);
      ctx.font = '16px sans-serif';
      ctx.fillText('Tap to drop the line', 180, 225);
      ctx.fillText('Walleye 1 pt. Pike 3 pts.', 180, 250);
      ctx.fillText(`Old boot: minus one. Do not tell Darlene.`, 180, 272);
    } else {
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(`TIME'S UP`, 180, 190);
      ctx.font = '18px sans-serif';
      ctx.fillText(`You bagged ${score} pts`, 180, 225);
      if (newBest) ctx.fillText('New best. Boasting rights.', 180, 252);
      ctx.font = '16px sans-serif';
      ctx.fillText('Tap to go again', 180, 290);
    }
  }
}

function loop(now) {
  const dt = Math.min(50, now - lastTime);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
