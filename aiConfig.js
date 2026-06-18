require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

// Persisted selection lives here. We persist ONLY the model choice — never the
// API key (the key stays in memory / env so it isn't written to disk).
const CONFIG_FILE = path.join(__dirname, 'ai-config.json');

// Models the application is allowed to switch between. Anyone can pick from this
// list; arbitrary strings are rejected so a bad value can't break every analysis.
const AVAILABLE_MODELS = [
  'llama-3.3-70b-versatile',
  'llama3-8b-8192',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'gemma2-9b-it',
];

const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const state = {
  model: AVAILABLE_MODELS.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : AVAILABLE_MODELS[0],
  apiKey: process.env.GROQ_API_KEY || '',
};

// Restore a previously chosen model (survives restarts). The API key is not read
// from here — it always comes from the environment on boot.
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (saved.model && AVAILABLE_MODELS.includes(saved.model)) {
      state.model = saved.model;
    }
  }
} catch (err) {
  console.error('Failed to read ai-config.json:', err.message);
}

// The Groq client is rebuilt whenever the API key changes.
let client = new Groq({ apiKey: state.apiKey });

function persist() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ model: state.model }, null, 2));
  } catch (err) {
    console.error('Failed to write ai-config.json:', err.message);
  }
}

module.exports = {
  AVAILABLE_MODELS,

  getModel: () => state.model,
  getClient: () => client,
  hasApiKey: () => Boolean(state.apiKey),
  isValidModel: (model) => AVAILABLE_MODELS.includes(model),

  // Open to everyone — switch which model is used for analysis.
  setModel(model) {
    if (!AVAILABLE_MODELS.includes(model)) {
      throw new Error(`Unsupported model "${model}". Allowed: ${AVAILABLE_MODELS.join(', ')}`);
    }
    state.model = model;
    persist();
    return state.model;
  },

  // Authenticated only — replace the API key and rebuild the Groq client.
  setApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      throw new Error('A non-empty apiKey is required');
    }
    state.apiKey = apiKey.trim();
    client = new Groq({ apiKey: state.apiKey });
    return true;
  },
};
