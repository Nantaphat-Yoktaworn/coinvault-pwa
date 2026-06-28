import { timingSafeEqual, sign } from '../_auth.js';

export async function onRequestPost({ request, env }) {
  let password = '';
  try { ({ password = '' } = await request.json()); } catch {}

  if (!env.APP_PASSWORD || !timingSafeEqual(password, env.APP_PASSWORD)) {
    return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const token = await sign(env.SESSION_SECRET);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`,
    },
  });
}
