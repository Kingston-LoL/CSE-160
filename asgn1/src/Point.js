// Point class for drawing points
class Point {
    constructor(x, y, color, size) {
        this.x = x;
        this.y = y;
        this.color = color; // [r, g, b, a] normalized to 0-1
        this.size = size;
    }
    
    render(gl, a_Position, a_Color, u_PointSize) {
        // Set point size
        gl.uniform1f(u_PointSize, this.size);
        
        // Set color
        gl.vertexAttrib4f(a_Color, this.color[0], this.color[1], this.color[2], this.color[3]);
        
        // Convert canvas coordinates to WebGL coordinates
        // Canvas: (0,0) at top-left, WebGL: (-1,-1) at bottom-left
        var glX = (this.x / gl.canvas.width) * 2 - 1;
        var glY = 1 - (this.y / gl.canvas.height) * 2;
        
        // Set position
        gl.vertexAttrib3f(a_Position, glX, glY, 0.0);
        
        // Draw the point
        gl.drawArrays(gl.POINTS, 0, 1);
    }
}
