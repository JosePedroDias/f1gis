# F1 GIS

This project showcases an implementation of the [open race track format](https://github.com/JosePedroDias/open-race-track-format) for designing race tracks.

With this I intend to:
- exercise the creation of tracks and come up with tutorial content;
- validate the how well this format captures relevant track data;
- how easy it is to use the parsed data and generate 2D/3D content from it suitable for game usage.

Will also try to create a simple Javascript racing game using the parsed track information, although that is not the main goal of this repo.

## Plan

- `rt.geojson` parsing completeness
    -  2D
        - [x] track and pit
        - [x] starting-grid and pit-stop
        - [ ] checkpoints
        - [ ] alignment-from-track
        - [ ] model and model-batch
        - [ ] track decorations
        - [ ] terrain-material
        - [ ] buildings
    - 3D
        - [ ] same support as 2D
        - [ ] camber
        - [ ] cross-sections + track decorations
- documentation
    - [ ] briefly document the parser, if it gets to a usable shape
    - [ ] write a tutorial on how to create `rt.geojson` tracks from scratch
- sample apps
    - [x] debug drawing in canvas (WIP)
    - [ ] 2D example
    - [ ] 3D example

## Bugs


## Tools

- JOSM (`brew install josm`)
- vscode with geojson as json (see .vscode/settings.json)

## Samples:

- [debug 2D map](https://josepedrodias.github.io/f1gis/debug2d.html) - renders features already supported by the parser, with auxiliary info to help debug any issues
- [sample 2D](https://josepedrodias.github.io/f1gis/sample2d.html) - WIP - will allow driving top-down with stupid simple car and camera
- [sample 3D](https://josepedrodias.github.io/f1gis/sample3d.html) - SUPER WIP - will render 3D mesh of map based on parsed data
