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
var texts = ["Viewing A", "Viewing B"];
var textIndex;
var correctIndex;
var accuracyDataOrig = 5;
var accuracyDataNew = 6;
// constants
var CHUNK_SIZE = 128;
var gameDataObj;
var JSONGuesses = [
  '{"addedSegIds":[2622],"remSegIds":[565,2811],"allSegIds":[2254,2651,2895,2622],"taskId":753588,"comment":"","lieAccuracy":0,"origAccuracy":0}',
  '{"addedSegIds":[3634,3209,2851],"remSegIds":[],"allSegIds":[2436,1978,2180,2492,3412,3539,3537,3605,3608,3588,3987,3634,3209,2851],"taskId":758040,"comment":"","lieAccuracy":0.8703303833014,"origAccuracy":0.9974903564623321}'
]


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


// image operations

// perform the 2d and 3d interactions when selecting a segment
// by default, this will toggle the highlighting of the segment in 2d view,
// the visibility of the segment in 3d view, and the presence of the segment in the selected list (for submission)


function selectSegId(segId) {
  console.log("adding more segids");
 
  // if(amLying){
  //   if(isConsensus(segId) <= 0){
  //     console.log("adding added segment");
  //     addedSegIds.push( segId);

      
  //   }else{
  //     var lieIdx = remSegIds.indexOf(segId);
  //     remSegIds.splice(lieIdx,1);
  //   }
  // }
  assignedTask.selected.push(segId);
  displayMeshForVolumeAndSegId(assignedTask.segmentation_id, segId);
  if(!amLying) {changeColor(segId, 0x00ff00);}
}

function deHighlightSegId(segId){
  // addedSegIds.splice(segId,1);
  if(remSegIds.indexOf(segId) ===-1){
    remSegIds.push(segId);
    changeColor(segId,0xff0000);
  }
  else{
    var lieIdx = remSegIds.indexOf(segId);
      
    remSegIds.splice(lieIdx,1);
    changeColor(segId,0x0000ff);
  }
   
}

function deselectSegId(segId) {  
  if( amLying){
    // if(isConsensus(segId) ){
    //   remSegIds[remSegIds.length] = segId;
    // }
    // else{
      var lieIdx = addedSegIds.indexOf(segId);
      addedSegIds.splice(lieIdx,1);

      var selectedIdx = assignedTask.selected.indexOf(segId);
      assignedTask.selected.splice(selectedIdx, 1);
 
    // }  
  }
  else{
    var selectedIdx = assignedTask.selected.indexOf(segId);
    assignedTask.selected.splice(selectedIdx, 1);
  }

  // assignedTask.tiles[currentTile].draw();
  THREEDViewRemoveSegment(segId);
}

function toggleSegId(segId) {
  var partOfOriginial;
  if (segId === 0 ) {
    return; // it a segment border or a seed
  }
  if(isSeed(segId)){
    return;
   

  }
  else{
    if(!amLying){
      partOfOriginial = false;
    }
    else{
      if(amLying && !isConsensus(segId)){
        partOfOriginial = false;
      }
      else{
        partOfOriginial = true;
      }
    }
    console.log("in orig add")
  }

  if (isSelected(segId) ) {
    if(!partOfOriginial){

     deselectSegId(segId);
    }
    else{
      deHighlightSegId(segId);
    }
  } else {
    selectSegId(segId);
  }
}

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

var renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
  alpha: false,
});
renderer.setDepthTest(false);

scene = new THREE.Scene();
setScene();
var threeDContainer = $('#3dContainer');

renderer.setSize(threeDContainer.width(), threeDContainer.height());
threeDContainer.html(renderer.domElement);



// THREEJS objects
var scene, camera, light, segments, cube, center, plane;

// Rotate an object around an arbitrary axis in world space
function rotateAroundWorldAxis(object, axis, radians) {
    var rotWorldMatrix = new THREE.Matrix4();
    rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);

    rotWorldMatrix.multiply(object.matrix);                // pre-multiply

    object.matrix = rotWorldMatrix;
    object.rotation.setFromRotationMatrix(object.matrix);
}

function setScene() {
  camera = new THREE.PerspectiveCamera(
    60, // Field of View (degrees)
    1, // Aspect ratio (set later)
    1, // Inner clipping plane
    100 // Far clipping plane
  );
  camera.position.set(0, 0, 1.8);
  camera.up.set(0, 1, 0);

  center = new THREE.Vector3(0,0,0);

  camera.lookAt(center);

  var mesh = new THREE.Mesh( new THREE.BoxGeometry( 1, 1, 1 ), new THREE.MeshNormalMaterial() );
  cube = new THREE.BoxHelper( mesh );
  cube.material.color.set( 0x555555 );

  viewport = new THREE.Object3D();
  segments = new THREE.Object3D();

  light = new THREE.DirectionalLight(0xffffff);

  var planeGeo = new THREE.PlaneBufferGeometry( 1, 1, 1 );

  var material = new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.2} );
  plane = new THREE.Mesh( planeGeo, material );

  cube.add(plane);

  var xAxis = new THREE.Vector3(1,0,0);
  rotateAroundWorldAxis(cube, xAxis, Math.PI / 2);

  scene.add(cube);
  cube.add(segments);
  scene.add(light);
  scene.add(camera);

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

  ThreeDViewRender();
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
   var url = 'https://eyewire.org/2.0/tasks/' + assignedTask.id + '/testsubmit';
      $.post(url, 'status=finished&segments=' + assignedTask.selected.join()).done(function (res) {
        
        accuracyDataOrig =  res.accuracy;
        alert("accuracy: " + res.accuracy);
      });
    amLying = true;
  //make everything blue
}

function startGuessing(){
  currentShowingTruth = false;
  // switchLie();

  //Choose a random position to start at
  textIndex = Math.floor((Math.random() * 2));

  $("#modeText").text(texts[textIndex]);
  correctIndex = !textIndex;
  remSegIds.forEach(function(segId){
      var segPos = assignedTask.selected.indexOf(segId);
        changeColor(segId, 0x0000ff);
        assignedTask.selected.splice(segPos, 1);
        THREEDViewRemoveSegment(segId);
      });
      addedSegIds.forEach(function(segId){
        changeColor(segId, 0x0000ff);
    });
  $("#submitTask").show();
  $("#saveLie").hide();
  $("#gameControls").show();
  var randomIndex2 = Math.floor((Math.random() * 2));
  if(randomIndex2 > 0) switchLie();
  alert("Begin player guess.");

     var url = 'https://eyewire.org/2.0/tasks/' + assignedTask.id + '/testsubmit';
      $.post(url, 'status=finished&segments=' + assignedTask.selected.join()).done(function (res) {
        accuracyDataNew =  res.accuracy;
        $("#grabstuff").text(getJSON());

      });
}

function switchLie(){
  if(currentShowingTruth){
    remSegIds.forEach(function(segId){
      var segPos = assignedTask.selected.indexOf(segId);
        assignedTask.selected.splice(segPos, 1);
        THREEDViewRemoveSegment(segId);
      });
      addedSegIds.forEach(function(segId){
        assignedTask.selected.push(segId);
        ThreeDViewAddSegment(segId);
    });
  } 
  else{

    addedSegIds.forEach(function(segId){
      var segPos = assignedTask.selected.indexOf(segId);
      assignedTask.selected.splice(segPos, 1);
      THREEDViewRemoveSegment(segId);
    });
    remSegIds.forEach(function(segId){
      assignedTask.selected.push(segId)
      ThreeDViewAddSegment(segId);
    });

  }
  ThreeDViewRender();
  currentShowingTruth = !currentShowingTruth;
  if(textIndex == 0) { textIndex = 1;}
  else{textIndex = 0;}
  $("#modeText").text(texts[textIndex]);
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
    $('#3dContainer').show();

    $('#submitTask').click(function () {
      calculateSuccessVals();
      
    });

   
    $('#Switch').click(switchLie);   

    $('#ChooseA').click(function(){guessIndex(0);});
    $('#ChooseB').click(function(){guessIndex(1);});

    for(var x = 0; x < consensusSegIds.length; x++){
      console.log("adding "  + consensusSegIds[x]);
      selectSegId(consensusSegIds[x]);
    }
  });

}

function guessIndex(index){
  if(correctIndex == index){
    alert("YOU GOT IT RIGHT");
  }
  else{
    alert("You Got it WRONG");
  }
}

function getJSON(){
  var objs = {
    "addedSegIds" : addedSegIds,
    "remSegIds" : remSegIds,
    "allSegIds" : assignedTask.selected,
    "taskId" : assignedTask.id ,
    "comment" : "",
    "lieAccuracy" : accuracyDataNew,
    "origAccuracy": accuracyDataOrig
  }
  return JSON.stringify(objs);
}

function loadJSON(JSONText){
  gameDataObj = JSON.parse(JSONText);
  addedSegIds = gameDataObj.addedSegIds;
  remSegIds = gameDataObj.remSegIds;
  consensusSegIds = gameDataObj.allSegIds;
  taskId = gameDataObj.taskId;
  comment = gameDataObj.comment;
  origAccuracy = gameDataObj.accuracyDataOrig;
  accuracyDataNew = gameDataObj.accuracyDataOrig;
}

///TODO: move this into a button to start the task
function start() {
  var indexToLoad = Math.floor(Math.random() * JSONGuesses.length);
  alert(indexToLoad);
  alert(JSONGuesses[indexToLoad]);
   loadJSON(JSONGuesses[indexToLoad]);
  // loadJSON('{"addedSegIds":[3634,3209,2851],"remSegIds":[],"allSegIds":[2436,1978,2180,2492,3412,3539,3537,3605,3608,3588,3987,3634,3209,2851],"taskId":758040,"comment":"","lieAccuracy":0.8703303833014,"origAccuracy":0.9974903564623321}');
  $.post('https://eyewire.org/2.0/tasks/' + taskId +'/testassign').done(playTask);
}
start();

///////////////////////////////////////////////////////////////////////////////
    $(".box-shadow-menu").click(function(){
       $("#list").toggle();
    });

