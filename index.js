const MOVETO = 'M';
const LINETO = 'L';
const QUADTO = 'Q';
const CURVETO = 'C';
const CLOSE = 'Z';

const SUPPORTED_ELEMENTS = ["g", "line", "rect", "circle", "ellipse", "path", "polygon"];

function joinNumbers(digits, ...numbers) {
  let s = '';
  for (let i = 0, n = numbers.length; i < n; i++) {
    let v = numbers[i];
    if (i > 0 && v >= 0) {
      s += ',';
    }
    s += v.toFixed(digits);
  }
  return s;
}

function parseUnitNumber(s) {
  if (!s) return undefined;
  let m = s.match(/^(-?[\d\.]+)(px)?$/);
  if (!m) {
    throw new Error('Could not parse number: ' + s);
  }
  let v = parseFloat(m[1]);
  if (m[2] === 'px') {
    return v;
  } else if (m[2] === undefined) {
    return v;
  } else {
   throw new Error('Unsupported unit: ' + m[2]);
  }
}

function smallestString(...strings) {
  let l;
  let smallest;
  for (let i = 0, n = strings.length; i < n; i++) {
    let s = strings[0];
    if (i === 0) {
      l = s.length;
      smallest = s;
    } else if (s.length < l) {
      smallest = s;
    }
  }
  return smallest;
}


class Transform {
  constructor(m) {
    this.m = Array.isArray(m) ? m : [1, 0, 0, 1, 0, 0];
  }

  translate(tx, ty) {
    this.m[4] += this.m[0] * tx + this.m[2] * ty;
    this.m[5] += this.m[1] * tx + this.m[3] * ty;
  }

  scale(sx, sy) {
    sx = sx !== undefined ? sx : 1.0;
    sy = sy !== undefined ? sy : sx;
    this.m[0] *= sx;
    this.m[1] *= sx;
    this.m[2] *= sy;
    this.m[3] *= sy;
  }

  transformPath(path) {
    let m = this.m;
    let newCommands = [];
    newCommands.length = path.commands.length;
    for (let i = 0, l = path.commands.length; i < l; i++) {
      let cmd = path.commands[i];
      switch(cmd.type) {
        case MOVETO:
        case LINETO:
          newCommands[i] = {
            type: cmd.type,
            x: cmd.x * m[0] + cmd.y * m[2] + m[4],
            y: cmd.x * m[1] + cmd.y * m[3] + m[5]
          };
          break;
        case QUADTO:
          newCommands[i] = {
            type: QUADTO,
            x: cmd.x * m[0] + cmd.y * m[2] + m[4],
            y: cmd.x * m[1] + cmd.y * m[3] + m[5],
            x1: cmd.x1 * m[0] + cmd.y1 * m[2] + m[4],
            y1: cmd.x1 * m[1] + cmd.y1 * m[3] + m[5]
          };
          break;
        case CURVETO:
          newCommands[i] = {
            type: CURVETO,
            x: cmd.x * m[0] + cmd.y * m[2] + m[4],
            y: cmd.x * m[1] + cmd.y * m[3] + m[5],
            x1: cmd.x1 * m[0] + cmd.y1 * m[2] + m[4],
            y1: cmd.x1 * m[1] + cmd.y1 * m[3] + m[5],
            x2: cmd.x2 * m[0] + cmd.y2 * m[2] + m[4],
            y2: cmd.x2 * m[1] + cmd.y2 * m[3] + m[5]
          };
          break;
        case CLOSE:
          newCommands[i] = { type: CLOSE };
          break;
        default:
          throw new Error('Unknown command type ' + cmd);
      }
    }
    return new Path(newCommands);
  }
}

class Path {
  constructor(commands) {
    this.commands = commands !== undefined ? commands : [];
  }

  moveTo(x, y) {
    this.commands.push({type: MOVETO, x: x, y: y});
  }

  lineTo(x, y) {
    this.commands.push({type: LINETO, x: x, y: y});
  }

  curveTo(x1, y1, x2, y2, x, y) {
    this.commands.push({type: CURVETO, x1: x1, y1: y1, x2: x2, y2: y2, x: x, y: y});
  }

  closePath() {
    this.commands.push({type: CLOSE});
  }

  close() {
    this.commands.push({type: CLOSE});
  }

  addEllipse(cx, cy, rx, ry) {
    const factor = (-1 + Math.sqrt(2)) / 3 * 4;
    let dx = rx * factor;
    let dy = ry * factor;
    let left = cx - rx;
    let right = cx + rx;
    let top = cy - ry;
    let bottom = cy + ry;
    this.moveTo(left, cy);
    this.curveTo(left, cy - dy, cx - dx, top, cx, top);
    this.curveTo(cx + dx, top, right, cy - dy, right, cy);
    this.curveTo(right, cy + dy, cx + dx, bottom, cx, bottom);
    this.curveTo(cx - dx, bottom, left, cy + dy, left, cy);
    this.close();
  }

  extend(path) {
    let commands = path.commands || path;
    Array.prototype.push.apply(this.commands, commands);
  }

  flatten() {
    return this;
  }

  transform(m) {
    if (m instanceof Transform) {
      return m.transformPath(this);
    } else {
      let t = new Transform(m);
      return t.transformPath(this);
    }
  }

  translate(tx, ty) {
    let t = new Transform();
    t.translate(tx, ty);
    return t.transformPath(this);
  }

  scale(sx, sy) {
    let t = new Transform();
    t.scale(sx, sy);
    return t.transformPath(this);
  }

  // Round off all floating-point numbers.
  // This is used to get cleaner output data when converting back to SVG.
  roundOff() {
    for (let i = 0, n = this.commands.length; i < n; i++) {
      let cmd = this.commands[i];
      switch(cmd.type) {
        case CURVETO:
          cmd.x2 = Math.round(cmd.x2);
          cmd.y2 = Math.round(cmd.y2);
          // Fall through...
        case QUADTO:
          cmd.x1 = Math.round(cmd.x1);
          cmd.y1 = Math.round(cmd.y1);
          // Fall through...
        case MOVETO:
        case LINETO:
          cmd.x = Math.round(cmd.x);
          cmd.y = Math.round(cmd.y);
      }
    }
  }

  toPathData(digits) {
    let d = '';
    let x, y;
    for (let i = 0, n = this.commands.length; i < n; i++) {
      let cmd = this.commands[i];
      if (cmd.type === MOVETO) {
        d += 'M';
        d += joinNumbers(digits, cmd.x, cmd.y);
        x = cmd.x;
        y = cmd.y;
      } else if (cmd.type === LINETO) {
        if (x === cmd.x) {
          let dAbs = 'V' + joinNumbers(digits, cmd.y);
          let dRel = 'v' + joinNumbers(digits, cmd.y - y);
          d += smallestString(dAbs, dRel);
        } else if (y === cmd.y) {
          let dAbs = 'H' + joinNumbers(digits, cmd.x);
          let dRel = 'h' + joinNumbers(digits, cmd.x - x);
          d += smallestString(dAbs, dRel);
        } else {
          let dAbs = 'L' + joinNumbers(digits, cmd.x, cmd.y);
          let dRel = 'l' + joinNumbers(digits, cmd.x - x, cmd.y - y);
          d += smallestString(dAbs, dRel);
        }
        x = cmd.x;
        y = cmd.y;
      } else if (cmd.type === QUADTO) {
        d += 'Q';
        d += joinNumbers(digits, cmd.x1, cmd.y1, cmd.x, cmd.y);
        x = cmd.x;
        y = cmd.y;
      } else if (cmd.type === CURVETO) {
        d += 'C';
        d += joinNumbers(digits, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        x = cmd.x;
        y = cmd.y;
      } else if (cmd.type === CLOSE) {
        d += 'z';
      }
    }
    return d;
  }

  // Draw the path to a 2D context.
  draw(ctx) {
    ctx.beginPath();
    let nCommands = this.commands.length;
    for (let i = 0; i < nCommands; i++) {
      let cmd = this.commands[i];
      if (cmd.type === MOVETO) {
        ctx.moveTo(cmd.x, cmd.y);
      } else if (cmd.type === LINETO) {
        ctx.lineTo(cmd.x, cmd.y);
      } else if (cmd.type === QUADTO) {
        ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
      } else if (cmd.type === CURVETO) {
        ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
      } else if (cmd.type === CLOSE) {
        ctx.closePath();
      }
    }
    ctx.fill();
  }
}

class Group {
  constructor(children) {
    this.children = children !== undefined ? children : [];
  }

  draw(ctx) {
    let n = this.children.length;
    for (let i = 0, n = this.children.length; i < n; i++) {
      this.children[i].draw(ctx);
    }
  }

  // Combines all underlying elements into a single path.
  flatten() {
    let path = new Path();
    this.children.forEach(child => {
      path.extend(child.flatten());
    });
    return path;
  }
}

function parseTransform(el, path) {
  // TODO: Currently only supports matrix(a, b, c, d, e, f)
  let transform = el.getAttribute('transform');
  if (!transform) return path;
  let m = transform.match(/matrix\((-?[\d\.]+)\s+(-?[\d\.]+)\s+(-?[\d\.]+)\s+(-?[\d\.]+)\s+(-?[\d\.]+)\s+(-?[\d\.]+)\)/);
  if (!m) return path;
  m = m.slice(1);
  m = m.map(v => parseFloat(v));
  return path.transform(m);
}

function tokenIsCommand(c) {
  return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');
}

function tokenizePathData(d) {
  let tokens = [];
  for (let i = 0; i < d.length; i++) {
    let c = d[i];
    if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) {
      tokens.push(c);
    } else if ((c >= '0' && c <= '9') || c === '.' || c === '-') {
      let start = i;
      do {
        i++;
        c = d[i];
      } while ((c >= '0' && c <= '9') || (c === '.'))
      tokens.push(parseFloat(d.substring(start, i)));
      if (i !== start) {
        i--;
      }
    } else if (c === ',' || c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      // Do nothing on whitespace.
    } else {
      throw new Error('Unknown token ' + c);
    }
  }
  return tokens;
}

function parsePath(el) {
  let path = new Path();
  let d = el.getAttribute('d');
  let tokens = tokenizePathData(d);
  let x, y, x1, y1, x2, y2;
  let i = 0;
  for (;;) {
    if (i >= tokens.length) break;
    let token = tokens[i++];
    console.assert(tokenIsCommand(token));
    if (token === 'M') {
      x = tokens[i++];
      y = tokens[i++];
      path.moveTo(x, y);
    } else if (token === 'm') {
      console.assert(x !== undefined && y !== undefined);
      x += tokens[i++];
      y += tokens[i++];
      path.moveTo(x, y);
    } else if (token === 'L') {
      while (!tokenIsCommand(tokens[i])) {
        x = tokens[i++];
        y = tokens[i++];
        path.lineTo(x, y);
      }
    } else if (token === 'H') {
      console.assert(x !== undefined && y !== undefined);
      while (!tokenIsCommand(tokens[i])) {
        x = tokens[i++];
        path.lineTo(x, y);
      }
    } else if (token === 'V') {
      console.assert(x !== undefined && y !== undefined);
      while (!tokenIsCommand(tokens[i])) {
        y = tokens[i++];
        path.lineTo(x, y);
      }
    } else if (token === 'l') {
      console.assert(x !== undefined && y !== undefined);
      while (!tokenIsCommand(tokens[i])) {
        x += tokens[i++];
        y += tokens[i++];
        path.lineTo(x, y);
      }
    } else if (token === 'h') {
      console.assert(x !== undefined && y !== undefined);
      while (!tokenIsCommand(tokens[i])) {
        x += tokens[i++];
        path.lineTo(x, y);
      }
    } else if (token === 'v') {
      console.assert(x !== undefined && y !== undefined);
      while (!tokenIsCommand(tokens[i])) {
        y += tokens[i++];
        path.lineTo(x, y);
      }
    } else if (token === 'C') {
      while (!tokenIsCommand(tokens[i])) {
        x1 = tokens[i++];
        y1 = tokens[i++];
        x2 = tokens[i++];
        y2 = tokens[i++];
        x = tokens[i++];
        y = tokens[i++];
        path.curveTo(x1, y1, x2, y2, x, y);
      }
    } else if (token === 'c') {
      console.assert(x !== undefined && y !== undefined);
      while (!tokenIsCommand(tokens[i])) {
        x1 = x + tokens[i++];
        y1 = y + tokens[i++];
        x2 = x + tokens[i++];
        y2 = y + tokens[i++];
        x += tokens[i++];
        y += tokens[i++];
        path.curveTo(x1, y1, x2, y2, x, y);
      }
    } else if (token === 'S') {
      while (!tokenIsCommand(tokens[i])) {
        x1 = x + (x - x2);
        y1 = y + (y - y2);
        x2 = tokens[i++];
        y2 = tokens[i++];
        x = tokens[i++];
        y = tokens[i++];
        path.curveTo(x1, y1, x2, y2, x, y);
      }
    } else if (token === 's') {
      console.assert(x !== undefined && y !== undefined);
      while (!tokenIsCommand(tokens[i])) {
        x1 = x + (x - x2);
        y1 = y + (y - y2);
        x2 = x + tokens[i++];
        y2 = y + tokens[i++];
        x += tokens[i++];
        y += tokens[i++];
        path.curveTo(x1, y1, x2, y2, x, y);
      }
    } else if (token === 'z' || token === 'Z') {
      path.closePath();
    } else {
      throw new Error('Unknown SVG command ' + token);
    }
  }
  path = parseTransform(el, path);
  return path;
}

function tokenizePointData(d) {
  let tokens = [];
  for (let i = 0; i < d.length; i++) {
    let c = d[i];
    if ((c >= '0' && c <= '9') || c === '.' || c === '-') {
      let start = i;
      do {
        i++;
        c = d[i];
      } while ((c >= '0' && c <= '9') || (c === '.'))
      tokens.push(parseFloat(d.substring(start, i)));
      if (i !== start) {
        i--;
      }
    } else if (c === ',' || c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      // Do nothing on whitespace.
    } else {
      throw new Error('Unknown token ' + c);
    }
  }
  return tokens;
}

function parsePolygon(el) {
  let points = el.getAttribute('points');
  let tokens = tokenizePointData(points);
  let path = new Path();
  for (let i = 0; i < tokens.length; i += 2) {
    let x = tokens[i];
    let y = tokens[i + 1];
    if (i === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  }
  path = parseTransform(el, path);
  return path;
}

function parseRect(el) {
  let x = parseFloat(el.getAttribute('x') || 0);
  let y = parseFloat(el.getAttribute('y') || 0);
  let width = parseFloat(el.getAttribute('width'));
  let height  = parseFloat(el.getAttribute('height'));
  let path = new Path();
  path.moveTo(x, y);
  path.lineTo(x + width, y);
  path.lineTo(x + width, y + height);
  path.lineTo(x, y + height);
  path.closePath();
  path = parseTransform(el, path);
  return path;
}

function parseLine(el) {
  let x1 = parseFloat(el.getAttribute('x1') || 0);
  let y1 = parseFloat(el.getAttribute('y1') || 0);
  let x2 = parseFloat(el.getAttribute('x2') || 0);
  let y2 = parseFloat(el.getAttribute('y2') || 0);
  let path = new Path();
  path.moveTo(x1, y1);
  path.lineTo(x2, y2);
  path = parseTransform(el, path);
  return path;
}

function parseEllipse(el) {
  let cx = parseFloat(el.getAttribute('cx') || 0);
  let cy = parseFloat(el.getAttribute('cy') || 0);
  let rx = parseFloat(el.getAttribute('rx'));
  let ry = parseFloat(el.getAttribute('ry'));
  let path = new Path();
  path.addEllipse(cx, cy, rx, ry);
  path = parseTransform(el, path);
  return path;
}

function parseCircle(el) {
  let cx = parseFloat(el.getAttribute('cx') || 0);
  let cy = parseFloat(el.getAttribute('cy') || 0);
  let r = parseFloat(el.getAttribute('r'));
  let path = new Path();
  path.addEllipse(cx, cy, r, r);
  path = parseTransform(el, path);
  return path;
}

// Parse the child elements and add them to the path.
function parseElement(el) {
  if (el.nodeName === 'g') {
    let paths = Array.from(el.children).map(child => parseElement(child));
    return new Group(paths);
  } else if (el.nodeName === 'path') {
    return parsePath(el);
  } else if (el.nodeName === 'polygon') {
    return parsePolygon(el);
  } else if (el.nodeName === 'rect') {
    return parseRect(el);
  } else if (el.nodeName === 'line') {
    return parseLine(el);
  } else if (el.nodeName === 'ellipse') {
    return parseEllipse(el);
  } else if (el.nodeName === 'circle') {
    return parseCircle(el);
  } else {
    throw new Error('Unsupported SVG node ' + el.nodeName);
  }
}

function parseSvg(svg) {
  let viewBox = svg.getAttribute('viewBox');
  let width = parseUnitNumber(svg.getAttribute('width'));
  let height = parseUnitNumber(svg.getAttribute('height'));
  let viewWidth, viewHeight;
  let viewX = 0;
  let viewY = 0;
  if (viewBox) {
    let m = viewBox.match(/(-?[\d\.]+)\s+(-?[\d\.]+)\s+(-?[\d\.]+)\s+(-?[\d\.]+)/);
    if (m) {
      viewX = parseFloat(m[1]);
      viewY = parseFloat(m[2]);
      viewWidth = parseFloat(m[3]);
      viewHeight = parseFloat(m[4]);
    }
  }
  let paths = Array.from(svg.children)
                   .filter(child => SUPPORTED_ELEMENTS.includes(child.nodeName))
                   .map(child => parseElement(child));
  let g = new Group(paths);
  let scale = 1;
  if (width === undefined) {
    width = viewWidth;
  }
  if (height === undefined) {
    height = viewHeight;
  }
  if (viewWidth !== undefined) {
    scale = width / viewWidth;
  }
  return {width, height, viewWidth, viewHeight, scale, tx: viewX, ty: viewY, root: g};
}

// ============================================================================================================
function svgToPath(svgElement, newWidth) {
  let svg = parseSvg(svgElement);
  let path = svg.root.flatten();

  // Compensate for view width scaling.
  path = path.scale(svg.scale);
  if (svg.tx !== 0 || svg.ty !== 0) {
    path = path.translate(-svg.tx, -svg.ty);
  }

  let viewWidth = svg.viewWidth;
  let viewHeight = svg.viewHeight;
  let width = svg.width;
  let height = svg.height;
  const ratio = svg.width / svg.height;

  // Normalize given size
  if (newWidth !== undefined) {
    let factor = newWidth / width;
    path = path.scale(factor);
    viewWidth = newWidth;
    viewHeight = newWidth / ratio;
    width = viewWidth;
    height = viewHeight;
  }

  path.roundOff();
  let d = path.toPathData();

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${viewWidth} ${viewHeight}" xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`;
}


module.exports = svgToPath;