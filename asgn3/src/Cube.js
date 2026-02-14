class Cube {
  constructor() {
    this.matrix = new Matrix4();
    this.color = [1, 1, 1, 1];
    this.textureIndex = 0;
    this.texColorWeight = 1.0;
  }

  static initialized = false;
  static vertexBuffer = null;
  static uvBuffer = null;
  static vertexCount = 36;

  static init(gl) {
    if (Cube.initialized) return;

    const vertices = new Float32Array([
      // Front
      0, 0, 0, 1, 1, 0, 1, 0, 0,
      0, 0, 0, 0, 1, 0, 1, 1, 0,
      // Back
      0, 0, 1, 1, 0, 1, 1, 1, 1,
      0, 0, 1, 1, 1, 1, 0, 1, 1,
      // Top
      0, 1, 0, 0, 1, 1, 1, 1, 1,
      0, 1, 0, 1, 1, 1, 1, 1, 0,
      // Bottom
      0, 0, 0, 1, 0, 0, 1, 0, 1,
      0, 0, 0, 1, 0, 1, 0, 0, 1,
      // Right
      1, 0, 0, 1, 1, 0, 1, 1, 1,
      1, 0, 0, 1, 1, 1, 1, 0, 1,
      // Left
      0, 0, 0, 0, 0, 1, 0, 1, 1,
      0, 0, 0, 0, 1, 1, 0, 1, 0,
    ]);

    const uvFace = [0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1];
    const uv = [];
    for (let i = 0; i < 6; i++) uv.push(...uvFace);
    const uvs = new Float32Array(uv);

    Cube.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    Cube.uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

    Cube.initialized = true;
  }

  render(ctx) {
    const gl = ctx.gl;
    gl.uniformMatrix4fv(ctx.u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4f(ctx.u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1i(ctx.u_TextureIndex, this.textureIndex);
    gl.uniform1f(ctx.u_texColorWeight, this.texColorWeight);

    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vertexBuffer);
    gl.vertexAttribPointer(ctx.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(ctx.a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.uvBuffer);
    gl.vertexAttribPointer(ctx.a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(ctx.a_UV);

    gl.drawArrays(gl.TRIANGLES, 0, Cube.vertexCount);
  }
}
