# svg-path-converter [![npm version](https://img.shields.io/npm/v/svg-path-converter.svg?style=flat)](https://www.npmjs.com/package/svg-path-converter)
NPM module for converting svgs to single paths.

Based on [svgcrush](https://github.com/fdb/svgcrush).

## Installation
```
npm install --save svg-path-converter
```

## Updates

### Version 1.0.0
* Initial commit

## Usage

svgToPath(svgElement, [options])

```
import svgToPath from 'svg-path-converter';
let svg = document.querySelector("svg");
let path = svgToPath(svg);
```

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
