class Camera {
  constructor(aspect) {
    this.fov = 60;
    this.eye = new Vector3([2, 1.7, 2]);
    this.up = new Vector3([0, 1, 0]);

    this.yaw = -35;
    this.pitch = -8;
    this.moveSpeed = 0.14;
    this.turnSpeed = 3.0;

    this.at = new Vector3([0, 0, -1]);
    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this.projectionMatrix.setPerspective(this.fov, aspect, 0.1, 300);

    this.verticalVelocity = 0;
    this.onGround = true;

    this._updateAtFromYawPitch();
    this.updateViewMatrix();
  }

  resize(aspect) {
    this.projectionMatrix.setPerspective(this.fov, aspect, 0.1, 300);
  }

  _updateAtFromYawPitch() {
    const yawRad = (this.yaw * Math.PI) / 180;
    const pitchRad = (this.pitch * Math.PI) / 180;
    const fx = Math.cos(pitchRad) * Math.cos(yawRad);
    const fy = Math.sin(pitchRad);
    const fz = Math.cos(pitchRad) * Math.sin(yawRad);
    this.at.set(this.eye);
    this.at.add(new Vector3([fx, fy, fz]));
  }

  updateViewMatrix() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0],
      this.eye.elements[1],
      this.eye.elements[2],
      this.at.elements[0],
      this.at.elements[1],
      this.at.elements[2],
      this.up.elements[0],
      this.up.elements[1],
      this.up.elements[2]
    );
  }

  getForwardVector() {
    const f = new Vector3();
    f.set(this.at);
    f.sub(this.eye);
    f.normalize();
    return f;
  }

  getForwardXZ() {
    const f = this.getForwardVector();
    f.elements[1] = 0;
    f.normalize();
    return f;
  }

  _moveBy(v, speed) {
    const m = new Vector3(v.elements);
    m.mul(speed);
    this.eye.add(m);
    this.at.add(m);
  }

  moveForward(speed = this.moveSpeed) {
    this._moveBy(this.getForwardXZ(), speed);
  }

  moveBackwards(speed = this.moveSpeed) {
    const b = this.getForwardXZ();
    b.mul(-1);
    this._moveBy(b, speed);
  }

  moveLeft(speed = this.moveSpeed) {
    const f = this.getForwardXZ();
    const s = Vector3.cross(this.up, f);
    s.normalize();
    this._moveBy(s, speed);
  }

  moveRight(speed = this.moveSpeed) {
    const f = this.getForwardXZ();
    const s = Vector3.cross(f, this.up);
    s.normalize();
    this._moveBy(s, speed);
  }

  panLeft(alpha = this.turnSpeed) {
    this.yaw -= alpha;
    this._updateAtFromYawPitch();
  }

  panRight(alpha = this.turnSpeed) {
    this.yaw += alpha;
    this._updateAtFromYawPitch();
  }

  pan(deltaYaw, deltaPitch) {
    this.yaw += deltaYaw;
    this.pitch += deltaPitch;
    if (this.pitch > 80) this.pitch = 80;
    if (this.pitch < -80) this.pitch = -80;
    this._updateAtFromYawPitch();
  }

  jump() {
    if (!this.onGround) return;
    this.verticalVelocity = 0.16;
    this.onGround = false;
  }

  setPosition(x, y, z) {
    const dx = this.at.elements[0] - this.eye.elements[0];
    const dy = this.at.elements[1] - this.eye.elements[1];
    const dz = this.at.elements[2] - this.eye.elements[2];
    this.eye.elements[0] = x;
    this.eye.elements[1] = y;
    this.eye.elements[2] = z;
    this.at.elements[0] = x + dx;
    this.at.elements[1] = y + dy;
    this.at.elements[2] = z + dz;
  }

  updateGravity(groundY = 1.7) {
    if (this.onGround) return;
    this.verticalVelocity -= 0.009;
    this.eye.elements[1] += this.verticalVelocity;
    this.at.elements[1] += this.verticalVelocity;
    if (this.eye.elements[1] <= groundY) {
      const dy = groundY - this.eye.elements[1];
      this.eye.elements[1] += dy;
      this.at.elements[1] += dy;
      this.verticalVelocity = 0;
      this.onGround = true;
    }
  }
}
