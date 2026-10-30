import { env } from 'cloudflare:workers';
import { requireChatGPTUser } from '../chatgpt-auth';
import { ownerAllowed } from '../../server/lead-service.mjs';
import { renderAdminPage, renderOwnerSetupPage } from '../../server/admin-page.mjs';
export const dynamic = 'force-dynamic';
export async function GET() {
 const identity = await requireChatGPTUser('/admin');
 return new Response(ownerAllowed(identity, env) ? renderAdminPage() : renderOwnerSetupPage({subject:identity.userId,email:identity.email}), {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",'Referrer-Policy':'no-referrer'}});
}
