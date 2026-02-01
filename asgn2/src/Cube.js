// Cube.js - Optimized cube drawing with reusable buffer
class Cube {
    constructor() {
        this.type = 'cube';
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
    }

    // Static buffer - created once and reused for all cubes
    static vertexBuffer = null;
    static vertices = null;
    static initialized = false;

    static initBuffer(gl) {
        if (Cube.initialized) return;

        // Create buffer once
        Cube.vertexBuffer = gl.createBuffer();
        if (!Cube.vertexBuffer) {
            console.log('Failed to create the buffer object');
            return;
        }

        // Define cube vertices (36 vertices for 12 triangles)
        // Each face is made of 2 triangles
        Cube.vertices = new Float32Array([
            // Front face
            0, 0, 0,   1, 1, 0,   1, 0, 0,
            0, 0, 0,   0, 1, 0,   1, 1, 0,
            // Back face
            0, 0, 1,   1, 0, 1,   1, 1, 1,
            0, 0, 1,   1, 1, 1,   0, 1, 1,
            // Top face
            0, 1, 0,   0, 1, 1,   1, 1, 1,
            0, 1, 0,   1, 1, 1,   1, 1, 0,
            // Bottom face
            0, 0, 0,   1, 0, 0,   1, 0, 1,
            0, 0, 0,   1, 0, 1,   0, 0, 1,
            // Right face
            1, 0, 0,   1, 1, 0,   1, 1, 1,
            1, 0, 0,   1, 1, 1,   1, 0, 1,
            // Left face
            0, 0, 0,   0, 0, 1,   0, 1, 1,
            0, 0, 0,   0, 1, 1,   0, 1, 0,
        ]);

        // Bind and upload vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, Cube.vertices, gl.STATIC_DRAW);

        Cube.initialized = true;
    }

    render(gl, a_Position, u_FragColor, u_ModelMatrix) {
        // Initialize buffer if needed
        if (!Cube.initialized) {
            Cube.initBuffer(gl);
        }

        // Set color
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);

        // Set model matrix
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        // Bind the buffer and set attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vertexBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // Draw all 36 vertices (12 triangles * 3 vertices)
        gl.drawArrays(gl.TRIANGLES, 0, 36);

        return 12; // Return triangle count for performance tracking
    }

    // Render with shading effect (different colors per face for depth perception)
    renderWithShading(gl, a_Position, u_FragColor, u_ModelMatrix) {
        // Initialize buffer if needed
        if (!Cube.initialized) {
            Cube.initBuffer(gl);
        }

        // Set model matrix
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        // Bind the buffer and set attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vertexBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // Draw each face with slightly different shading
        var baseColor = this.color;
        
        // Front face (normal brightness)
        gl.uniform4f(u_FragColor, baseColor[0], baseColor[1], baseColor[2], baseColor[3]);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        // Back face (darker)
        gl.uniform4f(u_FragColor, baseColor[0] * 0.7, baseColor[1] * 0.7, baseColor[2] * 0.7, baseColor[3]);
        gl.drawArrays(gl.TRIANGLES, 6, 6);
        
        // Top face (brighter)
        gl.uniform4f(u_FragColor, baseColor[0] * 1.1, baseColor[1] * 1.1, baseColor[2] * 1.1, baseColor[3]);
        gl.drawArrays(gl.TRIANGLES, 12, 6);
        
        // Bottom face (darker)
        gl.uniform4f(u_FragColor, baseColor[0] * 0.6, baseColor[1] * 0.6, baseColor[2] * 0.6, baseColor[3]);
        gl.drawArrays(gl.TRIANGLES, 18, 6);
        
        // Right face (medium)
        gl.uniform4f(u_FragColor, baseColor[0] * 0.85, baseColor[1] * 0.85, baseColor[2] * 0.85, baseColor[3]);
        gl.drawArrays(gl.TRIANGLES, 24, 6);
        
        // Left face (medium dark)
        gl.uniform4f(u_FragColor, baseColor[0] * 0.75, baseColor[1] * 0.75, baseColor[2] * 0.75, baseColor[3]);
        gl.drawArrays(gl.TRIANGLES, 30, 6);

        return 12; // Return triangle count
    }
}

// Helper function to draw a cube with given matrix and color (for easier use)
function drawCube(gl, a_Position, u_FragColor, u_ModelMatrix, matrix, color) {
    var cube = new Cube();
    cube.matrix = matrix;
    cube.color = color;
    return cube.renderWithShading(gl, a_Position, u_FragColor, u_ModelMatrix);
}
