# Firebase Webhook Setup for RL80 Market Data

## Overview
This guide sets up automatic market data syncing from your RL80 bot to your Firebase website.

## Architecture
```
RL80 Bot (GCE) → Webhook → Firebase Function → Firestore → Your Website
```

## Step 1: Set Up Firebase Function

In your Firebase project:

1. **Install Firebase Functions** (if not already):
```bash
npm install -g firebase-tools
firebase init functions
```

2. **Add this to `functions/index.js`**:
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

exports.receiveMarketData = functions.https.onRequest(async (req, res) => {
  // Add CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Token');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  // Basic authentication
  const authToken = req.headers['x-auth-token'];
  if (authToken !== functions.config().webhook.token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const marketData = req.body;
    
    // Store in Firestore
    await db.collection('marketData').doc('latest').set({
      ...marketData,
      receivedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Store historical data (keep last 30 days)
    const historyRef = await db.collection('marketHistory').add({
      ...marketData,
      receivedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Clean old history (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oldDocs = await db.collection('marketHistory')
      .where('timestamp', '<', thirtyDaysAgo.toISOString())
      .get();
    
    const batch = db.batch();
    oldDocs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    res.json({ 
      success: true, 
      message: 'Market data received',
      docId: historyRef.id 
    });
  } catch (error) {
    console.error('Error storing market data:', error);
    res.status(500).json({ error: 'Failed to store market data' });
  }
});
```

3. **Set the webhook token**:
```bash
firebase functions:config:set webhook.token="your-secret-webhook-token-here"
```

4. **Deploy the function**:
```bash
firebase deploy --only functions
```

5. **Note your webhook URL**:
```
https://YOUR-PROJECT.cloudfunctions.net/receiveMarketData
```

## Step 2: Configure RL80 Bot to Send Webhooks

1. **SSH into your bot**:
```bash
gcloud compute ssh rl80-bot --zone=us-central1-a --project=hailmary-3ff6c
```

2. **Add webhook configuration to `.env`**:
```bash
cd ~/apps/rl80-agent
nano .env

# Add these lines:
FIREBASE_WEBHOOK_URL=https://YOUR-PROJECT.cloudfunctions.net/receiveMarketData
WEBHOOK_AUTH_TOKEN=your-secret-webhook-token-here
```

3. **Create webhook integration** in `src/market-analysis-action.ts`:

Add after line 170 (after saving the market report):
```typescript
// Send to Firebase webhook
try {
    const webhookUrl = process.env.FIREBASE_WEBHOOK_URL;
    const authToken = process.env.WEBHOOK_AUTH_TOKEN;
    
    if (webhookUrl && authToken) {
        const axios = (await import('axios')).default;
        
        await axios.post(webhookUrl, marketAnalysis, {
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            timeout: 10000
        });
        
        runtime.logger.info('[Market Analysis] Data sent to Firebase webhook');
    }
} catch (webhookError) {
    runtime.logger.error('[Market Analysis] Failed to send webhook:', webhookError);
    // Don't fail the action if webhook fails
}
```

4. **Install axios**:
```bash
npm install axios
```

5. **Restart the bot**:
```bash
pm2 restart rl80-bot
```

## Step 3: Display Data on Your Firebase Website

1. **Read from Firestore in your website**:
```javascript
// In your website's JavaScript
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Real-time listener for market data
function subscribeToMarketData() {
  const marketRef = doc(db, 'marketData', 'latest');
  
  return onSnapshot(marketRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      updateMarketDisplay(data);
    }
  });
}

function updateMarketDisplay(data) {
  // Update your UI
  document.getElementById('market-summary').textContent = data.summary;
  document.getElementById('market-analysis').innerHTML = data.analysis;
  document.getElementById('last-update').textContent = new Date(data.timestamp).toLocaleString();
  
  // Update coin prices
  if (data.topCoins) {
    const coinsList = document.getElementById('top-coins');
    coinsList.innerHTML = data.topCoins.map(coin => `<li>${coin}</li>`).join('');
  }
}

// Start listening
const unsubscribe = subscribeToMarketData();
```

2. **Add to your HTML**:
```html
<div class="market-widget">
  <h2>RL80 Market Intelligence</h2>
  <div id="last-update" class="timestamp"></div>
  <div id="market-summary" class="summary"></div>
  <div id="market-analysis" class="analysis"></div>
  <ul id="top-coins" class="coins-list"></ul>
</div>
```

## Step 4: Test the Integration

1. **Trigger a market analysis**:
```bash
# On your bot server
cd ~/apps/rl80-agent
pm2 logs rl80-bot
# Wait for next scheduled run at 8 AM or 8 PM UTC
# Or manually trigger by restarting the bot
```

2. **Check Firebase Console**:
- Go to Firestore Database
- Look for `marketData` collection
- Verify `latest` document has current data

3. **Check your website**:
- The data should appear automatically
- Updates happen at 8 AM and 8 PM UTC

## Security Rules

Add to your Firestore rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read access to market data
    match /marketData/{document} {
      allow read: if true;
      allow write: if false;
    }
    
    // Optional: Restrict historical data
    match /marketHistory/{document} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

## Monitoring

1. **Firebase Console**: Monitor function executions
2. **Bot Logs**: `pm2 logs rl80-bot | grep webhook`
3. **Set up alerts** in Firebase for function errors

Your market data will now automatically sync to your Firebase website twice daily!