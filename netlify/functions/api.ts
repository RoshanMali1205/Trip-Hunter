/**
 * Netlify Functions entry for Trip Hunter API.
 *
 * Production path: wrap the Express app with `serverless-http` once that
 * dependency is installed in the function bundle. Until then this handler
 * serves a compatible health stub and documents the mount point.
 */

type NetlifyEvent = {
  path: string;
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body: string | null;
  rawUrl?: string;
};

type NetlifyResult = {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
};

const json = (statusCode: number, body: unknown): NetlifyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  },
  body: body === null ? '' : JSON.stringify(body),
});

export async function handler(event: NetlifyEvent): Promise<NetlifyResult> {
  if (event.httpMethod === 'OPTIONS') {
    return json(204, null);
  }

  const path = event.path.replace(/^\/\.netlify\/functions\/api/, '') || '/';
  const apiPath = path.startsWith('/api') ? path : `/api${path}`;

  // Health stub — Express app mounts here via serverless-http in a follow-up.
  // import { app } from '../../server/src/index.js';
  // import serverless from 'serverless-http';
  // export const handler = serverless(app);

  if (
    apiPath === '/api/v1/health' ||
    apiPath === '/api/v1/health/' ||
    apiPath === '/health' ||
    path === '/' ||
    path === ''
  ) {
    return json(200, {
      success: true,
      data: {
        status: 'ok',
        service: 'trip-hunter-api',
        runtime: 'netlify-functions',
        note: 'Express app will be wired via serverless-http',
        path: apiPath,
        timestamp: new Date().toISOString(),
      },
      message: 'Healthy',
    });
  }

  return json(501, {
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message:
        'API routes are served by the Express app locally. Wire serverless-http to mount server/src for full Netlify coverage.',
    },
  });
}

export default { handler };
