import { env } from 'cloudflare:workers';
import { handleAdminStatus } from '../../../../../../server/lead-service.mjs';
import { getChatGPTUser } from '../../../../../chatgpt-auth';
export const dynamic = 'force-dynamic';
async function handle(request: Request, context: {params: Promise<{id:string}>}) {
  return handleAdminStatus(request, env, env.DB, await getChatGPTUser(), (await context.params).id);
}
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as OPTIONS };
