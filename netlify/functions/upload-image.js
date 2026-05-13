/**
 * upload-image.js — Commits an image file to the site's GitHub repo.
 *
 * Path policy for the Graybeard site:
 *   - assets/films/<slug>.<ext>  — new uploads for film covers (preferred slot)
 *   - assets/og.<ext>            — social-sharing OG image
 *   - <root>/<existing-name>     — original cover images that ship with
 *                                  the repo. Re-uploading replaces them
 *                                  in place; new films should use the
 *                                  assets/films/ slot above.
 *
 * Env vars required: ADMIN_PASSWORD, GITHUB_REPO, GITHUB_TOKEN.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { password, path, data } = JSON.parse(event.body);

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const filmsSlot = /^assets\/films\/[a-z0-9_-]+\.(jpg|jpeg|png|webp|gif|svg)$/i;
  const ogSlot = /^assets\/og\.(jpg|jpeg|png|webp)$/i;
  const legacyRoots = new Set([
    'for-graybeard-website0.png',
    'graybeard-website-stills0.png',
    'vermin.png',
    'truewrestlingcropped.jpg',
    'cover-cowboy-1.jpg',
    'good-bernie.png',
    'pat-2-768x1152.jpg',
    'ringleaderreal-768x1152.png',
    'cover-superhyper.jpg',
    'cover-joe-hero.jpg',
    'kennycrop5-768x1152.jpg',
    'cover-harum.jpg',
    'cover-kettlebell.jpg',
    'cover-ringo.jpg',
    'cover-capt.jpg',
    'cover-joe-happiness-1.jpg',
    'cover-house-2.jpg',
    'cover-house-1.jpg',
  ]);

  const ok = filmsSlot.test(path) || ogSlot.test(path) || legacyRoots.has(path);
  if (!ok) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid image path' }) };
  }

  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  try {
    let sha;
    const getRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      { headers: { Authorization: `token ${token}`, 'User-Agent': 'graybeard-cms' } }
    );

    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }

    const body = {
      message: `Update ${path} via admin`,
      content: data
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'graybeard-cms'
        },
        body: JSON.stringify(body)
      }
    );

    if (!putRes.ok) {
      const err = await putRes.text();
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to upload', details: err }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
