import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const data = JSON.parse(read('site/games.json'));
test('game directory includes distinct curated HTTPS guide entrances', () => {
  assert.ok(data.length >= 10);
  assert.equal(new Set(data.map(g => g.id)).size, data.length);
  const platforms = new Set(['Switch', 'Switch 2']);
  const genres = new Set(['策略战棋', '角色扮演', '动作冒险', '竞速', '休闲模拟', '多人对战']);
  for (const game of data) {
    for (const field of ['id','title','english','url','source','summary','genre','platform','tone','symbol']) {
      assert.equal(typeof game[field], 'string', game.id + ' is missing ' + field);
      assert.ok(game[field].trim(), game.id + ' has blank ' + field);
    }
    assert.match(game.id, /^[a-z0-9-]+$/);
    assert.equal(new URL(game.url).protocol, 'https:');
    assert.ok(platforms.has(game.platform));
    assert.ok(genres.has(game.genre));
    assert.ok(Array.isArray(game.keywords));
  }
  assert.ok(data.filter(g => g.featured).length >= 3);
});
test('portal includes searchable directory, external link safety, fallback and no backend config', () => {
  const html = read('site/index.html');
  const app = read('site/app.js');
  assert.match(html, /id="search-input"/);
  assert.match(html, /id="game-grid"/);
  assert.match(html, /id="featured-grid"/);
  assert.match(html, /<noscript>/);
  assert.match(app, /noopener noreferrer/);
  assert.match(app, /localStorage/);
  assert.doesNotMatch(html, /VITE_COLLABORATION_URL|WikiEditor|SpaceWorkspace/);
});
