import { Client } from '@googlemaps/google-maps-services-js';

export async function geocodeLocations(items, generalLocations = []) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not set');
  const client = new Client({});
  const results = [];
  
  // First, get the geographic bounds of the general locations
  let locationBounds = null;
  if (generalLocations.length > 0) {
    try {
      console.log('Getting bounds for general locations:', generalLocations);
      const boundsQueries = generalLocations.slice(0, 3); // Limit to first 3 locations to avoid too many API calls
      const boundsPromises = boundsQueries.map(loc => 
        client.geocode({ params: { address: loc, key: apiKey } })
      );
      const boundsResults = await Promise.all(boundsPromises);
      const validBounds = boundsResults.filter(res => res.data.results.length > 0);
      
      if (validBounds.length > 0) {
        const allCoords = validBounds.flatMap(res => 
          res.data.results.map(result => ({
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng
          }))
        );
        
        // Expand bounds by 0.1 degrees (~11km) to be more flexible
        const latMargin = 0.1;
        const lngMargin = 0.1;
        
        locationBounds = {
          northeast: {
            lat: Math.max(...allCoords.map(c => c.lat)) + latMargin,
            lng: Math.max(...allCoords.map(c => c.lng)) + lngMargin
          },
          southwest: {
            lat: Math.min(...allCoords.map(c => c.lat)) - latMargin,
            lng: Math.min(...allCoords.map(c => c.lng)) - lngMargin
          }
        };
        console.log('Calculated bounds:', locationBounds);
      }
    } catch (error) {
      console.log('Failed to get bounds:', error);
    }
  }
  
  for (const item of items) {
    const baseName = item.name || item.mention;
    const queries = [
      // Try exact name first
      baseName,
      // Try with each general location context
      ...generalLocations.map(loc => `${baseName}, ${loc}`),
      // Try with address if provided
      ...(item.address ? [item.address] : [])
    ];
    
    console.log(`Geocoding "${baseName}" with queries:`, queries);
    
    let geocoded = false;
    for (const query of queries) {
      try {
        console.log(`  Trying: "${query}"`);
        
        const params = { address: query, key: apiKey };
        
        // Add location bias if we have bounds
        if (locationBounds) {
          params.bounds = `${locationBounds.southwest.lat},${locationBounds.southwest.lng}|${locationBounds.northeast.lat},${locationBounds.northeast.lng}`;
          console.log(`  Using bounds:`, params.bounds);
        }
        
        const res = await client.geocode({ params });
        const first = res.data.results[0];
        
        if (first) {
          console.log(`  ✅ Found: ${first.formatted_address}`);
          
          // Additional check: ensure the result is within our general location area
          let withinBounds = true;
          if (locationBounds) {
            const resultLat = first.geometry.location.lat;
            const resultLng = first.geometry.location.lng;
            
            withinBounds = (
              resultLat >= locationBounds.southwest.lat &&
              resultLat <= locationBounds.northeast.lat &&
              resultLng >= locationBounds.southwest.lng &&
              resultLng <= locationBounds.northeast.lng
            );
            
            console.log(`  Checking bounds: lat ${resultLat}, lng ${resultLng}`);
            console.log(`  Bounds: SW(${locationBounds.southwest.lat}, ${locationBounds.southwest.lng}) NE(${locationBounds.northeast.lat}, ${locationBounds.northeast.lng})`);
            console.log(`  Within bounds: ${withinBounds}`);
            
            if (!withinBounds) {
              console.log(`  ❌ Result outside bounds: ${first.formatted_address}`);
              // If this is the last query and no results found yet, accept the result anyway
              if (queries.indexOf(query) === queries.length - 1 && !geocoded) {
                console.log(`  ⚠️ Accepting out-of-bounds result as fallback`);
                withinBounds = true;
              } else {
                continue; // Try next query
              }
            }
          }
          
          results.push({
            ...item,
            locationName: first.formatted_address,
            coordinates: first.geometry?.location || null,
            placeId: first.place_id || null
          });
          geocoded = true;
          break;
        }
      } catch (error) {
        console.log(`  ❌ Query failed: ${error.message}`);
      }
    }
    
    if (!geocoded) {
      console.log(`  ❌ No results for "${baseName}"`);
      results.push({ ...item, locationName: null, coordinates: null, placeId: null });
    }
  }
  return results;
}
