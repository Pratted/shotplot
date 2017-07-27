var LOGGING_ENABLED = true; //toggle on/off to dump output to console.
var HEIGHT = 512;
var WIDTH = 1128;

function log(message){
    if(LOGGING_ENABLED){
        console.log(message);
    }
}


class ShotPlot {
    constructor(){
        this.bounds = [[0,0], [HEIGHT, WIDTH]];

        this.map = L.map('map', {
            crs: L.CRS.Simple,
            maxBounds: this.bounds,
            maxBoundsViscosity: 1.0,
            minZoom: 0,
            maxZoom: 3
        });

        this.map.fitBounds(this.bounds);

        this.shotPaths = {};
        this.longDrives = {};
        this.allDrives = {};
        this.tournamentFields = {};

        this.allDrivesPlots = {};

        this.holeMarkerCoords = {};
        this.playerShots = {};
        this.holeImages = {};
        this.currentHoleImage = null;
        this.prevPlayerID = null;

        this.flagIcon = L.icon({
            iconUrl: "/static/hole-flag.png",
        
            iconSize:     [26, 33], // size of the icon
            iconAnchor:   [13, 31] // point of the icon which will correspond to marker's location
        });

        //https://github.com/pointhi/leaflet-color-markers
        this.greenIcon = L.icon({
          iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        this.pinMarker = null;
        this.teeMarker = null;
        this.longDriveMarker = null;
    }


    /***************************************************************************************
    Get the selected value or id from select element.
    ***************************************************************************************/
    get playerID(){
        var e = document.getElementById('playerSelect');
        return e.options[e.selectedIndex].id;
    }

    get roundID(){
        var e = document.getElementById('roundSelect');
        return e.options[e.selectedIndex].value;
    }

    get tournamentID(){
        var e = document.getElementById('tournamentSelect');
        return e.options[e.selectedIndex].id;
    }

    get season(){
        var e = document.getElementById('seasonSelect');
        return e.options[e.selectedIndex].value;
    }

    get hole(){
        var e = document.getElementById('holeSelect');
        return e.options[e.selectedIndex].value;
    }

    get courseID(){
        var e = document.getElementById('roundSelect');
        return e.options[e.selectedIndex].className;
    }

    get displayAllDrives(){
        return document.getElementsByName('fieldDrives')[0].checked;
    }

    get displayLongDrive(){
        return document.getElementsByName('longDrive')[0].checked;
    }


    /**************************************************************************************
                                        Loading Tree

    loadTournaments  <-------------------------------------------- Start here on page load
        setupTournament      <---------------------------- Start here on tournament change
            clearShotPlots
            hideAll
            loadTeeAndPinMarkers
            loadLongDrives
            loadAllDrives
            loadPlayers
                setPlayerSelector
                setupPlayer        <-------------------------- Start here on Player change
                    setRoundSelector
                    setupHole         <------------------------- Start here on hole change
                        clearPlayerShotPaths
                        hideAll
                        loadHoleFullView
                        showTeeMarker
                        showPinMarker

    **************************************************************************************/

    setPlayerSelector(field){
        log("Setting player selector");
        var innerHtml = "";

        for(var i = 0; i < field.length; i++){
            var player = field[i];
            innerHtml += '<option id="' + player.player_id + '">' + player.name + "</option>\n"
        }

        log("Custom Inner Html");
        log(innerHtml);
        document.getElementById('playerSelect').innerHTML = innerHtml;
    }

    setRoundSelector(){
        var field = this.tournamentFields[this.tournamentID];
        var player = null;

        for(var i = 0; i < field.length; i++){
            if(field[i].player_id == this.playerID){
                player = field[i];
                break;
            }
        }

        var numRounds = player.round_id;
        var courseID = player.course_id;

        var innerHtml = "";
        for(var i = 1; i <= numRounds; i++){
            innerHtml += '<option class="' + courseID + '">' + i + '</option>\n';
        }

        log("Using inner html");
        log(innerHtml);
        document.getElementById('roundSelect').innerHTML = innerHtml;
    }


    /***************************************************************************************
    Load all tournaments for given season. 
    ***************************************************************************************/
    loadTournaments(){
        var xhttp = new XMLHttpRequest();
        var self = this;

        xhttp.onreadystatechange = function() {
            if(this.readyState == 4 && this.status == 200){
                log('Received tournaments from server.');
                document.getElementById('tournamentSelect').innerHTML = this.responseText;
                log(this.responseText);

                //After successfull load, load the tee & pin markers and players.
                //self.loadTeeAndPinMarkers();
                //self.loadLongDrives();
                //self.loadAllDrives();
                //self.loadPlayers();
                self.setupTournament();
            }
        }

        log("Requesting tournaments for ?year=" + this.season);

        xhttp.open("GET", '?season=' + this.season);
        xhttp.send();
    }

    /***************************************************************************************
    Get the list of players (i.e. field) for the selected tournament. 
    ***************************************************************************************/
    loadPlayers(){
        var xhttp = new XMLHttpRequest();
        var self = this;

        xhttp.onreadystatechange = function() {
            if(this.readyState == 4 && this.status == 200){
                log('Received players from server.');

                var field = self.tournamentFields[self.tournamentID] = JSON.parse(this.responseText);
                log(self.tournamentFields);

                self.setPlayerSelector(field);
                self.setupPlayer();
           }
        }
 
        log('Requesting players for ?year=' + this.season + "&tournament_id=" + this.tournamentID);
 
        xhttp.open("GET", '?season=' + this.season + "&tournament_id=" + this.tournamentID, false);
        xhttp.send();
    }

    /***************************************************************************************
    Load hole full view from URL.
    ***************************************************************************************/
    loadHoleFullView(){
        log("Downloading Hole Full view.")
        log("Hole:" + this.hole);
        log("TournamentID: " + this.tournamentID);
        log("CourseID: " + this.courseID);
        
        var url = `http://pga-tour-res.cloudinary.com/image/upload/c_fill,h_1024,b_rgb:424242/holes_2017_r_${this.tournamentID}_${this.courseID}_overhead_full_${this.hole}.jpg`;
        log(url);
        return L.imageOverlay(url, this.bounds);
    }

    /***************************************************************************************
    Setup the tournament on new tournament selection.
    ***************************************************************************************/
    setupTournament(){
        document.getElementById("holeSelect").selectedIndex = 0;
        document.getElementsByName('fieldDrives')[0].checked = false;
        document.getElementsByName('longDrive')[0].checked = false;
    
        this.clearShotPlots();
        this.hideAll();

        this.loadTeeAndPinMarkers();
        this.loadLongDrives();
        this.loadAllDrives();
        this.loadPlayers();
    }

    /***************************************************************************************
    Setup the player on new player selection.
    ***************************************************************************************/
    setupPlayer(){
        if(this.prevPlayerID){
            this.clearShotPath(this.prevPlayerID);
        }

        this.prevPlayerID = this.playerID;

        log("Setting up player " + this.playerID);
        this.setRoundSelector();
        this.setupHole();
    }

    /***************************************************************************************
    Setup the hole on new hole selection.
    ***************************************************************************************/
    setupHole(){
        log("Setting up hole.");
        var key = [this.season, this.courseID, this.hole];

        this.clearShotPath(this.playerID);
        this.loadPlayerShotPaths();

        this.updateShotPaths();
        this.hideLongDriveMarker();
        this.hideAllDrives();
        this.hideTeeMarker();
        this.hidePinMarker();

        if(this.currentHoleImage != undefined && this.map.hasLayer(this.currentHoleImage)){
            this.map.removeLayer(this.currentHoleImage);
            log("Removing old image");
        }

        //Download hole if not already cached.
        if(!(key in this.holeImages)){
            this.holeImages[key] = this.loadHoleFullView();
        }

        this.currentHoleImage = this.holeImages[key].addTo(this.map);

        this.showTeeMarker();
        this.showPinMarker();

        if(this.displayAllDrives) this.showAllDrives();
        if(this.displayLongDrive) this.showLongDriveMarker();
    }

    setupScorecard(){
        

        
    }


    /***************************************************************************************
    Load positions of Tee and Pin markers for all holes of tournament.
    If requesting the same tournament, use the cached positions.
    ***************************************************************************************/
    loadTeeAndPinMarkers(){
        var xhttp = new XMLHttpRequest();
        var self = this;

        if([this.season, this.tournamentID] in this.holeMarkerCoords){
            log("Using existing tee and pin markers.")
            return;
        }

        log("Requesting new tee and pin markers.");

        xhttp.onreadystatechange = function() {
            if(this.readyState == 4 && this.status == 200){
                log('Received tee and pin markers from server.');

                //cache the coordinates.
                var p = JSON.parse(this.responseText);
                self.holeMarkerCoords[[self.season, self.tournamentID]] = JSON.parse(this.responseText);
                log(self.holeMarkerCoords);
                log("P");
                log(p);
            }
        }

        log("Sending request: ?season=" + this.season + "&tournament_id=" + this.tournamentID + "&tee_markers=true");
        xhttp.open("GET", `?season=${this.season}&tournament_id=${this.tournamentID}&tee_markers=true`, false);
        xhttp.send();
    }

    loadLongDrives(){
        var xhttp = new XMLHttpRequest();
        var self = this;

        if([this.season, this.tournamentID] in this.longDrives){
            log("Using existing long drives.")
            return;
        }

        log("Requesting long drives.");

        xhttp.onreadystatechange = function() {
            if(this.readyState == 4 && this.status == 200){
                log('Received long drives from server.');

                //cache the coordinates.
                self.longDrives[[self.season, self.tournamentID]] = JSON.parse(this.responseText);
                log(JSON.parse(this.responseText));
            }
        }

        log("Sending request: ?season=" + this.season + "&tournament_id=" + this.tournamentID + "&long_drives=true");
        xhttp.open("GET", '?season=' + this.season + "&tournament_id=" + this.tournamentID + "&long_drives=true", false);
        xhttp.send();
    }

    loadAllDrives(){
        var xhttp = new XMLHttpRequest();
        var self = this;

        log("Requesting all drives.");

        xhttp.onreadystatechange = function() {
            if(this.readyState == 4 && this.status == 200){
                log('Received all drives from server.');
                log("Using tournamentID ");
                log(self.tournamentID);
                //cache the coordinates.
                self.allDrives[[self.season, self.tournamentID]] = JSON.parse(this.responseText);
                log(JSON.parse(this.responseText));
            }
        }

        log("Sending request: ?season=" + this.season + "&tournament_id=" + this.tournamentID + "&all_drives=true");
        xhttp.open("GET", '?season=' + this.season + "&tournament_id=" + this.tournamentID + "&all_drives=true",false);
        xhttp.send();
    }

    /***************************************************************************************
    Load all player shot paths for current tournament.
    ***************************************************************************************/
    loadPlayerShotPaths(playerID){
        playerID = playerID || this.playerID

        var xhttp = new XMLHttpRequest();
        var self = this;

        log("Requesting player shot paths.");

        //check if cached.
        if([this.tournamentID, playerID] in this.playerShots){
            log("Using existing shots for " + playerID + ".");
            self.plotShotPath(playerID);
            return;
        }

        xhttp.onreadystatechange = function() {
            if(this.readyState == 4 && this.status == 200){
                log('Received player shot paths for player ' + playerID);
  
                var shots = JSON.parse(this.responseText);
                log(self.tournamentID);
                self.playerShots[[self.tournamentID, playerID]] = shots;
                log(self.playerShots);

                self.plotShotPath(playerID);
            }
        }

        log("Sending request: ?season=" + this.season + "&tournament_id=" + this.tournamentID + "&player_id=" + playerID + "&shot_paths=true");
        xhttp.open("GET", '?season=' + this.season + "&tournament_id=" + this.tournamentID + "&player_id=" + playerID + "&shot_paths=true", false);
        xhttp.send();
    }

    showPinMarker(){
        if(this.pinMarker != undefined && this.map.hasLayer(this.pinMarker)){
            log("Pin is already plotted!");
            return;
        }

        var hole = this.holeMarkerCoords[[this.season, this.tournamentID]][this.roundID - 1][this.hole - 1];
        this.pinMarker = new L.marker([HEIGHT - (hole["pin_px_y"] / 2.0), (hole["pin_px_x"] / 2.0)]).addTo(this.map);   
    }

    hidePinMarker(){
        if(this.pinMarker != undefined && this.map.hasLayer(this.pinMarker)){
            this.map.removeLayer(this.pinMarker);
        }
    }

    showTeeMarker(){
        if(this.teeMarker != undefined && this.map.hasLayer(this.teeMarker)){
            log("Tee is already plotted!");
            return;
        }

        var hole = this.holeMarkerCoords[[this.season, this.tournamentID]][this.roundID - 1][this.hole - 1];
        this.teeMarker = new L.marker([HEIGHT - (hole["tee_px_y"] / 2.0), (hole["tee_px_x"] / 2.0)]).bindPopup("Tee").addTo(this.map);      
    }

    hideTeeMarker(){
       if(this.teeMarker != undefined && this.map.hasLayer(this.teeMarker)){
            this.map.removeLayer(this.teeMarker);
        }
    }

    showLongDriveMarker(){
        if(this.longDriveMarker != undefined && this.map.hasLayer(this.longDriveMarker)){
            log("Long Drive is already plotted!");
            return;
        }

        var longDrive = this.longDrives[[this.season, this.tournamentID]][this.roundID-1][this.hole-1];
        this.longDriveMarker = L.marker([HEIGHT - (longDrive.px_y / 2.0), (longDrive.px_x / 2.0)]).bindPopup(longDrive.player + "<br>" + longDrive.distance + " yds.").addTo(this.map);   
    }

    hideLongDriveMarker(){
        if(this.longDriveMarker != undefined && this.map.hasLayer(this.longDriveMarker)){
            this.map.removeLayer(this.longDriveMarker);
        }
    }

    showAllDrives(){
        var key = [this.season, this.tournamentID, this.roundID, this.hole];
        var drives = this.allDrives[[this.season, this.tournamentID]];
        var layerGroup = new L.layerGroup();
        var parent = this;

        var colors = {'-1': 'red', '0': 'blue', '1': 'black'};

        log("Using drives.");
        log(drives);
        log(this.tournamentID);

        if(key in this.allDrivesPlots){
            log("Using cached plots.");
            this.allDrivesPlots[key].addTo(this.map);
            return;
        }

        for(var i = 0; i < drives.length; i++){
            var drive = drives[i];

            if(drive.round_id == this.roundID && drive.hole == this.hole){
                var circle = L.circle([HEIGHT - (drive.px_y / 2.0), (drive.px_x / 2.0)], {
                    color: colors[drive.diff],
                    fillColor: colors[drive.diff],
                    fillOpacity: 0.5,
                    opacity: 0.5,
                    radius: 1
                }).bindPopup(drive.player + "<br>" + drive.distance + " yds.");

                circle.on('contextmenu',function(e){
                    log("Circle Right Clicked");
                    log(this.player_id);
                    parent.loadPlayerShotPaths(this.player_id);
                }, drive);
                layerGroup.addLayer(circle);
            }
        }

        this.allDrivesPlots[key] = layerGroup.addTo(this.map);

        log("Finished getting all drives.");
    }

    hideAllDrives(){
        //log("Hidiing all drives.");
        for(var e in this.allDrivesPlots){
            if(this.map.hasLayer(this.allDrivesPlots[e])){
                this.map.removeLayer(this.allDrivesPlots[e]);
            }
        }
    }

    toggleLongDrive(){
        log("Toggling long drive.");

        if(this.displayLongDrive){
            this.showLongDriveMarker();
        }
        else{
            this.hideLongDriveMarker();
        }
    }

    toggleAllDrives(){
        log("Toggling all drives.");

        if(this.displayAllDrives){
            this.showAllDrives();
        }
        else{
            this.hideAllDrives();
        }
    }

    plotShotPath(playerID){
        playerID = playerID || this.playerID;

        log("Using player id " + playerID);

        function compare(a,b){
            if(a.seq < b.seq) return -1;
            if(a.seq > b.seq) return 1;
            return 0;
        }

        var plot = new L.layerGroup();
        var hole = this.holeMarkerCoords[[this.season, this.tournamentID]][this.roundID - 1][this.hole - 1];
        var parent = this;

        var playerShots = this.playerShots[[this.tournamentID, playerID]];

        log("Gathered player shots.");
        log(playerShots);


        //get the shots for current hole and round.
        var shots = [];
        for(var i = 0; i < playerShots.length; i++){
            for(var j = 0; j < playerShots[i].length; j++){
                if(playerShots[i][j].c_hole == this.hole && playerShots[i][j].round_id == this.roundID){
                    shots.push(playerShots[i][j]);
                }
            }
        }

        if(shots.length == 0){
            log("No shots available for player " + playerID + " round: " + this.roundID);
            return;
        }

        log("Gathered shots for this hole.");
        log(shots);
        shots.sort(compare);

        var points = [[HEIGHT - (hole["tee_px_y"] / 2.0), (hole["tee_px_x"] / 2.0)]];

        //skip the last shot. It has inaccurate coordinates and will mess up the polyline.
        for(var i = 0; i < shots.length - 1; i++){
            var shot = shots[i];
            var coords = [HEIGHT - (shot["px_y"] / 2.0), (shot["px_x"] / 2.0)]

            points.push(coords);
            var marker = L.marker(coords, {icon: this.greenIcon, opacity: .6}).bindPopup(shot["text"]);

            //hide the shot path on right click.
            marker.on('contextmenu', function(e){
                log("Marker right clicked!");
                parent.clearShotPath(playerID);
            }, playerID)

            plot.addLayer(marker);
        }

        log(points);
        points.push([HEIGHT - (hole["pin_px_y"] / 2.0), (hole["pin_px_x"] / 2.0)]);
        
        var path = L.polyline(points, {color: 'green', weight: '2', opacity: 0.8});
        plot.addLayer(path);
        this.shotPaths[playerID] = plot.addTo(this.map);     
        log(this.tournaments);   
    }

    hideAll(){
        this.hideTeeMarker();
        this.hidePinMarker();
        this.hideLongDriveMarker();
        this.hideAllDrives();
    }

    updateShotPaths(){
        var activePlayers = [];
        log("Copying players");
        //copy current players.
        for(var key in this.shotPaths){
            log(key);
            activePlayers.push(key);
        }
        log("Removing plots");
        //remove them
        this.clearShotPlots();

        //re-add them using new hole/round.
        for(var i = 0; i < activePlayers.length; i++){
            //if(activePlayers[i] != this.playerID){
                this.plotShotPath(activePlayers[i]);           
                log("Adding path for " + activePlayers[i]);
            //}

        }
    }

    clearShotPath(playerID){
        playerID = playerID || this.playerID;

        log("Clearing shot path for player: ");
        log(playerID);

        if(this.map.hasLayer(this.shotPaths[playerID])){
            this.map.removeLayer(this.shotPaths[playerID]);
            delete this.shotPaths[playerID];
        }
    }

    clearShotPlots(){
        for(var key in this.shotPaths){
            log("REMOVING PATH");
            this.map.removeLayer(this.shotPaths[key]);
            delete this.shotPaths[key];
        } 
    }




}


 
shotplot = new ShotPlot();
shotplot.loadTournaments();



