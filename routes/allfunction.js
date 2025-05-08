import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

router.get('/:placeId',async (req, res)=>{
    const placeId = req.params.placeId;
    
    if( !placeId){
        return res.status(400).json({ error: 'Bad Request', message: 'placeId is required'})
    }

    const apiKey = process.env.GOOGLE_API_KEY;

    const apiUrl = `https://places.googleapis.com/v1/places/${placeId}`;
    const fieldMask = 'id,displayName,types,internationalPhoneNumber,rating,googleMapsUri,regularOpeningHours,businessStatus,userRatingCount,photos,shortFormattedAddress,editorialSummary';

    try{
        const response = await axios.get(apiUrl, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': fieldMask,
            },
        });
        // Check the response status code.
        if (response.status === 200) {
            const placeDetails = response.data;
             if (!placeDetails) {
              return res.status(404).json({ error: 'Not Found', message: 'Place details not found in API response' });
            }
            res.json(placeDetails); //  Send the place details in the response.
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Not Found', message: 'Place not found' });
        }
         else {
            // Handle other status codes as necessary (e.g., 403, 500)
            return res.status(response.status).json({
                error: 'API Error',
                message: `Failed to retrieve place details.  Status code: ${response.status}`,
            });
        }
    } catch (error) {
        console.log(error); 
    }
});

export default router;