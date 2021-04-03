# F1 GIS

A sample JS game to exercise the idea of mashing GIS maps as a base for a top-down racing game.

This is pretty much work in progress to validate the ideas and assert playability.

This project showcases the adoption of the [open race track format](https://github.com/JosePedroDias/open-race-track-format) for designing race tracks.


## Plan

- [ ] rt.geojson parsing
  - [ ] 2D
    - [x] track and pit
    - [ ] checkpoints
    - [ ] starting-grid and pit-stop
    - [ ] alignment-from-track
    - [ ] model and model-batch
    - [ ] track decorations
    - [ ] terrain-material
    - [ ] buildings
  - [ ] 3D
    - [ ] same support as 2D
    - [ ] cross-sections + track decorations

- sample apps
  - [x] debug drawing in canvas
  - [ ] 2D example
  - [ ] 3D example

## Sample content

- [debug 2D map](https://josepedrodias.github.io/f1gis/) - renders features already supported by the parser, with auxiliary info to help debug any issues
- [sample 2D](https://josepedrodias.github.io/f1gis/2D.html) - WIP - will allow driving top-down with stupid simple car and camera
- [sample 3D](https://josepedrodias.github.io/f1gis/3D.html) - SUPER WIP - will render 3D mesh of map based on parsed data
