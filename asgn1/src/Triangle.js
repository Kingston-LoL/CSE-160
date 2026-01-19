// Triangle class for drawing triangles
class Triangle {
    constructor(x1, y1, x2, y2, x3, y3, color, rotation) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.x3 = x3;
        this.y3 = y3;
        this.color = color; // [r, g, b, a] normalized to 0-1
        this.rotation = rotation || 0; // Rotation in degrees
    }
    
    // Rotate a point around a center
    rotatePoint(px, py, cx, cy, angleDeg) {
        var angleRad = angleDeg * Math.PI / 180;
        var cos = Math.cos(angleRad);
        var sin = Math.sin(angleRad);
        var dx = px - cx;
        var dy = py - cy;
        return [
            cx + dx * cos - dy * sin,
            cy + dx * sin + dy * cos
        ];
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
        
        // Calculate triangle centroid for rotation
        var cx = (this.x1 + this.x2 + this.x3) / 3;
        var cy = (this.y1 + this.y2 + this.y3) / 3;
        
        var v1 = [this.x1, this.y1];
        var v2 = [this.x2, this.y2];
        var v3 = [this.x3, this.y3];
        
        // Rotate vertices around centroid if rotation is specified
        if (this.rotation !== 0) {
            v1 = this.rotatePoint(this.x1, this.y1, cx, cy, this.rotation);
            v2 = this.rotatePoint(this.x2, this.y2, cx, cy, this.rotation);
            v3 = this.rotatePoint(this.x3, this.y3, cx, cy, this.rotation);
        }
        
        // Create buffer for triangle vertices
        var vertices = new Float32Array([
            ...this.canvasToWebGL(v1[0], v1[1], gl.canvas.width, gl.canvas.height),
            ...this.canvasToWebGL(v2[0], v2[1], gl.canvas.width, gl.canvas.height),
            ...this.canvasToWebGL(v3[0], v3[1], gl.canvas.width, gl.canvas.height)
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
