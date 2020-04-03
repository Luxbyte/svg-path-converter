const svgToPath = require('./index');
const fs = require('fs');
var jsdom = require('jsdom');
var { JSDOM }  = jsdom;

fs.readFile('./icons/luxbyte-logo.svg', (err, data) => {
  let dom = new JSDOM(data.toString());
  let svg = dom.window.document.querySelector("svg");
  console.log(svgToPath(svg, 200));
});