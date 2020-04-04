const svgToPath = require('./index');
const fs = require('fs');
var jsdom = require('jsdom');
var { JSDOM }  = jsdom;

fs.readFile('./icons/translation.svg', (err, data) => {
  let { window } = new JSDOM(data.toString());
  let svg = window.document.querySelector("svg");
  console.log(svgToPath(svg, {width: 200}));
});