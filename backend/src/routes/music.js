// ============================================================
// SPYCE - Music Search Proxy
// WHY THIS EXISTS: The Pi Browser blocks direct browser →
//   iTunes/Jamendo requests due to CORS. This route runs
//   server-side (no CORS restrictions) and forwards results.
// ROUTES:
//   GET /api/music/search?q=<query>
// ============================================================
const express = require('express');
const router = express.Router();

// ── iTunes Search ─────────────────────────────────────────────
const searchItunes = async (query) => {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=15&entity=song`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map(t => ({
    id: `itunes_${t.trackId}`,
    title: t.trackName,
    artist: t.artistName,
    album: t.collectionName,
    artwork: t.artworkUrl100 || t.artworkUrl60,
    previewUrl: t.previewUrl,
    duration: t.trackTimeMillis,
    source: 'iTunes',
  }));
};

// ── Jamendo Search ────────────────────────────────────────────
const searchJamendo = async (query) => {
  const url = `https://api.jamendo.com/v3.0/tracks/?client_id=b6747d04&format=json&limit=8&namesearch=${encodeURIComponent(query)}&include=musicinfo&audioformat=mp32`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map(t => ({
    id: `jamendo_${t.id}`,
    title: t.name,
    artist: t.artist_name,
    album: t.album_name,
    artwork: t.album_image || t.image,
    previewUrl: t.audio,
    duration: t.duration * 1000,
    source: 'Jamendo',
  }));
};

// ── GET /api/music/search ─────────────────────────────────────
router.get('/search', async (req, res) => {
  const { q } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Missing search query', results: [] });
  }

  try {
    // Run both sources in parallel — if one fails, the other still works
    const [itunesResult, jamendoResult] = await Promise.allSettled([
      searchItunes(q.trim()),
      searchJamendo(q.trim()),
    ]);

    const itunes = itunesResult.status === 'fulfilled' ? itunesResult.value : [];
    const jamendo = jamendoResult.status === 'fulfilled' ? jamendoResult.value : [];

    // Merge and deduplicate by title+artist
    const seen = new Set();
    const results = [...itunes, ...jamendo].filter(t => {
      const key = `${t.title}_${t.artist}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({
      results,
      meta: {
        query: q.trim(),
        total: results.length,
        sources: {
          itunes: itunes.length,
          jamendo: jamendo.length,
        },
      },
    });
  } catch (err) {
    console.error('Music search error:', err.message);
    res.status(500).json({ error: 'Music search failed', results: [] });
  }
});

module.exports = router;