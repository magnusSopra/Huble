// public/js/leaderboard.js
// Shared leaderboard rendering, used on the landing page and win screens.

function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function renderLeaderboard(tbodyEl, params) {
  const query = new URLSearchParams(params).toString();
  const rows = await Api.get(`/api/scores?${query}`);
  if (rows.length === 0) {
    tbodyEl.innerHTML = '<tr><td colspan="4" class="muted">No scores yet — be the first!</td></tr>';
    return;
  }
  tbodyEl.innerHTML = rows
    .map(
      (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.player_name}</td>
        <td>${r.attempts}</td>
        <td>${formatDuration(r.duration_ms)}</td>
      </tr>`
    )
    .join('');
}
