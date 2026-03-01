## CSE160 ASGN4 - Lighting + OBJ

### Run

Use any local server from this folder (`asgn4`) so OBJ fetching works:

- `python -m http.server 8000`
- then open `http://localhost:8000`

### Implemented Requirements

- Cube in scene
- Two spheres in scene
- Point light with:
  - animation over time
  - slider position control
  - visible cube marker at light location
- Camera controls:
  - sliders (yaw/pitch/distance)
  - keyboard (Arrow keys + Q/E zoom)
- Phong shader lighting in fragment shader:
  - ambient + diffuse + specular
- Normals passed to shader and transformed with normal matrix
- Normal visualization toggle
- Lighting on/off toggle
- Spot light added with cutoff slider
- Point and spot lights can be toggled individually
- OBJ model loaded (`models/icosahedron.obj`)
- World-like scene integration (ground/walls + objects)
