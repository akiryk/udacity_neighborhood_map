/** 
 * MAP
 * Google Map Key: AIzaSyA9_V4fG-umELVwoyKKRm4jQ8XODuwV9MA
 * 
 * Instagram
 * Client ID: 17e6a4adf0c8482d9230fdef0cfaa504
 * Client Secret: 830c4887fb90434c8f9ed63bd8c48f9c
 * user id: 3648741
 */

(function(){
	'use strict';

})();

var code; 

function AppViewModel(){

	this.location = ko.observable("Boston");

	this.changeSomething = function(){}

	this.getInstagramData = function(){
		var ig = "https://api.instagram.com/oauth/authorize/client_id=";
		var client_id = '17e6a4adf0c8482d9230fdef0cfaa504';
		var redirect = "&redirect_uri=http://localhost:8000/&response_type=token";
		var token = "3648741.17e6a4a.6abd370b82dc4e02a94e0a625870e1e3";
		var tagurl = 'https://api.instagram.com/v1/tags/?access_token=' + token;
		var locurl = 'https://api.instagram.com/v1/locations/search?lat=42.376340&lng=-71.143934&access_token=' + token;
		var getMediaIds = $.ajax({
		    url: 'https://api.instagram.com/v1/users/3648741/media/recent/?access_token=' + token,
		    type: "GET",
		    crossDomain: true,
		    dataType: "jsonp",
		});
		getMediaIds.then(function(mediaObject){
			var $display = $('#data-display');
			var markup = '<ul class="thumbnails">';
			// Get the thumbnail images
			mediaObject.data.forEach(function(el, i, arr){
				console.log(el.images.thumbnail.url);
				markup += '<li><img src="'+ el.images.thumbnail.url + '" width="100"></li>';
			});
			markup += '</ul>';
			$display.append(markup);
		});
	}
}


// activates knockoutjs
ko.applyBindings(new AppViewModel());

/** 
 * Load json data only once map is ready
 */
function loadData(){
	var getData = $.getJSON( "dev/data/shooting_incidents.json", function() {
  console.log('success');
	})
		.done(function(data){
			initMarkers(data);
		})
		.fail(function(msg){
			console.log('error: ' + msg);
		});
}

var map;
var infoWindow,
		currentIncident;

function initMarkers(incidents){
	// Display multiple markers on a map
	var markers = [],
  		marker, 
			i;

	// Loop through our array of incidents & place each one on the map  
  for( i = 0; i < incidents.length; i++ ) {
    var position = new google.maps.LatLng(incidents[i]['latitude'], incidents[i]['longitude']);
    marker = new google.maps.Marker({
        position: position,
        map: map,
        incident: incidents[i]
    });
    
    markers.push(marker);

    // Allow each marker to have an info window    
    marker.addListener('click', markerListener.bind(marker));

  }

 	var mcOptions = {gridSize: 50, maxZoom: 15}

  infoWindow  = 	new google.maps.InfoWindow(
  	{
  		maxWidth: 300
  	});


  var mc = new MarkerClusterer(map, markers, mcOptions);

  function markerListener(){
  	currentIncident = this.incident;
  	var searchString = 'Shooting, ' + currentIncident['Incident Date'] + ', ' + currentIncident['Concatenated Address'];
  	searchNews(searchString);
		infoWindow.setContent(this.incident['Killed and Injured'] + ' killed and injured');
    infoWindow.open(map, this);
	}
}

function initMap() {
	var myLatLng = {lat: 37.856365, lng: -98.341694};

  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 37.856365, lng: -98.341694},
    zoom: 5
  }); 
  
  loadData();
}

// This code generates a "Raw Searcher" to handle search queries. The Raw 
// Searcher requires you to handle and draw the search results manually.
google.load('search', '1');

var newsSearch;

var infoTemplate = 	'<h2 class="info-heading">%title%</h2>' +
										'<ul class="news-stories">%list-items%</ul>';

function searchComplete() {
  // Check that we got results
  if (newsSearch.results && newsSearch.results.length > 0) {

  	var listItems = '';
  	var len = newsSearch.results.length > 3 ? 3:newsSearch.results.length;
  	for (var i=0; i<len; i++){
  		listItems += '<li>' + newsSearch.results[i].titleNoFormatting + '</li>';
  	}

  	var str = infoTemplate.replace(/%title%/i, currentIncident['Killed and Injured'] + ' killed and injured in shooting near ' + currentIncident['City Or County'] + ', ' + currentIncident['State']);
  	str = str.replace(/%list-items%/i, listItems);
  	infoWindow.setContent(str);
    // 	// console.log(newsSearch.results[i].titleNoFormatting);
    // 	// console.log(newsSearch.results[i].content);
    // 	// console.log(newsSearch.results[i].publisher);
    // 	// console.log(newsSearch.results[i].unescapedUrl);
  
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

// function onLoad() {

//   // Create a News Search instance.
//   newsSearch = new google.search.NewsSearch();
//   // Set searchComplete as the callback function when a search is 
//   // complete.  The newsSearch object will have results in it.
//   newsSearch.setSearchCompleteCallback(this, searchComplete, null);

//   // Specify search quer(ies)
//   newsSearch.execute('Shooting October 27, 2015 1700 Block of Southcrest Drive, Texas	Fort Worth');

//   // Include the required Google branding
//   //google.search.Search.getBranding('branding');

// }

// // Set a callback to call your code when the page loads
// google.setOnLoadCallback(onLoad);
