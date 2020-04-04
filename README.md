# svg-path-converter [![npm version](https://img.shields.io/npm/v/svg-path-converter.svg?style=flat)](https://www.npmjs.com/package/svg-path-converter)
NPM module for converting svgs to single paths.  
This can be useful for icons and other monochromatic SVGs.  
`<text>` is currently not supported.

Initial code based on [svgcrush](https://github.com/fdb/svgcrush).

## Installation
```
npm install --save svg-path-converter
```

## Updates

### Version 1.0.8
* Bug fixes
* Changed options syntax

### Version 1.0.0
* Initial commit

## Usage

svgToPath(svgElement, [options])

```
import svgToPath from 'svg-path-converter';
let svg = document.querySelector("svg");
let path = svgToPath(svg);
```

### Options

| Option       | Type            | Default      | Note |
|--------------|-----------------|--------------|------|
| width        | Float           | input SVG width  | Scale output SVG to given width while preserving aspect ratio |
| height       | Float           | input SVG height | Scale output SVG to given height while preserving aspect ratio |
| precision    | Integer         | 0            | Number of digits after comma for path values |

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
