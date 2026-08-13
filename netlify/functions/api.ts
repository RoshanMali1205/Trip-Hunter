/**
 * Netlify Functions entry — mounts the Express API via serverless-http.
 *
 * Imports the compiled server app (built in scripts/netlify-build.sh).
 */
import serverless from 'serverless-http';
import { app } from '../../server/dist/index.js';

export const handler = serverless(app);
