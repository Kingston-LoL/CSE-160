// Triangle class for drawing triangles
class Triangle {
    constructor(x1, y1, x2, y2, x3, y3, color) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.x3 = x3;
        this.y3 = y3;
        this.color = color; // [r, g, b, a] normalized to 0-1
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
        
        // Create buffer for triangle vertices
        var vertices = new Float32Array([
            ...this.canvasToWebGL(this.x1, this.y1, gl.canvas.width, gl.canvas.height),
            ...this.canvasToWebGL(this.x2, this.y2, gl.canvas.width, gl.canvas.height),
            ...this.canvasToWebGL(this.x3, this.y3, gl.canvas.width, gl.canvas.height)
        ]);
        
        // Create buffer object
        var vertexBuffer = gl.createBuffer();
        if (!vertexBuffer) {
            console.log('Failed to create the buffer object');
            return;
        }
        
        // Bind the buffer object to target
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        
        // Write data into the buffer object
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
        
        // Assign the buffer object to a_Position variable
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
        
        // Enable the assignment to a_Position variable
        gl.enableVertexAttribArray(a_Position);
        
        // Draw the triangle
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
}
