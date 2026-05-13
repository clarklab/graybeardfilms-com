/**
 * save.js — Commits content.json to the site's GitHub repo.
 *
 * Called by admin/index.html when the editor clicks "Save Changes."
 * Authenticates with a shared password; writes via the GitHub
 * Contents API.
 *
 * Env vars required:
 *   ADMIN_PASSWORD  — shared editor password
 *   GITHUB_REPO     — "owner/name" of the site repo
 *   GITHUB_TOKEN    — fine-grained PAT with Contents:write on the repo
 *
 * The site's Netlify build is triggered automatically when the commit
 * lands on the default branch.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { password, content } = JSON.parse(event.body);

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  try {
    const getRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/content.json`,
      { headers: { Authorization: `token ${token}`, 'User-Agent': 'adlibcms' } }
    );

    if (!getRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to read current content' }) };
    }

    const fileData = await getRes.json();

    const putRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/content.json`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'adlibcms'
        },
        body: JSON.stringify({
          message: 'Update content via admin',
          content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
          sha: fileData.sha
        })
      }
    );

    if (!putRes.ok) {
      const err = await putRes.text();
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save', details: err }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
