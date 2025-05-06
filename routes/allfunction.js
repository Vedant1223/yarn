// simpleGoogleApis.js
// This file contains three simple API endpoints to test Google Maps API responses
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

/**
 * 2. TEXT SEARCH
 * Search for places using text query
 * 
 * Query parameters:
 * - query: The text to search for (e.g., "restaurants in New York")
 * - lat: (optional) Latitude to bias results
 * - lng: (optional) Longitude to bias results
 * - radius: (optional) Search radius in meters when lat/lng provided
 * 
 * Returns the full response from Google Places Text Search API
 */
router.get('/text-search', async (req, res) => {
  const { query, lat, lng, radius = 5000 } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'query parameter is required' });
  }
  
  try {
    const params = {
      key: process.env.GOOGLE_API_KEY,
      query,
      radius
    };
    
    // Add location bias if coordinates are provided
    if (lat && lng) {
      params.location = `${lat},${lng}`;
    }
    
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      { params }
    );
    
    // Return the raw response for inspection
    // res.json({
    //   status: response.data.status,
    //   results_count: response.data.results?.length || 0,
    //   has_next_page: !!response.data.next_page_token,
    //   next_page_token: response.data.next_page_token || null,
    //   results: response.data.results,
    //   raw_response: response.data
    // });
    res.json(response.data);
    
  } catch (error) {
    console.error('Error in text search:', error.message);
    res.status(500).json({ 
      error: 'Text search failed',
      message: error.message 
    });
  }
});

/**
 * 3. PLACE DETAILS
 * Get detailed information about a place
 * 
 * Query parameters:
 * - place_id: The unique identifier for the place
 * - fields: (optional) Comma-separated list of fields to include
 * 
 * Returns the full response from Google Place Details API
 */
router.get('/place-details', async (req, res) => {
  const { place_id, fields } = req.query;
  
  if (!place_id) {
    return res.status(400).json({ error: 'place_id is required' });
  }
  
  try {
    const params = {
      key: process.env.GOOGLE_API_KEY,
      place_id
    };
    
    // If specific fields are requested, add them to the params
    if (fields) {
      params.fields = fields;
    } else {
      // Default comprehensive fields if none specified
      params.fields = 'name,rating,formatted_address,geometry,icon,photos,place_id,' +
                     'formatted_phone_number,opening_hours,website,price_level,' +
                     'reviews,types,vicinity,url';
    }
    
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/details/json',
      { params }
    );
    
    // Return the raw response with some metadata
    // res.json({
    //   status: response.data.status,
    //   place_id: place_id,
    //   result: response.data.result,
    //   available_fields: Object.keys(response.data.result || {}),
    //   raw_response: response.data
    // });
    res.json(response.data);
    
  } catch (error) {
    console.error('Error getting place details:', error.message);
    res.status(500).json({ 
      error: 'Failed to get place details',
      message: error.message 
    });
  }
});

export default router;