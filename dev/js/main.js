var app = (function(){

	'use strict';

	/*
	 * Instance of a ViewModel
	 * Gives a hook for accessing the ViewModel from other objects
	 */
	var shootingViewModel;

	/*
	 * Data array
	 * Will be populated with data from an external JSON file
	 * See loadData() function below
	 */
	var incidentData = [];

	/* 
	 * An array of states with their coordinates
	 */
	var stateCoords = [];

	/*
	 * Coords for the center of the map
	 */
	var mapCenter = {lat: 37.856365, lng: -98.341694};

	/*
	 * load the Google search module with google.load(module, version)
	 */
	google.load('search', '1');

	/*
	 * Knockout ViewModel
	 * This will be called from the init function once google maps API is ready.
	 */
	var ViewModel = function(){

		var self = this;

		// Build the Google Map object. Store a reference to it.
	  this.googleMap = new google.maps.Map(document.getElementById('map'), {
	    center: mapCenter,
	    zoom: 5,
	    styles: [
	    	{
	    		"featureType":"landscape",
	    		"stylers":[
	    			{
	    				"hue":"#FFBB00"
	    			},
	    			{
	    				"saturation":43.400000000000006
	    			},
	    			{
	    				"lightness":37.599999999999994
	    			},
	    			{
	    				"gamma":1
	    			}
	    		]
	    	},
	    	{
	    		"featureType":"road.highway",
	    		"stylers":[
	    			{
	    				"hue":"#FFC200"
	    			},
	    			{
	    				"saturation":-61.8
	    			},
	    			{
	    				"lightness":45.599999999999994},
	    			{
	    				"gamma":1
	    			}
	    		]
	    	},
  			{
  				"featureType":"road.arterial",
  				"stylers":
  				[
  					{
  						"hue":"#FF0300"
		  			},
		  			{
		  				"saturation":-100
		  			},
		  			{
		  				"lightness":51.19999999999999
		  			},
		  			{
		  				"gamma":1
		  			}
  				]
  			},
  			{
  				"featureType":"road.local",
  				"stylers":
  					[
  						{
  							"hue":"#FF0300"
  						},
  						{
  							"saturation":-100
  						},
  						{
  							"lightness":52
  						},
  						{
  							"gamma":1
  						}
  					]
  				},
  				{
  					"featureType":"water",
  					"stylers":
  						[
  							{
  								"hue":"#0078FF"
  							},
  							{
  								"saturation":-13.200000000000003
  							},
  							{
  								"lightness":2.4000000000000057
  							},
  							{
  								"gamma":1
  							}
  						]
  					},
  					{
  						"featureType":"poi",
  						"stylers":
  							[
  								{
  									"hue":"#00FF6A"
  								},
  								{
  									"saturation":-1.0989010989011234
  								},
  								{
  									"lightness":11.200000000000017
  								},
  								{
  									"gamma":1
  								}
  							]
  						}
  					]
	  });

		// A set of all incidents. Not all will necessarily be displayed, depending
		// on how user filters the data.
		this.allIncidents = [];

		// A set of incidents that will display on the page based on how user
		// filters the data.
		this.visibleIncidents = ko.observableArray([]);

		// Array of states that are listed in data and will be listed
		// in the dropdown select menu.
	  this.listOfStates = [];

	  this.infoWindow = new google.maps.InfoWindow({ maxWidth: 380 });

	  /*
	 	 * Watch the list of incidents and keep track of which has been
	 	 * selected by the user.
	 	 */
		this.selectedIncident = ko.observable();

	  // Array of monthds that will be listed in select menu dropdown.
	  this.listOfMonths = ['All', 'February', 'March', 'April','May','June','July','August','September','October','November','December'];

		// Make collection of all incidents
	  incidentData.forEach(function(incident){
	  	
	  	var newIncident = new Incident(incident);
	  	
	  	self.allIncidents.push(newIncident);

	  	// Add a state to listOfStates only if it isn't already there
	  	if (self.listOfStates.indexOf(newIncident.state) == -1){
	  		self.listOfStates.push(newIncident.state);
	  	}

	  });

	  /*
	   * Sort states in the <select> menu and add 'All' to <options>
	   */
	  this.listOfStates.sort();
	  this.listOfStates.unshift('All');

	  utils.sortByState(this.allIncidents);

	  this.selectedState = ko.observable('All');
	  this.selectedState.subscribe(this.selectState.bind(this));

	  this.selectedMonth = ko.observable('All');
		this.selectedMonth.subscribe(this.selectMonth.bind(this));

	  this.allIncidents.forEach(function(incident){
	  	self.visibleIncidents.push(incident);
	  })

	  this.searchQuery = ko.observable(''); 
	  this.searchQuery.subscribe(this.applyFilters.bind(this));

	  // Make markers
	  this.allIncidents.forEach(function(incident) {
	    var markerOptions = {
	      map: self.googleMap,
	      position: incident.latlang
	    };

    	incident.marker = new google.maps.Marker(markerOptions);
    	incident.marker.addListener('click', incident.onClickMarker.bind(incident));

  	});

	};

	/*
	 * Filter the visible incidents by state, month, and search query.
	 * @param {string} value - The state, month, or search query
	 */
	ViewModel.prototype.applyFilters = function(value){
		
		var self = this;
		
		// Reset array of visible places to all places
		this.visibleIncidents(this.allIncidents);

		var state = this.selectedState(),
				month = this.selectedMonth(),
				query = this.searchQuery();

		if (state.toLowerCase() !== 'all'){
			// Filter out all incidents that don't match the state name.
			this.visibleIncidents(this.visibleIncidents().filter(function(incident){
				return incident.state == state;
			}));
		}

		if (month.toLowerCase() !== 'all'){
			// Filter out all incidents that don't match the state name.
			this.visibleIncidents(this.visibleIncidents().filter(function(incident){
				return incident.month == month;
			}));
		}

		if (query !== ''){
			// Filter out all incidents that don't match the state name.
			this.visibleIncidents(this.visibleIncidents().filter(function(incident){
				return incident.location.toLowerCase().indexOf(value.toLowerCase()) >= 0;
			}));
		}

		this.allIncidents.forEach(function(incident){
			incident.marker.setVisible(false);
		});

		this.visibleIncidents().forEach(function(incident){
			incident.marker.setVisible(true);
		});

	};

	/*
	 * Select a state from <select> menu
	 * @param {string} state - name of a state
	 */
	ViewModel.prototype.selectState = function(state){

		this.applyFilters();
		
		for (var i=0; i<stateCoords.length; i++){
			if (stateCoords[i].state === state){
				this.googleMap.setCenter({ lat: stateCoords[i].latitude, lng: stateCoords[i].longitude});
				this.googleMap.setZoom(6);
				break;
			}
		}
	}

	/*
	 * Select a month from <select> menu
	 * @param {string} month name
	 */
	ViewModel.prototype.selectMonth = function(month){
		this.applyFilters();
		utils.sortByDate(this.visibleIncidents);
	}

	/*
	 * Reset filters to initial state.
	 * Empty the search field input and reset the filter dropdowns.
	 * Set all incidents visible and re-render all location markers.
	 */
	ViewModel.prototype.resetFilters = function(){
		
		var self = this;

		this.searchQuery('');
		this.selectedState('All');
		this.selectedMonth('All');

		this.googleMap.setCenter(mapCenter);
		this.googleMap.setZoom(5);

		this.allIncidents.forEach(function(incident){
			// self.visibleIncidents.push(incident);
			incident.marker.setVisible(true);
		});

		// Unselect selected incident from sidebar
		$(this.selectedIncident()).removeClass('active');

		// Remove infowindow from view.
		this.infoWindow.close();

	};

	ViewModel.prototype.onClickMarker = function(incident){
		this.currentIncident = incident;
		this.setUpInfoWindow();
	}

	/*
	 * Select an incident from list in sidebar
	 */
	ViewModel.prototype.selectIncident = function(incident, evt){
		var self = shootingViewModel;
		self.currentIncident = incident;
		$(self.selectedIncident()).removeClass('active');
		self.selectedIncident(evt.currentTarget);
		$(self.selectedIncident()).addClass('active');
		incident.zoomToMarker();
		self.setUpInfoWindow();
	};

  /*
	 * Select an incident from list in sidebar
	 */
	ViewModel.prototype.setUpInfoWindow = function(){
		var incident = this.currentIncident;
    this.infoWindow.setContent(incident.title);
    this.infoWindow.open(this.googleMap, incident.marker);
    apiInfo.requestNews(incident);
	};

	/*
	 * Select an incident from list in sidebar
	 */
	ViewModel.prototype.displayNews = function(response){

			// An HTML template which will be populated with incident specific data.
			var infoTemplate 	= '<h3 class="iw-title">%title%</h3>' +
													'<div class="iw-timestamp">%timestamp%</div>';

			// A list of news items returned by the search
			var listItems = '';

			// Update HTML template with correct title and location.
		  infoTemplate = infoTemplate.replace(/%title%/i, this.currentIncident.title + ' in shooting near ' + this.currentIncident.city);

		  // Update HTML template with correct date and time info.
			infoTemplate = infoTemplate.replace(/%timestamp%/i, this.currentIncident.date);

			var altSearchInfo = 'Try looking at the source data at the <a href="http://www.gunviolencearchive.org/mass-shooting" class="iw-citation-link">Gun Violence Archive</a>.';
			
		  // Check that we got results
		  if (response.length > 0) {

		  	infoTemplate += '<div class="iw-content"><div class="iw-related-stories">Related News Stories</div>' +
							 '<ul class="news-stories">%list-items%</ul>' +
							 '<div class="iw-more-information">Don\'t see anything that looks related? ' + altSearchInfo + '</div></div>';

		  	var len = response.length;
		  	for (var i=1; i<len; i++){
		  		listItems += '<li><a target="_blank" href="' + response[i].unescapedUrl + '">';
		  		if (response[i].image && response[i].image.tbUrl){
		  			listItems += '<img src="' + response[i].image.tbUrl + '">';
		  		}
		  		listItems += '<h5 class="iw-headline">' + response[i].titleNoFormatting + '</h5></a>';
		  	}

		  	infoTemplate = infoTemplate.replace(/%list-items%/i, listItems);
		  
		  } else {
		  	// No search results!
		  	// Provide some fall-back information:
		  	infoTemplate += '<div class="iw-content iw-empty"><p>We can\'t find any news stories related to this incident. However, we can tell you that it occured at or near <span class="incident-address">' + currentIncident.location + '</span>.</p><p>' + altSearchInfo +'</p></div>';
		  }

		  // Print information in the info window.
		  this.infoWindow.setContent(infoTemplate);
	};


	/*
	 * A single gun-shooting incident with location data
	 */
	var Incident = function(incident){
		
		var self = this;
		this.title = getTitle();
		this.city = incident['City Or County'];
		this.location = incident['City Or County'] + ', ' + incident['State'];
		this.date = incident['Incident Date'];
		this.state = incident['State'];
		this.month = this.date.split(' ')[0];

		this.latlang = {
			lat: incident['latitude'],
			lng: incident['longitude']
		};
		

    // Save a reference to the Places' map marker after building the marker
    this.marker = null;

		function getTitle(){
			if (incident['# Killed']==0){
				return incident['# Injured'] + ' Injured';
			} else if (incidentData['# Injured'] == 0){
				return incident['# Killed'] + ' Killed';
			} else {
				return incident['# Killed'] + ' Killed and ' + incident['# Injured'] + ' Injured';
			}
		}
	}

	Incident.prototype.onClickMarker = function(){
		shootingViewModel.onClickMarker(this);
		this.zoomToMarker();
	};

	Incident.prototype.zoomToMarker = function(){
		var map = shootingViewModel.googleMap,
				marker = this.marker;
		map.setZoom(12);
    map.setCenter(marker.getPosition());
  	window.setTimeout(function(){
  		marker.setAnimation(null);
  	}, 2500);
  	marker.setAnimation(google.maps.Animation.BOUNCE);
	};

	/* 
	 * Handle API calls to populate infoWindow with information
	 */
	 var apiInfo = {

	 	init: function(){

	 	},

	 	newsSearch: {},

	 	/*
	 	 * Search google news for stories about a shooting incident.
	 	 * @param {object} incident - a instance of a shooting incident.
	 	 */
	 	requestNews: function(incident){

	 		var query = 'shooting gunfire ' + incident.location + ' ' + incident.date;

	 		// Requires that google jsapi be loaded and that Google loads 'search'
		  this.newsSearch = new google.search.NewsSearch();

		  // Set searchComplete as the callback function when a search is 
		  // complete.  The newsSearch object will have results in it.
		  this.newsSearch.setSearchCompleteCallback(this, this.handleNews, null);	  
		  this.newsSearch.execute(query);
		  //google.search.Search.getBranding('branding');

	 	},

	 	/*
	 	 * Handle search results from google new API request
	 	 */
	 	handleNews: function(){
	 		shootingViewModel.displayNews(this.newsSearch.results);
	 	}


	}

	/*
	 * Some utility functions used by different parts of this app
	 */
	var utils = {

		sortByDate: function(arrayToSort){
			arrayToSort.sort(function(a,b){
				return new Date(a.date) - new Date(b.date);
	  	});
		},

		/*
		 * Sort an array of incident objects
		 * Compare the state name of each object; if states are the same,
		 * compare the city/county. If city/county is the same, compare dates. 
		 * Result is a sorted array in alphabetical order by state, county, date.
		 * @param {array} arrayToSort - an array of incident objects
		 */
		sortByState: function(arrayToSort){
			arrayToSort.sort(function(a,b){
			  var stateA = a.state.toLowerCase(), 
			  		stateB = b.state.toLowerCase();

		    if (stateA < stateB) { //sort string ascending
		    	return -1; 
		    }

		    if (stateA > stateB) {
		    	return 1;
		    }

		    // If states are the same, sort by city/county
		    var cityA = a.city.toLowerCase(),
		    		cityB = b.city.toLowerCase();

		    if (cityA < cityB) { //sort string ascending
		    	return -1; 
		    }

		    if (cityA > cityB) {
		    	return 1;
		    }
		    
		    // If state AND city/county are the same, sort by date
		    return (new Date(a.date) - new Date(b.date));
		  });
		}

	}

	/** 
	 * Load json data necessary for the map.
	 * Use jQuery promises to hold off on rendering map until data is ready.
	 * Note: this function won't fire until Google Maps scripts have loaded.
	 */
	function loadData(){

		$.when(
		  // Get data on shooting incidents
		  $.getJSON( "dev/data/shooting_incidents.json", function(data){
		  	incidentData = data;
		  }),

		  // Get data about states (for centering map)
		  $.getJSON("dev/data/state_capitols.json", function(data) {
		    stateCoords = data;
		  })

		).then(function() {

			// Hide the loading message
			$('#loading').remove();

			// Create the viewmodel.
		  shootingViewModel = new ViewModel();
			ko.applyBindings(shootingViewModel);

		})
		.fail(function(msg){
				// Hide all sections that need data to display correctly
				$('.requires-data').hide();
				// Show a message about the problem
				$('#sidebar').append('<div class="data-fail-msg">Uh oh, we can\'t find the data file!' +
					' Try reloading the page to see if that works.</div>');
			});
	}

	/*
	 * Return an object to app with public methods
	 */
	return {

		// start the whole thing
		init: function(){
			loadData();
		}
	}

})();