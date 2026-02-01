# Assignment 2: Blocky 3D Horse

## Author
Kingston Cheung

## Description
A 3D blocky horse created with WebGL using cubes, cylinders, and cones. The horse features hierarchical joint animation with full walking and poke animations.

## Features Implemented

### Basic Requirements (All Complete)
- [x] **Draw a Cube** - Optimized cube drawing with reusable buffer
- [x] **drawCube(Matrix M)** - Function that draws cube using transformation matrix
- [x] **Global Rotation Slider** - Camera rotation via u_GlobalRotation uniform
- [x] **renderScene() Function** - Single function handles all drawing
- [x] **8+ Body Parts** - Horse has 18+ parts (body, neck, head, muzzle, 4 legs with upper/lower/hoof each, tail, ears, eyes, nostrils, mane)
- [x] **Joint Slider Control** - All major joints controllable via sliders
- [x] **Second Level Joint** - Upper leg → Lower leg hierarchy
- [x] **tick() Animation** - Smooth walking animation loop
- [x] **Animation Toggle** - Button to start/stop animation

### Extra Credit Features (All Complete)
- [x] **Color** - Nice brown/tan coloring with shading per face
- [x] **Natural Animation** - Realistic walking gait with coordinated leg movement
- [x] **Third Level Joint** - Upper leg → Lower leg → Hoof (front left leg)
- [x] **Non-cube Primitive** - Cylinders for muzzle and tail, cones for ears
- [x] **Mouse Rotation** - Drag to rotate camera view
- [x] **Poke Animation (Shift+Click)** - Horse rears up when poked!
- [x] **Performance Optimization** - Reusable buffers, single buffer upload
- [x] **Performance Indicator** - FPS, MS, and triangle count displayed

## Controls
- **Mouse Drag**: Rotate camera view
- **Shift + Click**: Trigger poke animation (horse rears up)
- **Start/Stop Animation**: Toggle walking animation
- **Reset Pose**: Return to default pose
- **Sliders**: Manual control of individual joints

## Horse Parts (18+ total)
1. Body (main torso)
2. Neck
3. Head
4. Muzzle (cylinder)
5. Left Ear (cone)
6. Right Ear (cone)
7. Left Eye
8. Right Eye
9. Left Nostril
10. Right Nostril
11. Mane (5 segments)
12. Tail (cylinder)
13. Tail Tuft
14. Front Left Upper Leg
15. Front Left Lower Leg
16. Front Left Hoof
17. Front Right Upper Leg
18. Front Right Lower Leg
19. Front Right Hoof
20. Back Left Upper Leg
21. Back Left Lower Leg
22. Back Left Hoof
23. Back Right Upper Leg
24. Back Right Lower Leg
25. Back Right Hoof

## Joint Hierarchy
```
Body
├── Neck
│   └── Head (rotates with head nod)
│       ├── Muzzle
│       ├── Ears
│       └── Eyes
├── Front Left Leg
│   ├── Upper Leg (Level 1)
│   │   └── Lower Leg (Level 2)
│   │       └── Hoof (Level 3) ← Third level joint!
├── Front Right Leg
│   └── Upper Leg → Lower Leg → Hoof
├── Back Left Leg
│   └── Upper Leg → Lower Leg → Hoof
├── Back Right Leg
│   └── Upper Leg → Lower Leg → Hoof
└── Tail (rotates for wagging)
```

## Files
- `src/asg2.html` - Main HTML file with UI and shaders
- `src/asg2.js` - Main JavaScript with horse model and animation
- `src/Cube.js` - Optimized cube primitive class
- `src/Cylinder.js` - Cylinder and cone primitive classes

## How to Run
1. Open `src/asg2.html` in a WebGL-enabled browser
2. Or host on a local server (e.g., `python -m http.server`)

## Performance Notes
- Buffers are created once and reused for all shapes
- Achieves 60+ FPS on modern hardware
- Triangle count displayed in real-time
