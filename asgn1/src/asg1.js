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
    var alphaSlider = document.getElementById('slider-alpha');
    
    redSlider.oninput = function() {
        currentColor[0] = this.value / 100.0;
    };
    greenSlider.oninput = function() {
        currentColor[1] = this.value / 100.0;
    };
    blueSlider.oninput = function() {
        currentColor[2] = this.value / 100.0;
    };
    alphaSlider.oninput = function() {
        currentColor[3] = this.value / 100.0;
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
        var square = new Square(x, y, currentSize, currentColor.slice());
        shapesList.push(square);
    } else if (currentBrushType === 'triangle') {
        // Create a triangle centered at click position
        var size = currentSize;
        var triangle = new Triangle(
            x, y - size,
            x - size * 0.866, y + size * 0.5,
            x + size * 0.866, y + size * 0.5,
            currentColor.slice()
        );
        shapesList.push(triangle);
    } else if (currentBrushType === 'circle') {
        var circle = new Circle(x, y, currentSize, currentColor.slice(), currentSegments);
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
                var interpSquare = new Square(interpX, interpY, currentSize, currentColor.slice());
                shapesList.push(interpSquare);
            } else if (currentBrushType === 'circle') {
                var interpCircle = new Circle(interpX, interpY, currentSize, currentColor.slice(), currentSegments);
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
    
    // Scale factor for the creature
    var scale = 2.0;
    var bodyWidth = 100 * scale;
    var bodyHeight = 140 * scale;
    
    // Main body/head - SQUARE (rectangle made of 2 triangles)
    var bodyLeft = centerX - bodyWidth / 2;
    var bodyRight = centerX + bodyWidth / 2;
    var bodyTop = centerY - bodyHeight / 2;
    var bodyBottom = centerY + bodyHeight / 2;
    
    // Body square - triangle 1
    shapesList.push(new Triangle(bodyLeft, bodyTop, bodyRight, bodyTop, bodyLeft, bodyBottom, bodyColor));
    // Body square - triangle 2
    shapesList.push(new Triangle(bodyRight, bodyTop, bodyRight, bodyBottom, bodyLeft, bodyBottom, bodyColor));
    
    // Ears - TWO TRIANGLES (one for each ear) - BIGGER
    var earSize = 80 * scale; // Increased from 50
    var earTopY = bodyTop - 25 * scale; // Moved higher
    
    // Left ear - single triangle (bigger)
    var leftEarX = bodyLeft - 20 * scale; // Extended further out
    shapesList.push(new Triangle(bodyLeft, bodyTop, leftEarX, earTopY, bodyLeft + 25 * scale, bodyTop + 35 * scale, bodyColor));
    
    // Right ear - single triangle (bigger)
    var rightEarX = bodyRight + 20 * scale; // Extended further out
    shapesList.push(new Triangle(bodyRight, bodyTop, rightEarX, earTopY, bodyRight - 25 * scale, bodyTop + 35 * scale, bodyColor));
    
    // Eyes - 2 upward-pointing triangles
    var eyeSize = 18 * scale;
    var eyeY = centerY - 35 * scale;
    var leftEyeX = centerX - 25 * scale;
    var rightEyeX = centerX + 25 * scale;
    
    // Left eye (upward triangle)
    shapesList.push(new Triangle(leftEyeX, eyeY, leftEyeX - eyeSize/2, eyeY - eyeSize, leftEyeX + eyeSize/2, eyeY - eyeSize, featureColor));
    // Right eye (upward triangle)
    shapesList.push(new Triangle(rightEyeX, eyeY, rightEyeX - eyeSize/2, eyeY - eyeSize, rightEyeX + eyeSize/2, eyeY - eyeSize, featureColor));
    
    // Nose - 1 inverted triangle
    var noseSize = 12 * scale;
    var noseX = centerX;
    var noseY = centerY - 10 * scale;
    shapesList.push(new Triangle(noseX, noseY, noseX - noseSize/2, noseY + noseSize, noseX + noseSize/2, noseY + noseSize, featureColor));
    
    // Mouth - horizontal line (2 triangles for a small rectangle)
    var mouthWidth = 25 * scale;
    var mouthHeight = 4 * scale;
    var mouthY = centerY + 15 * scale;
    var mouthLeft = centerX - mouthWidth / 2;
    var mouthRight = centerX + mouthWidth / 2;
    shapesList.push(new Triangle(mouthLeft, mouthY, mouthRight, mouthY, mouthLeft, mouthY + mouthHeight, featureColor));
    shapesList.push(new Triangle(mouthRight, mouthY, mouthRight, mouthY + mouthHeight, mouthLeft, mouthY + mouthHeight, featureColor));
    
    // Wings - TWO SMALL TRIANGLES that combine to form a big triangle (positioned like feet triangles, BIGGER)
    var wingSize = 120 * scale; // Increased from 80
    var wingY = centerY;
    
    // Left wing - two triangles that combine to form a big triangle (pointing downward like feet, extended outward)
    var leftWingX = centerX - 50 * scale; // Moved further out from center
    var leftWingTopY = wingY - 30 * scale; // Extended higher
    var leftWingBottomY = wingY + 80 * scale; // Extended lower
    // Left wing triangle 1 (left part - extends further out)
    shapesList.push(new Triangle(leftWingX, leftWingTopY, leftWingX - wingSize/2, leftWingBottomY, leftWingX, leftWingBottomY, bodyColor));
    // Left wing triangle 2 (right part - extends further out)
    shapesList.push(new Triangle(leftWingX, leftWingTopY, leftWingX + wingSize/2, leftWingBottomY, leftWingX, leftWingBottomY, bodyColor));
    
    // Right wing - two triangles that combine to form a big triangle (pointing downward like feet, extended outward)
    var rightWingX = centerX + 50 * scale; // Moved further out from center
    var rightWingTopY = wingY - 30 * scale; // Extended higher
    var rightWingBottomY = wingY + 80 * scale; // Extended lower
    // Right wing triangle 1 (left part - extends further out)
    shapesList.push(new Triangle(rightWingX, rightWingTopY, rightWingX - wingSize/2, rightWingBottomY, rightWingX, rightWingBottomY, bodyColor));
    // Right wing triangle 2 (right part - extends further out)
    shapesList.push(new Triangle(rightWingX, rightWingTopY, rightWingX + wingSize/2, rightWingBottomY, rightWingX, rightWingBottomY, bodyColor));
    
    // Legs - TWO SQUARES (rectangles) connecting to triangles (feet)
    var legWidth = 20 * scale;
    var legHeight = 30 * scale;
    var legTopY = bodyBottom;
    var leftLegX = centerX - 30 * scale;
    var rightLegX = centerX + 30 * scale;
    
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
    
    // Feet - triangles connected to the leg squares
    var footSize = 20 * scale;
    var footY = leftLegBottom + 5 * scale;
    
    // Left foot - inverted triangle
    shapesList.push(new Triangle(leftLegX, footY, leftLegX - footSize/2, footY + footSize, leftLegX + footSize/2, footY + footSize, featureColor));
    // Right foot - inverted triangle
    shapesList.push(new Triangle(rightLegX, footY, rightLegX - footSize/2, footY + footSize, rightLegX + footSize/2, footY + footSize, featureColor));
    
    // Halo/Aura - arc of circles at the top of head (like an angle/arch)
    // Creating an arc above the head using multiple small triangles
    var haloRadius = 80 * scale;
    var haloCenterX = centerX;
    var haloCenterY = bodyTop - 70 * scale; // Moved higher above the head
    var haloStartAngle = Math.PI * 0.25; // Start angle
    var haloEndAngle = Math.PI * 0.75; // End angle
    var haloSegments = 16; // Number of segments in the arc
    
    for (var i = 0; i < haloSegments; i++) {
        var angle1 = haloStartAngle + (haloEndAngle - haloStartAngle) * (i / haloSegments);
        var angle2 = haloStartAngle + (haloEndAngle - haloStartAngle) * ((i + 1) / haloSegments);
        var radius1 = haloRadius;
        var radius2 = haloRadius + 10 * scale;
        
        var x1 = haloCenterX + Math.cos(angle1) * radius1;
        var y1 = haloCenterY + Math.sin(angle1) * radius1;
        var x2 = haloCenterX + Math.cos(angle2) * radius1;
        var y2 = haloCenterY + Math.sin(angle2) * radius1;
        var x3 = haloCenterX + Math.cos(angle1) * radius2;
        var y3 = haloCenterY + Math.sin(angle1) * radius2;
        var x4 = haloCenterX + Math.cos(angle2) * radius2;
        var y4 = haloCenterY + Math.sin(angle2) * radius2;
        
        // Each segment is 2 triangles
        shapesList.push(new Triangle(x1, y1, x2, y2, x3, y3, haloColor));
        shapesList.push(new Triangle(x2, y2, x4, y4, x3, y3, haloColor));
    }
    
    renderAllShapes();
}
