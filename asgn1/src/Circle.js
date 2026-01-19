// Circle class for drawing circles using triangles
class Circle {
    constructor(x, y, radius, color, segments, rotation) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color; // [r, g, b, a] normalized to 0-1
        this.segments = segments || 20;
        this.rotation = rotation || 0; // Rotation in degrees
    }
    
    // Convert canvas coordinates to WebGL coordinates
    canvasToWebGL(x, y, canvasWidth, canvasHeight) {
        var glX = (x / canvasWidth) * 2 - 1;
        var glY = 1 - (y / canvasHeight) * 2;
        return [glX, glY];
    }
    
    render(gl, a_Position, a_Color) {
        // Set color for all vertices
        gl.vertexAttrib4f(a_Color, this.color[0], this.color[1], this.color[2], this.color[3]);
        
        // Calculate vertices for the circle
        var vertices = [];
        var centerGl = this.canvasToWebGL(this.x, this.y, gl.canvas.width, gl.canvas.height);
        
        // Convert radius from canvas pixels to WebGL coordinates
        var radiusGlX = (this.radius / gl.canvas.width) * 2;
        var radiusGlY = (this.radius / gl.canvas.height) * 2;
        
        // Create triangles fan from center
        var rotationRad = this.rotation * Math.PI / 180; // Convert rotation to radians
        for (var i = 0; i < this.segments; i++) {
            var angle1 = (i / this.segments) * 2 * Math.PI + rotationRad;
            var angle2 = ((i + 1) / this.segments) * 2 * Math.PI + rotationRad;
            
            // Center vertex
            vertices.push(centerGl[0], centerGl[1]);
            
            // First edge vertex
            vertices.push(
                centerGl[0] + radiusGlX * Math.cos(angle1),
                centerGl[1] + radiusGlY * Math.sin(angle1)
            );
            
            // Second edge vertex
            vertices.push(
                centerGl[0] + radiusGlX * Math.cos(angle2),
                centerGl[1] + radiusGlY * Math.sin(angle2)
            );
        }
        
        // Create buffer object
        var vertexBuffer = gl.createBuffer();
        if (!vertexBuffer) {
            console.log('Failed to create the buffer object');
            return;
        }
        
        // Bind the buffer object to target
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        
        // Write data into the buffer object
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
        
        // Assign the buffer object to a_Position variable
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
        
        // Enable the assignment to a_Position variable
        gl.enableVertexAttribArray(a_Position);
        
        // Draw the circle as triangle fan (3 vertices per triangle, segments triangles)
        gl.drawArrays(gl.TRIANGLES, 0, this.segments * 3);
    }
}
