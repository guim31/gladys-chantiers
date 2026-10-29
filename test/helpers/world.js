// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys, a fake `fetch` serving the
// real answers of the six portals (captured on 2026-10-29 around 17:12 in
// Paris, see test/fixtures/sources), a manual clock, and the integration wired
// on top through registerHandlers. Nothing touches the network.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';

process.env.LOG_LEVEL ??= 'silent';
// The dates of the portals are days of Paris.
process.env.TZ = 'Europe/Paris';

export const fixtureJson = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/sources/${name}`, import.meta.url), 'utf8'));

// 2026-10-29 16:12:39 UTC, the time of the capture.
export const FIXTURE_TIME = 1793290359761;

// Houses near worksites of the captures, not real addresses.
export const LYON_HOUSE = {
  id: 'h1',
  name: 'Maison',
  selector: 'maison',
  latitude: 45.742,
  longitude: 4.883,
};
export const PARIS_HOUSE = { ...LYON_HOUSE, latitude: 48.8493, longitude: 2.3383 };

// The fixture served for each host.
const HOSTS = {
  'opendata.paris.fr': 'paris',
  'data.grandlyon.com': 'lyon',
  'data.toulouse-metropole.fr': 'toulouse',
  'data.rennesmetropole.fr': 'rennes',
  'data.tours-metropole.fr': 'tours',
  'data.angers.fr': 'angers',
};

/**
 * A fake `fetch`. `data[city]` holds the answer served (editable by the
 * tests); `down` is a set of cities whose portal fails, `status` a map city →
 * HTTP status. Every call is recorded in `calls`.
 */
export function createFetch() {
  const data = Object.fromEntries(
    Object.values(HOSTS).map((city) => [city, fixtureJson(`${city}.json`)]),
  );
  const calls = [];
  const down = new Set();
  const status = new Map();
  const fetch = async (url, init = {}) => {
    calls.push({ url, headers: init.headers ?? {} });
    const city = HOSTS[new URL(url).host];
    if (!city) {
      return new Response('not found', { status: 404 });
    }
    if (down.has(city)) {
      throw new TypeError('fetch failed');
    }
    if (status.has(city)) {
      return new Response('error', { status: status.get(city) });
    }
    return new Response(JSON.stringify(data[city]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fetch, calls, data, down, status };
}

/** A manual clock. */
export function createClock(start = FIXTURE_TIME) {
  const clock = {
    time: start,
    now: () => clock.time,
    advance(ms) {
      clock.time += ms;
    },
  };
  return clock;
}

/**
 * @param {object} [options]
 * @param {object} [options.config] raw integration config
 * @param {object} [options.network] from createFetch
 * @param {Array} [options.devices] devices already created in Gladys
 * @param {Array} [options.houses] houses of Gladys
 * @param {boolean} [options.connect]
 */
export async function createWorld({
  config = { cities: ['lyon'], home_radius: '500', streets: 'Avenue Esquirol' },
  network = createFetch(),
  devices = [],
  houses = [LYON_HOUSE],
  connect = true,
  clock = createClock(),
} = {}) {
  const gladys = createFakeGladys({ config, devices, houses });
  const app = registerHandlers(gladys, { fetch: network.fetch, timers: false, now: clock.now });
  const world = { gladys, fake: gladys.fake, app, service: app.service, network, clock };
  if (connect) {
    await gladys.connect();
    await app.ready;
    await app.service.loading;
  }
  return world;
}

/** Run a configuration action; resolves with its message (multi-language). */
export async function action(world, key, fields = {}) {
  const ack = await world.fake.action(key, fields);
  if (!ack.success) {
    throw new Error(`${key} failed: ${ack.error}`);
  }
  return ack.data.message;
}

/** The device published for a name part or a predicate, from the last discovery list. */
export const discovered = (world, predicate) =>
  world.fake.discoveredDevices.find(
    typeof predicate === 'function' ? predicate : (d) => d.name.includes(predicate),
  );

/** Create a discovered device in Gladys, as the user would. */
export async function create(world, predicate) {
  const device = discovered(world, predicate);
  if (!device) {
    throw new Error(`${predicate} is not in the discovered devices`);
  }
  await world.fake.deviceCreated(device);
  return device;
}

/** External id of one feature of a device. */
export const featureId = (device, key) =>
  device.features.find((feature) => feature.external_id.endsWith(`:${key}`))?.external_id;

/** One pass of the hourly timer, `hours` later. */
export async function tick(world, hours = 1) {
  world.clock.advance(hours * 3600 * 1000);
  await world.service.refresh();
}

/** Captures what the integration logs, at a level. */
export function captureLogs(t, level = 'info') {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  const lines = [];
  const record = (...args) => {
    const text = args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' ');
    const match = /^\[[^\]]+\] \[(\w+)\]/.exec(text);
    lines.push({ level: match ? match[1].toLowerCase() : 'raw', text });
  };
  t.mock.method(console, 'log', record);
  t.mock.method(console, 'error', record);
  t.after(() => {
    process.env.LOG_LEVEL = previous;
  });
  return lines;
}
