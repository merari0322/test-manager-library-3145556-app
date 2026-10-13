// Basic smoke tests: the app is served, every menu screen exists, and the API calls each screen uses answer.
// Requires `docker compose up -d` from infra. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const APP = 'http://localhost:5173';
const API = 'http://localhost:8000/api/v1';
const { ADMIN_USERNAME = 'admin', ADMIN_PASSWORD = 'change-me' } = process.env;

test('the app page is served', async () => {
  const html = await (await fetch(APP)).text();
  assert.match(html, /<title>Manager Library<\/title>/);
});

test('the menu links every screen to a component', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  for (const name of ['Catálogo', 'Socios', 'Prestar', 'Devolver', 'Vencidos', 'Reporte']) {
    assert.ok(app.includes(`${name}:`), `falta la pantalla ${name}`);
  }
});

test('login works and every screen endpoint answers', async () => {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
  });
  assert.equal(login.status, 200);
  const { access_token } = await login.json();
  const headers = { Authorization: `Bearer ${access_token}`, Accept: 'application/json' };
  const today = new Date().toISOString().slice(0, 10);
  for (const path of ['/books', '/members', '/loans', '/loans/overdue', `/reports/most-borrowed?from=${today}&to=${today}`]) {
    assert.equal((await fetch(API + path, { headers })).status, 200, path);
  }
});

test('wrong password is rejected', async () => {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: 'incorrecta' }),
  });
  assert.equal(res.status, 401);
});
