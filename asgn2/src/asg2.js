// CSE 160 Assignment 2 - Blocky Horse
// Kingston Cheung

// ============================================================================
// Global Variables
// ============================================================================

// WebGL context and canvas
var gl;
var canvas;

// Shader attribute and uniform locations
var a_Position;
var u_FragColor;
var u_ModelMatrix;
var u_GlobalRotation;

// Global rotation angles (camera)
var g_globalAngleX = 0;
var g_globalAngleY = 0;

// Mouse rotation
var g_mouseDown = false;
var g_lastMouseX = 0;
var g_lastMouseY = 0;

// Animation state
var g_animationOn = false;
var g_startTime = performance.now() / 1000.0;
var g_seconds = 0;

// Poke animation state
var g_pokeAnimation = false;
var g_pokeStartTime = 0;

// Joint angles - Front Left Leg (3-level joint)
var g_frontLeftUpperAngle = 0;
var g_frontLeftLowerAngle = 0;
var g_frontLeftHoofAngle = 0;

// Joint angles - Front Right Leg
var g_frontRightUpperAngle = 0;
var g_frontRightLowerAngle = 0;

// Joint angles - Back Left Leg
var g_backLeftUpperAngle = 0;
var g_backLeftLowerAngle = 0;

// Joint angles - Back Right Leg
var g_backRightUpperAngle = 0;
var g_backRightLowerAngle = 0;

// Joint angles - Head and Tail
var g_headAngle = 0;
var g_tailAngle = 0;

// Performance tracking
var g_frameCount = 0;
var g_lastFPSUpdate = 0;
var g_fps = 0;
var g_triangleCount = 0;

// Colors for the horse
const HORSE_BODY_COLOR = [0.55, 0.35, 0.2, 1.0];      // Brown
const HORSE_DARK_COLOR = [0.4, 0.25, 0.15, 1.0];      // Dark brown
const HORSE_MANE_COLOR = [0.2, 0.1, 0.05, 1.0];       // Near black
const HORSE_HOOF_COLOR = [0.15, 0.1, 0.05, 1.0];      // Dark hooves
const HORSE_EYE_COLOR = [0.05, 0.05, 0.05, 1.0];      // Black eyes
const HORSE_NOSE_COLOR = [0.3, 0.2, 0.15, 1.0];       // Nose color

// ============================================================================
// Main Function
// ============================================================================

function main() {
    setupWebGL();
    connectVariablesToGLSL();
    setupUI();
    
    // Initialize cube and cylinder buffers
    Cube.initBuffer(gl);
    Cylinder.initBuffer(gl, 12);
    Cone.initBuffer(gl, 8);
    
    // Start animation loop
    requestAnimationFrame(tick);
}

// ============================================================================
// WebGL Setup
// ============================================================================

function setupWebGL() {
    canvas = document.getElementById('webgl');
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }
    
    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    
    // Enable depth testing for 3D
    gl.enable(gl.DEPTH_TEST);
    
    // Set clear color to sky blue
    gl.clearColor(0.53, 0.81, 0.92, 1.0);
}

function connectVariablesToGLSL() {
    // Compile shaders
    var vertexShader = compileShader(gl.VERTEX_SHADER, 'vertex-shader');
    var fragmentShader = compileShader(gl.FRAGMENT_SHADER, 'fragment-shader');
    
    if (!vertexShader || !fragmentShader) {
        console.log('Failed to compile shaders');
        return;
    }
    
    // Create and link program
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.log('Failed to link program: ' + gl.getProgramInfoLog(program));
        return;
    }
    
    gl.useProgram(program);
    
    // Get attribute and uniform locations
    a_Position = gl.getAttribLocation(program, 'a_Position');
    u_FragColor = gl.getUniformLocation(program, 'u_FragColor');
    u_ModelMatrix = gl.getUniformLocation(program, 'u_ModelMatrix');
    u_GlobalRotation = gl.getUniformLocation(program, 'u_GlobalRotation');
    
    if (a_Position < 0 || !u_FragColor || !u_ModelMatrix || !u_GlobalRotation) {
        console.log('Failed to get shader variable locations');
        return;
    }
}

function compileShader(type, sourceId) {
    var source = document.getElementById(sourceId).text;
    var shader = gl.createShader(type);
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log('Shader compile error: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

// ============================================================================
// UI Setup
// ============================================================================

function setupUI() {
    // Animation button
    document.getElementById('btn-animate').onclick = function() {
        g_animationOn = !g_animationOn;
        this.textContent = g_animationOn ? 'Stop Animation' : 'Start Animation';
        this.classList.toggle('active', g_animationOn);
    };
    
    // Reset button
    document.getElementById('btn-reset').onclick = function() {
        resetPose();
    };
    
    // Camera rotation sliders
    setupSlider('slider-camX', 'val-camX', function(val) {
        g_globalAngleX = val;
    });
    setupSlider('slider-camY', 'val-camY', function(val) {
        g_globalAngleY = val;
    });
    
    // Front Left Leg (3-level joint)
    setupSlider('slider-fl-upper', 'val-fl-upper', function(val) {
        g_frontLeftUpperAngle = val;
    });
    setupSlider('slider-fl-lower', 'val-fl-lower', function(val) {
        g_frontLeftLowerAngle = val;
    });
    setupSlider('slider-fl-hoof', 'val-fl-hoof', function(val) {
        g_frontLeftHoofAngle = val;
    });
    
    // Front Right Leg
    setupSlider('slider-fr-upper', 'val-fr-upper', function(val) {
        g_frontRightUpperAngle = val;
    });
    setupSlider('slider-fr-lower', 'val-fr-lower', function(val) {
        g_frontRightLowerAngle = val;
    });
    
    // Back Left Leg
    setupSlider('slider-bl-upper', 'val-bl-upper', function(val) {
        g_backLeftUpperAngle = val;
    });
    setupSlider('slider-bl-lower', 'val-bl-lower', function(val) {
        g_backLeftLowerAngle = val;
    });
    
    // Back Right Leg
    setupSlider('slider-br-upper', 'val-br-upper', function(val) {
        g_backRightUpperAngle = val;
    });
    setupSlider('slider-br-lower', 'val-br-lower', function(val) {
        g_backRightLowerAngle = val;
    });
    
    // Head and Tail
    setupSlider('slider-head', 'val-head', function(val) {
        g_headAngle = val;
    });
    setupSlider('slider-tail', 'val-tail', function(val) {
        g_tailAngle = val;
    });
    
    // Mouse rotation controls
    canvas.onmousedown = function(ev) {
        // Check for shift-click (poke animation)
        if (ev.shiftKey) {
            startPokeAnimation();
            return;
        }
        g_mouseDown = true;
        g_lastMouseX = ev.clientX;
        g_lastMouseY = ev.clientY;
    };
    
    canvas.onmouseup = function(ev) {
        g_mouseDown = false;
    };
    
    canvas.onmouseleave = function(ev) {
        g_mouseDown = false;
    };
    
    canvas.onmousemove = function(ev) {
        if (g_mouseDown) {
            var dx = ev.clientX - g_lastMouseX;
            var dy = ev.clientY - g_lastMouseY;
            
            g_globalAngleY += dx * 0.5;
            g_globalAngleX += dy * 0.5;
            
            // Clamp X rotation
            g_globalAngleX = Math.max(-90, Math.min(90, g_globalAngleX));
            
            // Update slider displays
            document.getElementById('slider-camX').value = g_globalAngleX;
            document.getElementById('slider-camY').value = g_globalAngleY;
            document.getElementById('val-camX').textContent = Math.round(g_globalAngleX);
            document.getElementById('val-camY').textContent = Math.round(g_globalAngleY);
            
            g_lastMouseX = ev.clientX;
            g_lastMouseY = ev.clientY;
        }
    };
}

function setupSlider(sliderId, valueId, callback) {
    var slider = document.getElementById(sliderId);
    var valueDisplay = document.getElementById(valueId);
    
    slider.oninput = function() {
        var val = parseFloat(this.value);
        valueDisplay.textContent = val;
        callback(val);
    };
}

function resetPose() {
    // Reset all joint angles
    g_frontLeftUpperAngle = 0;
    g_frontLeftLowerAngle = 0;
    g_frontLeftHoofAngle = 0;
    g_frontRightUpperAngle = 0;
    g_frontRightLowerAngle = 0;
    g_backLeftUpperAngle = 0;
    g_backLeftLowerAngle = 0;
    g_backRightUpperAngle = 0;
    g_backRightLowerAngle = 0;
    g_headAngle = 0;
    g_tailAngle = 0;
    
    // Reset sliders
    var sliders = [
        'slider-fl-upper', 'slider-fl-lower', 'slider-fl-hoof',
        'slider-fr-upper', 'slider-fr-lower',
        'slider-bl-upper', 'slider-bl-lower',
        'slider-br-upper', 'slider-br-lower',
        'slider-head', 'slider-tail'
    ];
    var values = [
        'val-fl-upper', 'val-fl-lower', 'val-fl-hoof',
        'val-fr-upper', 'val-fr-lower',
        'val-bl-upper', 'val-bl-lower',
        'val-br-upper', 'val-br-lower',
        'val-head', 'val-tail'
    ];
    
    for (var i = 0; i < sliders.length; i++) {
        document.getElementById(sliders[i]).value = 0;
        document.getElementById(values[i]).textContent = 0;
    }
}

// ============================================================================
// Animation
// ============================================================================

function tick() {
    var startTime = performance.now();
    
    // Update time
    g_seconds = performance.now() / 1000.0 - g_startTime;
    
    // Update animation
    if (g_animationOn) {
        updateAnimationAngles();
    }
    
    // Update poke animation
    if (g_pokeAnimation) {
        updatePokeAnimation();
    }
    
    // Render scene
    renderScene();
    
    // Update performance display
    updatePerformance(startTime);
    
    // Request next frame
    requestAnimationFrame(tick);
}

function updateAnimationAngles() {
    // Walking animation - legs move in opposite pairs
    var walkSpeed = 3.0;
    var legSwing = 25;
    var kneeSwing = 20;
    
    // Front legs (opposite to back legs on same side)
    g_frontLeftUpperAngle = legSwing * Math.sin(g_seconds * walkSpeed);
    g_frontLeftLowerAngle = -kneeSwing * Math.abs(Math.sin(g_seconds * walkSpeed));
    g_frontLeftHoofAngle = 10 * Math.sin(g_seconds * walkSpeed + 0.5);
    
    g_frontRightUpperAngle = legSwing * Math.sin(g_seconds * walkSpeed + Math.PI);
    g_frontRightLowerAngle = -kneeSwing * Math.abs(Math.sin(g_seconds * walkSpeed + Math.PI));
    
    // Back legs (opposite to front legs on same side)
    g_backLeftUpperAngle = legSwing * Math.sin(g_seconds * walkSpeed + Math.PI);
    g_backLeftLowerAngle = -kneeSwing * Math.abs(Math.sin(g_seconds * walkSpeed + Math.PI));
    
    g_backRightUpperAngle = legSwing * Math.sin(g_seconds * walkSpeed);
    g_backRightLowerAngle = -kneeSwing * Math.abs(Math.sin(g_seconds * walkSpeed));
    
    // Head bob
    g_headAngle = 5 * Math.sin(g_seconds * walkSpeed * 2);
    
    // Tail sway
    g_tailAngle = 15 * Math.sin(g_seconds * 2);
}

function startPokeAnimation() {
    g_pokeAnimation = true;
    g_pokeStartTime = g_seconds;
}

function updatePokeAnimation() {
    var pokeTime = g_seconds - g_pokeStartTime;
    var pokeDuration = 1.5; // seconds
    
    if (pokeTime > pokeDuration) {
        g_pokeAnimation = false;
        return;
    }
    
    // Rear up animation (like a startled horse)
    var t = pokeTime / pokeDuration;
    var rearAngle = Math.sin(t * Math.PI) * 30;
    
    // Front legs go up
    g_frontLeftUpperAngle = -rearAngle * 1.5;
    g_frontLeftLowerAngle = -rearAngle;
    g_frontLeftHoofAngle = -rearAngle * 0.5;
    g_frontRightUpperAngle = -rearAngle * 1.5;
    g_frontRightLowerAngle = -rearAngle;
    
    // Back legs brace
    g_backLeftUpperAngle = rearAngle * 0.3;
    g_backLeftLowerAngle = rearAngle * 0.5;
    g_backRightUpperAngle = rearAngle * 0.3;
    g_backRightLowerAngle = rearAngle * 0.5;
    
    // Head goes up
    g_headAngle = -rearAngle;
    
    // Tail goes up
    g_tailAngle = rearAngle;
}

function updatePerformance(startTime) {
    g_frameCount++;
    
    var now = performance.now();
    var elapsed = now - g_lastFPSUpdate;
    
    if (elapsed >= 1000) {
        g_fps = Math.round(g_frameCount * 1000 / elapsed);
        g_frameCount = 0;
        g_lastFPSUpdate = now;
        
        document.getElementById('fps').textContent = g_fps;
    }
    
    var ms = (now - startTime).toFixed(1);
    document.getElementById('ms').textContent = ms;
    document.getElementById('triangles').textContent = g_triangleCount;
}

// ============================================================================
// Render Scene
// ============================================================================

function renderScene() {
    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Set global rotation matrix
    var globalRotMat = new Matrix4();
    globalRotMat.rotate(g_globalAngleX, 1, 0, 0);
    globalRotMat.rotate(g_globalAngleY, 0, 1, 0);
    gl.uniformMatrix4fv(u_GlobalRotation, false, globalRotMat.elements);
    
    // Reset triangle count
    g_triangleCount = 0;
    
    // Draw the horse
    drawHorse();
    
    // Draw ground plane
    drawGround();
}

function drawGround() {
    var M = new Matrix4();
    M.translate(-0.5, -0.5, -0.5);
    M.scale(1.0, 0.02, 1.0);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, M, [0.3, 0.5, 0.2, 1.0]);
}

function drawHorse() {
    // Horse is centered at origin, scaled to fit in view
    
    // ========================================
    // BODY - Main torso
    // ========================================
    var bodyMatrix = new Matrix4();
    bodyMatrix.translate(-0.25, -0.05, -0.1);
    bodyMatrix.scale(0.5, 0.22, 0.2);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, bodyMatrix, HORSE_BODY_COLOR);
    
    // Chest/shoulder area (front of body, slightly wider)
    var chestMatrix = new Matrix4();
    chestMatrix.translate(0.15, -0.03, -0.11);
    chestMatrix.scale(0.12, 0.18, 0.22);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, chestMatrix, HORSE_BODY_COLOR);
    
    // Hindquarters (back of body, slightly wider)
    var hindMatrix = new Matrix4();
    hindMatrix.translate(-0.27, -0.02, -0.11);
    hindMatrix.scale(0.1, 0.17, 0.22);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, hindMatrix, HORSE_BODY_COLOR);
    
    // ========================================
    // NECK
    // ========================================
    var neckMatrix = new Matrix4();
    neckMatrix.translate(0.18, 0.1, -0.04);
    neckMatrix.rotate(-35, 0, 0, 1);  // Negative angle to point toward head
    neckMatrix.scale(0.1, 0.25, 0.08);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, neckMatrix, HORSE_BODY_COLOR);
    
    // Neck underside (slightly different shade)
    var neckUnderMatrix = new Matrix4();
    neckUnderMatrix.translate(0.2, 0.08, -0.03);
    neckUnderMatrix.rotate(-35, 0, 0, 1);
    neckUnderMatrix.scale(0.08, 0.2, 0.06);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, neckUnderMatrix, HORSE_DARK_COLOR);
    
    // Mane on neck (flowing down the back of neck)
    for (var i = 0; i < 6; i++) {
        var maneMatrix = new Matrix4();
        maneMatrix.translate(0.22 + i * 0.022, 0.14 + i * 0.032, -0.05);
        maneMatrix.rotate(-30 - i * 3, 0, 0, 1);
        maneMatrix.scale(0.025, 0.06, 0.1);
        g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, maneMatrix, HORSE_MANE_COLOR);
    }
    
    // ========================================
    // HEAD
    // ========================================
    var headBaseMatrix = new Matrix4();
    headBaseMatrix.translate(0.32, 0.32, -0.05);
    headBaseMatrix.rotate(g_headAngle, 0, 0, 1);
    
    // Head main block (upper part)
    var headMatrix = new Matrix4(headBaseMatrix);
    headMatrix.scale(0.15, 0.1, 0.1);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, headMatrix, HORSE_BODY_COLOR);
    
    // Lower jaw / face
    var faceMatrix = new Matrix4(headBaseMatrix);
    faceMatrix.translate(0.08, -0.06, 0.01);
    faceMatrix.scale(0.14, 0.08, 0.08);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, faceMatrix, HORSE_BODY_COLOR);
    
    // Muzzle/snout (elongated cube for horse-like nose)
    var muzzleMatrix = new Matrix4(headBaseMatrix);
    muzzleMatrix.translate(0.18, -0.08, 0.015);
    muzzleMatrix.scale(0.1, 0.06, 0.07);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, muzzleMatrix, HORSE_DARK_COLOR);
    
    // Nose tip (cylinder for rounded look)
    var noseTipMatrix = new Matrix4(headBaseMatrix);
    noseTipMatrix.translate(0.28, -0.08, 0.025);
    noseTipMatrix.rotate(90, 0, 1, 0);
    noseTipMatrix.scale(0.05, 0.05, 0.04);
    g_triangleCount += drawCylinder(gl, a_Position, u_FragColor, u_ModelMatrix, noseTipMatrix, HORSE_DARK_COLOR, 8);
    
    // Nostrils
    var nostrilMatrix1 = new Matrix4(headBaseMatrix);
    nostrilMatrix1.translate(0.28, -0.07, 0.02);
    nostrilMatrix1.scale(0.012, 0.015, 0.012);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, nostrilMatrix1, HORSE_MANE_COLOR);
    
    var nostrilMatrix2 = new Matrix4(headBaseMatrix);
    nostrilMatrix2.translate(0.28, -0.07, 0.065);
    nostrilMatrix2.scale(0.012, 0.015, 0.012);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, nostrilMatrix2, HORSE_MANE_COLOR);
    
    // Eyes (on sides of head like a real horse)
    var eyeMatrix1 = new Matrix4(headBaseMatrix);
    eyeMatrix1.translate(0.1, 0.04, -0.01);
    eyeMatrix1.scale(0.025, 0.03, 0.015);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, eyeMatrix1, HORSE_EYE_COLOR);
    
    var eyeMatrix2 = new Matrix4(headBaseMatrix);
    eyeMatrix2.translate(0.1, 0.04, 0.095);
    eyeMatrix2.scale(0.025, 0.03, 0.015);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, eyeMatrix2, HORSE_EYE_COLOR);
    
    // Ears (cones - non-cube primitive, angled outward)
    var earMatrix1 = new Matrix4(headBaseMatrix);
    earMatrix1.translate(0.04, 0.1, -0.01);
    earMatrix1.rotate(-15, 1, 0, 0);
    earMatrix1.scale(0.025, 0.07, 0.025);
    g_triangleCount += drawCone(gl, a_Position, u_FragColor, u_ModelMatrix, earMatrix1, HORSE_BODY_COLOR, 6);
    
    var earMatrix2 = new Matrix4(headBaseMatrix);
    earMatrix2.translate(0.04, 0.1, 0.09);
    earMatrix2.rotate(15, 1, 0, 0);
    earMatrix2.scale(0.025, 0.07, 0.025);
    g_triangleCount += drawCone(gl, a_Position, u_FragColor, u_ModelMatrix, earMatrix2, HORSE_BODY_COLOR, 6);
    
    // Forelock (hair between ears)
    var forelockMatrix = new Matrix4(headBaseMatrix);
    forelockMatrix.translate(0.02, 0.08, 0.02);
    forelockMatrix.scale(0.04, 0.06, 0.06);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, forelockMatrix, HORSE_MANE_COLOR);
    
    // ========================================
    // TAIL (cylinder - non-cube primitive)
    // ========================================
    var tailBaseMatrix = new Matrix4();
    tailBaseMatrix.translate(-0.25, 0.12, 0.0);
    tailBaseMatrix.rotate(g_tailAngle, 0, 0, 1);  // Side-to-side wag
    tailBaseMatrix.rotate(135, 0, 0, 1);  // Point backward and down
    
    // Main tail
    var tailMatrix = new Matrix4(tailBaseMatrix);
    tailMatrix.scale(0.04, 0.2, 0.04);
    g_triangleCount += drawCylinder(gl, a_Position, u_FragColor, u_ModelMatrix, tailMatrix, HORSE_MANE_COLOR, 8);
    
    // Tail tuft at the end
    var tuftMatrix = new Matrix4(tailBaseMatrix);
    tuftMatrix.translate(-0.03, 0.18, -0.03);
    tuftMatrix.scale(0.06, 0.12, 0.06);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, tuftMatrix, HORSE_MANE_COLOR);
    
    // Extra tail hair strands
    var tuftMatrix2 = new Matrix4(tailBaseMatrix);
    tuftMatrix2.translate(-0.02, 0.25, -0.02);
    tuftMatrix2.scale(0.04, 0.08, 0.04);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, tuftMatrix2, HORSE_MANE_COLOR);
    
    // ========================================
    // FRONT LEFT LEG (3-level joint chain)
    // ========================================
    drawLeg(0.18, -0.05, 0.07, g_frontLeftUpperAngle, g_frontLeftLowerAngle, g_frontLeftHoofAngle);
    
    // ========================================
    // FRONT RIGHT LEG
    // ========================================
    drawLeg(0.18, -0.05, -0.07, g_frontRightUpperAngle, g_frontRightLowerAngle, 0);
    
    // ========================================
    // BACK LEFT LEG
    // ========================================
    drawLeg(-0.22, -0.05, 0.07, g_backLeftUpperAngle, g_backLeftLowerAngle, 0);
    
    // ========================================
    // BACK RIGHT LEG
    // ========================================
    drawLeg(-0.22, -0.05, -0.07, g_backRightUpperAngle, g_backRightLowerAngle, 0);
}

function drawLeg(x, y, z, upperAngle, lowerAngle, hoofAngle) {
    // Upper leg (thigh) - muscular part
    var upperLegBase = new Matrix4();
    upperLegBase.translate(x, y, z);
    upperLegBase.rotate(upperAngle, 0, 0, 1);
    
    var upperLegMatrix = new Matrix4(upperLegBase);
    upperLegMatrix.translate(-0.03, -0.13, -0.03);
    upperLegMatrix.scale(0.06, 0.13, 0.06);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, upperLegMatrix, HORSE_BODY_COLOR);
    
    // Lower leg / cannon bone (thinner)
    var lowerLegBase = new Matrix4(upperLegBase);
    lowerLegBase.translate(0, -0.13, 0);
    lowerLegBase.rotate(lowerAngle, 0, 0, 1);
    
    var lowerLegMatrix = new Matrix4(lowerLegBase);
    lowerLegMatrix.translate(-0.018, -0.13, -0.018);
    lowerLegMatrix.scale(0.036, 0.13, 0.036);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, lowerLegMatrix, HORSE_BODY_COLOR);
    
    // Fetlock joint area (slight bulge)
    var fetlockMatrix = new Matrix4(lowerLegBase);
    fetlockMatrix.translate(-0.022, -0.12, -0.022);
    fetlockMatrix.scale(0.044, 0.03, 0.044);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, fetlockMatrix, HORSE_DARK_COLOR);
    
    // Hoof (connected to lower leg) - 3rd level joint
    var hoofBase = new Matrix4(lowerLegBase);
    hoofBase.translate(0, -0.13, 0);
    hoofBase.rotate(hoofAngle, 0, 0, 1);
    
    var hoofMatrix = new Matrix4(hoofBase);
    hoofMatrix.translate(-0.025, -0.045, -0.025);
    hoofMatrix.scale(0.05, 0.045, 0.05);
    g_triangleCount += drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, hoofMatrix, HORSE_HOOF_COLOR);
}

// ============================================================================
// Start Application
// ============================================================================

main();
