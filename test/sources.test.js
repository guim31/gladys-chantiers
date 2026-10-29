// -----------------------------------------------------------------------------
// The adapters of the six portals, on their real answers (2026-10-29): every
// worksite has an id, an end, a point and texts; dates are days of Paris.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOURCES, SOURCE_KEYS, centre, day, tidy } from '../src/sources.js';
import { FIXTURE_TIME, createFetch } from './helpers/world.js';

const read = async (key, network = createFetch()) => SOURCES[key].read(network.fetch);

// Worksites kept from each capture (sidewalk-only, "no impact" and finished
// ones, and the ones ending before they start, are left out).
const COUNTS = { paris: 105, lyon: 447, toulouse: 935, rennes: 233, tours: 177, angers: 120 };

for (const key of SOURCE_KEYS) {
  test(`${key}: every worksite is complete`, async () => {
    const list = await read(key);
    assert.equal(list.length, COUNTS[key]);
    const ids = new Set();
    for (const w of list) {
      assert.ok(w.id && !ids.has(w.id), `${key}: id ${w.id}`);
      ids.add(w.id);
      assert.ok(w.title, `${key} ${w.id}: title`);
      assert.ok(w.place, `${key} ${w.id}: place`);
      assert.ok(Number.isFinite(w.end), `${key} ${w.id}: end`);
      assert.ok(w.start === null || w.start <= w.end, `${key} ${w.id}: start after end`);
      assert.ok(w.lat > 41 && w.lat < 51 && w.lon > -5 && w.lon < 10, `${key} ${w.id}: point`);
    }
    assert.ok(
      list.some((w) => w.end >= FIXTURE_TIME),
      `${key}: worksites in progress`,
    );
  });
}

test('Paris: the code of the work in words, the district', async () => {
  const w = (await read('paris')).find((x) => x.id === 'CP003103');
  assert.deepEqual(
    { ...w, lat: undefined, lon: undefined },
    {
      id: 'CP003103',
      title: "Réhabilitation d'immeuble",
      street: 'rue de Vaugirard',
      place: 'Paris 6e',
      impact: 'Sens unique',
      start: Date.parse('2026-08-31T00:00:00+02:00'),
      end: Date.parse('2026-11-14T00:00:00+01:00') - 1,
      lat: undefined,
      lon: undefined,
    },
  );
});

test('Lyon: the centre of the shape, the arrondissement', async () => {
  const w = (await read('lyon')).find((x) => x.id === '416515');
  assert.equal(w.street, 'Avenue Esquirol');
  assert.equal(w.place, 'Lyon 3e');
  assert.equal(w.impact, 'Circulation interdite');
  assert.ok(Math.abs(w.lat - 45.7416) < 0.001 && Math.abs(w.lon - 4.8867) < 0.002);
});

test('Toulouse: the street out of the label, capitals tamed, sidewalks left out', async () => {
  const list = await read('toulouse');
  const w = list.find((x) => x.id === 'T26TLS09054');
  assert.equal(w.title, 'Voirie, balayage mécanisé');
  assert.equal(w.street, 'Autoroute 620');
  assert.ok(list.every((x) => x.impact !== 'Occupation du trottoir'));
});

test('Angers: real hours; Rennes and Tours: no "no impact" worksite', async () => {
  const w = (await read('angers')).find((x) => x.id === '110050');
  assert.equal(w.start, Date.parse('2026-11-10T06:00:00Z'));
  assert.equal(w.end, Date.parse('2026-11-10T11:00:00Z'));
  assert.ok((await read('rennes')).every((x) => !/^\d+ - /.test(x.place)));
});

test('a portal answering garbage or an error is a failure, not an empty city', async () => {
  const network = createFetch();
  network.data.paris = { error: 'oops' };
  await assert.rejects(read('paris', network), /unexpected answer/);
  network.status.set('lyon', 500);
  await assert.rejects(read('lyon', network), /data\.grandlyon\.com: HTTP 500/);
});

test('helpers: days of Paris, tidy texts, centre without bbox', () => {
  assert.equal(day('2026-11-13'), Date.parse('2026-11-13T00:00:00+01:00'));
  assert.equal(
    day('2026-11-13T00:00:00+00:00', { endOfDay: true }),
    Date.parse('2026-11-14T00:00:00+01:00') - 1,
  );
  assert.equal(day(null), null);
  assert.equal(tidy('  RUE  DES CAPITOULS '), 'Rue des capitouls');
  assert.equal(tidy('Rue Pollet '), 'Rue Pollet');
  assert.equal(tidy('146 - 144 rue de Vaugirard.'), '146 - 144 rue de Vaugirard');
  assert.equal(tidy('rue de Vaugirard 75006_'), 'rue de Vaugirard 75006');
  assert.deepEqual(
    centre({
      geometry: {
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      },
    }),
    { lat: 3, lon: 2 },
  );
  assert.deepEqual(centre({ geometry: null }), { lat: null, lon: null });
});
