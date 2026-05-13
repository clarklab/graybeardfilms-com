/**
 * verify.js — Validates the admin password without doing anything else.
 *
 * Called by admin/index.html on login to verify credentials before
 * loading content.json. Returns 200 on match, 401 otherwise.
 *
 * Env vars required: ADMIN_PASSWORD.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { password } = JSON.parse(event.body);

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
