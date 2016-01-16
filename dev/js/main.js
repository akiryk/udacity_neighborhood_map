var app = (function(){

	'use strict';

	/*
	 * Declare a variable that will be an instance of a Knockout.js ViewModel.
	 */
	var shootingViewModel;

	/*
	 * Array to be populated with data from an external JSON file
	 * with data about shooting incidents in the U.S. in 2015.
	 */
	var incidentData = [];

	/* 
	 * An array of states with their coordinates that will be used to 
	 * center the map when users filter data by state.
	 */
	var stateCoords = [];

	/*
	 * Default coords for the center of the map (somewhere in Kansas)
	 */
	var mapCenter = {lat: 37.856365, lng: -98.341694};

	/*
	 * Flag when Google Search API is loaded and ready based on when search 
	 * loads on index.html. This will trigger a callback to app.initSearch.
	 */
	var searchReady = false;

	/*
	 * Knockout ViewModel
	 * This will be called from the init function once google maps API is ready.
	 */
	var ViewModel = function(){

		var self = this;

		// Build the Google Map object and store a reference to it.
	  this.googleMap = new google.maps.Map(document.getElementById('map'), {
	    center: mapCenter,
	    zoom: 5
	  });

		// A set of all shooting incidents.
		this.allIncidents = [];

		// A set of all incidents that will display based on how user
		// filters the data.
		this.visibleIncidents = ko.observableArray([]);

	  // Google Maps InfoWindow reference.
	  this.infoWindow = new google.maps.InfoWindow({ maxWidth: 380 });

	  // States to be listed in <select> menu in filters. Not *all* states, 
		// only the states represented in incident data.
	  this.listOfStates = [];

	  // Array of monthds that will be listed in select menu dropdown.
	  this.listOfMonths = ['All', 'February', 'March', 'April','May','June','July','August','September','October','November','December'];

	  // Watch the list of incidents and keep track of which has been
	 	// selected by the user.
		this.selectedIncident = ko.observable();

		// Make collection of all incidents
	  incidentData.forEach(function(incident){
	  	
	  	var newIncident = new Incident(incident);
	  	
	  	self.allIncidents.push(newIncident);

	  	// Add a state to listOfStates only if it isn't already there
	  	if (self.listOfStates.indexOf(newIncident.state) == -1){
	  		self.listOfStates.push(newIncident.state);
	  	}

	  });

	  // Sort states in the <select> menu and add 'All' to <options>
	  this.listOfStates.sort();
	  this.listOfStates.unshift('All');

	  utils.sortByState(this.allIncidents);

	  this.selectedState = ko.observable('All');
	  this.selectedState.subscribe(this.selectState.bind(this));

	  // Sort months in the <select> menu and add 'All' to <options>
	  this.selectedMonth = ko.observable('All');
		this.selectedMonth.subscribe(this.selectMonth.bind(this));

		// Populate the array of incidents to be displayed, default to
		// displaying all of them.
	  this.allIncidents.forEach(function(incident){
	  	self.visibleIncidents.push(incident);
	  });

	  // Bind search input (users can enter text to filter incidents by location)
	  this.searchQuery = ko.observable(''); 
	  this.searchQuery.subscribe(this.applyFilters.bind(this));

	  // Make map markers for each incident.
	  this.allIncidents.forEach(function(incident) {
	    var markerOptions = {
	      map: self.googleMap,
	      position: incident.latlong
	    };

    	incident.marker = new google.maps.Marker(markerOptions);
    	incident.marker.addListener('click', incident.onClickMarker.bind(incident));

  	});

	};

	/*
	 * Filter the visible incidents by state, month, and search query. This will be
	 * called when user enters text in search input, changes a state, or changes a month.
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
			// A state is selected, so filter for only those that match it.
			this.visibleIncidents(this.visibleIncidents().filter(function(incident){
				return incident.state == state;
			}));
		}

		if (month.toLowerCase() !== 'all'){
			// A month is selected, so filter for only those that match it.
			this.visibleIncidents(this.visibleIncidents().filter(function(incident){
				return incident.month == month;
			}));
		}

		if (query !== ''){
			//Filter out all incidents that don't match the query string
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
	};

	/*
	 * Select a month from <select> menu
	 * @param {string} month name
	 */
	ViewModel.prototype.selectMonth = function(month){
		this.applyFilters();
		utils.sortByDate(this.visibleIncidents);
	};

	/*
	 * Reset filters to initial state.
	 * Empty the search field input and reset the filter dropdowns.
	 * Make all incidents visible and re-render all location markers.
	 */
	ViewModel.prototype.resetFilters = function(){
		
		var self = this;

		this.searchQuery('');
		this.selectedState('All');
		this.selectedMonth('All');

		this.googleMap.setCenter(mapCenter);
		this.googleMap.setZoom(5);

		this.allIncidents.forEach(function(incident){
			incident.marker.setVisible(true);
		});

		// stop marker from bouncing
		this.currentIncident.marker.setAnimation(null);

		// Unselect selected incident from sidebar
		$(this.selectedIncident()).removeClass('active');

		// Remove infowindow from view.
		this.infoWindow.close();

	};

	/*
	 * Handle map marker click event
	 * @param {object} incident - a visible shooting incident
	 */
	ViewModel.prototype.onClickMarker = function(incident){
		this.currentIncident = incident;
		this.setUpInfoWindow();
	};

	/*
	 * Get the currently active incident
	 * @return {object} - an Incident instance
	 */
	ViewModel.prototype.getCurrentIncident = function(){
		return this.currentIncident;
	};

	/*
	 * Select an incident from list in sidebar
	 * @param {object} incident - a shooting incident from observable array
	 * @param {object} evt - the click event
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
	 * Display InfoWindow with information about selected incident
	 * Display basic information and start Census API call for further data.
	 */
	ViewModel.prototype.setUpInfoWindow = function(){
		var incident = this.currentIncident;
		var txt = this.getTitleText() + 
							'<div class="iw-loading-msg">Loading demographic data</div>';
    this.infoWindow.setContent(txt);
    this.infoWindow.open(this.googleMap, incident.marker);
    //apiInfo.requestNews(incident);
    apiInfo.initCensusSearch(incident);
	};

	/*
	 * InfoWindow Title Text
	 * @return {string} - Title, location, and date of incident
	 */
	ViewModel.prototype.getTitleText = function(){
		var incident = this.currentIncident;
 		return '<h2 class="iw-title">' + incident.title + '</h2>' +
 		'<div class="iw-location">' + incident.location + '</div>' +
 		'<div class="iw-date">' + incident.date + '</div>';
	};

	/*
	 * Display a list of news stories related to a given incident 
	 * Use Google News API to find stories based on incident title, date, and location. 
	 * @param {object} response - the response object from Google News
	 */
	ViewModel.prototype.displayNews = function(response){

		$('#map').append('<div class="modal-bg" id="modal-bg"><div id="newsContainer" class="modal"></div></div>');
		// An HTML template which will be populated with incident specific data.
		var infoTemplate 	= '<h3 class="nc-title">%title%</h3>' +
												'<div class="nc-timestamp">%timestamp%</div>';

		// A list of news items returned by the search
		var listItems = '';

		// Update HTML template with correct title and location.
	  infoTemplate = infoTemplate.replace(/%title%/i, this.currentIncident.title + ' in shooting near ' + this.currentIncident.city);

	  // Update HTML template with correct date and time info.
		infoTemplate = infoTemplate.replace(/%timestamp%/i, this.currentIncident.date);

		var altSearchInfo = 'Try looking at the source data at the <a href="http://www.gunviolencearchive.org/mass-shooting" class="nc-citation-link">Gun Violence Archive</a>.';
		
	  // Check that we got results
	  if (typeof response !=='undefined' && response.length > 0) {

	  	infoTemplate += '<div class="nc-content"><h1 class="nc-related-stories">Related News Stories</h1>' +
						 '<ul class="news-stories">%list-items%</ul>' +
						 '<div class="nc-more-information">Don\'t see anything that looks related? ' + altSearchInfo + '</div></div>';

	  	var len = response.length;
	  	for (var i=0; i<len; i++){
	  		listItems += '<li><a target="_blank" href="' + response[i].unescapedUrl + '">';
	  		if (response[i].image && response[i].image.tbUrl){
	  			listItems += '<img src="' + response[i].image.tbUrl + '">';
	  		}
	  		listItems += '<h4 class="nc-headline">' + response[i].titleNoFormatting + '</h4>';
	  		listItems += '<p>' + response[i].content + '</p></a>';
	  	}

	  	infoTemplate = infoTemplate.replace(/%list-items%/i, listItems);
	  
	  } else {
	  	// No search results!
	  	// Provide some fall-back information:
	  	infoTemplate += '<div class="nc-content nc-empty"><p>We can\'t find any news stories related to this incident. However, we can tell you that it occured at or near <span class="incident-address">' + this.currentIncident.location + '</span>.</p><p>' + altSearchInfo +'</p></div>';
	  }

	  infoTemplate += '<div class="nc-close" id="nc-close">Close</div>';

	  // Print information in the info window.
	  $('#newsContainer').append(infoTemplate);

	};


	/*
	 * A single gun-shooting incident
	 * @param {object} incident - Data about location, date, and # injured and killed.
	 */
	var Incident = function(incident){
		
		var self = this;
		this.title = getTitle();
		this.city = incident['City Or County'];
		this.location = incident['City Or County'] + ', ' + incident['State'];
		this.date = incident['Incident Date'];
		this.state = incident['State'];
		this.month = this.date.split(' ')[0];

		this.latlong = {
			lat: incident['latitude'],
			lng: incident['longitude']
		};

    // Save a reference to the map marker. It will be set in ViewModel after incident is created.
    this.marker = null;

		function getTitle(){
			if (incident['# Killed'] === 0){
				return incident['# Injured'] + ' Injured';
			} else if (incident['# Injured'] === 0){
				return incident['# Killed'] + ' Killed';
			} else {
				return incident['# Killed'] + ' Killed and ' + incident['# Injured'] + ' Injured';
			}
		}
	};

	/* 
	 * Google Marker click event 
	 */
	Incident.prototype.onClickMarker = function(){
		shootingViewModel.onClickMarker(this);
		this.zoomToMarker();
	};

	/*
	 * Zoom map to marker
	 */
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

	 	/*
	 	 * Start search by getting correct FIPS codes.
	 	 */
	 	initCensusSearch: function(incident){
	 		this.getFIPS(incident);
	 	},

	 	/*
	 	 * Get special census code for county and state
	 	 * It's necessary to do a Census API search
	 	 */
	 	getFIPS: function(incident){
	 		this.incident = incident;
	 		var self = this;
	 		var site = 'http://data.fcc.gov/api/block/find?format=jsonp&latitude=' + incident.latlong.lat + '&longitude=' + incident.latlong.lng;
	 		$.ajax({
	 		 	url: site,
	 		 	dataType: "jsonp"
	 		 }).done(function(data){
	 		 		
	 		 		self.requestCensusData({
	 		 			stateCode: data.County.FIPS.substring(0,2),
	 		 			countyCode: data.County.FIPS.substring(2)
	 		 		});

	 		 	})
	 		 	.fail(function(msg){
	 		 		//handle error
	 		 		console.log('error getting FIPS codes');
	 		 		self.handleNoData();
	 		 	});
	 	},

	 	/*
	 	 * Start a Census API search based on state code and county code
	 	 * @param {object} data
	 	 *    - caller: the incident upon which seach is based
	 	      - stateCode: FIPS state code
	 	      - countyCode: FIPS county code
	 	 */
	 	requestCensusData: function(data){
	 		var self = this;

	 		// reference a few key Census search codes
	 		// Find more codes here: http://api.census.gov/data/2014/acs1/profile/variables.html
	 		var belowPov = 'DP03_0119PE',
	 				perCapIncome = 'DP03_0088E',
	 				totalPop = 'DP05_0001E',
	 				noHealthIns = 'DP03_0099PE';

	 		// Other Census search codes to use:
	 			 	// below10k = 'DP03_0076PE',
	 				// from10to15 = 'DP03_0077PE',
	 				// from15to25 = 'DP03_0078PE',
	 				// from25to35 = 'DP03_0079PE',
	 				// from35to50 = 'DP03_0080PE',
	 				// from50to75 = 'DP03_0081PE',
	 				// from75to100 ='DP03_0082PE',
	 				// from100to150 ='DP03_0083PE',
	 				// from150to200 ='DP03_0084PE',
	 				// from200orMore ='DP03_0085PE',
	 				// medianFamIncome = 'DP03_0086E',

	 		var county = data.countyCode,
	 				state = data.stateCode;

	 		var req = 'http://api.census.gov/data/2014/acs1/profile?get=' + totalPop + ',' +
	 							belowPov + ',' + perCapIncome + ',' + noHealthIns + ',NAME&for=county:'+county + 
	 							'&in=state:'+ state+'&key=c8a416af40d283eed8b070b25212fe18f2caba26';

	 		$.getJSON( req )
	 			.done(function(data){
	 				if (data !== undefined){
	 					self.handleCensus(data);
	 				} else {
	 					self.handleNoData();
	 				}
	 			})
	 			.fail(function(msg){
	 				self.handleNoData();
	 			});
	 	},

	 	/*
	 	 * Display Census data once it is ready
	 	 * @param {object} data -- the Census API results
	 	 *     Search results come in a multi-dimensional 
	 	 */
	 	handleCensus: function(data){
	 		var txt = shootingViewModel.getTitleText() +
	 							'<div class="iw-demo-title">Demographic data for ' + data[1][4] + '</div>' +
	 							'<div class="iw-row">' +
	 								'<div class="iw-left-col">Total Population:</div>' + 
	 								'<div class="iw-right-col">' + utils.numberWithCommas(data[1][0]) + '</div>' +
	 							'</div>' +
	 							'<div class="iw-row">' +
	 								'<div class="iw-left-col">Under Poverty Line:</div>' + 
	 								'<div class="iw-right-col">' + data[1][1] + '%</div>' +
	 							'</div>' +
	 							'<div class="iw-row">' +
	 								'<div class="iw-left-col">Per Capita Income:</div>' + 
	 								'<div class="iw-right-col">$' + utils.numberWithCommas(data[1][2]) + '</div>' +
	 							'</div>' +
	 							'<div class="iw-row">' +
	 								'<div class="iw-left-col">Percent Without Health Insurance:</div>' + 
	 								'<div class="iw-right-col">' + data[1][3] + '%</div>' +
	 							'</div>' + 
	 							'<div class="iw-citation">Source: U.S. Census</div>' + this.getGoogleNewsLinkText();
	 		this.renderInfoWindow(txt);
	 	},

	 	/*
	 	 * If Google Search is ready, display link to run search query
	 	 */
	 	getGoogleNewsLinkText: function(){
	 		var txt = '';
	 		
	 		if (searchReady){
	 			txt = '<div class="iw-more">See related news stories from Google News</div>';
	 		}

	 		return txt;
	 	},

	 	/*
	 	 * Display a message when Census API doesn't return useful or any data
	 	 */
	 	handleNoData: function(){
	 		var err = shootingViewModel.getTitleText() + 
	 			'<div class="iw-error">Uh oh. U.S. Census can\'t find information for this county.</div>' +
	 			this.getGoogleNewsLinkText();
	 		this.renderInfoWindow(err);
	 	},

	 	/*
	 	 * Show InfoWindow with all of the text from APIs.
	 	 */
	 	renderInfoWindow: function(txt){
	 		shootingViewModel.infoWindow.setContent(txt);
	 	},

	 	/* 
	 	 * Reference to a Google News Search object
	 	 */
	 	newsSearch: {},

	 	/*
	 	 * Search google news for stories about a shooting incident.
	 	 */
	 	requestNews: function(){			

	 		var incident = shootingViewModel.getCurrentIncident();

	 		var query = 'shooting gunfire ' + incident.location + ' ' + incident.date;

	 		// Requires that google jsapi be loaded and that Google loads 'search'
		  this.newsSearch = new google.search.WebSearch();

		  // Set searchComplete as the callback function when a search is 
		  // complete.  The newsSearch object will have results in it.
		  this.newsSearch.setSearchCompleteCallback(this, this.handleNews, null);	  
		  this.newsSearch.execute(query);

	 	},

	 	/*
	 	 * Handle search results from google search request
	 	 */
	 	handleNews: function(){
	 		shootingViewModel.displayNews(this.newsSearch.results);
	 	},
	};

	/*
	 * Some utility functions used by different parts of this app
	 */
	var utils = {

		numberWithCommas: function(x) {
    	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
		},

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

	};

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
				$('#sidebar').append('<div class="data-fail-msg">Uh oh, we can\'t load an important data file!' +
					' Try reloading the page to see if that works.</div>');
			});
	}

	function initEvents(){
		$("#map").on('click', function(e){
			if (e.target.classList.contains('iw-more')){
				apiInfo.requestNews();
				return;
			}
			if (e.target.classList.contains('nc-close')){
				removeModal();
			}
		});

		$('#sidebar').on('click', function(e){
			if( $('#modal-bg').length) {
				removeModal();
			}
		});

		$('#incidents-list, #apply-button, #reset-button').on('click', function(e){
			$('body').removeClass('display-mobile-nav');
		});

		$('.mobile-nav').on('click', function(e){
			$('body').toggleClass('display-mobile-nav');
		});

		function removeModal(){
			$('#modal-bg').remove();
		}

	}

	/*
	 * Return an object to app with public methods
	 */
	return {

		// start the whole thing
		init: function(){
			loadData();
			initEvents();
		},

		initSearch: function(){
			searchReady = true;
		}
	};

})();