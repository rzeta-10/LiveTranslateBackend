// server.js
// Node.js WebSocket proxy for Gemini Flash streaming translation

const WebSocket = require('ws');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const { text } = JSON.parse(message);
      ws.send(JSON.stringify({ streaming: true }));
      const prompt = `You are a language expert. Translate the following text to English. Provide only the translation, no explanations or additional text.\nText: "${text}"`;
      const stream = await model.generateContentStream({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
      for await (const event of stream.stream) {
        if (event.text) {
          const current = event.text();
          ws.send(JSON.stringify({ partial: current }));
        }
      }
      ws.send(JSON.stringify({ streaming: false, done: true }));
    } catch (err) {
      ws.send(JSON.stringify({ streaming: false, error: err.message || 'Translation error' }));
    }
  });
});

console.log(`WebSocket proxy server running on ws://localhost:${port}`);
