// Cylinder.js - Non-cube primitive for variety
class Cylinder {
    constructor(segments = 12) {
        this.type = 'cylinder';
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.segments = segments;
    }

    // Static buffers - created once per segment count
    static buffers = {};

    static initBuffer(gl, segments) {
        if (Cylinder.buffers[segments]) return Cylinder.buffers[segments];

        var vertices = [];
        var angleStep = (2 * Math.PI) / segments;

        // Build cylinder vertices
        for (var i = 0; i < segments; i++) {
            var angle1 = i * angleStep;
            var angle2 = (i + 1) * angleStep;
            
            var x1 = Math.cos(angle1) * 0.5;
            var z1 = Math.sin(angle1) * 0.5;
            var x2 = Math.cos(angle2) * 0.5;
            var z2 = Math.sin(angle2) * 0.5;

            // Side faces (2 triangles per segment)
            // Triangle 1
            vertices.push(x1, 0, z1);   // bottom
            vertices.push(x2, 0, z2);   // bottom
            vertices.push(x1, 1, z1);   // top
            // Triangle 2
            vertices.push(x2, 0, z2);   // bottom
            vertices.push(x2, 1, z2);   // top
            vertices.push(x1, 1, z1);   // top

            // Top cap (triangle fan from center)
            vertices.push(0, 1, 0);     // center top
            vertices.push(x1, 1, z1);
            vertices.push(x2, 1, z2);

            // Bottom cap (triangle fan from center)
            vertices.push(0, 0, 0);     // center bottom
            vertices.push(x2, 0, z2);
            vertices.push(x1, 0, z1);
        }

        var vertexArray = new Float32Array(vertices);
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);

        Cylinder.buffers[segments] = {
            buffer: buffer,
            vertexCount: vertices.length / 3,
            triangleCount: segments * 4  // 2 side + 1 top + 1 bottom per segment
        };

        return Cylinder.buffers[segments];
    }

    render(gl, a_Position, u_FragColor, u_ModelMatrix) {
        var bufferInfo = Cylinder.initBuffer(gl, this.segments);

        // Set color
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);

        // Set model matrix
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        // Bind buffer and set attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.vertexCount);

        return bufferInfo.triangleCount;
    }

    renderWithShading(gl, a_Position, u_FragColor, u_ModelMatrix) {
        var bufferInfo = Cylinder.initBuffer(gl, this.segments);

        // Set model matrix
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        // Bind buffer and set attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        var baseColor = this.color;
        var verticesPerSegment = 12; // 4 triangles * 3 vertices

        // Draw each segment with slight color variation for visual interest
        for (var i = 0; i < this.segments; i++) {
            var shade = 0.8 + 0.2 * Math.cos(i * 2 * Math.PI / this.segments);
            
            // Side faces (6 vertices = 2 triangles)
            gl.uniform4f(u_FragColor, 
                baseColor[0] * shade, 
                baseColor[1] * shade, 
                baseColor[2] * shade, 
                baseColor[3]);
            gl.drawArrays(gl.TRIANGLES, i * verticesPerSegment, 6);
            
            // Top cap (3 vertices = 1 triangle)
            gl.uniform4f(u_FragColor, 
                baseColor[0] * 1.1, 
                baseColor[1] * 1.1, 
                baseColor[2] * 1.1, 
                baseColor[3]);
            gl.drawArrays(gl.TRIANGLES, i * verticesPerSegment + 6, 3);
            
            // Bottom cap (3 vertices = 1 triangle)
            gl.uniform4f(u_FragColor, 
                baseColor[0] * 0.7, 
                baseColor[1] * 0.7, 
                baseColor[2] * 0.7, 
                baseColor[3]);
            gl.drawArrays(gl.TRIANGLES, i * verticesPerSegment + 9, 3);
        }

        return bufferInfo.triangleCount;
    }
}

// Cone class - for horse ears
class Cone {
    constructor(segments = 12) {
        this.type = 'cone';
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.segments = segments;
    }

    static buffers = {};

    static initBuffer(gl, segments) {
        if (Cone.buffers[segments]) return Cone.buffers[segments];

        var vertices = [];
        var angleStep = (2 * Math.PI) / segments;

        for (var i = 0; i < segments; i++) {
            var angle1 = i * angleStep;
            var angle2 = (i + 1) * angleStep;
            
            var x1 = Math.cos(angle1) * 0.5;
            var z1 = Math.sin(angle1) * 0.5;
            var x2 = Math.cos(angle2) * 0.5;
            var z2 = Math.sin(angle2) * 0.5;

            // Side face (triangle from base to tip)
            vertices.push(x1, 0, z1);   // base
            vertices.push(x2, 0, z2);   // base
            vertices.push(0, 1, 0);     // tip

            // Bottom cap
            vertices.push(0, 0, 0);     // center
            vertices.push(x2, 0, z2);
            vertices.push(x1, 0, z1);
        }

        var vertexArray = new Float32Array(vertices);
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);

        Cone.buffers[segments] = {
            buffer: buffer,
            vertexCount: vertices.length / 3,
            triangleCount: segments * 2
        };

        return Cone.buffers[segments];
    }

    render(gl, a_Position, u_FragColor, u_ModelMatrix) {
        var bufferInfo = Cone.initBuffer(gl, this.segments);

        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.vertexCount);

        return bufferInfo.triangleCount;
    }

    renderWithShading(gl, a_Position, u_FragColor, u_ModelMatrix) {
        var bufferInfo = Cone.initBuffer(gl, this.segments);

        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        var baseColor = this.color;

        for (var i = 0; i < this.segments; i++) {
            var shade = 0.8 + 0.2 * Math.cos(i * 2 * Math.PI / this.segments);
            
            // Side face
            gl.uniform4f(u_FragColor, 
                baseColor[0] * shade, 
                baseColor[1] * shade, 
                baseColor[2] * shade, 
                baseColor[3]);
            gl.drawArrays(gl.TRIANGLES, i * 6, 3);
            
            // Bottom cap
            gl.uniform4f(u_FragColor, 
                baseColor[0] * 0.7, 
                baseColor[1] * 0.7, 
                baseColor[2] * 0.7, 
                baseColor[3]);
            gl.drawArrays(gl.TRIANGLES, i * 6 + 3, 3);
        }

        return bufferInfo.triangleCount;
    }
}

// Helper functions
function drawCylinder(gl, a_Position, u_FragColor, u_ModelMatrix, matrix, color, segments) {
    var cylinder = new Cylinder(segments || 12);
    cylinder.matrix = matrix;
    cylinder.color = color;
    return cylinder.renderWithShading(gl, a_Position, u_FragColor, u_ModelMatrix);
}

function drawCone(gl, a_Position, u_FragColor, u_ModelMatrix, matrix, color, segments) {
    var cone = new Cone(segments || 12);
    cone.matrix = matrix;
    cone.color = color;
    return cone.renderWithShading(gl, a_Position, u_FragColor, u_ModelMatrix);
}
