import { requireAuth } from '../_auth.js';

const J = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

export async function onRequestGet({ request, env }) {
  if (!(await requireAuth(request, env))) return J({ ok: false }, 401);
  const blob = await env.DATA.get('blob');
  return J(blob ? JSON.parse(blob) : { updatedAt: 0, data: null });
}

export async function onRequestPut({ request, env }) {
  if (!(await requireAuth(request, env))) return J({ ok: false }, 401);
  let body;
  try { body = await request.json(); } catch { return J({ ok: false }, 400); }
  if (!body || typeof body.updatedAt !== 'number' || !body.data) return J({ ok: false }, 400);
  await env.DATA.put('blob', JSON.stringify({ updatedAt: body.updatedAt, data: body.data }));
  return J({ ok: true, updatedAt: body.updatedAt });
}
