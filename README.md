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
        - [x] dts
        - [x] sections
        - [x] raceway=start-finish
        - [x] multiple widths
        - [ ] alignment-from-track
        - [ ] model and model-batch
        - [ ] track decorations
        - [ ] terrain-material
        - [ ] buildings
        - [ ] identify best curve side to place labels/annotations
    - 3D
        - [x] same support as 2D
        - [x] height
        - [ ] camber
        - [ ] cross-sections + track decorations
        - [ ] follow track cam
        - [ ] uv mapping
- documentation
    - [ ] briefly document the parser, if it gets to a usable shape
    - [ ] write a tutorial on how to create `rt.geojson` tracks from scratch
- sample apps
    - [x] debug drawing in canvas
    - [x] render 3D track from parsed data

## Bugs

- start and end way orientations seem skewed
- parsed data should be centered on 0,0, it isn't yet

## Tools

- JOSM (`brew install josm`)
- vscode with geojson as json (see .vscode/settings.json)

## Samples:

Check the samples [here](https://josepedrodias.github.io/f1gis/index.html)
