import express from "express";
import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Route to calculate distances for different transport modes
router.get('/', async (req, res) => {
  const { lat, lng, place_id } = req.query;
  
  try {
    // 1. Check if all required parameters are provided
    if (!lat || !lng || !place_id) {
      return res.status(400).json({ error: "Required parameters: lat, lng, place_id" });
    }
    
    // 2. Combine lat and lng to make origin
    const origin = `${lat},${lng}`;
    
    // 3. Append place_id: prefix if needed
    const formattedPlaceId = place_id.startsWith('place_id:') ? place_id : `place_id:${place_id}`;
    
    const apiKey = process.env.GOOGLE_API_KEY;
    const modes =  ['driving', 'walking', 'bicycling', 'transit'];
    const results = {};
    
    // 4. Make requests for each transportation mode
    for (const mode of modes) {
      try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
          params: {
            origins: origin,
            destinations: formattedPlaceId,
            mode: mode,
            key: apiKey
          }
        });
        
        // Parse response
        if (response.data.rows?.[0]?.elements?.[0]?.status === 'OK') {
          const element = response.data.rows[0].elements[0];
          results[mode] = {
            distance: element.distance.text,
            duration: element.duration.text
          };
        } else {
          results[mode] = { error: 'Route not available' };
        }
      } catch (modeError) {
        // 5. Console log error message
        console.error(`Error fetching ${mode} route:`, modeError.message);
        results[mode] = { error: 'Failed to calculate route' };
      }
    }
    
    // 6. Return distance and time for different modes
    return res.json({
        car: results.driving,
        walking: results.walking,
        two_wheeler: results.bicycling,
        transit: results.transit
    });
    
  } catch (error) {
    // 5. Console log error message
    console.error('Distance calculation error:', error.message);
    return res.status(500).json({ error: 'Failed to calculate routes' });
  }
});

export default router;