#!/usr/bin/env node
/**
 * Writes public/env.js for the Angular browser bundle.
 * Netlify (and local CI) can inject SUPABASE_URL + SUPABASE_PUBLIC_KEY
 * without rebuilding TypeScript sources.
 */
const fs = require('node:fs');
const path = require('node:path');

const outPath = path.join(__dirname, '..', 'public', 'env.js');
const env = {
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_PUBLIC_KEY || '',
  apiBaseUrl: process.env.API_BASE_URL || '/api/v1',
};

const body = `window.__TRIP_HUNTER_ENV__ = ${JSON.stringify(env, null, 2)};\n`;
fs.writeFileSync(outPath, body, 'utf8');
console.log(`[write-browser-env] wrote ${outPath}`);
