import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

router.get('/', async (req, res) => {
    const { name, maxwidth = 400, placeId } = req.query;

    if ( !name) {
        return res.status(400).send('photo reference are required');
    }

    try {
        const newApiUrl = `https://places.googleapis.com/v1/${name}/media`;
                
        const response = await axios.get(
            newApiUrl, {
                params: {
                    maxWidthPx: maxwidth,
                    key: process.env.GOOGLE_API_KEY
                },
                responseType: 'stream'
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