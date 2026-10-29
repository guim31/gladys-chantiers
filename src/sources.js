// -----------------------------------------------------------------------------
// The open data sources: one adapter per city, each turning its own fields
// into the same shape, a worksite that disrupts traffic:
//
//   { id, title, street, place, impact, start, end, lat, lon }
//
//   id       the id the portal gives the worksite (unique within the source)
//   title    what is done ("Réfection de tranchées"), in French as published
//   street   the street(s) concerned, as published
//   place    the town or district ("Paris 6e", "Bron")
//   impact   the effect on traffic ("Circulation interdite"), or ''
//   start    first day, ms (local midnight), or null
//   end      last day, ms (local end of day), or null
//   lat/lon  a point of the worksite, or null
//
// The whole dataset of a city is read in one request, twice a day at most.
// Every source below was checked live on 2026-10-29 (test/fixtures/sources
// holds those answers). Keys are part of the device params: never rename one.
// -----------------------------------------------------------------------------

import { getJson } from './http.js';

const MAX_BYTES = 8e6;

/** A finite number, or null. */
export function num(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * A day published as "2026-11-13" (or "2026-11-13T00:00:00+00:00", a date
 * stored at UTC midnight): local midnight of that day, or with `endOfDay` the
 * last millisecond of it. The container runs in the time zone of Gladys (TZ).
 */
export function day(value, { endOfDay = false } = {}) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (!match) {
    return null;
  }
  const [year, month, date] = match.slice(1).map(Number);
  const ms = endOfDay
    ? new Date(year, month - 1, date + 1).getTime() - 1
    : new Date(year, month - 1, date).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** An instant ("2026-11-10T06:00:00+00:00"), in ms, or null. */
export function instant(value) {
  const ms = value ? Date.parse(value) : NaN;
  return Number.isFinite(ms) ? ms : null;
}

/** Trims, collapses spaces; a text in capitals gets lower case words, first letter up. */
export function tidy(value) {
  // Paris ends some streets with "." or "_" ("rue de Vaugirard 75006_").
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[\s._,;]+$/, '')
    .trim();
  if (text && text === text.toUpperCase() && /\p{Lu}{3}/u.test(text)) {
    const lower = text.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  return text;
}

/** First letter up. */
const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

/** `{ lat, lon }` of an Opendatasoft geo_point_2d, nulls without it. */
function point(value) {
  const lat = num(value?.lat);
  const lon = num(value?.lon);
  return lat !== null && lon !== null ? { lat, lon } : { lat: null, lon: null };
}

/** The URL of an Opendatasoft Explore v2.1 export (every record, one request). */
export function exportUrl(base, dataset, query) {
  return `${base}/api/explore/v2.1/catalog/datasets/${dataset}/exports/json?${new URLSearchParams(query)}`;
}

async function records(fetchImpl, url) {
  const data = await getJson(fetchImpl, url, { maxBytes: MAX_BYTES });
  if (!Array.isArray(data)) {
    throw new Error('unexpected answer');
  }
  return data;
}

// Paris publishes the nature of the work as a code.
export const PARIS_OBJECTS = {
  CONSTRUCTION_IMMEUBLE: "Construction d'immeuble",
  CREATION_ENTRETIEN_OUVRAGE_ART: "Ouvrage d'art",
  CREATION_RESEAUX: 'Création de réseaux',
  ENTRETIEN_RESEAU: 'Entretien de réseau',
  RACCORDEMENT_RESEAU: 'Raccordement au réseau',
  REAMENAGEMENT_SECTEUR: 'Réaménagement de secteur',
  REAMENAGEMENT_VOIRIE: 'Réaménagement de voirie',
  REHABILITATION_IMMEUBLE: "Réhabilitation d'immeuble",
  TRAVAUX_OUVRAGE: 'Travaux sur ouvrage',
  TRAVAUX_TRAMWAY: 'Travaux du tramway',
};
const PARIS_IMPACTS = {
  BARRAGE_TOTAL: 'Rue barrée',
  IMPASSE: 'Mise en impasse',
  RESTREINTE: 'Circulation restreinte',
  SENS_UNIQUE: 'Sens unique',
};

/** "75006" → "Paris 6e", "75001" → "Paris 1er". */
function arrondissement(code) {
  const match = /^75(?:0(\d\d)|116)$/.exec(String(code ?? ''));
  if (!match) {
    return 'Paris';
  }
  const number = match[1] ? Number(match[1]) : 16;
  return `Paris ${number}${number === 1 ? 'er' : 'e'}`;
}

function paris(record) {
  const code = record.objet;
  return {
    id: String(record.identifiant ?? ''),
    title:
      PARIS_OBJECTS[code] ||
      tidy(record.description) ||
      capitalize(
        String(code ?? '')
          .toLowerCase()
          .replace(/_/g, ' '),
      ),
    street: tidy(record.voie),
    place: arrondissement(record.cp_arrondissement),
    impact: PARIS_IMPACTS[record.impact_circulation] ?? tidy(record.niveau_perturbation),
    start: day(record.date_debut),
    end: day(record.date_fin, { endOfDay: true }),
    ...point(record.geo_point_2d),
  };
}

/** The centre of a GeoJSON feature: its bbox, else the mean of its coordinates. */
export function centre(feature) {
  const box = feature?.bbox;
  if (Array.isArray(box) && box.length >= 4 && box.every((v) => Number.isFinite(v))) {
    return { lat: (box[1] + box[3]) / 2, lon: (box[0] + box[2]) / 2 };
  }
  const points = [];
  const walk = (value) => {
    if (Array.isArray(value) && typeof value[0] === 'number') {
      points.push(value);
    } else if (Array.isArray(value)) {
      value.forEach(walk);
    }
  };
  walk(feature?.geometry?.coordinates);
  const valid = points.filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
  if (valid.length === 0) {
    return { lat: null, lon: null };
  }
  return {
    lat: valid.reduce((s, p) => s + p[1], 0) / valid.length,
    lon: valid.reduce((s, p) => s + p[0], 0) / valid.length,
  };
}

function lyon(feature) {
  const p = feature?.properties ?? {};
  return {
    id: String(p.gid ?? ''),
    title: capitalize(tidy(p.nomchantier)) || 'Travaux',
    street: tidy(p.nom),
    place: tidy(p.commune1).replace(/ Arrondissement$/, ''),
    impact: tidy(p.typeperturbation),
    start: day(p.debutchantier),
    end: day(p.finchantier, { endOfDay: true }),
    ...centre(feature),
  };
}

// Toulouse lists sidewalk works too: only the ones touching the roadway count.
const SIDEWALK_ONLY = /^(occupation du trottoir|occupation de la contre allée)$/i;

function toulouse(record) {
  const street = tidy(record.voie);
  // "AUTOROUTE 620 - Voirie, balayage mécanisé": the street, then the work.
  const label = String(record.libelle ?? '');
  const work = label.includes(' - ') ? label.slice(label.indexOf(' - ') + 3) : label;
  return {
    id: String(record.numero ?? ''),
    title: capitalize(tidy(work) || tidy(record.commentaire)) || 'Travaux',
    street,
    place: tidy(record.commune),
    impact: tidy(record.circulation),
    start: day(record.datedebut),
    end: day(record.datefin, { endOfDay: true }),
    ...point(record.geo_point_2d),
  };
}

function rennes(record) {
  return {
    id: String(record.id_evt ?? ''),
    title: record.libelle ? `Travaux ${tidy(record.libelle)}` : 'Travaux',
    street: capitalize(tidy(record.localisation).replace(/^(sur|dans) (la |le |l')?/i, '')),
    place: tidy(record.commune).replace(/\d+ - /g, ''),
    impact: tidy(record.type),
    start: day(record.date_deb),
    end: day(record.date_fin, { endOfDay: true }),
    ...point(record.geo_point_2d),
  };
}

function tours(record) {
  return {
    id: String(record.id ?? ''),
    title: tidy(record.type_de_travaux) || 'Travaux',
    street: tidy(record.adresse) || tidy(record.nom_de_la_voie),
    place: capitalize(tidy(record.commune).toLowerCase()).replace(
      /(^|[\s-])(\p{L})/gu,
      (m, sep, letter) => sep + letter.toUpperCase(),
    ),
    impact: tidy(record.impact_des_travaux_sur_la_circulation),
    start: day(record.date_previsionnelle_de_debut_des_travaux),
    end: day(record.date_previsionnelle_de_fin_des_travaux, { endOfDay: true }),
    ...point(record.geo_point_2d),
  };
}

function angers(record) {
  return {
    id: String(record.id ?? ''),
    title: tidy(record.title) || 'Travaux',
    street: tidy(record.address),
    place: 'Angers',
    impact: tidy(record.description),
    start: instant(record.startat),
    end: instant(record.endat),
    ...point(record.geo_point_2d),
  };
}

// A worksite without an id or an end, or ending before it starts (a typing
// error in the portal: which date is wrong cannot be told), is left out.
const keep = (worksite) =>
  worksite.id !== '' &&
  worksite.end !== null &&
  (worksite.start === null || worksite.start <= worksite.end);

export const SOURCES = {
  paris: {
    name: 'Paris',
    host: 'opendata.paris.fr',
    async read(fetchImpl) {
      const url = exportUrl('https://opendata.paris.fr', 'chantiers-perturbants', {
        select:
          'identifiant,objet,description,voie,precision_localisation,cp_arrondissement,date_debut,date_fin,impact_circulation,niveau_perturbation,geo_point_2d',
      });
      return (await records(fetchImpl, url)).map(paris).filter(keep);
    },
  },
  lyon: {
    name: 'Métropole de Lyon',
    host: 'data.grandlyon.com',
    async read(fetchImpl) {
      const url =
        'https://data.grandlyon.com/geoserver/metropole-de-lyon/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature' +
        '&typename=metropole-de-lyon:pvo_patrimoine_voirie.pvochantierperturbant&outputFormat=application/json&SRSNAME=EPSG:4326';
      const data = await getJson(fetchImpl, url, { maxBytes: MAX_BYTES });
      if (!Array.isArray(data?.features)) {
        throw new Error('unexpected answer');
      }
      return data.features
        .filter((f) => !/termin/i.test(f?.properties?.avancement ?? ''))
        .map(lyon)
        .filter(keep);
    },
  },
  toulouse: {
    name: 'Toulouse Métropole',
    host: 'data.toulouse-metropole.fr',
    async read(fetchImpl) {
      const url = exportUrl('https://data.toulouse-metropole.fr', 'chantiers-en-cours', {
        select:
          'numero,voie,commune,datedebut,datefin,libelle,commentaire,circulation,geo_point_2d',
      });
      return (await records(fetchImpl, url))
        .filter((r) => r.circulation && !SIDEWALK_ONLY.test(String(r.circulation).trim()))
        .map(toulouse)
        .filter(keep);
    },
  },
  rennes: {
    name: 'Rennes Métropole',
    host: 'data.rennesmetropole.fr',
    async read(fetchImpl) {
      const url = exportUrl('https://data.rennesmetropole.fr', 'travaux_6_jours', {
        select:
          'id_evt,commune,localisation,type,libelle,niv_perturbation,date_deb,date_fin,geo_point_2d',
      });
      return (await records(fetchImpl, url))
        .filter((r) => r.niv_perturbation !== 'Impact nul')
        .map(rennes)
        .filter(keep);
    },
  },
  tours: {
    name: 'Tours Métropole',
    host: 'data.tours-metropole.fr',
    async read(fetchImpl) {
      const url = exportUrl('https://data.tours-metropole.fr', 'travaux_lineaire_tmvl', {
        select:
          'id,commune,adresse,nom_de_la_voie,type_de_travaux,date_previsionnelle_de_debut_des_travaux,date_previsionnelle_de_fin_des_travaux,impact_des_travaux_sur_la_circulation,geo_point_2d',
      });
      return (await records(fetchImpl, url))
        .filter((r) => r.impact_des_travaux_sur_la_circulation !== 'Sans impact')
        .map(tours)
        .filter(keep);
    },
  },
  angers: {
    name: 'Angers',
    host: 'data.angers.fr',
    async read(fetchImpl) {
      const url = exportUrl('https://data.angers.fr', 'info-travaux', {
        select: 'id,title,description,address,startat,endat,traffic,geo_point_2d',
        where: 'endat >= now()',
      });
      return (await records(fetchImpl, url))
        .filter((r) => r.traffic !== 'normal')
        .map(angers)
        .filter(keep);
    },
  },
};

export const SOURCE_KEYS = Object.keys(SOURCES);
