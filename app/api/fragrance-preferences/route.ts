import { env } from 'cloudflare:workers';
import { handleFragrancePreferences } from '../../../server/fragrance-preferences.mjs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return handleFragrancePreferences(request, env.DB); }
export function POST(request: Request) { return handleFragrancePreferences(request, env.DB); }
export function PUT(request: Request) { return handleFragrancePreferences(request, env.DB); }
export function DELETE(request: Request) { return handleFragrancePreferences(request, env.DB); }
export function PATCH(request: Request) { return handleFragrancePreferences(request, env.DB); }
export function OPTIONS(request: Request) { return handleFragrancePreferences(request, env.DB); }
