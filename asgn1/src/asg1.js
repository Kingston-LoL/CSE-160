// CSE 160 Assignment 1 - Main WebGL Application
var gl;
var canvas;
var a_Position;
var a_Color;
var u_PointSize;
var u_FragColor;
var shaderProgram;

// Global state
var shapesList = [];
var currentBrushType = 'square'; // 'square', 'triangle', 'circle'
var currentColor = [1.0, 1.0, 1.0, 1.0]; // [r, g, b, a] normalized
var currentSize = 10;
var currentSegments = 20;
var currentRotation = 0; // Rotation angle in degrees
var isDrawing = false;
var lastX = -1;
var lastY = -1;

function main() {
    setupWebGL();
    connectVariablesToGLSL();
    setupUI();
    renderAllShapes();
}

function setupWebGL() {
    // Retrieve <canvas> element
    canvas = document.getElementById('gl-canvas');
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }
    
    // Get the rendering context for WebGL
    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    
    // Set clear color and enable alpha blending for transparency
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

function connectVariablesToGLSL() {
    // Load shaders
    var vertexShader = loadShader(gl.VERTEX_SHADER, 'vertex-shader');
    var fragmentShader = loadShader(gl.FRAGMENT_SHADER, 'fragment-shader');
    
    if (!vertexShader || !fragmentShader) {
        console.log('Failed to load shaders');
        return;
    }
    
    // Create shader program
    shaderProgram = gl.createProgram();
    if (!shaderProgram) {
        console.log('Failed to create shader program');
        return;
    }
    
    // Attach shaders
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    
    // Link program
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log('Failed to link shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return;
    }
    
    // Use program
    gl.useProgram(shaderProgram);
    
    // Get attribute and uniform locations
    a_Position = gl.getAttribLocation(shaderProgram, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }
    
    a_Color = gl.getAttribLocation(shaderProgram, 'a_Color');
    if (a_Color < 0) {
        console.log('Failed to get the storage location of a_Color');
        return;
    }
    
    u_PointSize = gl.getUniformLocation(shaderProgram, 'u_PointSize');
    if (!u_PointSize) {
        console.log('Failed to get the storage location of u_PointSize');
        return;
    }
    
    // Enable vertex attribute arrays
    gl.enableVertexAttribArray(a_Position);
}

function loadShader(type, sourceId) {
    var source = document.getElementById(sourceId).text;
    var shader = gl.createShader(type);
    
    if (shader == null) {
        console.log('Unable to create shader');
        return null;
    }
    
    // Set shader source code
    gl.shaderSource(shader, source);
    
    // Compile shader
    gl.compileShader(shader);
    
    // Check compilation status
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

function setupUI() {
    // Brush type buttons
    document.getElementById('btn-square').onclick = function() {
        setBrushType('square');
    };
    document.getElementById('btn-triangle').onclick = function() {
        setBrushType('triangle');
    };
    document.getElementById('btn-circle').onclick = function() {
        setBrushType('circle');
    };
    
    // Color sliders
    var redSlider = document.getElementById('slider-red');
    var greenSlider = document.getElementById('slider-green');
    var blueSlider = document.getElementById('slider-blue');
    
    redSlider.oninput = function() {
        currentColor[0] = this.value / 100.0;
    };
    greenSlider.oninput = function() {
        currentColor[1] = this.value / 100.0;
    };
    blueSlider.oninput = function() {
        currentColor[2] = this.value / 100.0;
    };
    
    // Rotation slider
    var rotationSlider = document.getElementById('slider-rotation');
    rotationSlider.oninput = function() {
        currentRotation = parseFloat(this.value);
    };
    
    // Size slider
    var sizeSlider = document.getElementById('slider-size');
    sizeSlider.oninput = function() {
        currentSize = parseFloat(this.value);
    };
    
    // Segments slider
    var segmentsSlider = document.getElementById('slider-segments');
    segmentsSlider.oninput = function() {
        currentSegments = parseInt(this.value);
        // Update existing circles if needed
        renderAllShapes();
    };
    
    // Clear button
    document.getElementById('btn-clear').onclick = function() {
        shapesList = [];
        renderAllShapes();
    };
    
    // Draw picture button
    document.getElementById('btn-draw-picture').onclick = function() {
        drawPicture();
    };
    
    // Canvas mouse events
    canvas.onmousedown = function(ev) {
        handleClick(ev);
        isDrawing = true;
    };
    
    canvas.onmousemove = function(ev) {
        if (isDrawing && ev.buttons === 1) {
            handleClick(ev);
        }
    };
    
    canvas.onmouseup = function(ev) {
        isDrawing = false;
        lastX = -1;
        lastY = -1;
    };
    
    canvas.onmouseleave = function(ev) {
        isDrawing = false;
        lastX = -1;
        lastY = -1;
    };
}

function setBrushType(type) {
    currentBrushType = type;
    
    // Update button styles
    document.getElementById('btn-square').classList.remove('active');
    document.getElementById('btn-triangle').classList.remove('active');
    document.getElementById('btn-circle').classList.remove('active');
    
    document.getElementById('btn-' + type).classList.add('active');
}

function handleClick(ev) {
    var x = ev.clientX;
    var y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();
    
    x = x - rect.left;
    y = y - rect.top;
    
    // Create shape based on current brush type
    if (currentBrushType === 'square') {
        var square = new Square(x, y, currentSize, currentColor.slice(), currentRotation);
        shapesList.push(square);
    } else if (currentBrushType === 'triangle') {
        // Create a triangle centered at click position
        var size = currentSize;
        var triangle = new Triangle(
            x, y - size,
            x - size * 0.866, y + size * 0.5,
            x + size * 0.866, y + size * 0.5,
            currentColor.slice(),
            currentRotation
        );
        shapesList.push(triangle);
    } else if (currentBrushType === 'circle') {
        var circle = new Circle(x, y, currentSize, currentColor.slice(), currentSegments, currentRotation);
        shapesList.push(circle);
    }
    
    // If dragging, also fill gaps between shapes
    if (lastX >= 0 && lastY >= 0 && (currentBrushType === 'square' || currentBrushType === 'circle')) {
        var dx = x - lastX;
        var dy = y - lastY;
        var distance = Math.sqrt(dx * dx + dy * dy);
        var steps = Math.max(1, Math.floor(distance / (currentSize * 0.5)));
        
        for (var i = 1; i < steps; i++) {
            var t = i / steps;
            var interpX = lastX + dx * t;
            var interpY = lastY + dy * t;
            
            if (currentBrushType === 'square') {
                var interpSquare = new Square(interpX, interpY, currentSize, currentColor.slice(), currentRotation);
                shapesList.push(interpSquare);
            } else if (currentBrushType === 'circle') {
                var interpCircle = new Circle(interpX, interpY, currentSize, currentColor.slice(), currentSegments, currentRotation);
                shapesList.push(interpCircle);
            }
        }
    }
    
    lastX = x;
    lastY = y;
    
    renderAllShapes();
}

function renderAllShapes() {
    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Render all shapes
    for (var i = 0; i < shapesList.length; i++) {
        shapesList[i].render(gl, a_Position, a_Color, u_PointSize);
    }
}

function drawPicture() {
    // Draw a picture using triangles based on hand-drawn reference
    // Recreating the bat-like creature: body (squares), ears (triangles), wings (big triangles), legs (squares connecting to triangles), halo (arc)
    
    var width = canvas.width;
    var height = canvas.height;
    var centerX = width / 2;
    var centerY = height / 2;
    
    // Background - simple dark background
    var bgColor = [0.1, 0.1, 0.15, 1.0];
    shapesList.push(new Triangle(0, 0, width, 0, width, height, bgColor));
    shapesList.push(new Triangle(0, 0, width, height, 0, height, bgColor));
    
    // Creature colors
    var bodyColor = [0.3, 0.3, 0.3, 1.0]; // Dark gray for body
    var featureColor = [0.1, 0.1, 0.1, 1.0]; // Black for features
    var haloColor = [0.8, 0.8, 0.9, 1.0]; // Light for halo
    
    // Scale factor for the creature - smaller overall
    var scale = 1.0; // Reduced from 2.0 to make everything smaller
    var bodyWidth = 100 * scale;
    var bodyHeight = 140 * scale; // This is the biggest shape size
    
    // Main body/head - SQUARE (rectangle made of 2 triangles)
    var bodyLeft = centerX - bodyWidth / 2;
    var bodyRight = centerX + bodyWidth / 2;
    var bodyTop = centerY - bodyHeight / 2;
    var bodyBottom = centerY + bodyHeight / 2;
    
    // Body square - triangle 1
    shapesList.push(new Triangle(bodyLeft, bodyTop, bodyRight, bodyTop, bodyLeft, bodyBottom, bodyColor));
    // Body square - triangle 2
    shapesList.push(new Triangle(bodyRight, bodyTop, bodyRight, bodyBottom, bodyLeft, bodyBottom, bodyColor));
    
    // Eyes - 2 small triangles inside top half of body, horizontally positioned
    var eyeSize = bodyHeight * 0.08; // Small triangles
    var eyeY = centerY - bodyHeight * 0.15; // In top half of body
    var leftEyeX = centerX - bodyWidth * 0.25; // Horizontally positioned
    var rightEyeX = centerX + bodyWidth * 0.25; // Horizontally positioned
    
    // Left eye (upward triangle)
    shapesList.push(new Triangle(leftEyeX, eyeY, leftEyeX - eyeSize/2, eyeY - eyeSize, leftEyeX + eyeSize/2, eyeY - eyeSize, featureColor));
    // Right eye (upward triangle)
    shapesList.push(new Triangle(rightEyeX, eyeY, rightEyeX - eyeSize/2, eyeY - eyeSize, rightEyeX + eyeSize/2, eyeY - eyeSize, featureColor));
    
    // Nose/Mouth - 1 inverted triangle (outline style) below eyes, centered
    var noseSize = bodyHeight * 0.08;
    var noseX = centerX;
    var noseY = centerY - bodyHeight * 0.05; // Below eyes
    shapesList.push(new Triangle(noseX, noseY, noseX - noseSize/2, noseY + noseSize, noseX + noseSize/2, noseY + noseSize, featureColor));
    
    // Wings - Each wing is TWO 90-degree (right-angled) triangles that combine to form a big triangle
    var wingSize = bodyHeight * 0.8; // Wings are large but proportional
    var wingHeight = bodyHeight * 0.6; // Height of the wing triangle
    
    // LEFT WING - Two right-angled triangles forming one big triangle
    // Big triangle vertices: (bodyLeft, bodyTop), (bodyLeft, bodyTop + wingHeight), (leftWingTipX, bodyTop + wingHeight)
    var leftWingTipX = bodyLeft - wingSize; // Tip extending outward
    
    // Left wing triangle 1 (upper right-angled triangle)
    // Right angle at: (bodyLeft, bodyTop) - forms 90 degrees
    shapesList.push(new Triangle(
        bodyLeft, bodyTop, // Top attachment point (right angle vertex)
        leftWingTipX, bodyTop, // Horizontal edge from body
        bodyLeft, bodyTop + wingHeight * 0.5, // Vertical edge down body
        bodyColor
    ));
    
    // Left wing triangle 2 (lower right-angled triangle)
    // Right angle at: (leftWingTipX, bodyTop + wingHeight) - forms 90 degrees
    shapesList.push(new Triangle(
        bodyLeft, bodyTop + wingHeight * 0.5, // Upper point (shared with triangle 1)
        leftWingTipX, bodyTop, // Shared horizontal edge
        leftWingTipX, bodyTop + wingHeight, // Bottom tip (right angle vertex)
        bodyColor
    ));
    
    // RIGHT WING - Two right-angled triangles forming one big triangle
    // Big triangle vertices: (bodyRight, bodyTop), (bodyRight, bodyTop + wingHeight), (rightWingTipX, bodyTop + wingHeight)
    var rightWingTipX = bodyRight + wingSize; // Tip extending outward
    
    // Right wing triangle 1 (upper right-angled triangle)
    // Right angle at: (bodyRight, bodyTop) - forms 90 degrees
    shapesList.push(new Triangle(
        bodyRight, bodyTop, // Top attachment point (right angle vertex)
        rightWingTipX, bodyTop, // Horizontal edge from body
        bodyRight, bodyTop + wingHeight * 0.5, // Vertical edge down body
        bodyColor
    ));
    
    // Right wing triangle 2 (lower right-angled triangle)
    // Right angle at: (rightWingTipX, bodyTop + wingHeight) - forms 90 degrees
    shapesList.push(new Triangle(
        bodyRight, bodyTop + wingHeight * 0.5, // Upper point (shared with triangle 1)
        rightWingTipX, bodyTop, // Shared horizontal edge
        rightWingTipX, bodyTop + wingHeight, // Bottom tip (right angle vertex)
        bodyColor
    ));
    
    // Legs - TWO short vertical lines (squares/rectangles) extending down from body
    var legWidth = bodyWidth * 0.12; // Thin vertical lines
    var legHeight = bodyHeight * 0.2; // Short legs
    var legTopY = bodyBottom;
    var leftLegX = centerX - bodyWidth * 0.3;
    var rightLegX = centerX + bodyWidth * 0.3;
    
    // Left leg - square (2 triangles)
    var leftLegLeft = leftLegX - legWidth / 2;
    var leftLegRight = leftLegX + legWidth / 2;
    var leftLegBottom = legTopY + legHeight;
    shapesList.push(new Triangle(leftLegLeft, legTopY, leftLegRight, legTopY, leftLegLeft, leftLegBottom, bodyColor));
    shapesList.push(new Triangle(leftLegRight, legTopY, leftLegRight, leftLegBottom, leftLegLeft, leftLegBottom, bodyColor));
    
    // Right leg - square (2 triangles)
    var rightLegLeft = rightLegX - legWidth / 2;
    var rightLegRight = rightLegX + legWidth / 2;
    var rightLegBottom = legTopY + legHeight;
    shapesList.push(new Triangle(rightLegLeft, legTopY, rightLegRight, legTopY, rightLegLeft, rightLegBottom, bodyColor));
    shapesList.push(new Triangle(rightLegRight, legTopY, rightLegRight, rightLegBottom, rightLegLeft, rightLegBottom, bodyColor));
    
    // Feet - small inverted triangles at the end of each leg
    var footSize = bodyHeight * 0.08;
    var footY = leftLegBottom + bodyHeight * 0.02;
    
    // Left foot - inverted triangle
    shapesList.push(new Triangle(leftLegX, footY, leftLegX - footSize/2, footY + footSize, leftLegX + footSize/2, footY + footSize, featureColor));
    // Right foot - inverted triangle
    shapesList.push(new Triangle(rightLegX, footY, rightLegX - footSize/2, footY + footSize, rightLegX + footSize/2, footY + footSize, featureColor));
    
    renderAllShapes();
}
