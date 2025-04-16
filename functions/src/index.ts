import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors({ origin: true }));

// Proxy endpoint for both domains
app.get('/proxy/*', async (req: express.Request, res: express.Response) => {
  try {
    const path = req.path.replace('/proxy/', '');
    let targetUrl: string;
    
    // Check if the path contains rl80.com or ourlady.io
    if (path.includes('rl80.com')) {
      targetUrl = `https://${path}`;
    } else {
      targetUrl = `https://ourlady.io/${path}`;
    }
    
    const response = await axios.get(targetUrl, {
      headers: {
        'Accept': 'image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      responseType: 'arraybuffer'
    });

    // Set appropriate headers
    res.set('Content-Type', response.headers['content-type']);
    res.set('Cache-Control', 'public, max-age=31536000');
    res.set('Access-Control-Allow-Origin', '*');
    
    res.send(response.data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).send('Error fetching resource');
  }
});

export const proxy = functions.https.onRequest(app); 