// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+).
//
// - worksites: the worksites of the followed zones (all of them, or the ones
//   picked), in progress first (nearest first around the house), then the
//   upcoming ones (setting `show_upcoming`). One row each: the street as
//   title, the work and its end date as subtitle, the distance from the house
//   as badge (setting `show_distance`); a tap opens the details.
//
// Budget of the core: a `card-list` in `list` display holds 8 rows.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { clip } from './devices.js';
import { TEXT, distanceText, say, shortDate } from './messages.js';

export const MAX_ROWS = 8;
// The data change twice a day at most; the clock moves them every hour.
const TTL_SECONDS = 1800;
// What closes the street, as the portals word it.
const CLOSED = /interdite|barr[ée]e|ferm[ée]e|impasse|deviated/i;

function row(item, language, { upcoming, showDistance }) {
  const { worksite } = item;
  const when = upcoming
    ? worksite.start !== null &&
      say(TEXT, language, 'from', { date: shortDate(worksite.start, language) })
    : say(TEXT, language, 'until', { date: shortDate(worksite.end, language) });
  let badge;
  if (upcoming) {
    badge = { text: say(TEXT, language, 'upcoming'), color: WIDGET_COLORS.INFO };
  } else if (showDistance && item.distance !== null) {
    badge = {
      text: distanceText(item.distance, language),
      color: CLOSED.test(worksite.impact) ? WIDGET_COLORS.DANGER : WIDGET_COLORS.WARNING,
    };
  }
  const details = [
    worksite.title,
    worksite.street,
    worksite.place,
    worksite.impact,
    [
      worksite.start !== null ? shortDate(worksite.start, language) : null,
      shortDate(worksite.end, language),
    ]
      .filter(Boolean)
      .join(' → '),
    item.distance !== null ? distanceText(item.distance, language) : null,
    item.city.source.name,
  ];
  return {
    title: clip(worksite.street || worksite.title, 60),
    subtitle: clip([worksite.title, when].filter(Boolean).join(' · '), 80),
    ...(badge ? { badge } : {}),
    description: clip(details.filter(Boolean).join('\n'), 2000),
  };
}

async function worksitesContent(service, { settings, language }) {
  await service.firstReading();
  const showUpcoming = settings?.show_upcoming !== false;
  const showDistance = settings?.show_distance !== false;
  const watched = service.watched();
  const chosen = Array.isArray(settings?.zones) ? settings.zones.map(String) : [];
  const entries =
    chosen.length > 0 ? watched.filter((entry) => chosen.includes(entry.deviceId)) : watched;
  const text = (key) => ({
    ttl_seconds: TTL_SECONDS,
    components: [{ type: 'text', text: say(TEXT, language, key) }],
  });
  if (entries.length === 0) {
    return text(chosen.length > 0 ? 'gone' : 'pickZone');
  }
  const views = entries.map((entry) => service.zoneView(entry.zone)).filter(Boolean);
  if (views.length === 0) {
    return text('noData');
  }
  // The same worksite in two zones is listed once.
  const seen = new Set();
  const unique = (items) => items.filter((item) => !seen.has(item.key) && seen.add(item.key));
  const byDistance = (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity);
  const active = unique(views.flatMap((view) => view.active)).sort(byDistance);
  const upcoming = showUpcoming
    ? unique(views.flatMap((view) => view.upcoming)).sort(
        (a, b) => a.worksite.start - b.worksite.start,
      )
    : [];
  const items = [
    ...active.map((item) => row(item, language, { upcoming: false, showDistance })),
    ...upcoming.map((item) => row(item, language, { upcoming: true, showDistance })),
  ].slice(0, MAX_ROWS);
  if (items.length === 0) {
    return text('empty');
  }
  return {
    ttl_seconds: TTL_SECONDS,
    components: [{ type: 'card-list', display: 'list', items }],
  };
}

export const WIDGETS = {
  worksites: { get: worksitesContent },
};
