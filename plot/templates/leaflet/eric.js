  var bounds = [[0,0], [512, 1128]];

  // initialize the map
  var map = L.map('map', {
    crs: L.CRS.Simple,
    maxBounds: bounds,
    maxBoundsViscosity: 1.0,
    minZoom: 0,
    maxZoom: 3
  });
  
  var image = L.imageOverlay('http://107.181.153.125/img/1_4_513_approaches.png', bounds).addTo(map);
  
  function drawShit(){
	  var circle2 = L.circle([400, 550], {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.5,
      radius: 1
    }).addTo(map);
	
		var polyline = L.polyline([[300,600],[400,550]], {color: 'red', weight: '2'}).addTo(map);
		var marker = L.marker([300,600]).addTo(map);
		marker.bindPopup("Hello World!");
		circle2.bindPopup("Fuck!");
    
    getHole();
	}
  
  function getHole(){
    var e = document.getElementById('holeSelect');
    var hole = e.options[e.selectedIndex].value;
    
    var e = document.getElementById('playerSelect');
    var player = e.options[e.selectedIndex].value;
    
    var e = document.getElementById('roundSelect');
    var round = e.options[e.selectedIndex].value;
    
    console.log("Hole " + hole)
    console.log("Player " + player)
    console.log("Round " + round)
  }

	function clearShit(){
		for(i in map._layers) {
			if(map._layers[i]._path != undefined) {
				try {
					map.removeLayer(map._layers[i]);
				}
				catch(e) {
					console.log("problem with " + e + map._layers[i]);
				}
			}
		}
	}
  
 function loadJSON(callback) {   

    var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
    xobj.open('GET', '01810.json', true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
          }
    };
    xobj.send(null);  
 }
  
  function updateMap(){
    var e = document.getElementById('holeSelect');
    var hole = e.options[e.selectedIndex].value;
    
    var e = document.getElementById('playerSelect');
    var player = e.options[e.selectedIndex].value;
    
    var e = document.getElementById('roundSelect');
    var round = e.options[e.selectedIndex].value;
    
    console.log("Hole " + hole);
    console.log("Player " + player);
    console.log("Round " + round);

    loadJSON(function(response){
      var a = JSON.parse(response);
      console.log(a);
      
    });
    
  }
  
  function plot(){
    
    
    
    
    
  }
  
  
  
  
	
  map.fitBounds(bounds);
  
  
  var CanvasLayer = L.GridLayer.extend({
    createTile: function(coords){
        // create a <canvas> element for drawing
        var tile = L.DomUtil.create('canvas', 'leaflet-tile');
        // setup tile width and height according to the options
        var size = this.getTileSize();
        tile.width = size.x;
        tile.height = size.y;
        // get a canvas context and draw something on it using coords.x, coords.y and coords.z
        var ctx = tile.getContext('2d');
        // return the tile so it can be rendered on screen
        return tile;
    }
  });  