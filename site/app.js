const storageKey = 'nx-archive:favorites:v1';
const genres = ['全部', '策略战棋', '角色扮演', '动作冒险', '竞速', '休闲模拟', '多人对战'];
const allowedTones = new Set(['violet','teal','coral','blue','pink','indigo','green','mint','amber','lime','plum','orange','navy']);
const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function safeUrl(url) { try { const parsed = new URL(url); return parsed.protocol === 'https:' ? parsed.href : '#'; } catch { return '#'; } }
function loadFavorites() { try { const value = JSON.parse(localStorage.getItem(storageKey) || '[]'); return new Set(Array.isArray(value) ? value.filter(x => typeof x === 'string') : []); } catch { return new Set(); } }
function saveFavorites() { try { localStorage.setItem(storageKey, JSON.stringify([...state.favorites])); } catch { /* private mode / disabled storage: in-memory only */ } }
const state = { games: [], genre: '全部', platform: '全部', favoritesOnly: false, query: '', favorites: loadFavorites() };
const els = {
  grid: document.querySelector('#game-grid'),
  featured: document.querySelector('#featured-grid'),
  empty: document.querySelector('#empty-state'),
  count: document.querySelector('#result-count'),
  search: document.querySelector('#search-input'),
  favCount: document.querySelector('#fav-count'),
  total: document.querySelector('#side-total'),
};
const external = 'target="_blank" rel="noopener noreferrer"';
function artwork(game, compact = false) {
  const tone = allowedTones.has(game.tone) ? game.tone : 'blue';
  return `<div class="game-art tone-${tone}${compact ? ' art-compact' : ''}"><span class="art-grid" aria-hidden="true"></span><span class="art-glyph" aria-hidden="true">${escapeHtml(game.symbol)}</span><span class="art-english" aria-hidden="true">${escapeHtml(game.english)}</span><span class="art-blob" aria-hidden="true"></span></div>`;
}
function gameCard(game) {
  const favorite = state.favorites.has(game.id);
  const url = safeUrl(game.url);
  return `<article class="game-card">
    <a class="card-image-link" href="${escapeHtml(url)}" ${external} aria-label="进入${escapeHtml(game.title)}外部攻略">
      ${artwork(game)}
      <span class="card-platform">${escapeHtml(game.platform)}</span>
      <span class="art-arrow" aria-hidden="true">↗</span>
    </a>
    <div class="game-card-details">
      <div class="card-detail-top"><span class="game-genre">${escapeHtml(game.genre)}</span>
      <button class="favorite-button${favorite ? ' is-saved' : ''}" type="button" data-favorite="${escapeHtml(game.id)}" aria-pressed="${favorite}" aria-label="${favorite ? '取消收藏' : '收藏'}${escapeHtml(game.title)}" title="${favorite ? '取消收藏' : '加入收藏'}">${favorite ? '♥' : '♡'}</button></div>
      <h3><a href="${escapeHtml(url)}" ${external}>${escapeHtml(game.title)} <span class="card-title-arrow" aria-hidden="true">↗</span></a></h3>
      <p class="card-summary">${escapeHtml(game.summary)}</p>
      <span class="card-source">来自 ${escapeHtml(game.source)}</span>
    </div>
  </article>`;
}
function featuredCard(game, index) {
  return `<a class="featured-card featured-${index + 1} tone-${allowedTones.has(game.tone) ? game.tone : 'blue'}" href="${escapeHtml(safeUrl(game.url))}" ${external} aria-label="浏览${escapeHtml(game.title)}攻略（新标签页）">
    <div class="feature-rings" aria-hidden="true"></div>
    <span class="feature-top"><span class="feature-badge">${index === 0 ? '主推攻略' : '精选 Wiki'}</span><span class="feature-number">0${index + 1}</span></span>
    <span class="feature-symbol" aria-hidden="true">${escapeHtml(game.symbol)}</span>
    <span class="feature-bottom"><small>${escapeHtml(game.platform)} · ${escapeHtml(game.genre)}</small><strong>${escapeHtml(game.title)}</strong><span class="feature-desc">${escapeHtml(game.summary)} <span aria-hidden="true">↗</span></span></span>
  </a>`;
}
function filteredGames() {
  const q = state.query.trim().toLocaleLowerCase();
  return state.games.filter(game =>
    (state.genre === '全部' || game.genre === state.genre)
    && (state.platform === '全部' || game.platform === state.platform)
    && (!state.favoritesOnly || state.favorites.has(game.id))
    && (!q || [game.title, game.english, game.genre, game.platform, game.source, ...(game.keywords || [])].join(' ').toLocaleLowerCase().includes(q))
  );
}
function syncButtons() {
  document.querySelectorAll('[data-genre]').forEach(button => {
    const active = button.dataset.genre === state.genre;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-platform]').forEach(button => {
    const active = button.dataset.platform === state.platform;
    button.classList.toggle('is-selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  for (const button of [document.querySelector('#favorite-filter'), document.querySelector('#side-favorites')]) {
    button.classList.toggle('is-active', state.favoritesOnly);
    button.setAttribute('aria-pressed', String(state.favoritesOnly));
  }
  els.favCount.textContent = String(state.favorites.size);
}
function render() {
  const games = filteredGames();
  els.grid.innerHTML = games.map(gameCard).join('');
  els.count.textContent = `共 ${games.length} 款游戏`;
  els.empty.hidden = games.length !== 0;
  const browsingAll = !state.query && state.genre === '全部' && state.platform === '全部' && !state.favoritesOnly;
  document.querySelector('#featured').hidden = !browsingAll;
  syncButtons();
}
function resetFilters() {
  state.genre = '全部'; state.platform = '全部'; state.favoritesOnly = false; state.query = '';
  els.search.value = ''; render();
}
document.addEventListener('click', event => {
  const fav = event.target.closest('[data-favorite]');
  if (fav) {
    const id = fav.dataset.favorite;
    if (!state.games.some(g => g.id === id)) return;
    state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
    saveFavorites(); render(); return;
  }
  const genre = event.target.closest('[data-genre]');
  if (genre && genres.includes(genre.dataset.genre)) {
    state.genre = genre.dataset.genre;
    render(); document.querySelector('#game-library').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const platform = event.target.closest('[data-platform]');
  if (platform && ['全部','Switch','Switch 2'].includes(platform.dataset.platform)) { state.platform = platform.dataset.platform; render(); return; }
  if (event.target.closest('#side-favorites') || event.target.closest('#favorite-filter')) {
    state.favoritesOnly = !state.favoritesOnly; render();
    if (event.target.closest('#side-favorites')) document.querySelector('#game-library').scrollIntoView({ behavior:'smooth' });
    return;
  }
  if (event.target.closest('#reset-filters')) resetFilters();
});
els.search.addEventListener('input', () => { state.query = els.search.value; render(); });
document.addEventListener('keydown', event => {
  const element = document.activeElement;
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT','TEXTAREA'].includes(element?.tagName) && !element?.isContentEditable) {
    event.preventDefault(); els.search.focus();
  }
  if (event.key === 'Escape' && element === els.search) {
    els.search.value = ''; state.query = ''; render(); els.search.blur();
  }
});
async function init() {
  try {
    const res = await fetch('./games.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) throw new Error('Invalid game list');
    state.games = data.filter(g => typeof g.id === 'string' && typeof g.title === 'string' && safeUrl(g.url) !== '#');
    state.favorites = new Set([...state.favorites].filter(id => state.games.some(g => g.id === id)));
    els.total.textContent = String(state.games.length);
    els.featured.innerHTML = state.games.filter(g => g.featured).slice(0, 3).map(featuredCard).join('');
    render();
  } catch (error) {
    console.error('Unable to load game directory:', error);
    els.count.textContent = '目录暂时不可用';
    els.empty.hidden = false;
    els.empty.querySelector('h3').textContent = '游戏目录加载失败';
    els.empty.querySelector('p').textContent = '请检查网络并刷新页面。';
    document.querySelector('#featured').hidden = true;
  }
}
init();
