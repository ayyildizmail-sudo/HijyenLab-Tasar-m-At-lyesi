import { env } from 'cloudflare:workers';
import { handleAnalytics } from '../../../server/lead-service.mjs';
export const dynamic = 'force-dynamic';
async function handle(request: Request) { return handleAnalytics(request, env, env.DB); }
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as OPTIONS };
