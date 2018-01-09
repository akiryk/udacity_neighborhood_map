# Neighborhood Map

## What it does
An application built with knockout.js that displays a map with data about shooting incidents in the United States in 2015, based on data from the [http://www.gunviolencearchive.org/mass-shooting](gun violence archive) and from the U.S. Census API. Key functionality of this map includes:
* Displays the distribution of shooting events across the U.S.
* Display incidents from a specified month using Knockout.js bindings
* Display incidents from a specified state using Knockout.js bindings (map zooms to specified state)
* Filter incidents by location (city, county, state) using text input field
* Users can reset filters and map to original settings with 'Reset Filters' button
* Users can see event details in an Info Window by clicking on a map marker or by clicking on an incident in the list of incidents in sidebar (or in mobile navigation if on a small screen).
* Info Windows display demographic date from U.S. Census. If data for a given location isn't available, window shows a fallback message
* Info Windows also display link to news stories related to the event by searching Google News for terms related to the event (e.g. 'Shooting near Montgomery, Alabama, May 24, 2015'). Since Google News search is officially deprecated, this link only displays if Google Search API responds. That is, it's a useful enhancement when it works (which is currently does).

## How to run the app locally
1. Clone it onto your machine: `git clone https://github.com/akiryk/udacity_neighborhood_map.git`
2. If you don't already have grunt installed, [get it now](http://gruntjs.com/).
3. cd into the udacity_neighborhood_map directory
4. Install grunt modules.
5. Run `grunt` from command line to start a local server at http://localhost:8000
6. Go to localhost:8000/prod to view production version of map.

## Using the filters
There are three ways to filter the data.
1. By state, using the state dropdown menu
2. By month, using the month dropdown menu
3. By query string, by entering location text into the search field.

## The Gun Violence Archive data (not API)
This data is loaded not by an API but with a simple JSON file. It needs to load before the knockout app can begin.

## Demographic data (US CENSUS API)
Each incident provides basic demographic data based on the county. This data comes from the US Census API, which is described in further detail below. In case the API request fails, app will display a message that U.S. Census data is unavailable. It just so happens that the first incident in sidebar does not return information, so click on '3 Killed and 2 Injured, Cherokee (County) Alabama' to see the failure message. I don't know why it fails, as the county and state codes are correct.

## Google News API
The Google News API is officially deprecated, yet it continues to function. Given that it provides reasonably meaningful information, I am using it here. If the Google News API fails to return any data, the app simply doesn't display a link to any news articles. In this sense, using the Google News API is an enhancement that only happens if the conditions are right.


## More info about the U.S. Census API:
Start by getting a key: http://api.census.gov/data/key_signup.html

**Make a request**

First, get the state and county FIPS codes based on lat long coords (e.g. Middlesex, Massachusetts is 25017 or 25 and 017). Do this based on lat/long like this:
http://data.fcc.gov/api/block/find?format=jsonp&latitude=LATITUDE&longitude=LONGITUTDE
Learn more about this here:
https://www.fcc.gov/general/census-block-conversions-api

Next, get codes for the parameters you're interested in (e.g. DP03_0119PE is % of families below poverty)
To get this code, go to: [http://api.census.gov/data/2014/acs1/profile/variables.html](http://api.census.gov/data/2014/acs1/profile/variables.html)

Last, piece the request together with comma-delimited codes:

    http://api.census.gov/data/2014/acs1/profile?get=param1,param2,param3,NAME&for=county:COUNTYCODE&in=state:STATECODE&key=API_KEY

##  View Map
See [map on github pages](http://akiryk.github.io/udacity_neighborhood_map)