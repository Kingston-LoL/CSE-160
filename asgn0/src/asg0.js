// Assignment 0 - Vector Operations
var gl;
var canvas;

function main() {  
  // Retrieve <canvas> element
  canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 

  // Get the rendering context for 2DCG
  gl = canvas.getContext('2d');
  if (!gl) {
    console.log('Failed to get 2D context');
    return false;
  }
  
  // Check if Vector3 is available
  if (typeof Vector3 === 'undefined') {
    console.error('Vector3 class not found! Check if cuon-matrix-cse160.js is loaded correctly.');
    return false;
  }
  
  // Set up event listeners
  var drawButton = document.getElementById('drawButton');
  var drawOperationButton = document.getElementById('drawOperationButton');
  if (drawButton) {
    drawButton.onclick = handleDrawEvent;
  }
  if (drawOperationButton) {
    drawOperationButton.onclick = handleDrawOperationEvent;
  }
  
  // Initial draw
  handleDrawEvent();
}

function drawVector(v, color) {
  // Set the color and line width
  gl.strokeStyle = color;
  gl.fillStyle = color;
  gl.lineWidth = 3;
  
  // Get canvas center
  var centerX = canvas.width / 2;
  var centerY = canvas.height / 2;
  
  // Scale coordinates by 20
  var x = v.elements[0] * 20;
  var y = v.elements[1] * 20;
  
  // Draw the vector as a line from center
  gl.beginPath();
  gl.moveTo(centerX, centerY);
  gl.lineTo(centerX + x, centerY - y); // Note: subtract y because canvas y-axis is flipped
  gl.stroke();
  
  // Draw an arrowhead
  var angle = Math.atan2(-y, x);
  var arrowLength = 8;
  var arrowAngle = Math.PI / 6;
  
  gl.beginPath();
  gl.moveTo(centerX + x, centerY - y);
  gl.lineTo(
    centerX + x - arrowLength * Math.cos(angle - arrowAngle),
    centerY - y + arrowLength * Math.sin(angle - arrowAngle)
  );
  gl.moveTo(centerX + x, centerY - y);
  gl.lineTo(
    centerX + x - arrowLength * Math.cos(angle + arrowAngle),
    centerY - y + arrowLength * Math.sin(angle + arrowAngle)
  );
  gl.stroke();
}

function handleDrawEvent() {
  // Clear the canvas (black background)
  gl.fillStyle = 'black';
  gl.fillRect(0, 0, canvas.width, canvas.height);
  
  // Read v1 values
  var v1x = parseFloat(document.getElementById('v1x').value) || 0;
  var v1y = parseFloat(document.getElementById('v1y').value) || 0;
  var v1 = new Vector3([v1x, v1y, 0]);
  
  // Read v2 values
  var v2x = parseFloat(document.getElementById('v2x').value) || 0;
  var v2y = parseFloat(document.getElementById('v2y').value) || 0;
  var v2 = new Vector3([v2x, v2y, 0]);
  
  // Draw v1 in red (only if not zero vector)
  if (v1x !== 0 || v1y !== 0) {
    drawVector(v1, 'red');
  }
  
  // Draw v2 in blue (only if not zero vector)
  if (v2x !== 0 || v2y !== 0) {
    drawVector(v2, 'blue');
  }
}

function handleDrawOperationEvent() {
  // Clear the canvas
  gl.fillStyle = 'black';
  gl.fillRect(0, 0, canvas.width, canvas.height);
  
  // Read v1 values
  var v1x = parseFloat(document.getElementById('v1x').value);
  var v1y = parseFloat(document.getElementById('v1y').value);
  var v1 = new Vector3([v1x, v1y, 0]);
  
  // Read v2 values
  var v2x = parseFloat(document.getElementById('v2x').value);
  var v2y = parseFloat(document.getElementById('v2y').value);
  var v2 = new Vector3([v2x, v2y, 0]);
  
  // Draw v1 in red
  drawVector(v1, 'red');
  
  // Draw v2 in blue
  drawVector(v2, 'blue');
  
  // Get operation
  var operation = document.getElementById('operation').value;
  var scalar = parseFloat(document.getElementById('scalar').value);
  
  if (operation === 'add') {
    var v3 = new Vector3(v1.elements);
    v3.add(v2);
    drawVector(v3, 'green');
  } else if (operation === 'sub') {
    var v3 = new Vector3(v1.elements);
    v3.sub(v2);
    drawVector(v3, 'green');
  } else if (operation === 'mul') {
    var v3 = new Vector3(v1.elements);
    v3.mul(scalar);
    drawVector(v3, 'green');
    var v4 = new Vector3(v2.elements);
    v4.mul(scalar);
    drawVector(v4, 'green');
  } else if (operation === 'div') {
    var v3 = new Vector3(v1.elements);
    v3.div(scalar);
    drawVector(v3, 'green');
    var v4 = new Vector3(v2.elements);
    v4.div(scalar);
    drawVector(v4, 'green');
  } else if (operation === 'magnitude') {
    var mag1 = v1.magnitude();
    var mag2 = v2.magnitude();
    console.log('Magnitude of v1: ' + mag1);
    console.log('Magnitude of v2: ' + mag2);
  } else if (operation === 'normalize') {
    var v1norm = new Vector3(v1.elements);
    v1norm.normalize();
    drawVector(v1norm, 'green');
    var v2norm = new Vector3(v2.elements);
    v2norm.normalize();
    drawVector(v2norm, 'green');
  } else if (operation === 'angle') {
    var angle = angleBetween(v1, v2);
    console.log('Angle between v1 and v2: ' + angle + ' radians');
    console.log('Angle between v1 and v2: ' + (angle * 180 / Math.PI) + ' degrees');
  } else if (operation === 'area') {
    var area = areaTriangle(v1, v2);
    console.log('Area of the triangle: ' + area);
  }
}

function angleBetween(v1, v2) {
  // Using dot product: dot(v1, v2) = ||v1|| * ||v2|| * cos(angle)
  var dot = Vector3.dot(v1, v2);
  var mag1 = v1.magnitude();
  var mag2 = v2.magnitude();
  
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }
  
  var cosAngle = dot / (mag1 * mag2);
  // Clamp to [-1, 1] to avoid numerical errors
  cosAngle = Math.max(-1, Math.min(1, cosAngle));
  return Math.acos(cosAngle);
}

function areaTriangle(v1, v2) {
  // Area of triangle = 0.5 * ||v1 x v2||
  var cross = Vector3.cross(v1, v2);
  var area = 0.5 * cross.magnitude();
  return area;
}
