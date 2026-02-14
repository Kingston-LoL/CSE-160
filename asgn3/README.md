# Assignment 3 - Horsekeeper World

## Run

Use a local server from repo root:

- `python -m http.server 8000`
- Open `http://localhost:8000/asgn3/src/asg3.html`

## Controls

- `W A S D` move
- `Q / E` rotate camera left/right
- Click canvas + move mouse for mouse look
- `R` add block in front of player
- `F` delete block in front of player
- `Space` jump

## Rubric Features Implemented

- 32x32 world from hardcoded 2D layout (`WORLD_LAYOUT`)
- Wall heights 0..4 using stacked textured cubes
- Ground from flattened cube
- Sky from giant color cube
- Perspective camera with `u_ViewMatrix` and `u_ProjectionMatrix`
- Keyboard movement and Q/E turning
- Mouse camera rotation (pointer lock)
- Multiple textures (grass, brick, wood)
- Mixed color+texture rendering via `u_texColorWeight`
- Add/delete blocks (simple Minecraft)
- Animal in world (blocky horse near stable)
- Simple game/story (collect 5 lanterns to open stable gate)
- Performance HUD (FPS and cube count)
