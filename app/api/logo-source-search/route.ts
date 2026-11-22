import { env } from 'cloudflare:workers';
import { searchLogoSources } from '../../../server/logo-source-search.mjs';

import { adminIds } from '../../../server/lead-service.mjs';
import { getChatGPTUser } from '../../chatgpt-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user || !adminIds(env).includes(user.userId)) {
    return Response.json({ status: 'access_denied' }, { status: 403, headers: { 'cache-control': 'private, no-store' } });
  }
  return searchLogoSources(request, env.LOGO_VISION_API_KEY);
}

// Static previews return 404 here; clients never upload an image without this check.
export async function GET() {
  const user = await getChatGPTUser();
  const enabled = !!user && adminIds(env).includes(user.userId) && !!env.LOGO_VISION_API_KEY;
  return Response.json({ enabled }, { headers: { 'cache-control': 'private, no-store' } });
}
