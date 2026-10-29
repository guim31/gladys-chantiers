// -----------------------------------------------------------------------------
// Integration configuration: defaults (they mirror the `default` values of the
// manifest `config_schema`, see test/manifest.test.js) and normalization, so
// the rest of the code never deals with strings, blanks or `undefined`.
// -----------------------------------------------------------------------------

import { SOURCE_KEYS } from './sources.js';

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

// Radius of the "around the house" device, in metres; "0" = no such device.
export const HOME_RADII = ['0', '200', '500', '1000', '2000'];

export const DEFAULT_CONFIG = {
  cities: [],
  streets: '',
  home_radius: '500',
  language: 'fr',
};

// A search term shorter than this would match half the streets of a city.
export const MIN_TERM = 3;
// Followed streets, at most.
export const MAX_STREETS = 10;

/** Lower case, without accents, punctuation as spaces: what the street search compares. */
export const fold = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** The cities chosen: an array from the form, tolerating a JSON or comma-separated string. */
function citiesOf(value) {
  let list = value;
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value);
    } catch {
      list = value.split(',');
    }
  }
  if (!Array.isArray(list)) {
    return [];
  }
  const wanted = list.map((item) => String(item).trim());
  return SOURCE_KEYS.filter((key) => wanted.includes(key));
}

/**
 * "Rue de Vaugirard; avenue Esquirol" → [{ term: "rue de vaugirard", label:
 * "Rue de Vaugirard" }, …]: the folded term searched, the text as typed.
 */
export function streetsOf(value) {
  const seen = new Set();
  const streets = [];
  for (const part of String(value ?? '').split(/[,;\n]/)) {
    const label = part.replace(/\s+/g, ' ').trim();
    const term = fold(label);
    if (term.length >= MIN_TERM && !seen.has(term)) {
      seen.add(term);
      streets.push({ term, label });
    }
  }
  return streets.slice(0, MAX_STREETS);
}

/**
 * @param {Record<string, unknown>} raw the configuration returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const radius = HOME_RADII.includes(String(source.home_radius))
    ? String(source.home_radius)
    : DEFAULT_CONFIG.home_radius;
  return {
    cities: citiesOf(source.cities),
    streets: streetsOf(source.streets),
    homeRadius: Number(radius),
    language: LANGUAGES.includes(source.language) ? source.language : DEFAULT_CONFIG.language,
  };
}
