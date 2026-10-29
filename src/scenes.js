// -----------------------------------------------------------------------------
// Scene actions (manifest `scene_actions`, Gladys 5.1+).
//
// - worksites_summary: the worksites of the followed zones (all of them, or
//   the ones picked) in one sentence ready for a message or a speaker
//   ("Autour de la maison : 2 chantiers en cours, dont Réfection de tranchées
//   · Avenue Esquirol · 350 m · jusqu'au 6 nov. 1 à venir."), with the number
//   of worksites in progress and upcoming, for a "Continue only if" step.
//
// A scene action does not receive the user's language: the sentence follows
// the `language` of the configuration. Outputs are numbers, never booleans:
// the core's "Continue only if" compares with ===.
// -----------------------------------------------------------------------------

import { worksiteText } from './devices.js';
import { TEXT, say } from './messages.js';

export class SceneError extends Error {}

const MAX_SENTENCE = 500;

const chosenIds = (value) =>
  (Array.isArray(value) ? value : value ? [value] : []).map(String).filter(Boolean);

export const SCENE_ACTIONS = {
  async worksites_summary(service, { fields }) {
    const language = service.config.language;
    // Asked right at start: the first reading, not "not read yet".
    await service.firstReading();
    const watched = service.watched();
    if (watched.length === 0) {
      throw new SceneError(say(TEXT, language, 'noZone'));
    }
    const asked = chosenIds(fields?.zones);
    const chosen = asked.length > 0 ? watched.filter((e) => asked.includes(e.deviceId)) : watched;
    if (chosen.length === 0) {
      throw new SceneError(say(TEXT, language, 'gone'));
    }
    const parts = [];
    const active = new Set();
    const upcoming = new Set();
    for (const entry of chosen) {
      const view = service.zoneView(entry.zone);
      if (!view) {
        continue;
      }
      view.active.forEach((item) => active.add(item.key));
      view.upcoming.forEach((item) => upcoming.add(item.key));
      const zone = entry.name;
      let part =
        view.active.length === 0
          ? say(TEXT, language, 'zoneNone', { zone })
          : say(TEXT, language, 'zoneSome', {
              zone,
              count: view.active.length,
              first: worksiteText(view.active[0], language),
            });
      if (view.upcoming.length > 0) {
        part += ` ${say(TEXT, language, 'zoneNext', { count: view.upcoming.length })}`;
      }
      parts.push(part);
    }
    const sentence = parts.length > 0 ? parts.join(' ') : say(TEXT, language, 'noData');
    return {
      sentence:
        sentence.length <= MAX_SENTENCE ? sentence : `${sentence.slice(0, MAX_SENTENCE - 1)}…`,
      active: active.size,
      upcoming: upcoming.size,
    };
  },
};
