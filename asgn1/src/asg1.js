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
    // Draw a picture using triangles - featuring initials "JC" (Jason Cheung)
    // This creates a stylized design with the initials integrated into a scene
    
    var width = canvas.width;
    var height = canvas.height;
    var centerX = width / 2;
    var centerY = height / 2;
    
    // Background triangles - sky gradient
    var skyColor1 = [0.2, 0.4, 0.8, 1.0];
    var skyColor2 = [0.5, 0.7, 1.0, 1.0];
    
    // Sky triangles
    shapesList.push(new Triangle(0, 0, width, 0, width, height * 0.6, skyColor1));
    shapesList.push(new Triangle(0, 0, width, height * 0.6, 0, height * 0.6, skyColor1));
    shapesList.push(new Triangle(0, height * 0.6, width, height * 0.6, width, height * 0.4, skyColor2));
    shapesList.push(new Triangle(0, height * 0.6, width, height * 0.4, 0, height * 0.4, skyColor2));
    
    // Ground
    var groundColor = [0.2, 0.6, 0.2, 1.0];
    shapesList.push(new Triangle(0, height * 0.6, width, height * 0.6, width, height, groundColor));
    shapesList.push(new Triangle(0, height * 0.6, width, height, 0, height, groundColor));
    
    // Letter J - made of triangles
    var jColor = [1.0, 0.8, 0.0, 1.0]; // Gold color
    var jX = centerX - 80;
    var jY = centerY;
    var jSize = 60;
    
    // J vertical line
    shapesList.push(new Triangle(jX, jY - jSize, jX + 15, jY - jSize, jX + 15, jY + jSize * 0.3, jColor));
    shapesList.push(new Triangle(jX, jY - jSize, jX + 15, jY + jSize * 0.3, jX, jY + jSize * 0.3, jColor));
    
    // J curve/hook
    shapesList.push(new Triangle(jX, jY + jSize * 0.3, jX + 15, jY + jSize * 0.3, jX + 25, jY + jSize * 0.5, jColor));
    shapesList.push(new Triangle(jX, jY + jSize * 0.3, jX + 25, jY + jSize * 0.5, jX + 10, jY + jSize * 0.5, jColor));
    shapesList.push(new Triangle(jX + 10, jY + jSize * 0.5, jX + 25, jY + jSize * 0.5, jX + 20, jY + jSize * 0.7, jColor));
    shapesList.push(new Triangle(jX + 10, jY + jSize * 0.5, jX + 20, jY + jSize * 0.7, jX + 5, jY + jSize * 0.7, jColor));
    
    // Letter C - made of triangles
    var cColor = [0.8, 0.2, 0.8, 1.0]; // Purple color
    var cX = centerX + 80;
    var cY = centerY;
    var cSize = 60;
    
    // C top curve
    shapesList.push(new Triangle(cX - cSize * 0.3, cY - cSize, cX, cY - cSize, cX + cSize * 0.2, cY - cSize * 0.7, cColor));
    shapesList.push(new Triangle(cX - cSize * 0.3, cY - cSize, cX + cSize * 0.2, cY - cSize * 0.7, cX - cSize * 0.1, cY - cSize * 0.7, cColor));
    
    // C left vertical
    shapesList.push(new Triangle(cX - cSize * 0.3, cY - cSize, cX - cSize * 0.1, cY - cSize * 0.7, cX - cSize * 0.1, cY + cSize * 0.7, cColor));
    shapesList.push(new Triangle(cX - cSize * 0.3, cY - cSize, cX - cSize * 0.1, cY + cSize * 0.7, cX - cSize * 0.3, cY + cSize, cColor));
    
    // C bottom curve
    shapesList.push(new Triangle(cX - cSize * 0.3, cY + cSize, cX - cSize * 0.1, cY + cSize * 0.7, cX + cSize * 0.2, cY + cSize * 0.7, cColor));
    shapesList.push(new Triangle(cX - cSize * 0.3, cY + cSize, cX + cSize * 0.2, cY + cSize * 0.7, cX, cY + cSize, cColor));
    
    // Decorative elements - sun
    var sunColor = [1.0, 1.0, 0.3, 1.0];
    var sunX = width * 0.8;
    var sunY = height * 0.2;
    var sunSize = 40;
    
    // Sun center
    shapesList.push(new Triangle(sunX, sunY, sunX + sunSize * 0.5, sunY - sunSize * 0.3, sunX + sunSize * 0.3, sunY + sunSize * 0.3, sunColor));
    shapesList.push(new Triangle(sunX, sunY, sunX + sunSize * 0.3, sunY + sunSize * 0.3, sunX - sunSize * 0.3, sunY + sunSize * 0.3, sunColor));
    shapesList.push(new Triangle(sunX, sunY, sunX - sunSize * 0.3, sunY + sunSize * 0.3, sunX - sunSize * 0.5, sunY - sunSize * 0.3, sunColor));
    shapesList.push(new Triangle(sunX, sunY, sunX - sunSize * 0.5, sunY - sunSize * 0.3, sunX + sunSize * 0.5, sunY - sunSize * 0.3, sunColor));
    
    // Mountains in background
    var mountainColor = [0.4, 0.3, 0.2, 1.0];
    shapesList.push(new Triangle(width * 0.1, height * 0.6, width * 0.3, height * 0.4, width * 0.5, height * 0.6, mountainColor));
    shapesList.push(new Triangle(width * 0.5, height * 0.6, width * 0.7, height * 0.5, width * 0.9, height * 0.6, mountainColor));
    
    renderAllShapes();
}
