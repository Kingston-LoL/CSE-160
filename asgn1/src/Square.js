// Square class for drawing squares (made of two triangles)
class Square {
    constructor(x, y, size, color, rotation) {
        this.x = x;
        this.y = y;
        this.size = size;
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
        
        var halfSize = this.size / 2;
        
        // Calculate corner points
        var corners = [
            [this.x - halfSize, this.y - halfSize], // top-left
            [this.x + halfSize, this.y - halfSize], // top-right
            [this.x + halfSize, this.y + halfSize], // bottom-right
            [this.x - halfSize, this.y + halfSize]  // bottom-left
        ];
        
        // Rotate corners around center if rotation is specified
        if (this.rotation !== 0) {
            for (var i = 0; i < corners.length; i++) {
                corners[i] = this.rotatePoint(corners[i][0], corners[i][1], this.x, this.y, this.rotation);
            }
        }
        
        // Create two triangles to form a square
        var vertices = new Float32Array([
            // First triangle (top-left, top-right, bottom-left)
            ...this.canvasToWebGL(corners[0][0], corners[0][1], gl.canvas.width, gl.canvas.height),
            ...this.canvasToWebGL(corners[1][0], corners[1][1], gl.canvas.width, gl.canvas.height),
            ...this.canvasToWebGL(corners[3][0], corners[3][1], gl.canvas.width, gl.canvas.height),
            // Second triangle (top-right, bottom-right, bottom-left)
            ...this.canvasToWebGL(corners[1][0], corners[1][1], gl.canvas.width, gl.canvas.height),
            ...this.canvasToWebGL(corners[2][0], corners[2][1], gl.canvas.width, gl.canvas.height),
            ...this.canvasToWebGL(corners[3][0], corners[3][1], gl.canvas.width, gl.canvas.height)
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
        
        // Draw the square (two triangles = 6 vertices)
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}
