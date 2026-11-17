import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'expo-crypto') return nextResolve('node:crypto', context);
    if (specifier === 'expo/fetch') {
      const mock = 'export function fetch(url, options) { return globalThis.testEntryFetch(url, options); }';
      return nextResolve('data:text/javascript,' + encodeURIComponent(mock), context);
    }
    const source = specifier.startsWith('@/')
      ? new URL('../src/' + specifier.slice(2) + '.ts', import.meta.url)
      : specifier.startsWith('./') && !/\.[cm]?[jt]sx?$/.test(specifier)
        ? new URL(specifier + '.ts', context.parentURL)
        : null;
    return nextResolve(source && existsSync(source) ? source.href : specifier, context);
  },
});

const { initializeDatabase } = await import('../src/database/initialize-database.ts');
const { createAccount, getAccountBySyncId, updateAccount, archiveAccount, canDeleteLocalAccount, deleteLocalAccount } = await import('../src/repositories/account-repository.ts');
const { createCategory, getCategoryBySyncId, updateCategory } = await import('../src/repositories/category-repository.ts');
const { createEntry, updateEntry, deleteEntry, getEntryBySyncId, resolveEntrySyncConflict } =
  await import('../src/repositories/entry-repository.ts');
const { claimNextSyncCommand } = await import('../src/repositories/sync-outbox-repository.ts');
const { uploadBudgetChanges } = await import('../src/services/upload-budget-changes.ts');
const { downloadProfileBudgetChanges } = await import('../src/services/initialize-profile-budget.ts');
const { createTransfer, updateTransfer } = await import('../src/repositories/transfer-repository.ts');
const { resolveBudgetEntityConflict } = await import('../src/services/budget-entity-conflict.ts');
const { listSyncConflicts } = await import('../src/services/pending-sync-conflicts.ts');

async function createFixture(t, filename = ':memory:') {
  const sqlite = new DatabaseSync(filename);
  t.after(() => sqlite.close());
  t.after(() => { delete globalThis.testEntryFetch; });
  const database = {
    execAsync: async (sql) => sqlite.exec(sql),
    runAsync: async (sql, ...args) => sqlite.prepare(sql).run(...args),
    getFirstAsync: async (sql, ...args) => sqlite.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql, ...args) => sqlite.prepare(sql).all(...args),
    withExclusiveTransactionAsync(operation) {
      return this.withTransactionAsync(() => operation(this));
    },
    async withTransactionAsync(operation) {
      sqlite.exec('BEGIN');
      try {
        await operation();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };

  await initializeDatabase(database);
  const account = await createAccount(database, {
    name: 'Cash', description: null, currencyCode: 'EUR', iconKey: 'cash',
    iconColor: null, openingBalanceMinor: 10_000, isHidden: 0,
  });
  const category = await createCategory(database, {
    name: 'Food', type: 'EXPENSE', iconKey: 'otherExpense', iconColor: null,
  });
  const input = {
    title: 'Lunch', amountMinor: 2_500, dateTime: new Date(), description: null,
    accountSyncId: account.syncId, categorySyncId: category.syncId,
  };
  const first = await createEntry(database, { ...input, type: 'EXPENSE' });
  const secondInput = { ...input, title: 'Dinner', amountMinor: 1_000 };
  const second = await createEntry(database, { ...secondInput, type: 'EXPENSE' });
  // Start with both expenses already acknowledged by the server at version 0.
  sqlite.exec('DELETE FROM sync_outbox;');
  const acknowledge = sqlite.prepare('UPDATE entries SET server_id = ?, server_version = 0 WHERE sync_id = ?');
  acknowledge.run(1, first.syncId);
  acknowledge.run(2, second.syncId);

  const remote = {
    id: 1, syncId: first.syncId, version: 1, title: 'Brunch', type: 'EXPENSE',
    amount: '40', currencyCode: 'EUR', accountName: account.name, categoryName: category.name,
    dateTime: first.dateTime, description: null, accountSyncId: account.syncId,
    categorySyncId: category.syncId, lastEditedBy: { id: 42, username: 'web-editor' },
  };
  const calls = [];
  return {
    database, input, first, second, secondInput, remote, calls, account, category, sqlite,
    balance: () => sqlite.prepare('SELECT balance_minor AS balance FROM accounts WHERE sync_id = ?')
      .get(account.syncId).balance,
    pending: () => sqlite.prepare('SELECT COUNT(*) AS total FROM sync_outbox').get().total,
    mockServer(serverDeleted = false) {
      globalThis.testEntryFetch = (_url, { method, body }) => {
        const payload = JSON.parse(body);
        calls.push({ method, payload });
        if (payload.syncId === first.syncId && payload.expectedVersion === 0) {
          return serverDeleted
            ? Response.json({ message: 'Entry was deleted on the server' }, { status: 410 })
            : Response.json({ code: 'ENTRY_VERSION_CONFLICT', serverEntry: remote }, { status: 409 });
        }
        if (method === 'POST' && payload.expectedVersion !== undefined) {
          return Response.json({ syncId: payload.syncId, deleted: true });
        }
        const id = payload.syncId === first.syncId ? 1 : payload.syncId === second.syncId ? 2 : 3;
        return Response.json({ syncId: payload.syncId, version: (payload.expectedVersion ?? -1) + 1, id });
      };
    },
  };
}

async function readConflict(database) {
  assert.equal(await uploadBudgetChanges(database, {}, () => true), 'complete');
  const conflicts = await listSyncConflicts(database);
  assert.equal(conflicts.length, 1);
  return conflicts[0];
}

for (const choice of ['local', 'server']) {
  test(`multiple local edits versus a server edit — keep ${choice}`, async (t) => {
    const fixture = await createFixture(t);
    const { database, first, input, calls } = fixture;
    await updateEntry(database, first.syncId, { ...input, amountMinor: 3_000 });
    await claimNextSyncCommand(database);
    await updateEntry(database, first.syncId, { ...input, amountMinor: 3_500 });
    assert.equal(fixture.pending(), 2);
    fixture.mockServer();
    const conflict = await readConflict(database);
    assert.equal(conflict.base.amountMinor, 2_500);
    assert.equal(conflict.local.amountMinor, 3_500);
    assert.equal(conflict.server.editor, 'web-editor');
    await resolveEntrySyncConflict(database, conflict, choice);
    assert.equal(await uploadBudgetChanges(database, {}, () => true), 'complete');
    assert.equal(fixture.pending(), 0);
    assert.equal(fixture.balance(), choice === 'local' ? 5_500 : 5_000);
    if (choice === 'local') {
      assert.equal(calls[1].payload.expectedVersion, 1);
      assert.equal(calls[1].payload.amount, 35);
    } else assert.equal(calls.length, 1);
  });

  test(`server deletion versus a local edit — keep ${choice} and send the next edit`, async (t) => {
    const fixture = await createFixture(t);
    const { database, first, second, input, secondInput, calls } = fixture;
    await updateEntry(database, first.syncId, { ...input, amountMinor: 3_000 });
    await updateEntry(database, second.syncId, { ...secondInput, amountMinor: 2_000 });
    fixture.mockServer(true);
    const conflict = await readConflict(database);
    assert.equal(conflict.server, null);
    assert.equal(conflict.local.amountMinor, 3_000);
    await resolveEntrySyncConflict(database, conflict, choice);
    assert.equal(await uploadBudgetChanges(database, {}, () => true), 'complete');
    assert.equal(await getEntryBySyncId(database, first.syncId), null);
    assert.equal(fixture.pending(), 0);
    assert.equal(fixture.balance(), choice === 'local' ? 5_000 : 8_000);
    assert.equal(calls[1].payload.syncId, second.syncId);
    assert.equal(calls[1].payload.amount, 20);
    if (choice === 'local') {
      assert.equal(calls[2].method, 'POST');
      assert.notEqual(calls[2].payload.syncId, first.syncId);
      assert.equal(calls[2].payload.amount, 30);
    } else assert.equal(calls.length, 2);
  });
}

test('a server edit restores a locally deleted expense without prompting', async (t) => {
  const fixture = await createFixture(t);
  const { database, first, input, calls } = fixture;
  await updateEntry(database, first.syncId, { ...input, amountMinor: 3_000 });
  await claimNextSyncCommand(database);
  await deleteEntry(database, first.syncId);
  fixture.mockServer();
  assert.equal(await uploadBudgetChanges(database, {}, () => true), 'complete');
  assert.deepEqual(await listSyncConflicts(database), []);
  assert.equal(fixture.pending(), 0);
  assert.equal(fixture.balance(), 5_000);
  const entry = await getEntryBySyncId(database, first.syncId);
  assert.equal(entry.serverId, 1);
  assert.equal(entry.amountMinor, 4_000);
  assert.equal(calls.length, 1);
});

for (const entity of ['CATEGORY', 'ACCOUNT', 'TRANSFER']) {
  for (const choice of ['local', 'server']) {
    test(`${entity} version conflict — keep ${choice} and send the next edit`, async (t) => {
      const fixture = await createFixture(t);
      const { account, category, database, sqlite, second, secondInput, calls } = fixture;
      sqlite.exec('UPDATE accounts SET server_id = 1, server_version = 0');
      sqlite.exec('UPDATE categories SET server_id = 1, server_version = 0');
      const accountData = {
        id: 1, syncId: account.syncId, name: 'Cash on server', description: null, currencyCode: 'EUR',
        iconKey: 'cash', archivedAt: null, shared: false, amount: 65, version: 1,
      };
      const categoryData = {
        id: 1, syncId: category.syncId, name: 'Food on server', type: 'EXPENSE', readOnly: false, version: 1,
      };
      const items = [
        ['ACCOUNT', accountData],
        ['CATEGORY', categoryData],
        ['ENTRY', { ...fixture.remote, amount: 25 }],
        ['ENTRY', { ...fixture.remote, id: 2, syncId: second.syncId, title: 'Dinner', amount: 10 }],
      ];
      let syncId;
      let target;
      if (entity === 'CATEGORY') {
        syncId = category.syncId;
        await updateCategory(database, syncId, { name: 'Food on phone', iconKey: 'otherExpense', iconColor: null, language: 'en' });
      } else if (entity === 'ACCOUNT') {
        syncId = account.syncId;
        await archiveAccount(database, syncId);
      } else {
        target = await createAccount(database, {
          name: 'Savings', description: null, currencyCode: 'EUR', iconKey: 'cash',
          iconColor: null, openingBalanceMinor: 0, isHidden: 0,
        });
        sqlite.prepare('UPDATE accounts SET server_id = 2, server_version = 0 WHERE sync_id = ?').run(target.syncId);
        const input = {
          fromAccountSyncId: account.syncId, toAccountSyncId: target.syncId,
          amountMinor: 500, targetAmountMinor: null, dateTime: new Date(), description: '',
        };
        await createTransfer(database, input);
        syncId = sqlite.prepare('SELECT sync_id AS id FROM transfers').get().id;
        sqlite.exec('UPDATE transfers SET server_id = 1, server_version = 0; DELETE FROM sync_outbox');
        await updateTransfer(database, syncId, { ...input, amountMinor: 800 });
        accountData.amount = 53;
        items.push(['ACCOUNT', { ...accountData, syncId: target.syncId, id: 2, name: target.name, amount: 12 }]);
        items.push(['TRANSFER', {
          syncId, id: 1, version: 1, fromAccountSyncId: account.syncId, toAccountSyncId: target.syncId,
          amount: 12, targetAmount: 12, fromAccountOwned: true, toAccountOwned: true,
          sourceCurrencyCode: 'EUR', targetCurrencyCode: 'EUR', dateTime: fixture.first.dateTime, description: null,
        }]);
      }
      await updateEntry(database, second.syncId, { ...secondInput, amountMinor: 2_000 });
      const downloadId = randomUUID();
      globalThis.testEntryFetch = (url, { method, body }) => {
        if (url.endsWith('/sync/downloads')) return Response.json({ downloadId, itemCount: items.length, mode: 'FULL' });
        if (url.includes(`/sync/downloads/${downloadId}?`)) {
          return Response.json({
            downloadId, mode: 'FULL', nextAfter: null, nextCursor: downloadId,
            items: items.map(([entityType, data], index) => ({
              action: 'UPSERT', position: index + 1, entityType, syncId: data.syncId, data,
            })),
          });
        }
        if (url.endsWith('/complete')) return new Response(null, { status: 204 });
        const payload = JSON.parse(body);
        calls.push({ method, payload });
        if (payload.syncId === syncId && payload.expectedVersion === 0) {
          return Response.json({ message: 'Version conflict' }, { status: 409 });
        }
        return Response.json({ syncId: payload.syncId, id: payload.syncId === second.syncId ? 2 : 1,
          version: payload.expectedVersion + 1 });
      };

      const conflict = await readConflict(database);
      assert.equal(conflict.entity, entity);
      assert.equal(conflict.canKeepLocal, true);
      await resolveBudgetEntityConflict(database, conflict, choice);
      assert.equal(await uploadBudgetChanges(database, {}, () => true), 'complete');
      assert.equal(fixture.pending(), 0);
      const next = calls.findIndex(({ payload }) => payload.syncId === second.syncId);
      assert.ok(next >= 1);
      if (choice === 'local') {
        const retried = calls.findIndex(({ payload }) => payload.syncId === syncId && payload.expectedVersion === 1);
        assert.ok(retried >= 1);
        assert.equal(retried < next, entity === 'ACCOUNT');
      }
      if (entity === 'CATEGORY') {
        assert.equal((await getCategoryBySyncId(database, syncId)).name,
          choice === 'local' ? 'Food on phone' : 'Food on server');
      } else if (entity === 'ACCOUNT') {
        assert.equal((await getAccountBySyncId(database, syncId)).archivedAt !== null, choice === 'local');
        assert.equal(fixture.balance(), 5_500);
      } else {
        assert.equal(fixture.balance(), choice === 'local' ? 4_700 : 4_300);
        assert.equal((await getAccountBySyncId(database, target.syncId)).balanceMinor, choice === 'local' ? 800 : 1_200);
      }
    });
  }
}

test('a deleted server category with local references is preserved along with its queued edit', async (t) => {
  const fixture = await createFixture(t);
  const { database, sqlite, category, first } = fixture;
  sqlite.exec('UPDATE categories SET server_id = 1, server_version = 0');
  await updateCategory(database, category.syncId, {
    name: 'Local category', iconKey: 'otherExpense', iconColor: null, language: 'en',
  });
  const downloadId = randomUUID();
  globalThis.testEntryFetch = (url) => {
    if (url.endsWith('/sync/downloads')) return Response.json({ downloadId, itemCount: 0, mode: 'FULL' });
    if (url.includes(`/sync/downloads/${downloadId}?`)) {
      return Response.json({ downloadId, mode: 'FULL', nextAfter: null, nextCursor: downloadId, items: [] });
    }
    if (url.endsWith('/complete')) return new Response(null, { status: 204 });
    return Response.json({ message: 'Category is unavailable for synchronization' }, { status: 404 });
  };
  const conflict = await readConflict(database);
  assert.equal(conflict.linkedLocally, true);
  assert.equal(conflict.canKeepLocal, false);
  await assert.rejects(resolveBudgetEntityConflict(database, conflict, 'server'), /depend/);
  assert.equal(fixture.pending(), 1);
  assert.equal((await getEntryBySyncId(database, first.syncId)).categorySyncId, category.syncId);
  assert.equal((await getCategoryBySyncId(database, category.syncId)).name, 'Local category');
  assert.equal(fixture.balance(), 6_500);
});

test('a delta restores the authoritative balance even at an already accepted account version', async (t) => {
  const { database, sqlite, account, first, remote, balance } = await createFixture(t);
  const cursor = randomUUID();
  const downloadId = randomUUID();
  sqlite.prepare('UPDATE sync_state SET initial_sync_complete = 1, download_cursor = ?').run(cursor);
  sqlite.exec('UPDATE accounts SET server_id = 1, server_version = 1');
  const items = [
    { entityType: 'ACCOUNT', data: {
      id: 1, syncId: account.syncId, version: 1, name: account.name, description: null,
      currencyCode: 'EUR', iconKey: 'cash', archivedAt: null, shared: false, amount: 50,
    } },
    { entityType: 'ENTRY', data: { ...remote, syncId: first.syncId, amount: 40 } },
  ];
  globalThis.testEntryFetch = (url) => {
    if (url.endsWith('/sync/downloads')) return Response.json({ downloadId, itemCount: items.length, mode: 'DELTA' });
    if (url.endsWith('/complete')) return new Response(null, { status: 204 });
    return Response.json({
      downloadId, mode: 'DELTA', nextAfter: null, nextCursor: downloadId,
      items: items.map((item, index) => ({
        ...item, syncId: item.data.syncId, action: 'UPSERT', position: index + 1,
      })),
    });
  };
  assert.equal(await downloadProfileBudgetChanges(database, {}), true);
  assert.equal(balance(), 5_000);
  assert.equal((await getAccountBySyncId(database, account.syncId)).openingBalanceMinor, 10_000);
});

test('restores a legacy category and retries the exact stored expense command', async (t) => {
  const { database, sqlite, account, category, input, pending, balance } = await createFixture(t);
  sqlite.exec('UPDATE categories SET server_id = 1, server_version = 4');
  const entry = await createEntry(database, { ...input, type: 'EXPENSE', amountMinor: 300 });
  const restoreToken = randomUUID();
  const originalRequests = [];
  let restored = false;
  globalThis.testEntryFetch = (url, { body }) => {
    const data = JSON.parse(body);
    if (url.endsWith('/dependencies/restore')) {
      assert.deepEqual(data, {
        entityType: 'CATEGORY', syncId: category.syncId, restoreToken,
        categoryName: category.name, categoryType: 'EXPENSE', categoryVersion: 4,
      });
      restored = true;
      return Response.json({ syncId: category.syncId, id: 2, version: 5 });
    }
    originalRequests.push({ url, body });
    if (!restored) {
      return Response.json({
        code: 'SYNC_DEPENDENCY_DELETED',
        dependency: { entityType: 'CATEGORY', syncId: category.syncId, restoreToken, needsCategoryDetails: true },
      }, { status: 409 });
    }
    assert.equal(data.accountSyncId, account.syncId);
    assert.equal(data.categorySyncId, category.syncId);
    return Response.json({ id: 3, version: 0, syncId: entry.syncId }, { status: 201 });
  };

  assert.equal(await uploadBudgetChanges(database, {}, () => true), 'complete');
  assert.deepEqual(originalRequests, [originalRequests[0], originalRequests[0]]);
  assert.equal((await getEntryBySyncId(database, entry.syncId)).categorySyncId, category.syncId);
  assert.equal((await getCategoryBySyncId(database, category.syncId)).serverVersion, 5);
  assert.equal(pending(), 0);
  assert.equal(balance(), 6_200);
});

test('restores both accounts for an offline cross-currency transfer without reapplying the local balances', async (t) => {
  const { database, sqlite, account, pending } = await createFixture(t);
  const target = await createAccount(database, {
    name: 'JPY', description: null, currencyCode: 'JPY', iconKey: 'cash',
    iconColor: null, openingBalanceMinor: 50, isHidden: 0,
  });
  sqlite.exec('DELETE FROM sync_outbox; UPDATE accounts SET server_id = rowid, server_version = 1');
  await createTransfer(database, {
    fromAccountSyncId: account.syncId, toAccountSyncId: target.syncId,
    amountMinor: 500, targetAmountMinor: 750, dateTime: new Date(), description: '',
  });

  const tokens = new Map([[account.syncId, randomUUID()], [target.syncId, randomUUID()]]);
  const restored = [];
  const transferRequests = [];
  globalThis.testEntryFetch = (url, { body }) => {
    const data = JSON.parse(body);
    if (url.endsWith('/dependencies/restore')) {
      assert.equal(data.restoreToken, tokens.get(data.syncId));
      assert.deepEqual(Object.keys(data).sort(), ['entityType', 'restoreToken', 'syncId']);
      restored.push(data.syncId);
      return Response.json({ syncId: data.syncId, id: restored.length, version: 2 });
    }
    transferRequests.push({ url, body });
    const missing = [account.syncId, target.syncId].find((id) => !restored.includes(id));
    if (missing) {
      return Response.json({
        code: 'SYNC_DEPENDENCY_DELETED',
        dependency: { entityType: 'ACCOUNT', syncId: missing, restoreToken: tokens.get(missing) },
      }, { status: 409 });
    }
    assert.equal(data.amount, 5);
    assert.equal(data.targetAmount, 750);
    return Response.json({ id: 1, version: 0, syncId: data.syncId }, { status: 201 });
  };
  assert.equal(await uploadBudgetChanges(database, {}, () => true), 'complete');
  assert.deepEqual(restored, [account.syncId, target.syncId]);
  assert.deepEqual(transferRequests, Array(3).fill(transferRequests[0]));
  assert.equal((await getAccountBySyncId(database, account.syncId)).balanceMinor, 6_000);
  assert.equal((await getAccountBySyncId(database, target.syncId)).balanceMinor, 800);
  assert.equal(pending(), 0);
});

test('a lost restore response keeps the original command ready for a retry', async (t) => {
  const { database, account, input, pending, balance } = await createFixture(t);
  const entry = await createEntry(database, { ...input, type: 'EXPENSE', amountMinor: 300 });
  const token = randomUUID();
  let restored = false;
  const commands = [];
  globalThis.testEntryFetch = (url, { body }) => {
    if (url.endsWith('/dependencies/restore')) {
      restored = true;
      throw new Error('Network response lost');
    }
    commands.push({ url, body });
    if (restored) return Response.json({ id: 3, version: 0, syncId: entry.syncId });
    return Response.json({
      code: 'SYNC_DEPENDENCY_DELETED',
      dependency: { entityType: 'ACCOUNT', syncId: account.syncId, restoreToken: token },
    }, { status: 409 });
  };

  await assert.rejects(uploadBudgetChanges(database, {}, () => true), /response lost/);
  assert.equal(pending(), 1);
  assert.equal(await uploadBudgetChanges(database, {}, () => true), 'complete');
  assert.deepEqual(commands, [commands[0], commands[0]]);
  assert.equal(pending(), 0);
  assert.equal(balance(), 6_200);
});

test('deletes a synchronized empty account with its last acknowledged version', async (t) => {
  const { database, sqlite, pending } = await createFixture(t);
  const account = await createAccount(database, {
    name: 'Empty', description: null, currencyCode: 'EUR', iconKey: 'cash',
    iconColor: null, openingBalanceMinor: 0, isHidden: 0,
  });
  sqlite.prepare('UPDATE accounts SET server_id = 7, server_version = 4 WHERE sync_id = ?').run(account.syncId);
  sqlite.prepare('DELETE FROM sync_outbox WHERE entity_sync_id = ?').run(account.syncId);

  assert.equal(await canDeleteLocalAccount(database, account.syncId), true);
  await deleteLocalAccount(database, account.syncId);
  assert.equal(await getAccountBySyncId(database, account.syncId), null);
  assert.equal(pending(), 1);
  globalThis.testEntryFetch = (url, { method, body }) => {
    assert.match(url, /\/api\/sync\/accounts\/[^/]+\/delete$/);
    assert.equal(method, 'POST');
    assert.deepEqual(JSON.parse(body), { syncId: account.syncId, expectedVersion: 4 });
    return Response.json({ syncId: account.syncId, deleted: true });
  };
  assert.equal(await uploadBudgetChanges(database, {}, () => true), 'complete');
  assert.equal(pending(), 0);
});

test('keeps accounts used by entries or transfers and cancels unused unsent accounts', async (t) => {
  const { database, account, pending } = await createFixture(t);
  const target = await createAccount(database, {
    name: 'Target', description: null, currencyCode: 'EUR', iconKey: 'cash',
    iconColor: null, openingBalanceMinor: 0, isHidden: 0,
  });
  const unused = await createAccount(database, {
    name: 'Unused', description: null, currencyCode: 'EUR', iconKey: 'cash',
    iconColor: null, openingBalanceMinor: 0, isHidden: 0,
  });
  await createTransfer(database, {
    fromAccountSyncId: account.syncId, toAccountSyncId: target.syncId,
    amountMinor: 100, targetAmountMinor: null, dateTime: new Date(), description: '',
  });
  const before = pending();
  for (const item of [account, target]) {
    assert.equal(await canDeleteLocalAccount(database, item.syncId), false);
    await assert.rejects(deleteLocalAccount(database, item.syncId), /entries or transfers/);
  }
  assert.equal(pending(), before);
  assert.equal(await canDeleteLocalAccount(database, unused.syncId), true);
  await deleteLocalAccount(database, unused.syncId);
  assert.equal(await getAccountBySyncId(database, unused.syncId), null);
  assert.equal(pending(), before - 1);
});

test('parks multiple conflicts durably and sends an independent expense on the same account', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'family-budget-conflicts-'));
  const filename = join(directory, 'budget.sqlite');
  const { database, first, second, input, secondInput, remote, pending } = await createFixture(t, filename);
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  await updateEntry(database, first.syncId, { ...input, amountMinor: 3_000 });
  await claimNextSyncCommand(database);
  await updateEntry(database, first.syncId, { ...input, amountMinor: 3_500 });
  await updateEntry(database, second.syncId, { ...secondInput, amountMinor: 1_500 });
  const independent = await createEntry(database, { ...input, title: 'Coffee', type: 'EXPENSE', amountMinor: 200 });
  const sent = [];
  globalThis.testEntryFetch = (_url, { body }) => {
    const data = JSON.parse(body);
    sent.push(data);
    if (data.syncId !== independent.syncId) {
      return Response.json({ code: 'ENTRY_VERSION_CONFLICT', serverEntry: { ...remote, syncId: data.syncId } }, { status: 409 });
    }
    return Response.json({ id: 3, version: 0, syncId: data.syncId });
  };

  assert.equal(await uploadBudgetChanges(database, {}, () => true), 'complete');
  assert.deepEqual(sent.map((item) => item.syncId), [first.syncId, second.syncId, independent.syncId]);
  assert.equal(pending(), 3);
  assert.equal(await claimNextSyncCommand(database), null);
  const reopened = new DatabaseSync(filename);
  try {
    const conflicts = await listSyncConflicts({
      getAllAsync: async (sql) => reopened.prepare(sql).all(),
    });
    assert.equal(conflicts.length, 2);
    assert.equal(conflicts[0].local.amountMinor, 3_500);
    assert.equal(conflicts[1].local.amountMinor, 1_500);
  } finally {
    reopened.close();
  }
});

test('restores a locally deleted account after an expense was added on the server', async (t) => {
  const { database, sqlite, category, remote, pending } = await createFixture(t);
  const account = await createAccount(database, {
    name: 'Deleted locally', description: null, currencyCode: 'EUR', iconKey: 'cash',
    iconColor: null, openingBalanceMinor: 10_000, isHidden: 0,
  });
  sqlite.prepare('UPDATE accounts SET server_id = 8, server_version = 0 WHERE sync_id = ?').run(account.syncId);
  sqlite.prepare('DELETE FROM sync_outbox WHERE entity_sync_id = ?').run(account.syncId);
  sqlite.prepare('UPDATE sync_state SET initial_sync_complete = 1, download_cursor = ?').run(randomUUID());
  await deleteLocalAccount(database, account.syncId);
  const items = [
    { entityType: 'ACCOUNT', data: {
      id: 8, syncId: account.syncId, version: 1, name: account.name, description: null,
      currencyCode: 'EUR', iconKey: 'cash', archivedAt: null, shared: false, amount: 70,
    } },
    { entityType: 'CATEGORY', data: {
      id: 1, syncId: category.syncId, version: 0, name: category.name, type: 'EXPENSE', readOnly: false,
    } },
    { entityType: 'ENTRY', data: {
      ...remote, id: 9, syncId: randomUUID(), accountSyncId: account.syncId, amount: 30,
    } },
  ];
  const downloads = new Map();
  globalThis.testEntryFetch = (url, { body }) => {
    if (url.endsWith('/complete')) return new Response(null, { status: 204 });
    if (url.endsWith('/sync/downloads')) {
      const id = randomUUID();
      const mode = JSON.parse(body).cursor ? 'DELTA' : 'FULL';
      downloads.set(id, mode);
      return Response.json({ downloadId: id, itemCount: items.length, mode });
    }
    const page = url.match(/\/sync\/downloads\/([^?]+)\?/);
    if (page) {
      return Response.json({
        downloadId: page[1], mode: downloads.get(page[1]), nextAfter: null, nextCursor: page[1],
        items: items.map((item, index) => ({
          ...item, syncId: item.data.syncId, action: 'UPSERT', position: index + 1,
        })),
      });
    }
    return Response.json({ message: 'Account version conflict' }, { status: 409 });
  };

  assert.equal(await uploadBudgetChanges(database, {}, () => true), 'complete');
  assert.equal(pending(), 0);
  assert.deepEqual(await listSyncConflicts(database), []);
  assert.equal(await downloadProfileBudgetChanges(database, {}), true);
  assert.equal((await getAccountBySyncId(database, account.syncId)).balanceMinor, 7_000);
  assert.equal((await getEntryBySyncId(database, items[2].data.syncId)).amountMinor, 3_000);
});

for (const mode of ['independent', 'disputed']) {
  test(`merges entry fields and preserves the local note — ${mode}`, async (t) => {
    const { database, first, input, remote, pending, balance } = await createFixture(t);
    const local = { ...input, description: 'Phone note', amountMinor: mode === 'disputed' ? 3_000 : 2_500 };
    await updateEntry(database, first.syncId, local);
    const requests = [];
    globalThis.testEntryFetch = (_url, { body }) => {
      const request = JSON.parse(body);
      requests.push(request);
      if (request.expectedVersion === 0) {
        return Response.json({
          code: 'ENTRY_VERSION_CONFLICT',
          serverEntry: { ...remote, title: first.title, amount: '40' },
        }, { status: 409 });
      }
      return Response.json({ id: 1, version: 2, syncId: first.syncId });
    };
    assert.equal(await uploadBudgetChanges(database, {}, () => true), 'complete');
    if (mode === 'disputed') {
      const conflicts = await listSyncConflicts(database);
      assert.equal(conflicts.length, 1);
      await resolveEntrySyncConflict(database, conflicts[0], 'server');
      assert.equal(await uploadBudgetChanges(database, {}, () => true), 'complete');
    }
    assert.equal(requests.length, 2);
    assert.equal(requests[1].expectedVersion, 1);
    assert.equal(requests[1].description, 'Phone note');
    assert.equal(requests[1].amount, 40);
    assert.equal((await getEntryBySyncId(database, first.syncId)).description, 'Phone note');
    assert.equal(pending(), 0);
    assert.equal(balance(), 5_000);
  });
}

test('merges an account name edited on the server with a note edited locally', async (t) => {
  const { account, database, sqlite, pending } = await createFixture(t);
  sqlite.exec('UPDATE accounts SET server_id = 1, server_version = 0');
  await updateAccount(database, account.syncId, {
    name: account.name, description: 'Local note', iconKey: 'cash', iconColor: null, isHidden: 0,
  });
  const downloadId = randomUUID();
  const server = {
    id: 1, syncId: account.syncId, name: 'Cash on server', description: null,
    currencyCode: 'EUR', iconKey: 'cash', archivedAt: null, shared: false, amount: 65, version: 1,
  };
  let merged;
  globalThis.testEntryFetch = (url, { body }) => {
    if (url.endsWith('/sync/downloads')) return Response.json({ downloadId, itemCount: 1, mode: 'FULL' });
    if (url.includes(`/sync/downloads/${downloadId}?`)) {
      return Response.json({ downloadId, mode: 'FULL', nextAfter: null, nextCursor: downloadId,
        items: [{ action: 'UPSERT', position: 1, entityType: 'ACCOUNT', syncId: server.syncId, data: server }],
      });
    }
    if (url.endsWith('/complete')) return new Response(null, { status: 204 });
    const payload = JSON.parse(body);
    if (payload.expectedVersion === 0) return Response.json({ message: 'Version conflict' }, { status: 409 });
    merged = payload;
    return Response.json({ syncId: account.syncId, id: 1, version: 2 });
  };
  assert.equal(await uploadBudgetChanges(database, {}, () => true), 'complete');
  assert.equal(pending(), 0);
  assert.equal(merged.expectedVersion, 1);
  assert.equal(merged.name, 'Cash on server');
  assert.equal(merged.description, 'Local note');
  assert.equal((await getAccountBySyncId(database, account.syncId)).name, 'Cash on server');
});

test('downloads an independent expense and its balance while an unrelated conflict is parked', async (t) => {
  const fixture = await createFixture(t);
  const { database, sqlite, account, first, input, remote, pending, balance } = fixture;
  const cursor = randomUUID();
  sqlite.prepare('UPDATE sync_state SET initial_sync_complete = 1, download_cursor = ?').run(cursor);
  sqlite.exec('UPDATE accounts SET server_id = 1, server_version = 0');
  await updateEntry(database, first.syncId, { ...input, amountMinor: 3_000 });
  fixture.mockServer();
  const parked = await readConflict(database);
  const downloadId = randomUUID();
  const otherAccount = randomUUID();
  const otherExpense = randomUUID();
  const accountData = { id: 1, syncId: account.syncId, version: 1, name: account.name, description: null,
    currencyCode: 'EUR', iconKey: 'cash', archivedAt: null, shared: false, amount: 50 };
  const rows = [
    ['ACCOUNT', accountData],
    ['ACCOUNT', { ...accountData, id: 2, syncId: otherAccount, name: 'Remote savings', amount: 90 }],
    ['ENTRY', { ...remote, amount: 40 }],
    ['ENTRY', { ...remote, id: 3, syncId: otherExpense, accountSyncId: otherAccount, amount: 10 }],
  ];
  globalThis.testEntryFetch = (url, { body }) => {
    if (url.endsWith('/sync/downloads')) {
      assert.equal(JSON.parse(body).cursor, cursor);
      return Response.json({ downloadId, itemCount: rows.length, mode: 'DELTA' });
    }
    if (url.endsWith('/complete')) return new Response(null, { status: 204 });
    return Response.json({ downloadId, mode: 'DELTA', nextAfter: null, nextCursor: downloadId,
      items: rows.map(([entityType, data], index) => ({
        action: 'UPSERT', position: index + 1, entityType, syncId: data.syncId, data,
      })),
    });
  };
  const readCursor = () => sqlite.prepare('SELECT download_cursor AS cursor FROM sync_state').get().cursor;
  assert.equal(await downloadProfileBudgetChanges(database, {}), true);
  assert.equal(pending(), 1);
  assert.equal(readCursor(), cursor);
  assert.equal((await getEntryBySyncId(database, first.syncId)).amountMinor, 3_000);
  assert.equal(balance(), 6_000);
  assert.equal((await getEntryBySyncId(database, otherExpense)).amountMinor, 1_000);
  assert.equal((await getAccountBySyncId(database, otherAccount)).balanceMinor, 9_000);
  await resolveEntrySyncConflict(database, parked, 'server');
  assert.equal(await downloadProfileBudgetChanges(database, {}), true);
  assert.equal(readCursor(), downloadId);
  assert.equal(pending(), 0);
  assert.equal(balance(), 5_000);
  assert.equal((await getAccountBySyncId(database, otherAccount)).openingBalanceMinor, 10_000);
});

test('merges a server-side transfer amount with the local note and updates both balances', async (t) => {
  const { account, database, sqlite, pending, balance } = await createFixture(t);
  sqlite.exec('UPDATE accounts SET server_id = 1, server_version = 0');
  const destination = await createAccount(database, {
    name: 'Savings', description: null, currencyCode: 'EUR', iconKey: 'cash',
    iconColor: null, openingBalanceMinor: 0, isHidden: 0,
  });
  const input = {
    fromAccountSyncId: account.syncId, toAccountSyncId: destination.syncId,
    amountMinor: 500, targetAmountMinor: null, dateTime: new Date(2026, 9, 19, 12), description: '',
  };
  await createTransfer(database, input);
  const syncId = sqlite.prepare('SELECT sync_id AS id FROM transfers').get().id;
  sqlite.prepare('UPDATE accounts SET server_id = 2, server_version = 0 WHERE sync_id = ?').run(destination.syncId);
  sqlite.exec('UPDATE transfers SET server_id = 1, server_version = 0; DELETE FROM sync_outbox');
  await updateTransfer(database, syncId, { ...input, description: 'Local transfer note' });

  const accountData = { id: 1, syncId: account.syncId, version: 1, name: account.name, description: null,
    currencyCode: 'EUR', iconKey: 'cash', archivedAt: null, shared: false, amount: 57 };
  const rows = [
    ['ACCOUNT', accountData],
    ['ACCOUNT', { ...accountData, syncId: destination.syncId, id: 2, name: destination.name, amount: 8 }],
    ['TRANSFER', {
      syncId, id: 1, version: 1, fromAccountSyncId: account.syncId, toAccountSyncId: destination.syncId,
      amount: 8, targetAmount: 8, fromAccountOwned: true, toAccountOwned: true,
      sourceCurrencyCode: 'EUR', targetCurrencyCode: 'EUR', dateTime: '2026-10-19T12:00:00', description: null,
    }],
  ];
  const downloadId = randomUUID();
  let merged;
  globalThis.testEntryFetch = (url, { body }) => {
    if (url.endsWith('/sync/downloads')) return Response.json({ downloadId, itemCount: rows.length, mode: 'FULL' });
    if (url.includes(`/sync/downloads/${downloadId}?`)) {
      return Response.json({ downloadId, mode: 'FULL', nextAfter: null, nextCursor: downloadId,
        items: rows.map(([entityType, data], index) => ({
          action: 'UPSERT', position: index + 1, entityType, syncId: data.syncId, data,
        })),
      });
    }
    if (url.endsWith('/complete')) return new Response(null, { status: 204 });
    const payload = JSON.parse(body);
    if (payload.expectedVersion === 0) return Response.json({ message: 'Version conflict' }, { status: 409 });
    merged = payload;
    return Response.json({ syncId, id: 1, version: 2 });
  };
  assert.equal(await uploadBudgetChanges(database, {}, () => true), 'complete');
  assert.equal(pending(), 0);
  assert.equal(merged.expectedVersion, 1);
  assert.equal(Number(merged.amount), 8);
  assert.equal(Number(merged.targetAmount), 8);
  assert.equal(merged.description, 'Local transfer note');
  assert.equal(balance(), 5_700);
  assert.equal((await getAccountBySyncId(database, destination.syncId)).balanceMinor, 800);
});

const { listPreferenceConflicts, resolvePreferenceConflict, syncBudgetPreferences } =
  await import('../src/services/budget-preferences.ts');
const { saveAccountOrder } = await import('../src/repositories/account-repository.ts');
const { saveCategoryOrder, getCategories } = await import('../src/repositories/category-repository.ts');

function preferenceServer(settings = {}) {
  let revision = 0;
  globalThis.testEntryFetch = (url, { method, body }) => {
    assert.ok(url.endsWith('/api/budget-preferences'));
    if (method === 'PUT') {
      const request = JSON.parse(body);
      if (request.revision !== String(revision)) return Response.json({}, { status: 409 });
      Object.assign(settings, request.settings);
      revision++;
    }
    return Response.json({ revision: String(revision), settings });
  };
  return {
    settings,
    edit(changes) {
      Object.assign(settings, changes);
      revision++;
    },
  };
}

test('budget appearance goes both ways, preserves resets and imports old local choices only once', async (t) => {
  const { database, account, category, sqlite } = await createFixture(t);
  sqlite.exec('UPDATE accounts SET server_id = 1, server_version = 0');
  sqlite.exec('UPDATE categories SET server_id = 1, server_version = 0');
  const accountColor = `account:${account.syncId}:color`;
  const hidden = `account:${account.syncId}:hidden`;
  const categoryColor = `category:${category.syncId}:color`;
  const icon = `category:${category.syncId}:icon`;
  sqlite.prepare('UPDATE accounts SET icon_color = ? WHERE sync_id = ?').run('#365BBC', account.syncId);
  sqlite.exec('DELETE FROM budget_preferences_dirty');
  const remote = preferenceServer({ [categoryColor]: '#397B55' });
  await syncBudgetPreferences(database, {});
  assert.equal(remote.settings[accountColor], '#365BBC');
  assert.equal((await getCategoryBySyncId(database, category.syncId)).iconColor, '#397B55');
  await updateAccount(database, account.syncId, {
    ...account, iconColor: null, isHidden: 1,
  });
  remote.edit({ [icon]: 'food' });
  await syncBudgetPreferences(database, {});
  assert.equal(remote.settings[accountColor], null);
  assert.equal(remote.settings[hidden], true);
  assert.equal((await getCategoryBySyncId(database, category.syncId)).iconKey, 'food');
  remote.edit({ [hidden]: false, [categoryColor]: null });
  await syncBudgetPreferences(database, {});
  assert.equal((await getAccountBySyncId(database, account.syncId)).isHidden, 0);
  assert.equal((await getCategoryBySyncId(database, category.syncId)).iconColor, null);
  assert.deepEqual(await listPreferenceConflicts(database), []);
});

test('order preserves a local rearrangement when the server adds an account, and parks competing changes', async (t) => {
  const { database, account, sqlite } = await createFixture(t);
  const b = await createAccount(database, { ...account, name: 'Savings' });
  const c = await createAccount(database, { ...account, name: 'Travel' });
  sqlite.exec('UPDATE accounts SET server_id = rowid, server_version = 0');
  const key = 'order:account';
  const original = [account.syncId, b.syncId, c.syncId];
  const remote = preferenceServer({ [key]: original });
  await syncBudgetPreferences(database, {});
  const newId = randomUUID();
  await saveAccountOrder(database, [b.syncId, account.syncId, c.syncId]);
  remote.edit({ [key]: [...original, newId] });
  await syncBudgetPreferences(database, {});
  assert.deepEqual(remote.settings[key], [b.syncId, account.syncId, c.syncId, newId]);

  await saveAccountOrder(database, [account.syncId, c.syncId, b.syncId]);
  remote.edit({ [key]: [c.syncId, b.syncId, account.syncId, newId] });
  await syncBudgetPreferences(database, {});
  const [conflict] = await listPreferenceConflicts(database);
  assert.equal(conflict.key, key);
  await resolvePreferenceConflict(database, conflict, 'local', {});
  await syncBudgetPreferences(database, {});
  assert.deepEqual(remote.settings[key], [account.syncId, c.syncId, b.syncId, newId]);
  assert.deepEqual(await listPreferenceConflicts(database), []);
});

test('category order synchronizes within its income or expense group', async (t) => {
  const { database, category, sqlite } = await createFixture(t);
  const custom = await createCategory(database, { ...category, name: 'Vacation' });
  const income = await createCategory(database, { ...category, name: 'Salary', type: 'INCOME' });
  sqlite.exec('UPDATE categories SET server_id = rowid, server_version = 0');
  const remote = preferenceServer();
  await syncBudgetPreferences(database, {});
  await saveCategoryOrder(database, 'EXPENSE', [custom.syncId, category.syncId]);
  await syncBudgetPreferences(database, {});
  assert.deepEqual(remote.settings['order:EXPENSE'], [custom.syncId, category.syncId]);
  remote.edit({ 'order:EXPENSE': [category.syncId, custom.syncId] });
  await syncBudgetPreferences(database, {});
  assert.deepEqual((await getCategories(database, 'EXPENSE')).map(({ syncId }) => syncId), [category.syncId, custom.syncId]);
  assert.deepEqual((await getCategories(database, 'INCOME')).map(({ syncId }) => syncId), [income.syncId]);
});
