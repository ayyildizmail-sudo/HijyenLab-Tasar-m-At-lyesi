import { handleExchangeRate } from '../../../server/tcmb-rate-service.mjs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return handleExchangeRate(request); }
export function POST(request: Request) { return handleExchangeRate(request); }
export function PUT(request: Request) { return handleExchangeRate(request); }
export function PATCH(request: Request) { return handleExchangeRate(request); }
export function DELETE(request: Request) { return handleExchangeRate(request); }
export function OPTIONS(request: Request) { return handleExchangeRate(request); }
