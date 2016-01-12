Neighborhood Map

First, get an API key:
http://api.census.gov/data/key_signup.html

Second, get the state and county FIPS codes (e.g. Middlesex, Massachusetts is 25017 or 25 and 017). Do this based on lat/long like this:
http://data.fcc.gov/api/block/find?format=jsonp&latitude=LATITUDE&longitude=LONGITUTDE

Learn more about this here:
https://www.fcc.gov/general/census-block-conversions-api

Next, get codes for the parameters you're interested in (e.g. DP03_0119PE is % of families below poverty)

http://api.census.gov/data/2014/acs1/profile/variables.html

Last, piece the request together with comma-delimited codes for a given:

e.g.
http://api.census.gov/data/2014/acs1/profile?get=param1,param2,param3,NAME&for=county:COUNTYCODE&in=state:STATECODE&key=API_KEY
