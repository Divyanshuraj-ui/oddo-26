import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI SDK on server-side with required headers
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Multi-Turn Chatbot API endpoint
 * Maintains conversation history and custom system instruction for Brightloop copilot
 */
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { messages, systemInstruction, model = 'gemini-3.8-flash' } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const defaultSystemInstruction =
      systemInstruction ||
      `You are the Brightloop Intelligence Copilot, an expert AI assistant embedded inside Brightloop Software's Subscription Management & Recurring Billing System.
You assist finance leads, sales executives, and operations teams with:
- Analyzing Monthly Recurring Revenue (MRR), ARR, and cashflow health.
- Diagnosing overdue invoices and proposing effective collection/dunning strategies.
- Structuring quotations, product lines, and variant pricing (such as Odoo edition +$560 surcharge).
- Formulating volume discount rules (seat thresholds, percentage vs fixed discounts, usage caps).
- Clarifying plan lifecycle rules (auto-close, early cancellation, pause, and contract renewals).
Provide concise, actionable, and structured guidance tailored to SaaS subscription operations.`;

    // Map conversation history to GenAI contents structure
    const contents = messages.map((m: { role: string; text: string }) => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: defaultSystemInstruction,
      },
    });

    res.json({
      text: response.text || '',
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);
    res.status(500).json({
      error: error.message || 'Internal error calling Gemini API',
    });
  }
});

/**
 * Google Maps Grounding API endpoint
 * Uses gemini-3.8-flash with googleMaps tool for geographic verification, client addresses, and local branch tax zones
 */
app.post('/api/gemini/maps', async (req, res) => {
  try {
    const { query, latitude, longitude } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required for Google Maps grounding' });
    }

    const config: any = {
      tools: [{ googleMaps: {} }],
    };

    if (latitude !== undefined && longitude !== undefined) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: Number(latitude),
            longitude: Number(longitude),
          },
        },
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: query,
      config,
    });

    // Extract Google Maps grounding chunks (verified places, maps links, and reviews)
    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const mapSources: { uri?: string; title?: string; address?: string }[] = [];

    rawChunks.forEach((chunk: any) => {
      if (chunk.maps) {
        mapSources.push({
          uri: chunk.maps.uri,
          title: chunk.maps.title,
          address: chunk.maps.address,
        });
      }
    });

    res.json({
      text: response.text || '',
      sources: mapSources,
      rawChunks,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/maps:', error);
    res.status(500).json({
      error: error.message || 'Internal error calling Google Maps Grounding',
    });
  }
});

// Mount Vite in development or static assets in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Brightloop Subscription Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
