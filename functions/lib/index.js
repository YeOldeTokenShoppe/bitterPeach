"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxy = void 0;
const functions = __importStar(require("firebase-functions"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const axios_1 = __importDefault(require("axios"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true }));
// Proxy endpoint for both domains
app.get('/proxy/*', async (req, res) => {
    try {
        const path = req.path.replace('/proxy/', '');
        let targetUrl;
        // Check if the path contains rl80.com or ourlady.io
        if (path.includes('rl80.com')) {
            targetUrl = `https://${path}`;
        }
        else {
            targetUrl = `https://ourlady.io/${path}`;
        }
        const response = await axios_1.default.get(targetUrl, {
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
    }
    catch (error) {
        console.error('Proxy error:', error);
        res.status(500).send('Error fetching resource');
    }
});
exports.proxy = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map