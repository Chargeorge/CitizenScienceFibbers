
// globals
var assignedTask = null;
var channelContext = null;
var bufferContext = null;
var amLying = false;
var preLying = true;
var lieImPlaykng;
var addedSegIds = [];
var remSegIds = [];
var consensusSegIds = [];

var JSONGuesses = [
  '{"addedSegIds":[2622],"remSegIds":[565,2811],"allSegIds":[2254,2651,2895,2622],"taskId":753588,"comment":"","lieAccuracy":0,"origAccuracy":0}'

]


// constants
var CHUNK_SIZE = 128;

var CHUNKS = [
  [0,0,0],
  [1,0,0],
  [0,1,0],
  [1,1,0],
  [0,0,1],
  [1,0,1],
  [0,1,1],
  [1,1,1]
];

function setContexts(channel, buffer) {
  channelContext = channel;
  bufferContext = buffer;
}

function setTask(task) {
  task.selected = [];
  assignedTask = task;
  assignedTask.tiles = {};
}

///////////////////////////////////////////////////////////////////////////////
/// utils

function isSeed(segId) {
  return assignedTask.seeds.indexOf(segId) !== -1;
}

function isConsensus(segId){
  return consensusSegIds.indexOf(segId) !== -1;
}

function isSelected(segId) {
  return assignedTask.selected.indexOf(segId) !== -1;
}

function clamp(val, min, max) {
  return Math.max(Math.min(val, max), min);
}

function rgbEqual(rgb1, rgb2) {
  return rgb1[0] === rgb2[0] && rgb1[1] === rgb2[1] && rgb1[2] === rgb2[2];
}

function rgbToSegId(rgb) {
  return rgb[0] + rgb[1] * 256 + rgb[2] * 256 * 256;
}

function segIdToRGB(segId) {
  var blue = Math.floor(segId / (256 * 256));
  var green = Math.floor((segId % (256 * 256)) / 256);
  var red = segId % 256;

  return [red, green, blue];
}

///////////////////////////////////////////////////////////////////////////////
/// classes
function Tile(id) {
  this.id = id;
  this.count = 0;
  this.segmentation = {};
  this.channel = {};
}

Tile.prototype.isComplete = function () {
  return this.count === 8; // 4 channel, 4 segmentation
};

function convertBase64ImgToImage(b64String, callback) {
  var imageBuffer = new Image();

  imageBuffer.onload = function () {
    callback(this);
  };

  imageBuffer.src = b64String;
}

Tile.prototype.load = function (data, type, x, y, callback) {
  var _this = this;

  var chunk = y * 2 + x;

  if (_this[type][chunk]) {
    return; // chunk already loaded or in queue
  }

  _this[type][chunk] = true; // mark it as being in progress

  tileLoadingQueue.push(function () {
    convertBase64ImgToImage(data, function (image) {
      // process image
      bufferContext.drawImage(image, 0, 0);
      _this[type][chunk] = bufferContext.getImageData(0, 0, CHUNK_SIZE, CHUNK_SIZE);
      _this.count++;

      if (_this.isComplete()) { // all tiles have been loaded
        callback(_this);
      }
    });
  });
};

// draw this tile in the 2d view and update the plane position in the 3d view
Tile.prototype.draw = function () {
  plane.position.z = -0.5 + (currentTile / 256);
  ThreeDViewRender();

  for (var i = 0; i < 4; i++) {
    var x = i % 2;
    var y = i < 2 ? 0 : 1;

    if (!this.isComplete()) {
      return;
    }

    var segData = this.segmentation[i];
    var targetData = this.channel[i];

    channelContext.putImageData(
      highlight(targetData, segData),
      x * CHUNK_SIZE,
      y * CHUNK_SIZE
    );
  }
};



// returns the the segment id located at the given x y position of this tile
Tile.prototype.segIdForPosition = function(x, y) {
  var chunkX = Math.floor(x / CHUNK_SIZE);
  var chunkY = Math.floor(y / CHUNK_SIZE);
  var chunkRelX = x % CHUNK_SIZE;
  var chunkRelY = y % CHUNK_SIZE;
  var data = this.segmentation[chunkY * 2 + chunkX].data;
  var start = (chunkRelY * CHUNK_SIZE + chunkRelX) * 4;
  var rgb = [data[start], data[start+1], data[start+2]];
  return rgbToSegId(rgb);
};

// image operations

// perform the 2d and 3d interactions when selecting a segment
// by default, this will toggle the highlighting of the segment in 2d view,
// the visibility of the segment in 3d view, and the presence of the segment in the selected list (for submission)

function checkIds(){
  var badSegsRemoved = [];
  var segsRepaired = [];

  var superFlousAdditions;
  var extraDeletions;

  // foreach(var i in remSegIds){
  //   if(assignedTask.selected.indexOf(i)) >=0){
  //     segsRepaired.add(i);
  //   }

  // }

  // foreach(var i in assignedTask)
}


///////////////////////////////////////////////////////////////////////////////
/// 3d code

var meshes = {};

var cameraContext1 = {
  "renderer" : new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
    alpha: false,
  }),
  "scene" : new THREE.Scene(),
  "cube" : {},
  "camera" : {}, 
  "light" : {},
  "center": {},
  "plane" : {}

};

var cameraContext2 = {
  "renderer" : new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
    alpha: false,
  }),
  "scene" : new THREE.Scene(),
  "cube" : {},
  "camera" : {}, 
  "light" : {},
  "center": {},
  "plane" : {}

};
cameraContext1.renderer.setDepthTest(false);

cameraContext2.renderer.setDepthTest(false);
// rendererTwo.setDepthTest(false);

setScene(cameraContext1);

setScene(cameraContext2);

var threeDContainer = $('#3dContainer');
var threeDContainerTwo = $("#3dContainerTwo");
cameraContext1.renderer.setSize(threeDContainer.width(), threeDContainer.height());
cameraContext2.renderer.setSize(threeDContainerTwo.width(), threeDContainerTwo.height());

// rendererTwo.setSize(threeDContainer.width(), threeDContainer.height());
threeDContainer.html(cameraContext1.renderer.domElement);
threeDContainerTwo.html(rendererTwo .domElement);
alert("Setup complete");
// THREEJS objects


// var scene, camera, light, segments, cube, center, plane;
// var scene2, camera2, segments2, cube2, center2, plane2;

// Rotate an object around an arbitrary axis in world space
function rotateAroundWorldAxis(object, axis, radians) {
    var rotWorldMatrix = new THREE.Matrix4();
    rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);

    rotWorldMatrix.multiply(object.matrix);                // pre-multiply

    object.matrix = rotWorldMatrix;
    object.rotation.setFromRotationMatrix(object.matrix);
}

function getCube(){

}



function setScene(cameraContext) {
  cameraContext.camera = new THREE.PerspectiveCamera(
    60, // Field of View (degrees)
    1, // Aspect ratio (set later)
    1, // Inner clipping plane
    100 // Far clipping plane
  );
  cameraContext.camera.position.set(0, 0, 1.8);
  cameraContext.camera.up.set(0, 1, 0);

  center = new THREE.Vector3(0,0,0);

  cameraContext.camera.lookAt(center);

  var mesh = new THREE.Mesh( new THREE.BoxGeometry( 1, 1, 1 ), new THREE.MeshNormalMaterial() );
  cameraContext.cube = new THREE.BoxHelper( mesh );
  cameraContext.cube.material.color.set( 0x555555 );

  cameraContext.viewport = new THREE.Object3D();
  cameraContext.segments = new THREE.Object3D();

  cameraContext.light = new THREE.DirectionalLight(0xffffff);

  var planeGeo = new THREE.PlaneBufferGeometry( 1, 1, 1 );

  var material = new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.2} );
  cameraContext.plane = new THREE.Mesh( planeGeo, material );

  cameraContext.cube.add(plane);

  var xAxis = new THREE.Vector3(1,0,0);
  rotateAroundWorldAxis(cameraContext.cube, xAxis, Math.PI / 2);

  cameraContext.scene.add(cameraContext.cube);
  cameraContext.cube.add(cameraContext.segments);
  cameraContext.scene.add(cameraContext.light);
  cameraContext.scene.add(cameraContext.camera);
}


$("#3dContainer canvas").mousemove(function (e) {
  var jThis = $(this);
  var parentOffset = jThis.offset();
  var relX = e.pageX - parentOffset.left;
  var relY = e.pageY - parentOffset.top;

  mouseX = relX / jThis.width() - 0.5;
  mouseY = relY / jThis.height() - 0.5;
});


// flags for energy efficiency
var animating = false;
var canvasHasFocus = false;

$("#3dContainer canvas").mouseenter(function (e) {
  canvasHasFocus = true;
  if (!animating) {
    animating = true;
    requestAnimationFrame(animate);
  }
})
.mouseout(function () {
  canvasHasFocus = false;
});

// rotates the cube based on mouse position
function animate() {
  var dx = (4 * mouseX - camera.position.x) * 0.05;
  var dy = (-4 * mouseY - camera.position.y) * 0.05;

  if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
    ThreeDViewRender(dx, dy);
    requestAnimationFrame(animate);
  }
  else if (canvasHasFocus) {
    requestAnimationFrame(animate);
  }
  else {
    animating = false;
  }
}

// rerenders the 3d world
function ThreeDViewRender(dx, dy) {
  dx = (dx === undefined) ? 0 : dx;
  dy = (dy === undefined) ? 0 : dy;

  camera.position.x += dx;
  camera.position.y += dy;
  camera.lookAt(center);

  light.position.set(camera.position.x, camera.position.y, camera.position.z);

  renderer.render(scene, camera);
}

// adds the segment to the 3d world
function ThreeDViewAddSegment(segId, partOfOriginial) {
  
  segments.add(meshes[segId]);
}

// removes the segment from the 3d world and instantly rerenders
function THREEDViewRemoveSegment(segId, partOfOriginial) {
  segments.remove(meshes[segId]);

  ThreeDViewRender();
}

///////////////////////////////////////////////////////////////////////////////
/// loading 3d mesh data

// loads the mesh for the given segment in the given volume. Calls the done handler
// when the mesh is ready for display. If the mesh is selected or is a seed, it
// displays the segment.
function displayMeshForVolumeAndSegId(volume, segId, done) {
  var doneWrapper = function () {
    if (done) {
      done();
    }
    ThreeDViewRender();
  };

  if (meshes[segId]) {
    ThreeDViewAddSegment(segId);
    doneWrapper();
  } else {
    var segmentMesh = new THREE.Object3D();
    meshes[segId] = segmentMesh;

    var count = CHUNKS.length; // ensure that we have a response for each chunk

    CHUNKS.forEach(function(chunk) {


        getMeshForVolumeXYZAndSegId(volume, chunk, segId, getColorForSegId(segId),function (mesh) {
        count--;
        if (mesh) {
          segmentMesh.add(mesh);
        }
        if (count === 0) {
          segmentMesh.position.set(-0.5, -0.5, -0.5); // since the vertexes are from 0 to 1, we want to center around 0

          if (isSelected(segId) || isSeed(segId)) {
            ThreeDViewAddSegment(segId);
          }

          doneWrapper();
        }
      });
    });
  }
}

function getColorForSegId(segId){
  if(amLying){
      if(addedSegIds.indexOf(segId) >= 0 ){
        return 'purple'; 
      }else if(remSegIds.indexOf(segId) >= 0){
        return 'red';
      }
      else{
        return 'blue';
      }
  }
  else{
    return (isSeed(segId)) ? 'blue' : 'green';
  }
}

// loads the VOA mesh for the given segment in the given chunk from the EyeWire data server into a Three JS mesh.
// passes the mesh to the done handler as a single argument or passes false if there is no mesh for the given segment in the chunk
// function getMeshForVolumeXYZAndSegId(volume, chunk, segId, done) {
//   var meshUrl = 'http://cache.eyewire.org/volume/' + volume + '/chunk/0/'+ chunk[0] + '/' + chunk[1] + '/' + chunk[2] + '/mesh/' + segId;

//   var req = new XMLHttpRequest();
//   req.open("GET", meshUrl, true);
//   req.responseType = "arraybuffer";

//   req.onload = function (event) {
//     var data = req.response;

//     if (data) {
//       var mesh = new THREE.Segment(
//         new Float32Array(data),
//         new THREE.MeshLambertMaterial({
//           color: isSeed(segId) ? 'blue' : 'green'
//         })
//       );

//       done(mesh);
//     } else {
//       done(false);
//     }
//   };

//   req.send();
// }

function getMeshForVolumeXYZAndSegId(volume, chunk, segId, color,  done) {
  var meshUrl = 'http://cache.eyewire.org/volume/' + volume + '/chunk/0/'+ chunk[0] + '/' + chunk[1] + '/' + chunk[2] + '/mesh/' + segId;

  var req = new XMLHttpRequest();
  req.open("GET", meshUrl, true);
  req.responseType = "arraybuffer";

  req.onload = function (event) {
    var data = req.response;

    if (data) {
      var mesh = new THREE.Segment(
        new Float32Array(data),
        new THREE.MeshLambertMaterial({
          color: color
        })
      );

      done(mesh);
    } else {
      done(false);
    }
  };

  req.send();
}


function changeColor(segId, newColor){
  meshes[segId].children.forEach(function(segment) {segment.material.color.set(newColor)});

    ThreeDViewRender();
    
}

function startLying(){
  assignedTask.selected.forEach(function(segId){
    consensusSegIds.push(segId);
    amLying = true;
    changeColor(segId, 0x0000ff)
  });
   $("#beginLie").hide();
   $("#saveLie").show();
   alert("Begin making the lie.");
  //make everything blue
}

function startGuessing(){
  remSegIds.forEach(function(segId){
    var segPos = assignedTask.selected.indexOf(segId);
    assignedTask.selected.splice(segPos, 1);
    THREEDViewRemoveSegment(segId);
  });
  addedSegIds.forEach(function(segId){
    changeColor(segId, 0x0000ff);
  });
  amLying = false;
  $("#submitTask").show();
  $("#saveLie").hide();
  alert("Begin player guess.");
}


// start game
function waitForAll(asyncFunctions, done) {
  var count = asyncFunctions.length;

  asyncFunctions.forEach(function (f) {
    f(function () {
      count--;

      if (count === 0) {
        done();
      }
    });
  });
}


var currentTile;
var tileLoadingQueue = [];

// load all the tiles for the assigned task
// function loadTiles(done) {
//   var tileCount = 0;

//   var startingTile = assignedTask.startingTile;
//   currentTile = startingTile;

//   function loadTilesNicely() {
//     for (var i = 0; i < 8; i++) {
//       var load = tileLoadingQueue.shift();
//       if (load) {
//         load();
//       }
//     }

//     if (tileCount < 256) {
//       // continue to check for more tiles
//       requestAnimationFrame(loadTilesNicely);
//     }
//   }
//   requestAnimationFrame(loadTilesNicely);

//   loadTilesForAxis('xy', startingTile, function (tile) {
//     tileCount++;

//     if (tile.id === startingTile) {
//       loadedStartingTile = true;
//       tile.draw();
//       $('#channelCanvas').show();

//       register2dInteractions();
//     }

//     if (tileCount === 256) {
//       done();
//     }
//   });

//   ThreeDViewRender();
// }

function loadSeedMeshes(done) {
  var seedsLoaded = 0;
  assignedTask.seeds.forEach(function (segId) {
    displayMeshForVolumeAndSegId(assignedTask.segmentation_id, segId, function () {
      seedsLoaded++;
      if (seedsLoaded === assignedTask.seeds.length) {
        done();
      }
    });
  });
}

function loadTaskData(done) {
  waitForAll([
    loadTiles,
    loadSeedMeshes
  ], done);
}

function calculateSuccessVals(){
  var totalRemFound = 0;
  var totalAddedFound = 0;
  assignedTask.selected.forEach(function(segId){
    if(addedSegIds.indexOf(segId) !== -1){totalAddedFound++;}
  });
  remSegIds.forEach(function(segId){
    if(isSelected(segId)) {totalRemFound++;}
  });
  var totalTotal =  totalRemFound+totalAddedFound;
  var totalTotalLies = remSegIds.length + addedSegIds.length;
  alert("Player found " + totalTotal + "out of " + totalTotalLies);
}

function playTask(task) {
  setTask(task);

  $('#loadingText').show();

  var loadingIndicator = setInterval(function () {
    $('#loadingText').html($('#loadingText').html() + '.');
  }, 2000);

  loadTaskData(function () {
    console.log('we are done loading!');
    clearInterval(loadingIndicator);
    $('#loadingText').hide();
    $('#3dContainer').show();

    $('#submitTask').click(function () {
      calculateSuccessVals();
      var url = 'https://eyewire.org/2.0/tasks/' + assignedTask.id + '/testsubmit';
      $.post(url, 'status=finished&segments=' + assignedTask.selected.join()).done(function (res) {
        $('#results').html('score ' + res.score + ', accuracy ' + res.accuracy + ', trailblazer ' + res.trailblazer);
      });
    });

   
  });
}


///TODO: move this into a button to start the task
function start(JSONText) {
  obj = JSON.parse(JSONText);
  remSegIds.add
  $.post('https://eyewire.org/2.0/tasks/'+ obj.taskId + '/testassign').done(playTask);
}
