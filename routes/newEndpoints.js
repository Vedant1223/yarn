import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// Shared utility functions
async function getPlaceDetails(placeId) {
    try {
        const detailsResponse = await axios.get(
            'https://maps.googleapis.com/maps/api/place/details/json',
            {
                params: {
                    key: process.env.GOOGLE_API_KEY,
                    place_id: placeId,
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

function processPlace(place, details, keyword) {
    // Process photos (limited to first 5)
    const images = details && details.photos
        ? details.photos.slice(0, 5).map(photo => {
            return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${process.env.GOOGLE_API_KEY}`;
        })
        : [];
    
    // Extract amenities from types
    const amenities = [];
    if (place.types) {
        if (place.types.includes('lodging')) amenities.push('Accommodation');
        if (place.types.includes('spa')) amenities.push('Spa Services');
        if (place.types.includes('restaurant')) amenities.push('Restaurant');
        if (place.types.includes('bar')) amenities.push('Bar');
        if (place.types.includes('gym')) amenities.push('Fitness Center');
        if (place.types.includes('parking')) amenities.push('Parking Available');
    }
    
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
        amenities: amenities,
        types: place.types,
        search_keyword: keyword,
    };
}

async function processPlacesResults(results, keyword) {
    return Promise.all(
        results.map(async (place) => {
            const details = await getPlaceDetails(place.place_id);
            return processPlace(place, details, keyword);
        })
    );
}

// Routes
router.get('/place', async (req, res) => {
    const { address, type = 'establishment', radius = 10000, keyword = 'hotel' } = req.query;

    if (!address) {
        return res.status(400).json({ error: 'address is required' });
    }

    try {
        // Step 1: Convert address to coordinates
        const geocodeURL = 'https://maps.googleapis.com/maps/api/geocode/json';
        const georesponse = await axios.get(geocodeURL, {
            params: {
                address,
                key: process.env.GOOGLE_API_KEY,
            },
        });

        if (georesponse.data.status !== 'OK') {
            return res.status(400).json({ error: 'Invalid location' });
        }

        const { lat, lng } = georesponse.data.results[0].geometry.location;
        
        // Step 2: Search for nearby places
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
            return res.status(500).json({ 
                error: placesResponse.data.error_message || 'Places API failed' 
            });
        }

        // Step 3: Process results and get details
        const places = await processPlacesResults(placesResponse.data.results, keyword);
        res.json(places);

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch places' });
    }
});

router.get('/nearby', async (req, res) => {
    const { lat, lng, radius = 5000, keyword = 'hotel with boardroom', type = 'establishment' } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ error: 'lat and lng are required' });
    }
    
    try {
        // Search for nearby places
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
            return res.status(500).json({ 
                error: placesResponse.data.error_message || 'Places API failed' 
            });
        }

        // Process results and get details
        const places = await processPlacesResults(placesResponse.data.results, keyword);
        res.json(places);

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch nearby places' });
    }
});

export default router;