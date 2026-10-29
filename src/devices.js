// -----------------------------------------------------------------------------
// The Gladys device of a followed zone (the house and a radius around it, or a
// street searched by name in every city chosen) and its states:
//   active    counter-sensor/integer   worksites in progress in the zone
//   upcoming  counter-sensor/integer   worksites announced, not started yet
//   nearest   text/text                around the house: the nearest one in
//                                      progress ("Réfection · Avenue Esquirol
//                                      · 350 m · jusqu'au 6 nov. · Circulation
//                                      interdite")
//   current   text/text                a street: the one in progress ending
//                                      last
//   next      text/text                the next one to start
//
// Read-only, no polling: the integration reads the portals on its own timer
// (src/service.js), Gladys never polls (`should_poll: false`).
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as C,
  DEVICE_FEATURE_TYPES as T,
} from '@gladysassistant/integration-sdk';
import { NAMES, TEXT, distanceText, say, shortDate } from './messages.js';

export const ZONE_TYPE = 'zone';
export const HOME_ZONE = 'home';
export const STREET_ZONE = 'street';
export const MAX_DEVICE_NAME = 80;
export const MAX_TEXT = 200;
export const MAX_COUNT = 5000;

/** Shortens a text to `max` characters, with an ellipsis. */
export function clip(text, max) {
  const value = String(text ?? '');
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

/** The platform id of a zone: "home", or "street-<folded term with dashes>". */
export const zonePlatformId = (zone) =>
  zone.kind === HOME_ZONE ? HOME_ZONE : `${STREET_ZONE}-${zone.term.replace(/ /g, '-')}`;

/** The feature keys of a zone. */
export const featureKeys = (zone) => [
  'active',
  'upcoming',
  zone.kind === HOME_ZONE ? 'nearest' : 'current',
  'next',
];

/** The name of a zone device: "Chantiers · Autour de la maison", "Chantiers · Rue Pollet". */
export function zoneName(zone, language) {
  const names = NAMES[language] ?? NAMES.en;
  const label = zone.kind === HOME_ZONE ? names.home : zone.label;
  return clip(`${names.device} · ${label}`, MAX_DEVICE_NAME);
}

/**
 * The device of a zone.
 * @param {object} gladys
 * @param {{ kind: string, term?: string, label?: string }} zone
 * @param {string} language
 */
export function buildZoneDevice(gladys, zone, language) {
  const ids = gladys.externalIds(ZONE_TYPE, zonePlatformId(zone));
  const names = NAMES[language] ?? NAMES.en;
  const counter = {
    category: C.COUNTER_SENSOR,
    type: T.SENSOR.INTEGER,
    min: 0,
    max: MAX_COUNT,
  };
  const text = { category: C.TEXT, type: T.TEXT.TEXT, min: 0, max: 0 };
  const definitions = {
    active: counter,
    upcoming: counter,
    nearest: text,
    current: text,
    next: text,
  };
  return {
    name: zoneName(zone, language),
    external_id: ids.device,
    should_poll: false,
    params: [
      { name: 'zone', value: zone.kind },
      ...(zone.kind === STREET_ZONE
        ? [
            { name: 'term', value: zone.term },
            { name: 'label', value: zone.label },
          ]
        : []),
    ],
    features: featureKeys(zone).map((key) => ({
      name: names[key],
      external_id: ids.feature(key),
      ...definitions[key],
      read_only: true,
      has_feedback: false,
    })),
  };
}

/**
 * One worksite in one line: "Réfection de tranchées · Avenue Esquirol · 350 m
 * · jusqu'au 6 nov. · Circulation interdite". `upcoming` says when it starts.
 */
export function worksiteText(item, language, { upcoming = false, distance = true } = {}) {
  const { worksite } = item;
  const when = upcoming
    ? worksite.start !== null &&
      say(TEXT, language, 'from', { date: shortDate(worksite.start, language) })
    : say(TEXT, language, 'until', { date: shortDate(worksite.end, language) });
  return clip(
    [
      worksite.title,
      worksite.street,
      distance && item.distance !== null ? distanceText(item.distance, language) : null,
      when,
      worksite.impact,
    ]
      .filter(Boolean)
      .join(' · '),
    MAX_TEXT,
  );
}

/**
 * The states of a zone device.
 * @param {object} view from Worksites.zoneView(): { zone, active, upcoming }
 */
export function zoneStates(gladys, view, language) {
  const ids = gladys.externalIds(ZONE_TYPE, zonePlatformId(view.zone));
  const none = say(TEXT, language, 'none');
  const first = view.active[0];
  const next = view.upcoming[0];
  const values = {
    active: Math.min(MAX_COUNT, view.active.length),
    upcoming: Math.min(MAX_COUNT, view.upcoming.length),
    nearest: first ? worksiteText(first, language) : none,
    current: first ? worksiteText(first, language) : none,
    next: next ? worksiteText(next, language, { upcoming: true }) : none,
  };
  return featureKeys(view.zone).map((key) =>
    typeof values[key] === 'string'
      ? { device_feature_external_id: ids.feature(key), text: values[key] }
      : { device_feature_external_id: ids.feature(key), state: values[key] },
  );
}
