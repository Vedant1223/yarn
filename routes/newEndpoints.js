import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();


async function getPlaceDetails(placeId) {
    if (!placeId) {
        throw { status: 400, message: 'placeId is required' }; // Throw an error object
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    const apiUrl = `https://places.googleapis.com/v1/places/${placeId}`;
    const fieldMask = 'id,displayName,types,internationalPhoneNumber,rating,googleMapsUri,regularOpeningHours,businessStatus,userRatingCount,photos,shortFormattedAddress,editorialSummary,websiteUri,priceLevel'; // Make sure websiteUri and priceLevel are included

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': fieldMask,
            },
        });

        if (response.status === 200) {
            const placeDetails = response.data;
            if (!placeDetails) {
                throw { status: 404, message: 'Place details not found in API response' };
            }
            return placeDetails; // Return the place details
        } else if (response.status === 404) {
            throw { status: 404, message: 'Place not found' };
        } else {
            // Handle other status codes
            throw {
                status: response.status,
                message: `Failed to retrieve place details. Status code: ${response.status}`,
            };
        }
    } catch (error) {
        console.error('Error fetching place details:', error.response?.data || error.message || error);
        throw error.response?.data || error; // Re-throw the error for the route handler to catch
    }
}

router.get('/place', async (req, res) => {
    const { address, type = 'establishment', radius = 10000, keyword = 'hotel' } = req.query;

    if (!address) {
        return res.status(400).json({ error: 'Bad Request', message: 'address is required' });
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
            return res.status(400).json({ error: 'Bad Request', message: 'Invalid location' });
        }

        const { lat, lng } = georesponse.data.results[0].geometry.location;

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
            return res.status(500).json({ error: 'API Error', message: placesResponse.data.error_message || 'Places API failed' });
        }

        const places = await Promise.all(
            placesResponse.data.results.map(async (place) => {
                try {
                    const placeDetails = await getPlaceDetails(place.place_id);

                    const images = placeDetails?.photos
                        ? placeDetails.photos.slice(0, 5).map(photo => `/api/place-photo?name=${photo.name}`)
                        : [];

                    let businessStatus = placeDetails?.businessStatus || 'UNKNOWN';
                    if (businessStatus === 'OPERATIONAL') businessStatus = 'Open';
                    else if (businessStatus === 'CLOSED_TEMPORARILY') businessStatus = 'Temporarily Closed';
                    else if (businessStatus === 'CLOSED_PERMANENTLY') businessStatus = 'Permanently Closed';

                    return {
                        id: placeDetails?.id,
                        name: placeDetails?.displayName?.text,
                        address: placeDetails?.shortFormattedAddress,
                        rating: placeDetails?.rating,
                        user_ratings_total: placeDetails?.userRatingCount,
                        map_url: placeDetails?.googleMapsUri,
                        images: images,
                        phone: placeDetails?.internationalPhoneNumber,
                        website: placeDetails?.websiteUri,
                        business_status: businessStatus,
                        price_level: placeDetails?.priceLevel || 0,
                        types: placeDetails?.types,
                        search_keyword: keyword,
                        open_now: placeDetails?.regularOpeningHours?.openNow || null,
                    };
                } catch (error) {
                    console.error(`Error fetching details for ${place.name} (${place.place_id}):`, error);
                    // Decide how to handle errors for individual places. 
                    // You might want to return a default object or skip this place.
                    return { id: place.place_id, name: place.name, error: 'Failed to fetch details' };
                }
            })
        );

        res.json(places);

    } catch (error) {
        console.error('Error:', error.response?.data || error.message || error);
        res.status(error.status || 500).json({ error: 'Failed to fetch nearby places', message: error.message });
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