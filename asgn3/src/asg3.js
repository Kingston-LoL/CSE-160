let gl;
let canvas;

let a_Position;
let a_UV;
let u_ModelMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_FragColor;
let u_Sampler0;
let u_Sampler1;
let u_Sampler2;
let u_TextureIndex;
let u_texColorWeight;

let g_camera;
let g_keys = {};
let g_world = [];
let g_worldCubes = [];
let g_gateOpened = false;
let g_gameWon = false;
let g_collectCount = 0;
let g_lastFrame = performance.now();
let g_fpsAccumFrames = 0;
let g_fpsAccumTime = 0;
let g_fps = 0;

let g_drawCube = new Cube();
let g_cubeCountDrawn = 0;
const GATE_MIN_X = 14;
const GATE_MAX_X = 17;
const GATE_Z = 0; // true north boundary wall

const WORLD_SIZE = 32;
const MAX_WALL_HEIGHT = 4;
const PLAYER_RADIUS = 0.22;
const PLAYER_EYE_Y = 1.7;

const WORLD_LAYOUT = [
  "44444444444444444444444444444444",
  "40000000000000000000000000000004",
  "40222220000011110000022222000004",
  "40100020000010010000020001000004",
  "40103020000010010000020301000004",
  "40100020000011110000020001000004",
  "40222220000000000000022222000004",
  "40000000001111111110000000000004",
  "40033300001000000010003330000004",
  "40030300001000000010003030000004",
  "40033300001000000010003330000004",
  "40000000001111111110000000000004",
  "40000111100000000001111000000004",
  "40000100100022002201001000000004",
  "40000100100020000201001000000004",
  "40000100100022002201001000000004",
  "40000100100000000001001000000004",
  "40000100111111111111001000000004",
  "40000000000000000000000000000004",
  "40222000002220002220000002222004",
  "40002000002000002000000002000004",
  "40222000002220002220000002222004",
  "40000000000000000000000000000004",
  "40001111110000000000111111000004",
  "40001000010000000000100001000004",
  "40001000011112222111100001000004",
  "40001000010000000000100001000004",
  "40001111110000000000111111000004",
  "40000000000033330000000000000004",
  "40000000000030030000000000000004",
  "40000000000033330000000000000004",
  "44444444444444444444444444444444",
];

const LANTERNS = [
  { x: 5.5, y: 1.1, z: 5.5, collected: false },
  { x: 26.5, y: 1.1, z: 4.5, collected: false },
  { x: 20.5, y: 1.1, z: 18.5, collected: false },
  { x: 8.5, y: 1.1, z: 25.5, collected: false },
  { x: 27.5, y: 1.1, z: 27.5, collected: false },
];

function main() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { antialias: true });
  if (!gl) {
    console.log("WebGL not supported");
    return;
  }

  if (!initShaders()) return;
  connectVariables();

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.09, 0.11, 0.16, 1.0);

  Cube.init(gl);
  buildWorldFromLayout();
  rebuildWorldCubes();

  g_camera = new Camera(canvas.width / canvas.height);
  placeCameraAtSafeSpawn();
  setupTextures();
  setupInput();

  requestAnimationFrame(tick);
}

function initShaders() {
  const vs = compileShader(gl.VERTEX_SHADER, document.getElementById("vertex-shader").text);
  const fs = compileShader(gl.FRAGMENT_SHADER, document.getElementById("fragment-shader").text);
  if (!vs || !fs) return false;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log(gl.getProgramInfoLog(program));
    return false;
  }
  gl.useProgram(program);
  gl.program = program;
  return true;
}

function compileShader(type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function connectVariables() {
  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  a_UV = gl.getAttribLocation(gl.program, "a_UV");
  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  u_Sampler0 = gl.getUniformLocation(gl.program, "u_Sampler0");
  u_Sampler1 = gl.getUniformLocation(gl.program, "u_Sampler1");
  u_Sampler2 = gl.getUniformLocation(gl.program, "u_Sampler2");
  u_TextureIndex = gl.getUniformLocation(gl.program, "u_TextureIndex");
  u_texColorWeight = gl.getUniformLocation(gl.program, "u_texColorWeight");
}

function setupTextures() {
  // Texture 0: Grass checker
  createTexture(0, 64, (x, y) => {
    const c = ((x >> 3) + (y >> 3)) & 1;
    return c ? [66, 133, 53, 255] : [78, 152, 61, 255];
  });
  // Texture 1: Brick wall
  createTexture(1, 64, (x, y) => {
    const mortar = (y % 16 === 0) || ((x + ((y >> 4) % 2) * 8) % 16 === 0);
    if (mortar) return [150, 145, 140, 255];
    const n = ((x * 17 + y * 13) & 7) - 3;
    return [146 + n, 74 + n, 56 + n, 255];
  });
  // Texture 2: Wood planks
  createTexture(2, 64, (x, y) => {
    const seam = (y % 12 === 0) || (y % 12 === 1);
    if (seam) return [92, 66, 38, 255];
    const grain = Math.floor(10 * Math.sin((x + y * 0.4) * 0.2));
    return [131 + grain, 95 + grain, 58 + grain, 255];
  });

  gl.uniform1i(u_Sampler0, 0);
  gl.uniform1i(u_Sampler1, 1);
  gl.uniform1i(u_Sampler2, 2);
}

function createTexture(unit, size, colorFn) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const c = colorFn(x, y);
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = c[3];
    }
  }
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.generateMipmap(gl.TEXTURE_2D);
}

function setupInput() {
  document.addEventListener("keydown", (e) => {
    g_keys[e.key.toLowerCase()] = true;
    if (e.key === " ") g_camera.jump();
    if (e.key.toLowerCase() === "r") editBlockAhead(1);
    if (e.key.toLowerCase() === "f") editBlockAhead(-1);
  });
  document.addEventListener("keyup", (e) => {
    g_keys[e.key.toLowerCase()] = false;
  });

  canvas.addEventListener("click", () => {
    if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
  });

  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === canvas) {
      g_camera.pan(e.movementX * 0.12, -e.movementY * 0.08);
    }
  });

  document.getElementById("resetBtn").onclick = () => {
    resetGameState();
  };
  document.getElementById("playAgainBtn").onclick = () => {
    resetGameState();
  };

  window.addEventListener("resize", onResize);
  onResize();
}

function onResize() {
  const ratio = 16 / 10;
  const w = Math.max(520, Math.min(window.innerWidth - 360, 980));
  const h = Math.round(w / ratio);
  canvas.width = w;
  canvas.height = h;
  gl.viewport(0, 0, canvas.width, canvas.height);
  if (g_camera) g_camera.resize(canvas.width / canvas.height);
}

function buildWorldFromLayout() {
  g_world = [];
  for (let z = 0; z < WORLD_SIZE; z++) {
    const row = WORLD_LAYOUT[z] || "";
    const line = [];
    for (let x = 0; x < WORLD_SIZE; x++) {
      let h = parseInt(row[x] || "0", 10);
      if (Number.isNaN(h)) h = 0;
      if (h < 0) h = 0;
      if (h > MAX_WALL_HEIGHT) h = MAX_WALL_HEIGHT;
      line.push(h);
    }
    g_world.push(line);
  }
}

function findSafeSpawnCell() {
  const candidates = [
    [16, 16],
    [15, 16],
    [16, 15],
    [14, 14],
    [12, 12],
    [6, 6],
    [8, 8],
    [4, 4],
    [3, 3],
    [2, 2],
  ];

  for (const c of candidates) {
    if (isSpawnAreaOpen(c[0], c[1])) return c;
  }

  for (let z = 1; z < WORLD_SIZE - 1; z++) {
    for (let x = 1; x < WORLD_SIZE - 1; x++) {
      if (isSpawnAreaOpen(x, z)) return [x, z];
    }
  }

  return [1, 1];
}

function isCellWalkable(x, z) {
  return g_world[z] && g_world[z][x] === 0;
}

function isSpawnAreaOpen(x, z) {
  // Require center + 8 surrounding cells empty so player does not spawn trapped.
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = x + dx;
      const cz = z + dz;
      if (cx < 1 || cz < 1 || cx >= WORLD_SIZE - 1 || cz >= WORLD_SIZE - 1) return false;
      if (!isCellWalkable(cx, cz)) return false;
    }
  }
  return true;
}

function placeCameraAtSafeSpawn() {
  const spawn = findSafeSpawnCell();
  g_camera.yaw = 45;
  g_camera.pitch = -10;
  g_camera.setPosition(spawn[0] + 0.5, PLAYER_EYE_Y, spawn[1] + 0.5);
  g_camera._updateAtFromYawPitch();
  g_camera.updateViewMatrix();
}

function rebuildWorldCubes() {
  g_worldCubes = [];
  for (let z = 0; z < WORLD_SIZE; z++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      const h = g_world[z][x];
      for (let y = 0; y < h; y++) {
        const m = new Matrix4();
        m.translate(x, y - 0.5, z);
        const textureIndex = y === h - 1 ? 2 : 1;
        g_worldCubes.push({ matrix: m, textureIndex: textureIndex });
      }
    }
  }
}

function tick(now) {
  const dt = Math.min(0.033, (now - g_lastFrame) / 1000);
  g_lastFrame = now;

  if (!g_gameWon) {
    handleMovement(dt);
    g_camera.updateGravity(1.7);
    g_camera.updateViewMatrix();
    updateLanterns();
    checkWinCondition();
  }

  renderScene();
  updateHud(dt);

  requestAnimationFrame(tick);
}

function handleMovement(dt) {
  const s = g_camera.moveSpeed * (dt * 60);
  const forward = g_camera.getForwardXZ();
  const right = Vector3.cross(forward, g_camera.up);
  right.normalize();

  if (g_keys["w"]) attemptMove(forward.elements[0] * s, forward.elements[2] * s);
  if (g_keys["s"]) attemptMove(-forward.elements[0] * s, -forward.elements[2] * s);
  if (g_keys["a"]) attemptMove(-right.elements[0] * s, -right.elements[2] * s);
  if (g_keys["d"]) attemptMove(right.elements[0] * s, right.elements[2] * s);
  if (g_keys["q"]) g_camera.panLeft(g_camera.turnSpeed * (dt * 60));
  if (g_keys["e"]) g_camera.panRight(g_camera.turnSpeed * (dt * 60));
}

function attemptMove(dx, dz) {
  const ex = g_camera.eye.elements[0];
  const ez = g_camera.eye.elements[2];

  // Axis-separated resolution helps sliding along walls naturally.
  const nx = ex + dx;
  if (canOccupy(nx, ez)) {
    g_camera.eye.elements[0] = nx;
    g_camera.at.elements[0] += dx;
  }

  const nz = ez + dz;
  if (canOccupy(g_camera.eye.elements[0], nz)) {
    g_camera.eye.elements[2] = nz;
    g_camera.at.elements[2] += dz;
  }
}

function canOccupy(x, z) {
  const probes = [
    [0, 0],
    [PLAYER_RADIUS, 0],
    [-PLAYER_RADIUS, 0],
    [0, PLAYER_RADIUS],
    [0, -PLAYER_RADIUS],
  ];

  for (const p of probes) {
    const px = x + p[0];
    const pz = z + p[1];
    const cx = Math.floor(px);
    const cz = Math.floor(pz);

    // Outside world bounds counts as blocked.
    if (cx < 0 || cz < 0 || cx >= WORLD_SIZE || cz >= WORLD_SIZE) return false;

    // Any wall stack blocks player movement.
    if (g_world[cz][cx] > 0) return false;
  }

  return true;
}

function editBlockAhead(delta) {
  const f = g_camera.getForwardXZ();
  const tx = Math.floor(g_camera.eye.elements[0] + f.elements[0] * 2.0);
  const tz = Math.floor(g_camera.eye.elements[2] + f.elements[2] * 2.0);
  if (tx < 1 || tx >= WORLD_SIZE - 1 || tz < 1 || tz >= WORLD_SIZE - 1) return;

  const next = g_world[tz][tx] + delta;
  g_world[tz][tx] = Math.max(0, Math.min(MAX_WALL_HEIGHT, next));
  rebuildWorldCubes();
}

function updateLanterns() {
  for (const l of LANTERNS) {
    if (l.collected) continue;
    const dx = g_camera.eye.elements[0] - l.x;
    const dy = g_camera.eye.elements[1] - l.y;
    const dz = g_camera.eye.elements[2] - l.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < 1.2 * 1.2) {
      l.collected = true;
      g_collectCount++;
      if (g_collectCount === LANTERNS.length) openStableGate();
    }
  }
}

function checkWinCondition() {
  if (!g_gateOpened || g_gameWon) return;

  const ex = g_camera.eye.elements[0];
  const ez = g_camera.eye.elements[2];
  const inGateX = ex >= GATE_MIN_X && ex <= (GATE_MAX_X + 1);
  const reachedNorth = ez <= 0.95;

  if (inGateX && reachedNorth) {
    g_gameWon = true;
    showWinScreen();
  }
}

function openStableGate() {
  g_gateOpened = true;
  // Open a clearly visible doorway on the true north boundary.
  for (let x = GATE_MIN_X; x <= GATE_MAX_X; x++) {
    g_world[GATE_Z][x] = 0;     // boundary wall itself
    g_world[1][x] = 0;          // walkway inside
    g_world[2][x] = 0;          // extra clearance so it feels like a gate lane
  }
  rebuildWorldCubes();
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);

  g_cubeCountDrawn = 0;

  drawSky();
  drawGround();
  drawWorldWalls();
  drawLanterns();
  drawGateMarker();
  drawHorse(25.5, 0.0, 26.0, 0.95);
}

function drawCubeWith(matrix, color, textureIndex, texWeight) {
  g_drawCube.matrix = matrix;
  g_drawCube.color = color;
  g_drawCube.textureIndex = textureIndex;
  g_drawCube.texColorWeight = texWeight;
  g_drawCube.render({
    gl,
    a_Position,
    a_UV,
    u_ModelMatrix,
    u_FragColor,
    u_TextureIndex,
    u_texColorWeight,
  });
  g_cubeCountDrawn++;
}

function drawSky() {
  const m = new Matrix4();
  m.translate(-80, -80, -80);
  m.scale(192, 192, 192);
  drawCubeWith(m, [0.48, 0.68, 0.98, 1], 0, 0.0);
}

function drawGround() {
  const m = new Matrix4();
  m.translate(0, -0.55, 0);
  m.scale(WORLD_SIZE, 0.5, WORLD_SIZE);
  drawCubeWith(m, [1, 1, 1, 1], 0, 1.0);
}

function drawWorldWalls() {
  for (const c of g_worldCubes) {
    drawCubeWith(c.matrix, [1, 1, 1, 1], c.textureIndex, 1.0);
  }
}

function drawLanterns() {
  for (const l of LANTERNS) {
    if (l.collected) continue;
    // pole
    const pole = new Matrix4();
    pole.translate(l.x - 0.08, 0.0, l.z - 0.08);
    pole.scale(0.16, 1.0, 0.16);
    drawCubeWith(pole, [1, 1, 1, 1], 2, 1.0);
    // light box
    const glow = new Matrix4();
    glow.translate(l.x - 0.2, 1.0, l.z - 0.2);
    glow.scale(0.4, 0.4, 0.4);
    drawCubeWith(glow, [1.0, 0.85, 0.28, 1], 0, 0.0);
  }
}

function drawGateMarker() {
  // Show gate location even before opening, then switch to "open" visuals after.
  const centerX = (GATE_MIN_X + GATE_MAX_X + 1) * 0.5;
  const z = 1.0;

  // Left pillar
  const p1 = new Matrix4();
  p1.translate(GATE_MIN_X - 0.2, 0.0, z - 0.1);
  p1.scale(0.25, 1.8, 0.25);
  drawCubeWith(p1, [0.65, 0.58, 0.45, 1], 2, 1.0);

  // Right pillar
  const p2 = new Matrix4();
  p2.translate(GATE_MAX_X + 0.95, 0.0, z - 0.1);
  p2.scale(0.25, 1.8, 0.25);
  drawCubeWith(p2, [0.65, 0.58, 0.45, 1], 2, 1.0);

  // Arch beam
  const arch = new Matrix4();
  arch.translate(GATE_MIN_X - 0.2, 1.6, z - 0.1);
  arch.scale((GATE_MAX_X - GATE_MIN_X) + 1.4, 0.2, 0.25);
  drawCubeWith(arch, [0.65, 0.58, 0.45, 1], 2, 1.0);

  if (!g_gateOpened) {
    // Closed gate panel
    const panel = new Matrix4();
    panel.translate(GATE_MIN_X + 0.05, 0.1, z - 0.05);
    panel.scale((GATE_MAX_X - GATE_MIN_X) + 0.9, 1.3, 0.12);
    drawCubeWith(panel, [0.48, 0.31, 0.2, 1], 2, 1.0);

    // Red beacon above closed gate
    const beacon = new Matrix4();
    beacon.translate(centerX - 0.2, 1.95, z - 0.2);
    beacon.scale(0.4, 0.25, 0.4);
    drawCubeWith(beacon, [0.95, 0.25, 0.2, 1], 0, 0.0);
  } else {
    // Green beacon when open
    const beaconOpen = new Matrix4();
    beaconOpen.translate(centerX - 0.2, 1.95, z - 0.2);
    beaconOpen.scale(0.4, 0.25, 0.4);
    drawCubeWith(beaconOpen, [0.2, 0.9, 0.35, 1], 0, 0.0);
  }
}

function drawHorse(x, y, z, s) {
  const brown = [0.56, 0.36, 0.2, 1];
  const dark = [0.22, 0.12, 0.08, 1];
  const hoof = [0.14, 0.08, 0.05, 1];

  const body = new Matrix4();
  body.translate(x, y + 1.0 * s, z);
  body.scale(1.8 * s, 0.8 * s, 0.75 * s);
  drawCubeWith(body, brown, 0, 0.0);

  const neck = new Matrix4();
  neck.translate(x + 1.45 * s, y + 1.35 * s, z + 0.15 * s);
  neck.rotate(-25, 0, 0, 1);
  neck.scale(0.38 * s, 0.9 * s, 0.45 * s);
  drawCubeWith(neck, brown, 0, 0.0);

  const head = new Matrix4();
  head.translate(x + 1.95 * s, y + 1.55 * s, z + 0.12 * s);
  head.scale(0.65 * s, 0.4 * s, 0.5 * s);
  drawCubeWith(head, brown, 0, 0.0);

  const snout = new Matrix4();
  snout.translate(x + 2.50 * s, y + 1.45 * s, z + 0.18 * s);
  snout.scale(0.35 * s, 0.25 * s, 0.36 * s);
  drawCubeWith(snout, dark, 0, 0.0);

  const tail = new Matrix4();
  tail.translate(x - 0.2 * s, y + 1.35 * s, z + 0.28 * s);
  tail.rotate(140, 0, 0, 1);
  tail.scale(0.2 * s, 0.75 * s, 0.2 * s);
  drawCubeWith(tail, dark, 0, 0.0);

  const legs = [
    [x + 0.2 * s, z + 0.1 * s],
    [x + 1.25 * s, z + 0.1 * s],
    [x + 0.2 * s, z + 0.55 * s],
    [x + 1.25 * s, z + 0.55 * s],
  ];

  for (const l of legs) {
    const upper = new Matrix4();
    upper.translate(l[0], y + 0.25 * s, l[1]);
    upper.scale(0.28 * s, 0.9 * s, 0.2 * s);
    drawCubeWith(upper, brown, 0, 0.0);

    const foot = new Matrix4();
    foot.translate(l[0] - 0.02 * s, y + 0.15 * s, l[1] - 0.02 * s);
    foot.scale(0.32 * s, 0.12 * s, 0.24 * s);
    drawCubeWith(foot, hoof, 0, 0.0);
  }
}

function updateHud(dt) {
  g_fpsAccumFrames++;
  g_fpsAccumTime += dt;
  if (g_fpsAccumTime >= 0.5) {
    g_fps = Math.round(g_fpsAccumFrames / g_fpsAccumTime);
    g_fpsAccumFrames = 0;
    g_fpsAccumTime = 0;
  }

  const status = document.getElementById("status");
  const perf = document.getElementById("perf");
  const objective = document.getElementById("objective");
  status.textContent = `Lanterns: ${g_collectCount}/${LANTERNS.length}`;
  perf.textContent = `FPS: ${g_fps} | Cubes: ${g_cubeCountDrawn}`;

  if (g_gameWon) {
    objective.textContent = "Victory! You led the horse through the north gate.";
  } else if (g_gateOpened) {
    objective.textContent = "Gate open at north wall center (x~16, z~0). Lead the horse home!";
  }
}

function showWinScreen() {
  const winScreen = document.getElementById("winScreen");
  const winText = document.getElementById("winText");
  if (!winScreen || !winText) return;
  winText.textContent = `You collected ${g_collectCount} lanterns and reached the north gate.`;
  winScreen.style.display = "flex";
}

function hideWinScreen() {
  const winScreen = document.getElementById("winScreen");
  if (winScreen) winScreen.style.display = "none";
}

function resetGameState() {
  buildWorldFromLayout();
  g_gateOpened = false;
  g_gameWon = false;
  g_collectCount = 0;
  for (const l of LANTERNS) l.collected = false;
  rebuildWorldCubes();
  hideWinScreen();
  g_camera = new Camera(canvas.width / canvas.height);
  placeCameraAtSafeSpawn();
}

main();
