import { env } from 'cloudflare:workers';
import { handleAdminLeads } from '../../../../server/lead-service.mjs';
import { getChatGPTUser } from '../../../chatgpt-auth';
export const dynamic = 'force-dynamic';
async function handle(request: Request) { return handleAdminLeads(request, env, env.DB, await getChatGPTUser()); }
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as OPTIONS };
