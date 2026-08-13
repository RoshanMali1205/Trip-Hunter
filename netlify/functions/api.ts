/**
 * Netlify Functions entry — mounts the Express API via serverless-http.
 *
 * Build compiles `server/` to `server/dist` (see netlify.toml). Redirects:
 * `/api/*` → `/.netlify/functions/api/:splat`.
 */
import serverless from 'serverless-http';
import { app } from '../../server/dist/index.js';

export const handler = serverless(app);

export default { handler };
