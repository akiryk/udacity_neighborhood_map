/** 
 * MAP
 * Google Map Key: AIzaSyA9_V4fG-umELVwoyKKRm4jQ8XODuwV9MA
 * 
 */

var map;

var app = (function(){
	'use strict';

	var infoWindow,
			currentIncident;

	/*
	 * Incident Model
	 * @param {json} incidentData - data for a single gun violence incident.
	 */
	var Incident = function(incidentData){

		var self = this;

		this.date = ko.observable(incidentData['Incident Date']);

		this.desc = ko.computed(function(){
			var desc;
			if (incidentData['# Killed']==0){
				desc = incidentData['# Injured'] + ' Injured';
			} else if (incidentData['# Injured'] == 0){
				desc = incidentData['# Killed'] + ' Killed';
			} else {
				desc = incidentData['# Killed'] + ' Killed and ' + incidentData['# Injured'] + ' Injured';
			}
			return desc;
		}, this);

		this.location = ko.computed(function(){
			return incidentData['City Or County'] + ', ' + incidentData['State'];
		}, this);

		this.marker = new google.maps.Marker({
	      position: new google.maps.LatLng(incidentData['latitude'], incidentData['longitude']),
	      map: map,
	      parent: this
		  });

		// data doesn't need to be an observable. 
		// we can reference when necessary to get additional information
		// about an incident.
		this.data = incidentData;

	}

	Incident.prototype.onClickMarker = function(evt){
    if (map.getZoom()<12){
    	map.setZoom(12);
    	map.setCenter(this.marker.getPosition());
    }
    this.setupInfoWindow();
	}

	Incident.prototype.onClickListItem = function(evt){
		map.setZoom(12);
    map.setCenter(this.marker.getPosition());
    this.setupInfoWindow();
	}

	Incident.prototype.setupInfoWindow = function(){
		currentIncident = this;
    infoWindow.setContent(this.desc());
    infoWindow.open(map, this.marker);

		// infoWindow.setPosition({lat:this.data.latitude,lng:this.data.longitude});
    var searchString = 'Shooting, ' + this.date() + ', ' + this.location();
  	searchNews(searchString);
	}

	/*
	 * Knockout ViewModel 
	 * @param {json} allIncidents - set of data in json format.
	 */
	var AppViewModel = function(allIncidents){

		var self = this,
				pos,
				marker,
				inc;
				
		this.markers = ko.observableArray([]);

		// List of gun violence incidents
		this.incidentList = ko.observableArray([]);

		this.listOfStates = ko.observableArray([]);

		// Loop through json data for all incidents
		allIncidents.forEach(function(singleIncident){
			inc = new Incident(singleIncident);
			self.incidentList.push(inc);
			inc.marker.addListener('click', inc.onClickMarker.bind(inc));
			self.markers.push(inc.marker);
			// Add each state to list only once
			if (self.listOfStates().indexOf(singleIncident['State'])<0){
				self.listOfStates.push(singleIncident['State']);
			}
		});

		//initMarkerClusters(self.markers());

		// Maintain a list of incidents that won't change
		// so we can reset list when necessary.
		this.fixedList = this.incidentList.slice(0);

		this.months = ko.observableArray(['All', 'February', 'March', 'April','May','June','July','August','September','October','November','December']);

		this.selectedMonth = ko.observable('All');

		// Sort states alphabetically
		this.listOfStates().sort();

		// Add 'All' as first option in list of states
		this.listOfStates().unshift('All');

		this.selectedState = ko.observable('All');

		this.selectedIncident = ko.observable();

		/**
		 * Make an incident "Active" when a user clicks on it
		 * This means: change the css of the list item and
		 * display the proper marker on the map
		 */
		this.setIncident = function(clickedIncident, event){
			$(self.selectedIncident()).removeClass('active');
			self.selectedIncident(event.currentTarget);
			$(self.selectedIncident()).addClass('active');
    	// map.setCenter({lat: clickedIncident.data.latitude, lng: clickedIncident.data.longitude});
    	window.setTimeout(function(){
    		clickedIncident.marker.setAnimation(null);
    	}, 2500);
    	clickedIncident.marker.setAnimation(google.maps.Animation.BOUNCE);
    	clickedIncident.onClickListItem();
		}

		/*
		 * Reset list of incidents
		 * Revert to original complete list without filters
		 * and update the filter menus to 'All'
		 */
		this.resetIncidents = function(){
			self.incidentList(self.fixedList);
			self.selectedState('All');
			self.selectedMonth('All');
			map.setZoom(5);
			map.setCenter({lat: 37.856365, lng: -98.341694});
			this.markers().forEach(function(marker){
				marker.setMap(map);
			});
			infoWindow.close();
		}

		/*
		 * Filter the list of incidents based on
		 * currently selected 'state' and 'month' 
		 */
		this.filterIncidents = function(){
			// Reset incidentList to the original complete list.
			self.incidentList(self.fixedList);	
			
			var state = self.selectedState(),
					month = self.selectedMonth();

			if (state.toLowerCase() !== 'all'){
				// Filter out all incidents that don't match the state name.
				self.incidentList(self.incidentList().filter(function(el){
					return el.data['State'] == state;
				}));
			}

			if (month.toLowerCase() !== 'all'){
				self.incidentList(self.incidentList().filter(function(el){
					return el.date().split(' ')[0] == month;
				}));
			}

			this.markers().filter(function(marker){
				if(self.incidentList().indexOf(marker.parent)!=-1){
					return true;
				} else {
					marker.setMap(null);
				}
			});
			//self.mc.clearMarkers()
			//initMarkerClusters(newMarkers);
		}

		/**
		 * Listen to changes in the filters. When there is a change,
		 * fire the filterIncidents() function.
		 */
		this.selectedState.subscribe(this.filterIncidents, this);
		this.selectedMonth.subscribe(this.filterIncidents, this);

		/**
   * Use MarkerClusterer library to cluster markers
   * This helps performance when handling large numbers of markers
   * by only displaying 1 marker for multiple instances that
   * occur in the same general area.
   */
		function initMarkerClusters(markers){
			var mcOptions = {gridSize: 50, maxZoom: 15};
		  self.mc = new MarkerClusterer(map, markers, mcOptions);
		}	

	}

	/** 
	 * Load json data for incidents of gun violence.
	 * On success, instantiate knockout and pass it the data.
	 * Note: this function won't fire until map is ready.
	 */
	function loadData(){
		var getData = $.getJSON( "dev/data/shooting_incidents.json", function() {
		})
			.done(function(data){
				ko.applyBindings(new AppViewModel(data));
			})
			.fail(function(msg){
				console.log('error: ' + msg);
			});
	}

	// This code generates a "Raw Searcher" to handle search queries. The Raw 
	// Searcher requires you to handle and draw the search results manually.
	google.load('search', '1');

	var newsSearch;

	var infoTemplate = 	'<h2 class="info-heading">%title%</h2>' +
											'<ul class="news-stories">%list-items%</ul>';

	function searchComplete() {
		console.dir(currentIncident);
	  // Check that we got results
	  if (newsSearch.results && newsSearch.results.length > 0) {

	  	var listItems = '';
	  	var len = newsSearch.results.length;// > 3 ? 3:newsSearch.results.length;
	  	for (var i=0; i<len; i++){
	  		listItems += '<li><a href="' + newsSearch.results[i].unescapedUrl + '">' + newsSearch.results[i].titleNoFormatting + '</a></li>';
	  	}

	  	var str = infoTemplate.replace(/%title%/i, currentIncident.data['# Killed'] + ' killed and ' + currentIncident.data['# Injured'] + ' injured in shooting near ' + currentIncident.location());
	  	str = str.replace(/%list-items%/i, listItems);
	  	infoWindow.setContent(str);
	  
	  } else {

	  }
	}

	function searchNews(searchString){
	  // Create a News Search instance.
	  newsSearch = new google.search.NewsSearch();
	  // Set searchComplete as the callback function when a search is 
	  // complete.  The newsSearch object will have results in it.
	  newsSearch.setSearchCompleteCallback(this, searchComplete, null);

	  // Specify search quer(ies)
	  newsSearch.execute(searchString);

	  // Include the required Google branding
	  //google.search.Search.getBranding('branding');

	} 

	return {
		init: function(){
			loadData();
			infoWindow = new google.maps.InfoWindow({ maxWidth: 300 });
		}
	}

})();

/**
 * Render Google map
 * This function is called by the google map's API
 */
function initMap() {
	var myLatLng = {lat: 37.856365, lng: -98.341694};

  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 37.856365, lng: -98.341694},
    zoom: 5
  }); 
  
  app.init();
}