// -----------------------------------------------------------------------------
// The integration at runtime: the worksites of every city chosen, the zones
// offered in the Discover tab (around the house, the streets typed), the
// states of the zones added to Gladys, and the scene triggers.
//
// Data flow: the whole dataset of each ticked city is read twice a day (the
// portals update it once a day at most). Every hour, without reading anything,
// the worksites are sorted again against the clock (started, ended), the
// states of the zones are published when they change and the triggers fire.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { DEFAULT_CONFIG, fold, normalizeConfig } from './config.js';
import { HOME_ZONE, STREET_ZONE, buildZoneDevice, zoneStates } from './devices.js';
import { REPORTS, lines, render, shortDate } from './messages.js';
import { SOURCES } from './sources.js';

const logger = createLogger({ name: 'chantiers' });

// The portals publish once a day: read twice a day at most.
export const READ_EVERY_MS = 12 * 3600 * 1000;
// A failed read is tried again after this, the known worksites kept.
export const RETRY_MS = 3600 * 1000;
// A city never read: tried again after this.
export const FIRST_RETRY_MS = 10 * 60 * 1000;
// The worksites are sorted again against the clock this often.
export const TICK_MS = 3600 * 1000;
// Unchanged states are sent again this often, or the dashboard shows "no
// recent value" after 48 hours.
export const HEARTBEAT_MS = 6 * 3600 * 1000;

export const TRIGGERS = {
  ANNOUNCED: 'worksite_announced',
  STARTED: 'worksite_started',
  ENDED: 'worksite_ended',
};

/** Distance in metres between two points (equirectangular: a few km at most). */
export function distance(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const x = (lon2 - lon1) * rad * Math.cos(((lat1 + lat2) / 2) * rad);
  const y = (lat2 - lat1) * rad;
  return 6371000 * Math.hypot(x, y);
}

/** One city at runtime: its source, its worksites and how the last read went. */
class City {
  constructor(key) {
    this.key = key;
    this.source = SOURCES[key];
    this.worksites = null; // array, null before the first read
    this.readAt = null;
    this.retryAt = null;
    this.okAt = null;
    this.error = null;
  }
}

export class Worksites {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the SDK's fake)
   * @param {typeof fetch} [options.fetch]
   * @param {() => number} [options.now]
   * @param {boolean} [options.timers] false in the tests: they call refresh()
   */
  constructor({ gladys, fetch = globalThis.fetch, now = Date.now, timers = true }) {
    this.gladys = gladys;
    this.fetch = fetch;
    this.now = now;
    this.useTimers = timers;
    this.config = normalizeConfig(DEFAULT_CONFIG);
    this.house = null; // { lat, lon } of the first located house
    this.houseError = false;
    this.cities = new Map(); // key → City
    this.snapshots = new Map(); // deviceId → { active: Set, upcoming: Set, items: Map }
    this.discoveredSignature = null;
    this.publishFailed = false;
    this.discoveryFailed = false;
    this.fireFailed = false;
    this.timer = null;
    this.stopped = false;
    this.refreshing = null;
    this.loading = Promise.resolve();
  }

  // --- lifecycle --------------------------------------------------------------

  async start(config) {
    this.config = config;
    await this.locate();
    this.schedule();
    logger.info(
      `Started: ${config.cities.length} city(ies) chosen, ${this.watched().length} zone(s) added`,
    );
    // The first reading in the background: the widget and the scene action
    // wait for it.
    this.loading = this.refresh({ discover: true });
  }

  /** Gladys restarted: everything again, the house and the states included. */
  async resync(config) {
    this.config = config;
    await this.locate();
    this.gladys.forgetPublishedStates?.();
    await this.refresh({ discover: true });
  }

  async reconfigure(config) {
    this.config = config;
    // Another radius or other cities move worksites in and out of the zones:
    // that is no news, the triggers start again from what is there.
    this.snapshots.clear();
    await this.locate();
    await this.refresh({ discover: true });
  }

  async stop() {
    this.stopped = true;
    clearInterval(this.timer);
    await this.refreshing;
  }

  schedule() {
    if (!this.useTimers || this.stopped) {
      return;
    }
    clearInterval(this.timer);
    this.timer = setInterval(() => this.refresh(), TICK_MS);
    this.timer.unref?.();
  }

  /** The position of the house, for the "around the house" zone (none when off). */
  async locate() {
    if (this.config.homeRadius === 0) {
      this.house = null;
      return;
    }
    try {
      const houses = await this.gladys.getHouses();
      const located = (houses ?? []).find(
        (h) => Number.isFinite(h?.latitude) && Number.isFinite(h?.longitude),
      );
      const house = located ? { lat: located.latitude, lon: located.longitude } : null;
      if (JSON.stringify(house) !== JSON.stringify(this.house)) {
        this.snapshots.clear();
      }
      this.house = house;
      this.houseError = false;
    } catch (err) {
      if (!this.houseError) {
        logger.warn(`Cannot read the location of the house: ${err.message}`);
      }
      this.houseError = true;
    }
  }

  // --- zones ------------------------------------------------------------------

  /** The zones the configuration offers: the house (radius > 0, located), the streets typed. */
  offeredZones() {
    const zones = [];
    if (this.config.homeRadius > 0 && this.house) {
      zones.push({ kind: HOME_ZONE });
    }
    for (const street of this.config.streets) {
      zones.push({ kind: STREET_ZONE, term: street.term, label: street.label });
    }
    return zones;
  }

  /** The zone of a device created in Gladys, from its params. */
  zoneOfDevice(device) {
    const param = (name) => device?.params?.find?.((p) => p.name === name)?.value;
    const kind = param('zone');
    if (kind === HOME_ZONE) {
      return { kind };
    }
    const term = fold(param('term'));
    return kind === STREET_ZONE && term
      ? { kind, term, label: String(param('label') ?? term) }
      : null;
  }

  /** The zones added to Gladys: `{ deviceId, name, zone }[]`. */
  watched() {
    return (this.gladys.devices ?? [])
      .map((device) => ({
        deviceId: device.external_id,
        name: device.name,
        zone: this.zoneOfDevice(device),
      }))
      .filter((entry) => entry.zone);
  }

  city(key) {
    if (!this.cities.has(key)) {
      this.cities.set(key, new City(key));
    }
    return this.cities.get(key);
  }

  /**
   * The worksites of a zone, sorted against the clock: `active` (in progress;
   * nearest first around the house, ending last first in a street) and
   * `upcoming` (starting soonest first). Items: `{ key, city, worksite, distance }`.
   * `cities`: the keys of the cities read. Null before any city was read, or
   * around a house no longer located.
   */
  zoneView(zone) {
    const cities = this.config.cities.filter((key) => this.city(key).worksites !== null);
    if (cities.length === 0 || (zone.kind === HOME_ZONE && !this.house)) {
      return null;
    }
    const now = this.now();
    const active = [];
    const upcoming = [];
    for (const key of cities) {
      const city = this.city(key);
      for (const worksite of city.worksites) {
        if (worksite.end < now) {
          continue;
        }
        let metres = null;
        if (zone.kind === HOME_ZONE) {
          if (worksite.lat === null) {
            continue;
          }
          metres = distance(this.house.lat, this.house.lon, worksite.lat, worksite.lon);
          if (metres > this.config.homeRadius) {
            continue;
          }
        } else if (!fold(worksite.street).includes(zone.term)) {
          continue;
        }
        const item = { key: `${key}:${worksite.id}`, city, worksite, distance: metres };
        (worksite.start !== null && worksite.start > now ? upcoming : active).push(item);
      }
    }
    active.sort((a, b) =>
      zone.kind === HOME_ZONE ? a.distance - b.distance : b.worksite.end - a.worksite.end,
    );
    upcoming.sort((a, b) => a.worksite.start - b.worksite.start);
    return { zone, active, upcoming, cities: new Set(cities) };
  }

  /** Waits for the first reading (at most `ms`), for a widget or a scene action asked at start. */
  async firstReading(ms = 10000) {
    let timer;
    await Promise.race([
      this.loading,
      new Promise((resolve) => {
        timer = setTimeout(resolve, ms);
      }),
    ]);
    clearTimeout(timer);
  }

  async publishDiscovered({ force = false } = {}) {
    const devices = new Map();
    const add = (zone) => {
      const device = buildZoneDevice(this.gladys, zone, this.config.language);
      devices.set(device.external_id, device);
    };
    this.offeredZones().forEach(add);
    // The zones already added stay listed, whatever the configuration.
    for (const entry of this.watched()) {
      if (!devices.has(entry.deviceId)) {
        add(entry.zone);
      }
    }
    const list = [...devices.values()];
    const signature = JSON.stringify(list.map((d) => [d.external_id, d.name, d.features]));
    if (!force && signature === this.discoveredSignature) {
      return;
    }
    try {
      await this.gladys.publishDiscoveredDevices(list);
      this.discoveredSignature = signature;
      if (this.discoveryFailed) {
        this.discoveryFailed = false;
        logger.info('Discovered zones published again');
      }
    } catch (err) {
      if (!this.discoveryFailed) {
        logger.warn(`Cannot publish the discovered zones: ${err.message}`);
      }
      this.discoveryFailed = true;
    }
  }

  async publish(states) {
    if (states.length === 0) {
      return;
    }
    try {
      await this.gladys.publishChangedStates(states, { heartbeat: HEARTBEAT_MS });
      if (this.publishFailed) {
        this.publishFailed = false;
        logger.info('States published again');
      }
    } catch (err) {
      // Gladys restarting: said once, the next tick sends them again.
      if (!this.publishFailed) {
        logger.warn(`Cannot publish ${states.length} state(s): ${err.message}`);
      }
      this.publishFailed = true;
    }
  }

  /** A device was just added in Gladys: its states, all of them, now. */
  async onDeviceCreated(device) {
    const zone = this.zoneOfDevice(device);
    if (!zone) {
      return;
    }
    await this.refresh();
    const view = this.zoneView(zone);
    // The SDK forgot what was published before the creation (dropped by Gladys).
    if (view) {
      await this.publish(zoneStates(this.gladys, view, this.config.language));
    }
    this.refreshWidget();
  }

  refreshWidget() {
    this.gladys.requestWidgetRefresh?.('worksites')?.catch?.(() => {});
  }

  // --- refresh ------------------------------------------------------------------

  /** One pass: the reads that are due, then the zones; concurrent calls share it. */
  refresh({ discover = false } = {}) {
    if (!this.refreshing) {
      this.refreshing = this.refreshAll(discover)
        .catch((err) => logger.warn(`Refresh failed: ${err.message}`))
        .finally(() => {
          this.refreshing = null;
        });
      return this.refreshing;
    }
    // A discovery asked during a refresh (cities just ticked) runs again
    // right after it: the running one may not include the new cities.
    return discover ? this.refreshing.then(() => this.refresh({ discover })) : this.refreshing;
  }

  async refreshAll(forceDiscovery) {
    for (const key of this.config.cities) {
      await this.read(this.city(key));
    }
    await this.publishDiscovered({ force: forceDiscovery });
    const states = [];
    const events = [];
    for (const entry of this.watched()) {
      const view = this.zoneView(entry.zone);
      if (!view) {
        continue;
      }
      states.push(...zoneStates(this.gladys, view, this.config.language));
      events.push(...this.zoneEvents(entry, view));
    }
    await this.publish(states);
    for (const { key, data } of events) {
      await this.fire(key, data);
    }
  }

  /** Reads the worksites of a city when due; a failure keeps the known ones. */
  async read(city) {
    const now = this.now();
    if (city.worksites && now - city.readAt < READ_EVERY_MS) {
      return;
    }
    if (city.retryAt !== null && now < city.retryAt) {
      return;
    }
    try {
      const worksites = await city.source.read(this.fetch);
      // An empty list (a renamed field, a dataset being reloaded) is a
      // failure, not a city without worksites.
      if (worksites.length === 0) {
        throw new Error('empty list');
      }
      city.worksites = worksites;
      city.readAt = now;
      city.retryAt = null;
      logger.debug(`${city.source.name}: ${worksites.length} worksites read`);
      city.okAt = now;
      if (city.error) {
        logger.info(`${city.source.name}: data back`);
      }
      city.error = null;
    } catch (err) {
      city.retryAt = now + (city.worksites ? RETRY_MS : FIRST_RETRY_MS);
      if (!city.error) {
        logger.warn(`${city.source.name}: data unavailable: ${err.message}`);
      }
      city.error = err.message;
    }
  }

  /** The trigger events of a zone since the last pass (none on the first one). */
  zoneEvents(entry, view) {
    const before = this.snapshots.get(entry.deviceId);
    const items = new Map([...view.active, ...view.upcoming].map((item) => [item.key, item]));
    const active = new Set(view.active.map((item) => item.key));
    const upcoming = new Set(view.upcoming.map((item) => item.key));
    this.snapshots.set(entry.deviceId, { active, upcoming, items, cities: view.cities });
    if (!before) {
      return [];
    }
    const events = [];
    const event = (key, item) => events.push({ key, data: this.eventData(entry, item) });
    // A city read for the first time (its portal was down at start) brings
    // worksites that are no news.
    const news = (id) => before.cities.has(items.get(id).city.key);
    for (const id of active) {
      if (!before.active.has(id) && news(id)) {
        event(TRIGGERS.STARTED, items.get(id));
      }
    }
    for (const id of upcoming) {
      if (!before.upcoming.has(id) && !before.active.has(id) && news(id)) {
        event(TRIGGERS.ANNOUNCED, items.get(id));
      }
    }
    for (const id of before.active) {
      if (!active.has(id) && !upcoming.has(id)) {
        event(TRIGGERS.ENDED, before.items.get(id));
      }
    }
    return events;
  }

  eventData(entry, item) {
    const { worksite } = item;
    const language = this.config.language;
    return {
      zone: entry.deviceId,
      zone_name: entry.name ?? '',
      title: worksite.title,
      street: worksite.street,
      place: worksite.place,
      city: item.city.source.name,
      impact: worksite.impact,
      start: worksite.start === null ? '' : shortDate(worksite.start, language),
      end: shortDate(worksite.end, language),
      distance: item.distance === null ? 0 : Math.round(item.distance),
    };
  }

  async fire(key, data) {
    try {
      await this.gladys.publishSceneEvent(key, data);
      if (this.fireFailed) {
        this.fireFailed = false;
        logger.info('Scene triggers fired again');
      }
    } catch (err) {
      if (!this.fireFailed) {
        logger.warn(`Cannot fire the ${key} trigger: ${err.message}`);
      }
      this.fireFailed = true;
    }
  }

  // --- configuration action -----------------------------------------------------

  status() {
    const now = this.now();
    const blocks = [];
    if (this.config.cities.length === 0) {
      blocks.push(render(REPORTS, 'noCity'));
    }
    for (const key of this.config.cities) {
      const city = this.city(key);
      const live = (city.worksites ?? []).filter((w) => w.end >= now);
      const upcoming = live.filter((w) => w.start !== null && w.start > now).length;
      blocks.push(
        render(REPORTS, 'city', {
          name: city.source.name,
          active: live.length - upcoming,
          upcoming,
        }),
        city.okAt === null
          ? render(REPORTS, 'waiting')
          : render(REPORTS, 'read', { hours: Math.round((now - city.okAt) / 3600000) }),
        city.error ? render(REPORTS, 'error', { error: city.error }) : null,
      );
    }
    if (this.config.homeRadius > 0 && !this.house) {
      blocks.push(render(REPORTS, 'noHouse'));
    }
    if (this.offeredZones().length === 0) {
      blocks.push(render(REPORTS, 'noZone'));
    }
    blocks.push(render(REPORTS, 'watched', { count: this.watched().length }));
    return lines(...blocks);
  }
}
