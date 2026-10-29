// -----------------------------------------------------------------------------
// What the integration writes to `docker logs`: at info, only the lifecycle
// (the start, a portal lost and back), never one line per reading; a failure
// that repeats at every cycle is logged once, plus one line when it is over.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureLogs, create, createWorld, tick } from './helpers/world.js';

const strip = (line) => line.text.replace(/^\[[^\]]+\] /, '');

test('the start is one info line', async (t) => {
  const lines = captureLogs(t, 'info');
  const world = await createWorld();
  t.after(() => world.app.stop());
  assert.deepEqual(lines.map(strip), [
    '[INFO] [chantiers] Started: 1 city(ies) chosen, 0 zone(s) added',
  ]);
});

test('a normal day writes nothing at info, one line per reading at debug', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, 'Avenue Esquirol');
  const lines = captureLogs(t, 'info');
  for (let i = 0; i < 24; i += 1) {
    await tick(world);
  }
  assert.deepEqual(lines, []);
  const debug = captureLogs(t, 'debug');
  // The data are read twice a day: a new reading 12 hours after the last one.
  for (let i = 0; i < 12; i += 1) {
    await tick(world);
  }
  assert.deepEqual(debug.map(strip), ['[DEBUG] [chantiers] Métropole de Lyon: 447 worksites read']);
});

test('a portal down: one warning, then one line at recovery', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, 'Avenue Esquirol');
  const lines = captureLogs(t, 'info');
  world.network.down.add('lyon');
  for (let i = 0; i < 16; i += 1) {
    await tick(world);
  }
  world.network.down.delete('lyon');
  await tick(world);
  assert.deepEqual(lines.map(strip), [
    '[WARN] [chantiers] Métropole de Lyon: data unavailable: data.grandlyon.com: fetch failed',
    '[INFO] [chantiers] Métropole de Lyon: data back',
  ]);
});
