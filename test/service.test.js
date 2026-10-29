// -----------------------------------------------------------------------------
// The integration end to end, against the SDK's fake Gladys and the real
// answers of the portals: the zones offered, their states, the reading pace,
// the triggers, the widget, the scene action and the status action.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../src/app.js';
import { distanceText } from '../src/messages.js';
import { READ_EVERY_MS, TICK_MS, TRIGGERS } from '../src/service.js';
import {
  FIXTURE_TIME,
  LYON_HOUSE,
  action,
  create,
  createClock,
  createFetch,
  createWorld,
  discovered,
  featureId,
  tick,
} from './helpers/world.js';

const stateOf = (world, device, key) => {
  const id = featureId(device, key);
  const all = world.fake.states.filter((s) => s.device_feature_external_id === id);
  const last = all.at(-1);
  return last?.text ?? last?.state;
};

const eventsOf = (world, key) => world.fake.sceneEvents.filter((e) => e.key === key);

test('the zones offered: around the house and one per street typed', async (t) => {
  const world = await createWorld({
    config: { cities: ['lyon'], home_radius: '500', streets: 'Avenue Esquirol; rue pollet, ab' },
  });
  t.after(() => world.app.stop());
  const names = world.fake.discoveredDevices.map((d) => d.name).sort();
  assert.deepEqual(names, [
    'Chantiers · Autour de la maison',
    'Chantiers · Avenue Esquirol',
    'Chantiers · rue pollet',
  ]);
  const street = discovered(world, 'Avenue Esquirol');
  assert.equal(street.should_poll, false);
  assert.match(street.external_id, /:street-avenue-esquirol$/);
  assert.deepEqual(
    street.features.map((f) => f.name),
    ['Chantiers en cours', 'Chantiers à venir', 'Chantier en cours', 'Prochain chantier'],
  );
});

test('no house zone when the radius is off or no house is located', async (t) => {
  for (const options of [
    { config: { cities: ['lyon'], home_radius: '0', streets: 'Pollet' } },
    { config: { cities: ['lyon'], home_radius: '500', streets: 'Pollet' }, houses: [] },
  ]) {
    const world = await createWorld(options);
    t.after(() => world.app.stop());
    assert.deepEqual(
      world.fake.discoveredDevices.map((d) => d.name),
      ['Chantiers · Pollet'],
    );
  }
});

test('a zone added gets all its states at once, from the real data', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const home = await create(world, 'Autour de la maison');
  const street = await create(world, 'Avenue Esquirol');
  // Esquirol starts on 2 November: upcoming on 29 October.
  assert.equal(stateOf(world, street, 'active'), 0);
  assert.equal(stateOf(world, street, 'upcoming'), 1);
  assert.equal(stateOf(world, street, 'current'), 'Aucun chantier');
  assert.equal(
    stateOf(world, street, 'next'),
    'Réfections de tranchées · Avenue Esquirol · à partir du 2 nov. · Circulation interdite',
  );
  const view = world.service.zoneView({ kind: 'home' });
  assert.ok(view.active.length > 0, 'worksites in progress around the house');
  assert.equal(stateOf(world, home, 'active'), view.active.length);
  const nearest = stateOf(world, home, 'nearest');
  assert.match(nearest, / · \d+ m · jusqu'au /);
  for (const item of [...view.active, ...view.upcoming]) {
    assert.ok(item.distance <= 500, `${item.worksite.street}: ${item.distance} m`);
  }
  // Nearest first.
  const distances = view.active.map((item) => item.distance);
  assert.deepEqual(
    distances,
    [...distances].sort((a, b) => a - b),
  );
});

test('the street search ignores accents and case', async (t) => {
  const world = await createWorld({
    config: { cities: ['paris'], home_radius: '0', streets: 'RUE DE VAUGIRARD' },
  });
  t.after(() => world.app.stop());
  const view = world.service.zoneView(world.service.offeredZones()[0]);
  assert.ok(view.active.length >= 1);
  assert.ok(view.active.every((item) => /vaugirard/i.test(item.worksite.street)));
});

test('the portals are read twice a day, the clock moves the states every hour', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const street = await create(world, 'Avenue Esquirol');
  const reads = () => world.network.calls.length;
  const before = reads();
  for (let i = 0; i < 11; i += 1) {
    await tick(world);
  }
  assert.equal(reads(), before, 'no reading within 12 hours');
  await tick(world);
  assert.equal(reads(), before + 1);
  // Until 2 November 00:00 in Paris, 3 days and a few hours later.
  const published = world.fake.states.length;
  await tick(world, 1);
  assert.equal(world.fake.states.length, published, 'nothing changed: nothing published');
  while (world.clock.now() < Date.parse('2026-11-02T00:30:00+01:00')) {
    await tick(world);
  }
  assert.equal(stateOf(world, street, 'active'), 1);
  assert.equal(stateOf(world, street, 'upcoming'), 0);
  assert.match(
    stateOf(world, street, 'current'),
    /^Réfections de tranchées · Avenue Esquirol · jusqu'au 6 nov\./,
  );
});

test('started, ended and announced fire once, never at start', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const street = await create(world, 'Avenue Esquirol');
  await tick(world);
  assert.deepEqual(world.fake.sceneEvents, []);
  while (world.clock.now() < Date.parse('2026-11-02T00:30:00+01:00')) {
    await tick(world);
  }
  const started = eventsOf(world, TRIGGERS.STARTED);
  assert.equal(started.length, 1);
  assert.deepEqual(started[0].data, {
    zone: street.external_id,
    zone_name: 'Chantiers · Avenue Esquirol',
    title: 'Réfections de tranchées',
    street: 'Avenue Esquirol',
    place: 'Lyon 3e',
    city: 'Métropole de Lyon',
    impact: 'Circulation interdite',
    start: '2 nov.',
    end: '6 nov.',
    distance: 0,
  });
  while (world.clock.now() < Date.parse('2026-11-07T00:30:00+01:00')) {
    await tick(world);
  }
  assert.equal(eventsOf(world, TRIGGERS.ENDED).length, 1);
  assert.equal(eventsOf(world, TRIGGERS.STARTED).length, 1);
  // A new worksite in the next reading.
  const sample = world.network.data.lyon.features.find((f) => f.properties.gid === 416515);
  world.network.data.lyon.features.push({
    ...structuredClone(sample),
    properties: {
      ...sample.properties,
      gid: 1,
      debutchantier: '2026-12-01',
      finchantier: '2026-12-03',
    },
  });
  for (let i = 0; i < 12; i += 1) {
    await tick(world);
  }
  const announced = eventsOf(world, TRIGGERS.ANNOUNCED);
  assert.equal(announced.length, 1);
  assert.equal(announced[0].data.start, '1 déc.');
});

test('a worksite gone from the data ends; a city first read late brings no news', async (t) => {
  const network = createFetch();
  network.down.add('paris');
  const world = await createWorld({
    network,
    config: { cities: ['lyon', 'paris'], home_radius: '0', streets: 'Rue' },
  });
  t.after(() => world.app.stop());
  await create(world, 'Rue');
  await tick(world);
  network.down.delete('paris');
  // Tried again 10 minutes after the failure: within the next hour.
  await tick(world);
  assert.ok(world.service.city('paris').worksites);
  assert.deepEqual(world.fake.sceneEvents, [], 'the worksites of Paris are no news');
  const gone = network.data.lyon.features.find(
    (f) => /^rue/i.test(f.properties.nom) && f.properties.debutchantier < '2026-10-29',
  );
  network.data.lyon.features = network.data.lyon.features.filter((f) => f !== gone);
  for (let i = 0; i < 12; i += 1) {
    await tick(world);
  }
  const ended = eventsOf(world, TRIGGERS.ENDED).filter((e) => e.data.city === 'Métropole de Lyon');
  assert.ok(ended.some((e) => e.data.street === gone.properties.nom.trim()));
});

test('a new radius or new cities move worksites without firing anything', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, 'Autour de la maison');
  await tick(world);
  await world.fake.configUpdated({ cities: ['lyon'], home_radius: '2000', streets: '' });
  await tick(world);
  await world.fake.configUpdated({ cities: ['lyon'], home_radius: '200', streets: '' });
  await tick(world);
  assert.deepEqual(world.fake.sceneEvents, []);
});

test('the container keeps itself up to date: its own timer, never onPoll', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'], now: FIXTURE_TIME });
  const network = createFetch();
  const clock = createClock();
  const gladys = createFakeGladys({
    config: { cities: ['lyon'], home_radius: '500', streets: 'Avenue Esquirol' },
    houses: [LYON_HOUSE],
  });
  const app = registerHandlers(gladys, { fetch: network.fetch, now: clock.now });
  t.after(() => app.stop());
  await gladys.connect();
  await app.ready;
  await app.service.loading;
  const device = app.service.gladys.fake.discoveredDevices.find((d) => d.name.includes('Esquirol'));
  await gladys.fake.deviceCreated(device);
  const reads = network.calls.length;
  clock.advance(READ_EVERY_MS);
  t.mock.timers.tick(TICK_MS);
  await app.service.refreshing;
  assert.equal(network.calls.length, reads + 1);
});

test('the widget lists the worksites of the zones, in progress first, 8 at most', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const home = await create(world, 'Autour de la maison');
  await create(world, 'Avenue Esquirol');
  const get = async (settings) => {
    const result = await world.fake.widgetGet('worksites', { settings, language: 'fr' });
    assert.equal(result.success, true);
    const content = result.data.content;
    assert.deepEqual(validateWidgetContent(content), []);
    return content;
  };
  const all = await get({});
  const list = all.components[0];
  assert.equal(list.type, 'card-list');
  assert.ok(list.items.length > 0 && list.items.length <= 8);
  assert.match(list.items[0].badge.text, /^\d+ m$/);
  assert.match(list.items[0].subtitle, /jusqu'au/);
  const without = await get({
    zones: [home.external_id],
    show_upcoming: false,
    show_distance: false,
  });
  assert.ok(without.components[0].items.every((item) => !item.badge));
  assert.ok(without.components[0].items.every((item) => !/à partir du/.test(item.subtitle)));
  const gone = await get({ zones: ['nothing'] });
  assert.equal(gone.components[0].text, "Cette zone n'est plus suivie.");
});

test('the scene action says the worksites in one sentence', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const street = await create(world, 'Avenue Esquirol');
  const result = await world.fake.sceneAction('worksites_summary', { zones: [street.external_id] });
  assert.equal(result.success, true);
  assert.deepEqual(result.data.outputs, {
    sentence: 'Chantiers · Avenue Esquirol : aucun chantier en cours. 1 à venir.',
    active: 0,
    upcoming: 1,
  });
  const none = await (await createWorld()).fake.sceneAction('worksites_summary', {});
  assert.equal(none.success, false);
});

test('the status action reports the cities, the house and the zones', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, 'Avenue Esquirol');
  const message = await action(world, 'status');
  assert.equal(
    message.fr,
    [
      '■ Métropole de Lyon : 321 en cours, 126 à venir',
      'Dernière lecture il y a 0 h.',
      '1 zone ajoutée à Gladys.',
    ].join('\n'),
  );
  assert.deepEqual(Object.keys(message), ['en', 'fr', 'de', 'es']);
});

test('a city down at start: nothing published, tried again 10 minutes later', async (t) => {
  const network = createFetch();
  network.status.set('lyon', 503);
  const world = await createWorld({ network });
  t.after(() => world.app.stop());
  assert.equal(world.service.zoneView({ kind: 'home' }), null);
  const message = await action(world, 'status');
  assert.match(message.en, /Last error: data\.grandlyon\.com: HTTP 503/);
  network.status.delete('lyon');
  world.clock.advance(11 * 60 * 1000);
  await world.service.refresh();
  assert.ok(world.service.zoneView({ kind: 'home' }));
});

test('a zone deleted then added again days later fires nothing old', async (t) => {
  const world = await createWorld({
    config: { cities: ['paris'], home_radius: '0', streets: 'Rue' },
  });
  t.after(() => world.app.stop());
  const zone = await create(world, 'Rue');
  await tick(world);
  await world.fake.deviceDeleted(zone);
  for (let i = 0; i < 72; i += 1) {
    await tick(world);
  }
  await world.fake.deviceCreated(zone);
  await tick(world);
  assert.deepEqual(world.fake.sceneEvents, []);
});

test('a zone just added has its reference at once: a start in the next hour fires', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  world.clock.time = Date.parse('2026-11-01T23:30:00+01:00');
  await create(world, 'Avenue Esquirol');
  await tick(world);
  assert.equal(eventsOf(world, TRIGGERS.STARTED).length, 1);
});

test('distances: metres, then kilometres with a decimal comma', () => {
  assert.equal(distanceText(994, 'fr'), '990 m');
  assert.equal(distanceText(997, 'fr'), '1 km');
  assert.equal(distanceText(1250, 'fr'), '1,3 km');
  assert.equal(distanceText(1250, 'en'), '1.3 km');
});
