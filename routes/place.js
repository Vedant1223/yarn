import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

router.get('/', async (req, res) => {
    const { reference, maxwidth = 800 } = req.query;
    
    if (!reference) {
        return res.status(400).send('Photo reference is required');
    }
    
    try {
        // Request the image from Google with your API key
        const response = await axios.get(
            'https://maps.googleapis.com/maps/api/place/photo', {
                params: {
                    photoreference: reference,
                    maxwidth,
                    key: process.env.GOOGLE_API_KEY
                },
                responseType: 'stream' // Important for efficient image handling
            }
        );
        
        // Forward the content type header
        if (response.headers['content-type']) {
            res.setHeader('content-type', response.headers['content-type']);
        }
        
        // Stream the image directly to the client
        response.data.pipe(res);
    } catch (error) {
        console.error('Error fetching place photo:', error);
        res.status(500).send('Failed to fetch photo');
    }
});

export default router;