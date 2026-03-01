"use strict";

const VSHADER_SOURCE = `
attribute vec3 a_Position;
attribute vec3 a_Normal;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjMatrix;
uniform mat4 u_NormalMatrix;

varying vec3 v_WorldPos;
varying vec3 v_Normal;

void main() {
  vec4 worldPos = u_ModelMatrix * vec4(a_Position, 1.0);
  v_WorldPos = worldPos.xyz;
  v_Normal = normalize((u_NormalMatrix * vec4(a_Normal, 0.0)).xyz);
  gl_Position = u_ProjMatrix * u_ViewMatrix * worldPos;
}
`;

const FSHADER_SOURCE = `
precision mediump float;

varying vec3 v_WorldPos;
varying vec3 v_Normal;

uniform vec3 u_BaseColor;
uniform vec3 u_CameraPos;

uniform float u_ShowNormals;
uniform float u_UseLighting;

uniform float u_PointLightOn;
uniform vec3 u_PointLightPos;
uniform vec3 u_PointLightColor;

uniform float u_SpotLightOn;
uniform vec3 u_SpotLightPos;
uniform vec3 u_SpotLightDir;
uniform vec3 u_SpotLightColor;
uniform float u_SpotCutoffCos;

uniform vec3 u_SpecularColor;
uniform float u_Shininess;

vec3 phongLight(
  vec3 N,
  vec3 V,
  vec3 fragPos,
  vec3 lightPos,
  vec3 lightColor
) {
  vec3 toLight = lightPos - fragPos;
  float dist = length(toLight);
  vec3 L = normalize(toLight);

  float ndotl = max(dot(N, L), 0.0);
  vec3 R = reflect(-L, N);
  float spec = 0.0;
  if (ndotl > 0.0) {
    spec = pow(max(dot(V, R), 0.0), u_Shininess);
  }

  float attenuation = 1.0 / (1.0 + 0.09 * dist + 0.032 * dist * dist);
  vec3 diffuse = ndotl * u_BaseColor * lightColor;
  vec3 specular = spec * u_SpecularColor * lightColor;
  return (diffuse + specular) * attenuation;
}

void main() {
  vec3 N = normalize(v_Normal);

  if (u_ShowNormals > 0.5) {
    gl_FragColor = vec4(N * 0.5 + 0.5, 1.0);
    return;
  }

  if (u_UseLighting < 0.5) {
    gl_FragColor = vec4(u_BaseColor, 1.0);
    return;
  }

  vec3 V = normalize(u_CameraPos - v_WorldPos);
  vec3 color = 0.18 * u_BaseColor; // ambient

  if (u_PointLightOn > 0.5) {
    color += phongLight(N, V, v_WorldPos, u_PointLightPos, u_PointLightColor);
  }

  if (u_SpotLightOn > 0.5) {
    vec3 lightToFrag = normalize(v_WorldPos - u_SpotLightPos);
    float theta = dot(lightToFrag, normalize(u_SpotLightDir));
    float cone = smoothstep(u_SpotCutoffCos, min(1.0, u_SpotCutoffCos + 0.08), theta);
    vec3 spotContrib = phongLight(N, V, v_WorldPos, u_SpotLightPos, u_SpotLightColor);
    color += cone * spotContrib;
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

const FALLBACK_OBJ = `
# Simple icosahedron fallback OBJ
v -0.5257 0.8506 0.0000
v 0.5257 0.8506 0.0000
v -0.5257 -0.8506 0.0000
v 0.5257 -0.8506 0.0000
v 0.0000 -0.5257 0.8506
v 0.0000 0.5257 0.8506
v 0.0000 -0.5257 -0.8506
v 0.0000 0.5257 -0.8506
v 0.8506 0.0000 -0.5257
v 0.8506 0.0000 0.5257
v -0.8506 0.0000 -0.5257
v -0.8506 0.0000 0.5257
f 1 2 6
f 1 6 12
f 1 12 11
f 1 11 8
f 1 8 2
f 2 8 9
f 2 9 10
f 2 10 6
f 6 10 5
f 6 5 12
f 12 5 3
f 12 3 11
f 11 3 7
f 11 7 8
f 8 7 9
f 4 10 9
f 4 9 7
f 4 7 3
f 4 3 5
f 4 5 10
`;

const state = {
  showNormals: false,
  useLighting: true,
  pointLightOn: true,
  spotLightOn: true,
  animatePointLight: true,
  animateHorse: true,
  pointLightManual: [2.0, 2.5, 2.0],
  pointLightColor: [1.0, 1.0, 1.0],
  spotCutoffDeg: 20.0,
  cameraYawDeg: 35.0,
  cameraPitchDeg: 18.0,
  cameraDist: 11.0,
  objMesh: null,
  lastTime: 0
};

const app = {
  gl: null,
  canvas: null,
  program: null,
  loc: {},
  meshes: {}
};

const HORSE_COLORS = {
  body: [0.55, 0.35, 0.2],
  dark: [0.4, 0.25, 0.15],
  mane: [0.2, 0.1, 0.05],
  hoof: [0.15, 0.1, 0.05],
  eye: [0.05, 0.05, 0.05]
};

function main() {
  app.canvas = document.getElementById("glcanvas");
  app.gl = app.canvas.getContext("webgl");
  if (!app.gl) {
    alert("WebGL is not available in this browser.");
    return;
  }

  const gl = app.gl;
  app.program = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);
  gl.useProgram(app.program);

  app.loc = {
    a_Position: gl.getAttribLocation(app.program, "a_Position"),
    a_Normal: gl.getAttribLocation(app.program, "a_Normal"),
    u_ModelMatrix: gl.getUniformLocation(app.program, "u_ModelMatrix"),
    u_ViewMatrix: gl.getUniformLocation(app.program, "u_ViewMatrix"),
    u_ProjMatrix: gl.getUniformLocation(app.program, "u_ProjMatrix"),
    u_NormalMatrix: gl.getUniformLocation(app.program, "u_NormalMatrix"),
    u_BaseColor: gl.getUniformLocation(app.program, "u_BaseColor"),
    u_CameraPos: gl.getUniformLocation(app.program, "u_CameraPos"),
    u_ShowNormals: gl.getUniformLocation(app.program, "u_ShowNormals"),
    u_UseLighting: gl.getUniformLocation(app.program, "u_UseLighting"),
    u_PointLightOn: gl.getUniformLocation(app.program, "u_PointLightOn"),
    u_PointLightPos: gl.getUniformLocation(app.program, "u_PointLightPos"),
    u_PointLightColor: gl.getUniformLocation(app.program, "u_PointLightColor"),
    u_SpotLightOn: gl.getUniformLocation(app.program, "u_SpotLightOn"),
    u_SpotLightPos: gl.getUniformLocation(app.program, "u_SpotLightPos"),
    u_SpotLightDir: gl.getUniformLocation(app.program, "u_SpotLightDir"),
    u_SpotLightColor: gl.getUniformLocation(app.program, "u_SpotLightColor"),
    u_SpotCutoffCos: gl.getUniformLocation(app.program, "u_SpotCutoffCos"),
    u_SpecularColor: gl.getUniformLocation(app.program, "u_SpecularColor"),
    u_Shininess: gl.getUniformLocation(app.program, "u_Shininess")
  };

  app.meshes.cube = createMesh(gl, createCubeData());
  app.meshes.sphere = createMesh(gl, createSphereData(28, 18));
  app.meshes.cylinder = createMesh(gl, createCylinderData(16));
  app.meshes.cone = createMesh(gl, createConeData(12));

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.03, 0.03, 0.04, 1.0);

  initUI();
  initKeyboard();
  loadObjModel();

  requestAnimationFrame(tick);
}

function initUI() {
  const $ = (id) => document.getElementById(id);

  bindToggleButton($("toggleLighting"), () => (state.useLighting = !state.useLighting), () => state.useLighting, "Lighting");
  bindToggleButton($("toggleNormals"), () => (state.showNormals = !state.showNormals), () => state.showNormals, "Show Normals");
  bindToggleButton($("togglePoint"), () => (state.pointLightOn = !state.pointLightOn), () => state.pointLightOn, "Point Light");
  bindToggleButton($("toggleSpot"), () => (state.spotLightOn = !state.spotLightOn), () => state.spotLightOn, "Spot Light");
  bindToggleButton($("toggleAnimate"), () => (state.animatePointLight = !state.animatePointLight), () => state.animatePointLight, "Animate Point Light");
  bindToggleButton($("toggleHorse"), () => (state.animateHorse = !state.animateHorse), () => state.animateHorse, "Animate Horse");

  bindSlider("lightX", (v) => (state.pointLightManual[0] = v));
  bindSlider("lightY", (v) => (state.pointLightManual[1] = v));
  bindSlider("lightZ", (v) => (state.pointLightManual[2] = v));

  bindSlider("lightR", (v) => (state.pointLightColor[0] = v));
  bindSlider("lightG", (v) => (state.pointLightColor[1] = v));
  bindSlider("lightB", (v) => (state.pointLightColor[2] = v));

  bindSlider("spotCutoff", (v) => (state.spotCutoffDeg = v));
  bindSlider("camYaw", (v) => (state.cameraYawDeg = v));
  bindSlider("camPitch", (v) => (state.cameraPitchDeg = v));
  bindSlider("camDist", (v) => (state.cameraDist = v));
}

function bindToggleButton(button, onToggle, getter, label) {
  if (!button) return;
  const sync = () => {
    const on = getter();
    button.textContent = `${label}: ${on ? "ON" : "OFF"}`;
    button.classList.toggle("active", on);
  };
  button.addEventListener("click", () => {
    onToggle();
    sync();
  });
  sync();
}

function bindSlider(id, onChange) {
  const slider = document.getElementById(id);
  if (!slider) return;
  onChange(Number(slider.value));
  slider.addEventListener("input", () => onChange(Number(slider.value)));
}

function initKeyboard() {
  window.addEventListener("keydown", (e) => {
    const step = 3.0;
    if (e.key === "ArrowLeft") state.cameraYawDeg -= step;
    if (e.key === "ArrowRight") state.cameraYawDeg += step;
    if (e.key === "ArrowUp") state.cameraPitchDeg += step;
    if (e.key === "ArrowDown") state.cameraPitchDeg -= step;
    if (e.key.toLowerCase() === "q") state.cameraDist = Math.max(4, state.cameraDist - 0.4);
    if (e.key.toLowerCase() === "e") state.cameraDist = Math.min(20, state.cameraDist + 0.4);

    const yawSlider = document.getElementById("camYaw");
    const pitchSlider = document.getElementById("camPitch");
    const distSlider = document.getElementById("camDist");
    if (yawSlider) yawSlider.value = String(state.cameraYawDeg);
    if (pitchSlider) pitchSlider.value = String(state.cameraPitchDeg);
    if (distSlider) distSlider.value = String(state.cameraDist);
  });
}

async function loadObjModel() {
  const gl = app.gl;
  if (!gl) return;

  let objText = FALLBACK_OBJ;
  try {
    const resp = await fetch("./models/icosahedron.obj");
    if (resp.ok) {
      objText = await resp.text();
    }
  } catch (err) {
    console.warn("Using fallback embedded OBJ data.", err);
  }

  const objData = parseOBJ(objText);
  app.meshes.obj = createMesh(gl, objData);
  state.objMesh = app.meshes.obj;
}

function tick(now) {
  const dt = now - state.lastTime;
  state.lastTime = now;
  render(now, dt);
  requestAnimationFrame(tick);
}

function render(nowMs) {
  const gl = app.gl;
  const loc = app.loc;
  resizeCanvasToDisplaySize(app.canvas);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(app.program);

  const aspect = gl.canvas.width / gl.canvas.height;
  const proj = mat4Create();
  mat4Perspective(proj, degToRad(55), aspect, 0.1, 100.0);

  const yaw = degToRad(state.cameraYawDeg);
  const pitch = degToRad(state.cameraPitchDeg);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const dist = state.cameraDist;

  const eye = [dist * cp * sy, dist * sp + 2.0, dist * cp * cy];
  const target = [0.0, 0.6, 0.0];
  const up = [0.0, 1.0, 0.0];

  const view = mat4Create();
  mat4LookAt(view, eye, target, up);

  gl.uniformMatrix4fv(loc.u_ViewMatrix, false, view);
  gl.uniformMatrix4fv(loc.u_ProjMatrix, false, proj);
  gl.uniform3fv(loc.u_CameraPos, new Float32Array(eye));

  const t = nowMs * 0.001;
  let pointPos;
  if (state.animatePointLight) {
    const orbitR = 2.6;
    pointPos = [
      state.pointLightManual[0] + Math.cos(t) * orbitR,
      state.pointLightManual[1] + Math.sin(t * 1.3) * 0.7,
      state.pointLightManual[2] + Math.sin(t) * orbitR
    ];
  } else {
    pointPos = [...state.pointLightManual];
  }

  const spotPos = [0.0, 4.2, 0.0];
  const spotDir = [0.0, -1.0, 0.0];

  gl.uniform1f(loc.u_ShowNormals, state.showNormals ? 1.0 : 0.0);
  gl.uniform1f(loc.u_UseLighting, state.useLighting ? 1.0 : 0.0);
  gl.uniform1f(loc.u_PointLightOn, state.pointLightOn ? 1.0 : 0.0);
  gl.uniform3fv(loc.u_PointLightPos, new Float32Array(pointPos));
  gl.uniform3fv(loc.u_PointLightColor, new Float32Array(state.pointLightColor));
  gl.uniform1f(loc.u_SpotLightOn, state.spotLightOn ? 1.0 : 0.0);
  gl.uniform3fv(loc.u_SpotLightPos, new Float32Array(spotPos));
  gl.uniform3fv(loc.u_SpotLightDir, new Float32Array(spotDir));
  gl.uniform3fv(loc.u_SpotLightColor, new Float32Array([0.70, 0.82, 1.0]));
  gl.uniform1f(loc.u_SpotCutoffCos, Math.cos(degToRad(state.spotCutoffDeg)));
  gl.uniform3fv(loc.u_SpecularColor, new Float32Array([1.0, 1.0, 1.0]));
  gl.uniform1f(loc.u_Shininess, 30.0);

  // Ground
  drawObject(app.meshes.cube, [0.22, 0.34, 0.24], modelTRS([0, -1.4, 0], [0, 0, 0], [9, 0.2, 9]));
  // Walls
  drawObject(app.meshes.cube, [0.30, 0.28, 0.35], modelTRS([0, 1.0, -4.5], [0, 0, 0], [9, 2.8, 0.2]));
  drawObject(app.meshes.cube, [0.25, 0.26, 0.37], modelTRS([-4.5, 1.0, 0], [0, 0, 0], [0.2, 2.8, 9]));

  // Assignment objects
  drawObject(app.meshes.cube, [0.82, 0.36, 0.36], modelTRS([-1.2, 0.0, 0.1], [0, t * 1.2, 0], [1.0, 1.0, 1.0]));
  drawObject(app.meshes.sphere, [0.28, 0.56, 0.85], modelTRS([2.0, 0.2, 1.0], [0, 0, 0], [0.95, 0.95, 0.95]));
  drawObject(app.meshes.sphere, [0.90, 0.86, 0.36], modelTRS([0.0, 1.3, -1.4], [0, 0, 0], [0.65, 0.65, 0.65]));
  drawHorse(t);

  if (state.objMesh) {
    drawObject(state.objMesh, [0.86, 0.64, 0.28], modelTRS([1.5, -0.2, -2.2], [0, -t * 0.7, 0], [1.2, 1.2, 1.2]));
  }

  // Visual marker for light position
  const prevUseLighting = state.useLighting;
  gl.uniform1f(loc.u_UseLighting, 0.0);
  drawObject(app.meshes.cube, state.pointLightColor, modelTRS(pointPos, [0, 0, 0], [0.18, 0.18, 0.18]));
  gl.uniform1f(loc.u_UseLighting, prevUseLighting ? 1.0 : 0.0);
}

function drawObject(mesh, color, modelMatrix) {
  if (!mesh) return;
  const gl = app.gl;
  const loc = app.loc;

  const normalMatrix = mat4Create();
  if (!mat4Invert(normalMatrix, modelMatrix)) {
    mat4Identity(normalMatrix);
  }
  mat4Transpose(normalMatrix, normalMatrix);

  gl.uniform3fv(loc.u_BaseColor, new Float32Array(color));
  gl.uniformMatrix4fv(loc.u_ModelMatrix, false, modelMatrix);
  gl.uniformMatrix4fv(loc.u_NormalMatrix, false, normalMatrix);

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positionBuffer);
  gl.vertexAttribPointer(loc.a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(loc.a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
  gl.vertexAttribPointer(loc.a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(loc.a_Normal);

  gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
}

function createMesh(gl, data) {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.positions), gl.STATIC_DRAW);

  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.normals), gl.STATIC_DRAW);

  return {
    positionBuffer,
    normalBuffer,
    vertexCount: data.positions.length / 3
  };
}

function createCubeData() {
  const positions = [
    // Front
    -1, -1, 1, 1, -1, 1, 1, 1, 1,
    -1, -1, 1, 1, 1, 1, -1, 1, 1,
    // Back
    1, -1, -1, -1, -1, -1, -1, 1, -1,
    1, -1, -1, -1, 1, -1, 1, 1, -1,
    // Left
    -1, -1, -1, -1, -1, 1, -1, 1, 1,
    -1, -1, -1, -1, 1, 1, -1, 1, -1,
    // Right
    1, -1, 1, 1, -1, -1, 1, 1, -1,
    1, -1, 1, 1, 1, -1, 1, 1, 1,
    // Top
    -1, 1, 1, 1, 1, 1, 1, 1, -1,
    -1, 1, 1, 1, 1, -1, -1, 1, -1,
    // Bottom
    -1, -1, -1, 1, -1, -1, 1, -1, 1,
    -1, -1, -1, 1, -1, 1, -1, -1, 1
  ];

  const normals = [
    // Front
    0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, 0, 1, 0, 0, 1, 0, 0, 1,
    // Back
    0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 0, -1, 0, 0, -1, 0, 0, -1,
    // Left
    -1, 0, 0, -1, 0, 0, -1, 0, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0,
    // Right
    1, 0, 0, 1, 0, 0, 1, 0, 0,
    1, 0, 0, 1, 0, 0, 1, 0, 0,
    // Top
    0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, 1, 0, 0, 1, 0, 0, 1, 0,
    // Bottom
    0, -1, 0, 0, -1, 0, 0, -1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0
  ];

  return { positions, normals };
}

function createSphereData(segments, rings) {
  const positions = [];
  const normals = [];

  for (let y = 0; y < rings; y++) {
    const v0 = y / rings;
    const v1 = (y + 1) / rings;
    const theta0 = v0 * Math.PI;
    const theta1 = v1 * Math.PI;

    for (let x = 0; x < segments; x++) {
      const u0 = x / segments;
      const u1 = (x + 1) / segments;
      const phi0 = u0 * Math.PI * 2.0;
      const phi1 = u1 * Math.PI * 2.0;

      const p00 = spherePoint(theta0, phi0);
      const p10 = spherePoint(theta1, phi0);
      const p11 = spherePoint(theta1, phi1);
      const p01 = spherePoint(theta0, phi1);

      // tri 1
      positions.push(...p00, ...p10, ...p11);
      normals.push(...p00, ...p10, ...p11);
      // tri 2
      positions.push(...p00, ...p11, ...p01);
      normals.push(...p00, ...p11, ...p01);
    }
  }

  return { positions, normals };
}

function createCylinderData(segments) {
  const positions = [];
  const step = (Math.PI * 2.0) / segments;

  for (let i = 0; i < segments; i++) {
    const a0 = i * step;
    const a1 = (i + 1) * step;

    const x0 = Math.cos(a0) * 0.5;
    const z0 = Math.sin(a0) * 0.5;
    const x1 = Math.cos(a1) * 0.5;
    const z1 = Math.sin(a1) * 0.5;

    // Side quad (2 tris)
    positions.push(x0, 0, z0, x1, 0, z1, x0, 1, z0);
    positions.push(x1, 0, z1, x1, 1, z1, x0, 1, z0);
    // Top cap
    positions.push(0, 1, 0, x0, 1, z0, x1, 1, z1);
    // Bottom cap
    positions.push(0, 0, 0, x1, 0, z1, x0, 0, z0);
  }

  return { positions, normals: generateFlatNormals(positions) };
}

function createConeData(segments) {
  const positions = [];
  const step = (Math.PI * 2.0) / segments;

  for (let i = 0; i < segments; i++) {
    const a0 = i * step;
    const a1 = (i + 1) * step;

    const x0 = Math.cos(a0) * 0.5;
    const z0 = Math.sin(a0) * 0.5;
    const x1 = Math.cos(a1) * 0.5;
    const z1 = Math.sin(a1) * 0.5;

    // Side triangle
    positions.push(x0, 0, z0, x1, 0, z1, 0, 1, 0);
    // Bottom cap
    positions.push(0, 0, 0, x1, 0, z1, x0, 0, z0);
  }

  return { positions, normals: generateFlatNormals(positions) };
}

function spherePoint(theta, phi) {
  const x = Math.sin(theta) * Math.cos(phi);
  const y = Math.cos(theta);
  const z = Math.sin(theta) * Math.sin(phi);
  return [x, y, z];
}

function parseOBJ(text) {
  const positionsTemp = [];
  const normalsTemp = [];
  const outPos = [];
  const outNorm = [];
  let hasAnyFaceNormal = false;

  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    const type = parts[0];

    if (type === "v") {
      positionsTemp.push([Number(parts[1]), Number(parts[2]), Number(parts[3])]);
    } else if (type === "vn") {
      normalsTemp.push([Number(parts[1]), Number(parts[2]), Number(parts[3])]);
    } else if (type === "f") {
      const face = parts.slice(1);
      for (let i = 1; i + 1 < face.length; i++) {
        const tri = [face[0], face[i], face[i + 1]];
        for (const token of tri) {
          const refs = token.split("/");
          const vi = parseOBJIndex(refs[0], positionsTemp.length);
          const ni = refs.length >= 3 && refs[2] ? parseOBJIndex(refs[2], normalsTemp.length) : -1;

          const p = positionsTemp[vi] || [0, 0, 0];
          outPos.push(p[0], p[1], p[2]);

          if (ni >= 0 && normalsTemp[ni]) {
            const n = normalsTemp[ni];
            outNorm.push(n[0], n[1], n[2]);
            hasAnyFaceNormal = true;
          } else {
            outNorm.push(0, 0, 0);
          }
        }
      }
    }
  }

  if (!hasAnyFaceNormal) {
    const generated = generateFlatNormals(outPos);
    return { positions: outPos, normals: generated };
  }

  // Fill missing normals if the file had a mix of present/missing normal refs.
  for (let i = 0; i < outNorm.length; i += 3) {
    const nx = outNorm[i];
    const ny = outNorm[i + 1];
    const nz = outNorm[i + 2];
    if (nx === 0 && ny === 0 && nz === 0) {
      const triStart = Math.floor(i / 9) * 9;
      const n = computeTriangleNormal(outPos, triStart);
      outNorm[i] = n[0];
      outNorm[i + 1] = n[1];
      outNorm[i + 2] = n[2];
    }
  }

  return { positions: outPos, normals: outNorm };
}

function parseOBJIndex(rawIndex, length) {
  const idx = Number(rawIndex);
  if (Number.isNaN(idx)) return -1;
  if (idx > 0) return idx - 1;
  if (idx < 0) return length + idx;
  return -1;
}

function generateFlatNormals(positions) {
  const normals = new Array(positions.length).fill(0);
  for (let i = 0; i < positions.length; i += 9) {
    const n = computeTriangleNormal(positions, i);
    normals[i] = n[0];
    normals[i + 1] = n[1];
    normals[i + 2] = n[2];
    normals[i + 3] = n[0];
    normals[i + 4] = n[1];
    normals[i + 5] = n[2];
    normals[i + 6] = n[0];
    normals[i + 7] = n[1];
    normals[i + 8] = n[2];
  }
  return normals;
}

function computeTriangleNormal(positions, triStart) {
  const ax = positions[triStart + 0];
  const ay = positions[triStart + 1];
  const az = positions[triStart + 2];
  const bx = positions[triStart + 3];
  const by = positions[triStart + 4];
  const bz = positions[triStart + 5];
  const cx = positions[triStart + 6];
  const cy = positions[triStart + 7];
  const cz = positions[triStart + 8];

  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const acx = cx - ax;
  const acy = cy - ay;
  const acz = cz - az;

  const nx = aby * acz - abz * acy;
  const ny = abz * acx - abx * acz;
  const nz = abx * acy - aby * acx;
  const len = Math.hypot(nx, ny, nz) || 1.0;
  return [nx / len, ny / len, nz / len];
}

function createProgram(gl, vsrc, fsrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsrc);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const msg = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Failed to link shaders: ${msg}`);
  }
  return program;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const msg = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${msg}`);
  }
  return shader;
}

function resizeCanvasToDisplaySize(canvas) {
  const displayWidth = canvas.clientWidth | 0;
  const displayHeight = canvas.clientHeight | 0;
  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
}

function modelTRS(translate, rotateXYZ, scale) {
  const m = mat4Create();
  mat4Identity(m);
  mat4Translate(m, m, translate);
  mat4RotateX(m, m, rotateXYZ[0] || 0);
  mat4RotateY(m, m, rotateXYZ[1] || 0);
  mat4RotateZ(m, m, rotateXYZ[2] || 0);
  mat4Scale(m, m, scale);
  return m;
}

function mat4Clone(a) {
  return new Float32Array(a);
}

function applyLocalTRS(base, translate, rotateXYZ, scale) {
  const m = mat4Clone(base);
  mat4Translate(m, m, translate);
  mat4RotateX(m, m, rotateXYZ[0] || 0);
  mat4RotateY(m, m, rotateXYZ[1] || 0);
  mat4RotateZ(m, m, rotateXYZ[2] || 0);
  mat4Scale(m, m, scale);
  return m;
}

function drawHorse(t) {
  const walk = state.animateHorse ? Math.sin(t * 3.0) : 0.0;
  const walkOpp = state.animateHorse ? Math.sin(t * 3.0 + Math.PI) : 0.0;
  const headAngle = state.animateHorse ? Math.sin(t * 6.0) * degToRad(5) : 0.0;
  const tailAngle = state.animateHorse ? Math.sin(t * 2.0) * degToRad(15) : 0.0;

  const upperA = degToRad(25) * walk;
  const lowerA = -degToRad(20) * Math.abs(walk);
  const hoofA = degToRad(10) * Math.sin(t * 3.0 + 0.5);
  const upperB = degToRad(25) * walkOpp;
  const lowerB = -degToRad(20) * Math.abs(walkOpp);

  // Horse root transform: same proportions as ASG2, scaled up into ASG4 world.
  const root = modelTRS([-1.7, -0.1, 2.3], [0, degToRad(100), 0], [2.8, 2.8, 2.8]);

  // Body
  drawObject(app.meshes.cube, HORSE_COLORS.body, applyLocalTRS(root, [-0.25, -0.05, -0.1], [0, 0, 0], [0.5, 0.22, 0.2]));
  drawObject(app.meshes.cube, HORSE_COLORS.body, applyLocalTRS(root, [0.15, -0.03, -0.11], [0, 0, 0], [0.12, 0.18, 0.22]));
  drawObject(app.meshes.cube, HORSE_COLORS.body, applyLocalTRS(root, [-0.27, -0.02, -0.11], [0, 0, 0], [0.1, 0.17, 0.22]));

  // Neck
  drawObject(app.meshes.cube, HORSE_COLORS.body, applyLocalTRS(root, [0.18, 0.1, -0.04], [0, 0, degToRad(-35)], [0.1, 0.25, 0.08]));
  drawObject(app.meshes.cube, HORSE_COLORS.dark, applyLocalTRS(root, [0.2, 0.08, -0.03], [0, 0, degToRad(-35)], [0.08, 0.2, 0.06]));

  // Mane
  for (let i = 0; i < 6; i++) {
    drawObject(
      app.meshes.cube,
      HORSE_COLORS.mane,
      applyLocalTRS(
        root,
        [0.22 + i * 0.022, 0.14 + i * 0.032, -0.05],
        [0, 0, degToRad(-30 - i * 3)],
        [0.025, 0.06, 0.1]
      )
    );
  }

  // Head hierarchy base
  const headBase = mat4Clone(root);
  mat4Translate(headBase, headBase, [0.32, 0.32, -0.05]);
  mat4RotateZ(headBase, headBase, headAngle);

  drawObject(app.meshes.cube, HORSE_COLORS.body, applyLocalTRS(headBase, [0, 0, 0], [0, 0, 0], [0.15, 0.1, 0.1]));
  drawObject(app.meshes.cube, HORSE_COLORS.body, applyLocalTRS(headBase, [0.08, -0.06, 0.01], [0, 0, 0], [0.14, 0.08, 0.08]));
  drawObject(app.meshes.cube, HORSE_COLORS.dark, applyLocalTRS(headBase, [0.18, -0.08, 0.015], [0, 0, 0], [0.1, 0.06, 0.07]));
  drawObject(app.meshes.cylinder, HORSE_COLORS.dark, applyLocalTRS(headBase, [0.28, -0.08, 0.025], [0, degToRad(90), 0], [0.05, 0.05, 0.04]));
  drawObject(app.meshes.cube, HORSE_COLORS.mane, applyLocalTRS(headBase, [0.28, -0.07, 0.02], [0, 0, 0], [0.012, 0.015, 0.012]));
  drawObject(app.meshes.cube, HORSE_COLORS.mane, applyLocalTRS(headBase, [0.28, -0.07, 0.065], [0, 0, 0], [0.012, 0.015, 0.012]));
  drawObject(app.meshes.cube, HORSE_COLORS.eye, applyLocalTRS(headBase, [0.1, 0.04, -0.01], [0, 0, 0], [0.025, 0.03, 0.015]));
  drawObject(app.meshes.cube, HORSE_COLORS.eye, applyLocalTRS(headBase, [0.1, 0.04, 0.095], [0, 0, 0], [0.025, 0.03, 0.015]));
  drawObject(app.meshes.cone, HORSE_COLORS.body, applyLocalTRS(headBase, [0.04, 0.1, -0.01], [degToRad(-15), 0, 0], [0.025, 0.07, 0.025]));
  drawObject(app.meshes.cone, HORSE_COLORS.body, applyLocalTRS(headBase, [0.04, 0.1, 0.09], [degToRad(15), 0, 0], [0.025, 0.07, 0.025]));
  drawObject(app.meshes.cube, HORSE_COLORS.mane, applyLocalTRS(headBase, [0.02, 0.08, 0.02], [0, 0, 0], [0.04, 0.06, 0.06]));

  // Tail hierarchy base
  const tailBase = mat4Clone(root);
  mat4Translate(tailBase, tailBase, [-0.25, 0.12, 0.0]);
  mat4RotateZ(tailBase, tailBase, tailAngle);
  mat4RotateZ(tailBase, tailBase, degToRad(135));
  drawObject(app.meshes.cylinder, HORSE_COLORS.mane, applyLocalTRS(tailBase, [0, 0, 0], [0, 0, 0], [0.04, 0.2, 0.04]));
  drawObject(app.meshes.cube, HORSE_COLORS.mane, applyLocalTRS(tailBase, [-0.03, 0.18, -0.03], [0, 0, 0], [0.06, 0.12, 0.06]));
  drawObject(app.meshes.cube, HORSE_COLORS.mane, applyLocalTRS(tailBase, [-0.02, 0.25, -0.02], [0, 0, 0], [0.04, 0.08, 0.04]));

  // Legs (ASG2 hierarchy)
  drawHorseLeg(root, [0.18, -0.05, 0.07], upperA, lowerA, hoofA);
  drawHorseLeg(root, [0.18, -0.05, -0.07], upperB, lowerB, 0.0);
  drawHorseLeg(root, [-0.22, -0.05, 0.07], upperB, lowerB, 0.0);
  drawHorseLeg(root, [-0.22, -0.05, -0.07], upperA, lowerA, 0.0);
}

function drawHorseLeg(root, basePos, upperAngle, lowerAngle, hoofAngle) {
  const upperBase = mat4Clone(root);
  mat4Translate(upperBase, upperBase, basePos);
  mat4RotateZ(upperBase, upperBase, upperAngle);
  drawObject(app.meshes.cube, HORSE_COLORS.body, applyLocalTRS(upperBase, [-0.03, -0.13, -0.03], [0, 0, 0], [0.06, 0.13, 0.06]));

  const lowerBase = mat4Clone(upperBase);
  mat4Translate(lowerBase, lowerBase, [0, -0.13, 0]);
  mat4RotateZ(lowerBase, lowerBase, lowerAngle);
  drawObject(app.meshes.cube, HORSE_COLORS.body, applyLocalTRS(lowerBase, [-0.018, -0.13, -0.018], [0, 0, 0], [0.036, 0.13, 0.036]));
  drawObject(app.meshes.cube, HORSE_COLORS.dark, applyLocalTRS(lowerBase, [-0.022, -0.12, -0.022], [0, 0, 0], [0.044, 0.03, 0.044]));

  const hoofBase = mat4Clone(lowerBase);
  mat4Translate(hoofBase, hoofBase, [0, -0.13, 0]);
  mat4RotateZ(hoofBase, hoofBase, hoofAngle);
  drawObject(app.meshes.cube, HORSE_COLORS.hoof, applyLocalTRS(hoofBase, [-0.025, -0.045, -0.025], [0, 0, 0], [0.05, 0.045, 0.05]));
}

function degToRad(d) {
  return (d * Math.PI) / 180.0;
}

// ===== Minimal mat4 utility =====

function mat4Create() {
  const out = new Float32Array(16);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}

function mat4Identity(out) {
  out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
  out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
  out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
  out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
  return out;
}

function mat4Perspective(out, fovy, aspect, near, far) {
  const f = 1.0 / Math.tan(fovy / 2);
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;

  if (far !== null && far !== Infinity) {
    const nf = 1 / (near - far);
    out[10] = (far + near) * nf;
    out[14] = 2 * far * near * nf;
  } else {
    out[10] = -1;
    out[14] = -2 * near;
  }
  return out;
}

function mat4LookAt(out, eye, center, up) {
  let x0;
  let x1;
  let x2;
  let y0;
  let y1;
  let y2;
  let z0;
  let z1;
  let z2;
  let len;

  z0 = eye[0] - center[0];
  z1 = eye[1] - center[1];
  z2 = eye[2] - center[2];
  len = Math.hypot(z0, z1, z2);
  if (len === 0) {
    z2 = 1;
  } else {
    z0 /= len;
    z1 /= len;
    z2 /= len;
  }

  x0 = up[1] * z2 - up[2] * z1;
  x1 = up[2] * z0 - up[0] * z2;
  x2 = up[0] * z1 - up[1] * z0;
  len = Math.hypot(x0, x1, x2);
  if (len === 0) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    x0 /= len;
    x1 /= len;
    x2 /= len;
  }

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;
  len = Math.hypot(y0, y1, y2);
  if (len !== 0) {
    y0 /= len;
    y1 /= len;
    y2 /= len;
  }

  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;
  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;
  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
  out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
  out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
  out[15] = 1;
  return out;
}

function mat4Translate(out, a, v) {
  const x = v[0];
  const y = v[1];
  const z = v[2];
  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  }
  return out;
}

function mat4Scale(out, a, v) {
  const x = v[0];
  const y = v[1];
  const z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}

function mat4RotateX(out, a, rad) {
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  const a10 = a[4];
  const a11 = a[5];
  const a12 = a[6];
  const a13 = a[7];
  const a20 = a[8];
  const a21 = a[9];
  const a22 = a[10];
  const a23 = a[11];

  if (a !== out) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }

  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}

function mat4RotateY(out, a, rad) {
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  const a00 = a[0];
  const a01 = a[1];
  const a02 = a[2];
  const a03 = a[3];
  const a20 = a[8];
  const a21 = a[9];
  const a22 = a[10];
  const a23 = a[11];

  if (a !== out) {
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }

  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}

function mat4RotateZ(out, a, rad) {
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  const a00 = a[0];
  const a01 = a[1];
  const a02 = a[2];
  const a03 = a[3];
  const a10 = a[4];
  const a11 = a[5];
  const a12 = a[6];
  const a13 = a[7];

  if (a !== out) {
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }

  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}

function mat4Invert(out, a) {
  const a00 = a[0];
  const a01 = a[1];
  const a02 = a[2];
  const a03 = a[3];
  const a10 = a[4];
  const a11 = a[5];
  const a12 = a[6];
  const a13 = a[7];
  const a20 = a[8];
  const a21 = a[9];
  const a22 = a[10];
  const a23 = a[11];
  const a30 = a[12];
  const a31 = a[13];
  const a32 = a[14];
  const a33 = a[15];

  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) {
    return null;
  }
  det = 1.0 / det;

  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}

function mat4Transpose(out, a) {
  if (out === a) {
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a12 = a[6];
    const a13 = a[7];
    const a23 = a[11];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a01;
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a02;
    out[9] = a12;
    out[11] = a[14];
    out[12] = a03;
    out[13] = a13;
    out[14] = a23;
  } else {
    out[0] = a[0];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a[1];
    out[5] = a[5];
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a[2];
    out[9] = a[6];
    out[10] = a[10];
    out[11] = a[14];
    out[12] = a[3];
    out[13] = a[7];
    out[14] = a[11];
    out[15] = a[15];
  }
  return out;
}

main();
