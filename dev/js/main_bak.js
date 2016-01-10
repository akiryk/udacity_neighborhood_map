/** 
 * MAP
 * Google Map Key: AIzaSyA9_V4fG-umELVwoyKKRm4jQ8XODuwV9MA
 * 
 * Yo, look here: http://codepen.io/prather-mcs/pen/KpjbNN
 */


var app = (function(){

	'use strict';

	// This code generates a "Raw Searcher" to handle search queries. The Raw 
	// Searcher requires you to handle and draw the search results manually.
	google.load('search', '1');

	var map,
			viewModel,
			infoWindow,
			currentIncident;

	/*
	 * The Data Model
	 */
	 var mapData = {};

	/*
	 * Incident Model
	 * @param {json} incidentData - data for a single gun violence incident.
	 */
	var Incident = function(incidentData, parent){
		var self = this;

		this.parent = parent;
		console.log(this.parent);
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
	      map: self.parent.map,
	      parent: this
	  });

		// data doesn't need to be an observable. 
		// we can reference when necessary to get additional information
		// about an incident.
		this.data = incidentData;

	}

	Incident.prototype.onClickMarker = function(evt){
    if (this.parent.map.getZoom()<12){
    	this.parent.map.setZoom(12);
    	this.parent.map.setCenter(this.marker.getPosition());
    }
    this.setupInfoWindow();
	}

	Incident.prototype.onClickListItem = function(evt){
		this.parent.map.setZoom(12);
    this.parent.map.setCenter(this.marker.getPosition());
    this.setupInfoWindow();
	}

	Incident.prototype.setupInfoWindow = function(){
		currentIncident = this;
    infoWindow.setContent(this.desc());
    infoWindow.open(map, this.marker);
    viewModel.createSearch(this);
	}

	/*
	 * Knockout ViewModel 
	 */
	var AppViewModel = function(){

		var self = this,
				pos,
				marker,
				inc;

		self.map = new google.maps.Map(document.getElementById('map'), {
	    center: {lat: 37.856365, lng: -98.341694},
	    zoom: 5  
	  }); 				
				
		this.markers = ko.observableArray([]);

		// List of gun violence incidents
		this.incidentList = ko.observableArray([]);

		this.listOfStates = ko.observableArray([]);

		// Loop through json data for all incidents
		mapData.forEach(function(singleIncident){
			inc = new Incident(singleIncident, self);
			self.incidentList.push(inc);
			inc.marker.addListener('click', inc.onClickMarker.bind(inc));
			self.markers.push(inc.marker);
			// Add each state to list only once
			if (self.listOfStates().indexOf(singleIncident['State'])<0){
				self.listOfStates.push(singleIncident['State']);
			}
		});

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

		this.customSearchTerms = ko.observable('Gun shooting');

		this.fixedSearchTerms = ko.observable();

		this.completeSearch = ko.computed(function(){
			return self.customSearchTerms() + ', ' + self.fixedSearchTerms();
		}, this);

		this.query = ko.observable('');

		this.filterLocations = function(value) {

			self.incidentList.removeAll();

			// Add incidents back if they match the query string
	    for(var incident in self.fixedList) {
	      if(self.fixedList[incident].location().toLowerCase().indexOf(value.toLowerCase()) >= 0) {
	        self.incidentList.push(self.fixedList[incident]);
	        self.fixedList[incident].marker.setMap(map);
	      } 
	    }
	  }

		this.query.subscribe(this.filterLocations);

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
		 * Reset list of incidents without filters
		 */
		this.resetFilters = function(){
			
			// Reset the list of incidents to the original unfiltered list
			self.incidentList(self.fixedList);

			// Reset the filter dropdowns to "All"
			self.selectedState('All');
			self.selectedMonth('All');
			self.query('');

			// Reset map zoom and centering
			map.setZoom(5);
			map.setCenter({lat: 37.856365, lng: -98.341694});

			// Display all of the markers by making sure each is associated with the map.
			this.incidentList().forEach(function(incident){
				incident.marker.setMap(map);
			});

			// Close info window in case it's open
			infoWindow.close();
		}

		/*
		 * Create a search query for Google News.
		 * Combine the custom search terms (e.g. Gun violence) with date and
		 * location data for a given incident.
		 * Then run a search.
		 * @param {object} incident - instance of an Incident.
		 */
		this.createSearch = function(incident){
			this.fixedSearchTerms(incident.location() + ', ' + incident.date());
			this.searchNews();
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

			// this.markers().filter(function(marker){
			// 	if(self.incidentList().indexOf(marker.parent)!=-1){
			// 		return true;
			// 	} else {
			// 		marker.setMap(null);
			// 	}
			// });

			this.fixedList.forEach(function(incident){
				if(self.incidentList().indexOf(incident.marker.parent)!=-1){
					incident.marker.setMap(map);
				} else {
					incident.marker.setMap(null);
				}
			});
		}

		/**
		 * Listen to changes in the filters. When there is a change,
		 * fire the filterIncidents() function.
		 */
		this.selectedState.subscribe(this.filterIncidents, this);
		this.selectedMonth.subscribe(this.filterIncidents, this);

		/*
		 * Search Google News
		 */
		this.searchNews = function(){
		  // Create a News Search instance.
		  this.newsSearch = new google.search.NewsSearch();
		  // Set searchComplete as the callback function when a search is 
		  // complete.  The newsSearch object will have results in it.
		  this.newsSearch.setSearchCompleteCallback(this, this.searchComplete, null);	  
		  this.newsSearch.execute(this.completeSearch());

		} 

		/*
		 * Handle a completed Google News search
		 * Parse results and render them into an info window on the map.
		 */
		this.searchComplete = function(){

			// create a shortcult to this.newsSearch
		  var newsSearch = this.newsSearch;

			// An HTML template which will be populated with incident specific data.
			var infoTemplate 	= '<h3 class="iw-title">%title%</h3>' +
													'<div class="iw-timestamp">%timestamp%</div>';

			// A list of news items returned by the search
			var listItems = '';

			// Update HTML template with correct title and location.
		  infoTemplate = infoTemplate.replace(/%title%/i, currentIncident.desc() + ' in shooting near ' +currentIncident.location());

		  // Update HTML template with correct date and time info.
			infoTemplate = infoTemplate.replace(/%timestamp%/i, currentIncident.data['Incident Date']);

			var altSearchInfo = 'Try changing the search terms, "' + this.customSearchTerms() + '," to something else — or look at the source data at the <a href="http://www.gunviolencearchive.org/mass-shooting" class="iw-citation-link">Gun Violence Archive</a>.';
			
		  // Check that we got results
		  if (newsSearch.results && newsSearch.results.length > 0) {

		  	infoTemplate += '<div class="iw-content"><div class="iw-related-stories">News Stories Related To: <span class="iw-search-terms iw-custom-terms">"' + this.customSearchTerms() + '</span>, <span class="iw-search-terms iw-fixed-terms">' + this.fixedSearchTerms() + '"</span></div>' +
							 '<ul class="news-stories">%list-items%</ul>' +
							 '<div class="iw-more-information">Don\'t see anything that looks related? ' + altSearchInfo + '</div></div>';

		  	var len = newsSearch.results.length;
		  	for (var i=1; i<len; i++){
		  		listItems += '<li><a target="_blank" href="' + newsSearch.results[i].unescapedUrl + '">';
		  		if (newsSearch.results[i].image && newsSearch.results[i].image.tbUrl){
		  			listItems += '<img src="' + newsSearch.results[i].image.tbUrl + '">';
		  		}
		  		listItems += '<h5 class="iw-headline">' + newsSearch.results[i].titleNoFormatting + '</h5></a>';
		  	}

		  	infoTemplate = infoTemplate.replace(/%list-items%/i, listItems);
		  
		  } else {
		  	// No search results!
		  	// Provide some fall-back information:
		  	infoTemplate += '<div class="iw-content iw-empty"><p>We can\'t find any news stories related to this incident. However, we can tell you that it occured at or near <span class="incident-address">' +  currentIncident.data['Concatenated Address'] + '</span>.</p><p>' + altSearchInfo +'</p></div>';
		  }

		  // Print information in the info window.
		  infoWindow.setContent(infoTemplate);

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
				mapData = data;
				viewModel = new AppViewModel();
				ko.applyBindings(viewModel);
			})
			.fail(function(msg){
				console.log('error: ' + msg);
			});
	}

	return {
		init: function(){
			loadData();
			infoWindow = new google.maps.InfoWindow({ maxWidth: 380 });
		}
	}

})();

/**
 * Render Google map
 * This function is called by the google map's API
 */
function initMap() {
	var myLatLng = {lat: 37.856365, lng: -98.341694};

  var googleMap = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 37.856365, lng: -98.341694},
    zoom: 5
  }); 
  
  app.init(googleMap);
}