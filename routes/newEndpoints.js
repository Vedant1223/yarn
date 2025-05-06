

import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();


async function getPlaceDetails(placeId) {
  try {
      const detailsResponse = await axios.get(
          'https://maps.googleapis.com/maps/api/place/details/json',
          {
              params: {
                  key: process.env.GOOGLE_API_KEY,
                  place_id: placeId,
                  // Modified fields list: removed reviews and editorial_summary
                  fields: 'name,rating,formatted_address,photos,url,website,formatted_phone_number,price_level,opening_hours'
              }
          }
      );

      return detailsResponse.data.result;
  } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
  }
}


router.get('/place', async (req, res) => {
    const { address, type = 'establishment', radius = 10000, keyword = 'hotel' } = req.query;

    if (!address) {
        return res.status(400).json({ error: 'address is required' });
    }

    try {
        const geocodeURL = `https://maps.googleapis.com/maps/api/geocode/json`;
        const georesponse = await axios.get(geocodeURL, {
            params: {
                address,
                key: process.env.GOOGLE_API_KEY,
            },
        });

        if (georesponse.data.status !== 'OK') {
            return res.status(400).json({ error: 'Invalid location' });
        }

        const result = georesponse.data.results[0];
        const { lat, lng } = result.geometry.location;

        const placesResponse = await axios.get(
            'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
            {
                params: {
                    key: process.env.GOOGLE_API_KEY,
                    location: `${lat},${lng}`,
                    radius,
                    keyword,
                    type,
                },
            }
        );

        if (placesResponse.data.status !== 'OK') {
            return res.status(500).json({ error: placesResponse.data.error_message || 'Places API failed' });
        }

        const places = await Promise.all(
            placesResponse.data.results.map(async (place) => {
                // Get detailed information for each place
                const details = await getPlaceDetails(place.place_id);

                // Process available photos (limited to first 5)
                const images = details && details.photos
                    ? details.photos.slice(0, 5).map(photo => {
                        return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${process.env.GOOGLE_API_KEY}`;
                    })
                    : [];
                
                const amenities = [];
            
                if (place.types) {
                    if (place.types.includes('lodging')) amenities.push('Accommodation');
                    if (place.types.includes('spa')) amenities.push('Spa Services');
                    if (place.types.includes('restaurant')) amenities.push('Restaurant');
                    if (place.types.includes('bar')) amenities.push('Bar');
                    if (place.types.includes('gym')) amenities.push('Fitness Center');
                    if (place.types.includes('parking')) amenities.push('Parking Available');
                }
                
                // Extract business status information
                let businessStatus = place.business_status || 'UNKNOWN';
                if (businessStatus === 'OPERATIONAL') businessStatus = 'Open';
                else if (businessStatus === 'CLOSED_TEMPORARILY') businessStatus = 'Temporarily Closed';
                else if (businessStatus === 'CLOSED_PERMANENTLY') businessStatus = 'Permanently Closed';

                return {
                    id: place.place_id,
                    name: place.name,
                    address: details?.formatted_address || place.vicinity,
                    rating: place.rating,
                    user_ratings_total: place.user_ratings_total,
                    map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`,
                    images: images,
                    phone: details?.formatted_phone_number,
                    website: details?.website,
                    business_status: businessStatus,
                    price_level: place.price_level || 0, 
                    amenities: amenities,
                    types: place.types,
                    search_keyword: keyword,
                };
            })
        );

        res.json(places);

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch nearby places' });
    }
});




router.get('/nearby', async (req, res) => {
    const { lat, lng, radius = 5000, keyword = 'hotel with boardroom', type = 'establishment' } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ error: 'lat and lng are required' });
    }
    try {
        const apiUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
        const placesResponse = await axios.get(apiUrl, {
            params: {
                key: process.env.GOOGLE_API_KEY,
                location: `${lat},${lng}`,
                radius,
                keyword,
                type,
            },
        });

        const places = await Promise.all(
            placesResponse.data.results.map(async (place) => {
                // Get detailed information for each place
                const details = await getPlaceDetails(place.place_id);
                
                // Process photos (limited to first 5)
                const images = details && details.photos
                    ? details.photos.slice(0, 5).map(photo => {
                        return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${process.env.GOOGLE_API_KEY}`;
                    })
                    : [];
                
                // Process business status
                let businessStatus = place.business_status || 'UNKNOWN';
                if (businessStatus === 'OPERATIONAL') businessStatus = 'Open';
                else if (businessStatus === 'CLOSED_TEMPORARILY') businessStatus = 'Temporarily Closed';
                else if (businessStatus === 'CLOSED_PERMANENTLY') businessStatus = 'Permanently Closed';
                
                return {
                    id: place.place_id,
                    name: place.name,
                    address: details?.formatted_address || place.vicinity,
                    rating: place.rating,
                    user_ratings_total: place.user_ratings_total,
                    map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`,
                    images: images,
                    phone: details?.formatted_phone_number,
                    website: details?.website,
                    business_status: businessStatus,
                    price_level: place.price_level || 0,
                    types: place.types,
                    search_keyword: keyword,
                };
            })
        );

        res.json(places);

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch nearby places' });
    }
});

export default router;