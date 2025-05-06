import express from "express";
const router = express.Router();
import axios from 'axios';

import dotenv from "dotenv";    
dotenv.config();


router.get('/geocode', async (req, res) => {
    const { address } = req.query;
  
    if (!address) {
      return res.status(400).json({ error: 'Address query is required' });
    }
  
    try {
      const geocodeURL = `https://maps.googleapis.com/maps/api/geocode/json`;
      const response = await axios.get(geocodeURL, {
        params: {
          address,
          key: process.env
          .GOOGLE_API_KEY,
        },
      });
  
  
      const result = response.data.results[0];
      if (!result) {
        return res.status(404).json({ error: 'Location not found' });
      }
  
      const { lat, lng } = result.geometry.location;
      res.json({ lat, lng });
    } catch (error) {
      console.error('Geocode Error:', error.message);
      res.status(500).json({ error: 'Failed to get coordinates' });
    }
  });
  
  
  
  router.get('/nearby-places', async (req, res) => {
      const { lat, lng, radius = 3000, keyword = 'party' } = req.query;
    
      if (!lat || !lng) {
        return res.status(400).json({ error: 'lat and lng are required' });
      }
    
      try {
        const apiUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
        const params = {
          key: process.env.GOOGLE_API_KEY,
          location: `${lat},${lng}`,
          radius,
          keyword,
          type: 'cafe', 
        };
    
        const response = await axios.get(apiUrl, { params });
  //       const places = response.data.results;
    
  //       res.json({
  //         count: places.length,
  //         places: places.map(place => ({
  //           name: place.name,
  //           address: place.vicinity,
  //           location: place.geometry.location,
  //           rating: place.rating,
  //           place_id: place.place_id
  //         }))
          
  //       });
  //     } catch (error) {
  //       console.error('Error fetching places:', error.response?.data || error.message);
  //       res.status(500).json({ error: 'Failed to fetch nearby places' });
  //     }
  //   });
  
  
  
      // Send the full JSON response
      // res.json(response.data);
      const places = response.data.results;   
      res.json(places[0]);
  
    } catch (error) {
      console.error('Error fetching places:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to fetch nearby places' });
    }
  });
  
  
  router.get('/restaurants-near-location', async (req, res) => {
    const { location, keyword = 'dining', radius = 3000 } = req.query;
  
    if (!location) {
      return res.status(400).json({ error: 'location query is required' });
    }
  
    try {
      // Step 1: Geocode the location name
      const geoResponse = await axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            address: location,
            key: process.env.GOOGLE_API_KEY,
          },
        }
      );
  
      const geoResult = geoResponse.data.results[0];
      if (!geoResult) {
        return res.status(404).json({ error: 'Location not found' });
      }
  
      const { lat, lng } = geoResult.geometry.location;
  
      // Step 2: Get nearby places
      const placesResponse = await axios.get(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        {
          params: {
            key: process.env.GOOGLE_API_KEY,
            location: `${lat},${lng}`,
            radius,
            keyword,
            type: 'restaurant', // or 'cafe'
          },
        }
      );
  
      const places = placesResponse.data.results.map((place) => ({
        name: place.name,
        address: place.vicinity,
        rating: place.rating,
        location: place.geometry.location,
      }));
  
      res.json({
        location: geoResult.formatted_address,
        coordinates: { lat, lng },
        totalResults: places.length,
        places,
      });
    } catch (error) {
      console.error('Error:', error.message);
      res.status(500).json({ error: 'Failed to fetch nearby restaurants' });
    }
  });
  
  
  
  router.get('/nearby', async (req, res) => {
    const { lat, lng, radius = 3000, keyword = 'restaurant' } = req.query;
  
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }
  
    try {
      const apiUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
      const response = await axios.get(apiUrl, {
        params: {
          key: process.env.GOOGLE_API_KEY,
          location: `${lat},${lng}`,
          radius,
          keyword,
          type: keyword,
        },
      });
  
      const places = response.data.results.map(place => {
        const mapUrl = `https://www.google.com/maps/search/?api=1`
          + `&query=${encodeURIComponent(place.name)}`
          + `&query_place_id=${place.place_id}`;
  
        // If the place has a photo, build a photo URL
        const photoReference = place.photos?.[0]?.photo_reference;
        const photoUrl = photoReference
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${process.env.GOOGLE_API_KEY}`
          : null;
  
        return {
          name: place.name,
          address: place.vicinity,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          map_url: mapUrl,
          photo_url: photoUrl,
        };
      });
  
      res.json(places);
    } catch (error) {
      console.error('Error fetching places:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to fetch nearby places' });
    }
  });  



export default router