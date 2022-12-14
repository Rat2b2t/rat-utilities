// Globals
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
//var res = document.getElementById('results');
var mapImage = new Image();

const imageResolutionX = 3840;
const imageResolutionY = 2160;

// Target Canvas size
canvas.width = 1000;
canvas.height = 800;

window.onload = function() {
  trackTransforms(ctx);
  
  // Zoom technique by Gavin Kistner
  // Source: http://phrogz.net/tmp/canvas_zoom_to_cursor.html
  var lastX = canvas.width/2;
  var lastY = canvas.height/2;
  var scaleFactor = 1.1;
  var dragStart;
  var dragged;
  
  const zoom = (clicks) => {
    var pt = ctx.transformedPoint(lastX, lastY);
    ctx.translate(pt.x,pt.y);
    var factor = Math.pow(scaleFactor, clicks);
    ctx.scale(factor, factor);
    ctx.translate(-pt.x, -pt.y);
    redraw();
  }
 
  const redraw = () => {
    // Clear the entire canvas
    var p1 = ctx.transformedPoint(0, 0);
    var p2 = ctx.transformedPoint(canvas.width, canvas.height);
    ctx.clearRect(p1.x,p1.y,p2.x-p1.x,p2.y-p1.y);
    ctx.drawImage(mapImage, 0, 0);
   }
  
  // Initial map image load from remote origin
  mapImage.crossOrigin = "Anonymous";
  mapImage.src = "https://i.imgur.com/EvxriIt.png";
  mapImage.onload = function () {
    ctx.drawImage(mapImage, 0, 0);
    
    // Transform to center of map and redraw
    ctx.translate(-((imageResolutionX/2)-(canvas.width/2)), -((imageResolutionY/2)-(canvas.height/2)));
    redraw();
  };
  
  const handleScroll = (event) => {
    var delta = event.wheelDelta ? event.wheelDelta/40 : event.detail ? -event.detail : 0;
    if (delta) {
      zoom(delta);
    }
    return event.preventDefault() && false;
  }
  
  const mousedownHandler = (event) => {
    document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
			lastX = event.offsetX || (event.pageX - canvas.offsetLeft);
			lastY = event.offsetY || (event.pageY - canvas.offsetTop);
			dragStart = ctx.transformedPoint(lastX, lastY);
			dragged = false;
  }
  
  const mouseMoveHandler = (event) => {
    lastX = event.offsetX || (event.pageX - canvas.offsetLeft);
			lastY = event.offsetY || (event.pageY - canvas.offsetTop);
			dragged = true;
			if (dragStart){
				var pt = ctx.transformedPoint(lastX, lastY);
				ctx.translate(pt.x-dragStart.x, pt.y-dragStart.y);
				redraw();
			}
  }
  
  const mouseupHandler = (event) => {
    dragStart = null;
  }
  
  // Results updater  
  const mousePos = (event) => {
    lastX = event.offsetX || (event.pageX - canvas.offsetLeft);
    lastY = event.offsetY || (event.pageY - canvas.offsetTop);
    var pt = ctx.transformedPoint(lastX, lastY);
    var x = Math.round(pt.x);
    var y = Math.round(pt.y);

    var p = ctx.getImageData(x, y, 1, 1).data;
    results.innerHTML = '<table style="width:100%;table-layout:fixed"><td>Pixel X: ' 
      + x + '</td><td>Pixel Y: ' + y + '</td><td>Nether X: ' 
      + getNetherXFromPixelX(x) + '</td><td>Nether Z: ' + getNetherZFromPixelY(y) + '</td><td>Overworld X: ' 
      + getOverworldXFromPixelX(x) + '</td><td>Overworld Z: ' + getOverworldZFromPixelY(y) +"</td></table>";
    return {x, y};
  }

  const mouseClick = (event) => {
    lastX = event.offsetX || (event.pageX - canvas.offsetLeft);
    lastY = event.offsetY || (event.pageY - canvas.offsetTop);
    var pt = ctx.transformedPoint(lastX, lastY);
    var x = Math.round(pt.x);
    var y = Math.round(pt.y);

    // Set and update pixels
    document.getElementById("x").value = x;
    document.getElementById("y").value = y;
    onPixelXInput();
    onPixelYInput();
  }
  
  // Event listeners
  canvas.addEventListener('DOMMouseScroll', handleScroll, false);
  canvas.addEventListener('mousewheel', handleScroll, false);
  canvas.addEventListener('mousedown', mousedownHandler, false);
  canvas.addEventListener('mousemove', mouseMoveHandler, false);
  canvas.addEventListener('mouseup', mouseupHandler, false);
  
  canvas.addEventListener('mousemove', mousePos, false);
  canvas.addEventListener('click', mouseClick, false);
}

// Adds ctx.getTransform() - returns an SVGMatrix
// Adds ctx.transformedPoint(x,y) - returns an SVGPoint
const trackTransforms = (ctx) => {
  var svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
  var xform = svg.createSVGMatrix();
  ctx.getTransform = function(){ return xform; };

  var savedTransforms = [];
  var save = ctx.save;
  ctx.save = function(){
    savedTransforms.push(xform.translate(0,0));
    return save.call(ctx);
  };
  var restore = ctx.restore;
  ctx.restore = function(){
    xform = savedTransforms.pop();
    return restore.call(ctx);
  };

  var scale = ctx.scale;
  ctx.scale = function(sx,sy){
    xform = xform.scaleNonUniform(sx,sy);
    return scale.call(ctx,sx,sy);
  };
  var rotate = ctx.rotate;
  ctx.rotate = function(radians){
    xform = xform.rotate(radians*180/Math.PI);
    return rotate.call(ctx,radians);
  };
  var translate = ctx.translate;
  ctx.translate = function(dx,dy){
    xform = xform.translate(dx,dy);
    return translate.call(ctx,dx,dy);
  };
  var transform = ctx.transform;
  ctx.transform = function(a,b,c,d,e,f){
    var m2 = svg.createSVGMatrix();
    m2.a=a; m2.b=b; m2.c=c; m2.d=d; m2.e=e; m2.f=f;
    xform = xform.multiply(m2);
    return transform.call(ctx,a,b,c,d,e,f);
  };
  var setTransform = ctx.setTransform;
  ctx.setTransform = function(a,b,c,d,e,f){
    xform.a = a;
    xform.b = b;
    xform.c = c;
    xform.d = d;
    xform.e = e;
    xform.f = f;
    return setTransform.call(ctx,a,b,c,d,e,f);
  };
  var pt  = svg.createSVGPoint();
  ctx.transformedPoint = function(x,y){
    pt.x=x; pt.y=y;
    return pt.matrixTransform(xform.inverse());
  }
}

// Sidebar
const baseX = -245760;
const baseZ = -138240;
const totalX = 491520;
const totalZ = 276480;

const xShiftPerPixel = totalX / imageResolutionX;
const zShiftPerPixel = totalZ / imageResolutionY;

const getOverworldX = () => {
  return document.getElementById("overworld-x").value;
}

const onOverworldXInput = () => {
  const overworldX = getOverworldX();
  //setPixelX
  const pixelX = Math.round((overworldX - baseX) / xShiftPerPixel);
  setPixelX(pixelX);
  //setNetherX
  const netherX = Math.round(overworldX/8);
  setNetherX(netherX);
}

const setOverworldX = (overworldX) => {
  document.getElementById("overworld-x").value = overworldX;
}

const getOverworldZ = () => {
  return document.getElementById("overworld-z").value;
}

const onOverworldZInput = () => {
  const overworldZ = getOverworldZ();
  //setPixelY
  const pixelY = Math.round((overworldZ - baseZ) / zShiftPerPixel);
  setPixelY(pixelY);
  //setNetherZ
  const netherZ = Math.round(overworldZ/8);
  setNetherZ(netherZ);
}

const setOverworldZ = (overworldZ) => {
  document.getElementById("overworld-z").value = overworldZ;
}

const getPixelX = () => {
  return document.getElementById("x").value;
}

const onPixelXInput = () => {
  const pixelX = getPixelX();
  //setOverworldX
  const overworldX = getOverworldXFromPixelX(pixelX);
  setOverworldX(overworldX);
  //setNetherX
  const netherX = Math.round(overworldX/8);
  setNetherX(netherX);
}

const setPixelX = (pixelX) => {
  document.getElementById("x").value = pixelX;
}

const getPixelY = () => {
  return document.getElementById("y").value;
}

const onPixelYInput = () => {
  const pixelY = getPixelY();
  //setOverworldZ
  const overworldZ = getOverworldZFromPixelY(pixelY);
  setOverworldZ(overworldZ);
  //setNetherZ
  const netherZ = Math.round(overworldZ/8);
  setNetherZ(netherZ);
}

const setPixelY = (pixelY) => {
  document.getElementById("y").value = pixelY;
}

const getNetherX = () => {
  return document.getElementById("nether-x").value;
}

const onNetherXInput = () => {
  const netherX = getNetherX();
  //setOverworldX
  const overworldX = Math.round(netherX*8);
  setOverworldX(overworldX);
  //setPixelX
  const pixelX = Math.round((overworldX - baseX) / xShiftPerPixel);
  setPixelX(pixelX);
}

const setNetherX = (netherX) => {
  document.getElementById("nether-x").value = netherX;
}

const getNetherZ = () => {
  return document.getElementById("nether-z").value;
}

const onNetherZInput = () => {
  const netherZ = getNetherZ();
  //setOverworldZ
  const overworldZ = Math.round(netherZ*8);
  setOverworldZ(overworldZ);
  //setPixelY
  const pixelY = Math.round((overworldZ - baseZ) / zShiftPerPixel);
  setPixelY(pixelY);
}

const setNetherZ = (netherZ) => {
  document.getElementById("nether-z").value = netherZ;
}

const getOverworldXFromPixelX = (pixelX) => {
  return baseX + (pixelX * xShiftPerPixel);
}

const getOverworldZFromPixelY = (pixelY) => {
  return baseZ + (pixelY * zShiftPerPixel)
}

const getNetherXFromPixelX = (pixelX) => {
  return Math.round(getOverworldXFromPixelX(pixelX) / 8);
}

const getNetherZFromPixelY = (pixelY) => {
  return Math.round(getOverworldZFromPixelY(pixelY) / 8);
}