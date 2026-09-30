import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openDB } from 'idb';
import { activateAccount } from '../utils/activeAccount';
import { getAnonymousData, getDb } from '../utils/db';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test('sign-in leaves anonymous records untouched and requires reload to switch accounts', async () => {
  globalThis.localStorage = new MemoryStorage();
  const old = await openDB('adaptive-study-game-db', 3, {
    upgrade(db) { db.createObjectStore('studySets', { keyPath: 'id' }); },
  });
  await old.put('studySets', { id: 'old-set' });
  old.close();
  localStorage.setItem('adaptive-study-game-sets', JSON.stringify([{ id: 'old-local-set' }]));

  activateAccount('google-account-a');
  const account = await getDb();
  assert.equal(account.name, 'adaptive-study-game-db-account-google-account-a');
  assert.deepEqual(await account.getAll('studySets'), []);
  const anonymous = await getAnonymousData();
  assert.equal(anonymous.studySets?.length, 2);
  const untouched = await openDB('adaptive-study-game-db');
  assert.deepEqual(await untouched.getAll('studySets'), [{ id: 'old-set' }]);
  untouched.close();
  assert.ok(localStorage.getItem('adaptive-study-game-sets'));
  localStorage.setItem('adaptive-study-game-history', '{broken');
  assert.equal((await getAnonymousData()).studySets?.length, 2);
  assert.equal(localStorage.getItem('adaptive-study-game-history'), '{broken');
  assert.throws(() => activateAccount('google-account-b'), /Reload before changing accounts/);
  account.close();
});
