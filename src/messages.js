// -----------------------------------------------------------------------------
// Texts sent from the container (feature names, action messages, widget
// contents, scene outputs), in the four languages of the Gladys interface.
// Entries are strings or functions of one parameter object. German says "du",
// Spanish "usted". What the portals publish (the nature of the work, street
// and place names, the effect on traffic) stays in French, as published.
// -----------------------------------------------------------------------------

export const INIT_FAILED = {
  en: 'Initialization failed, check the integration logs.',
  fr: "L'initialisation a échoué, consultez les logs de l'intégration.",
  de: 'Initialisierung fehlgeschlagen, sieh dir die Protokolle der Integration an.',
  es: 'La inicialización ha fallado, consulte los registros de la integración.',
};

// Feature names, frozen when the device is created (configured language),
// and the names of the devices.
export const NAMES = {
  en: {
    active: 'Worksites in progress',
    upcoming: 'Upcoming worksites',
    nearest: 'Nearest worksite',
    current: 'Worksite in progress',
    next: 'Next worksite',
    device: 'Worksites',
    home: 'Around the house',
  },
  fr: {
    active: 'Chantiers en cours',
    upcoming: 'Chantiers à venir',
    nearest: 'Chantier le plus proche',
    current: 'Chantier en cours',
    next: 'Prochain chantier',
    device: 'Chantiers',
    home: 'Autour de la maison',
  },
  de: {
    active: 'Laufende Baustellen',
    upcoming: 'Geplante Baustellen',
    nearest: 'Nächste Baustelle',
    current: 'Laufende Baustelle',
    next: 'Kommende Baustelle',
    device: 'Baustellen',
    home: 'Rund ums Haus',
  },
  es: {
    active: 'Obras en curso',
    upcoming: 'Obras previstas',
    nearest: 'Obra más cercana',
    current: 'Obra en curso',
    next: 'Próxima obra',
    device: 'Obras',
    home: 'Alrededor de la casa',
  },
};

// Locales of the dates ("13 nov.", "13. Nov.").
export const LOCALES = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };

const plural = (count, one, many) => (count === 1 ? one : many);
const pluralFr = (count, one, many) => (count > 1 ? many : one);

// Feature states, widget contents and scene outputs.
export const TEXT = {
  en: {
    none: 'No worksite',
    until: ({ date }) => `until ${date}`,
    from: ({ date }) => `from ${date}`,
    upcoming: 'Upcoming',
    zoneNone: ({ zone }) => `${zone}: no worksite in progress.`,
    zoneSome: ({ zone, count, first }) =>
      `${zone}: ${count} ${plural(count, 'worksite', 'worksites')} in progress, including ${first}.`,
    zoneNext: ({ count }) => `${count} upcoming.`,
    noData: 'The worksites are not read yet.',
    pickZone: 'Add a zone in the Discover tab of the integration, then pick it here.',
    gone: 'This zone is no longer followed.',
    noZone: 'No zone is followed: add one in the Discover tab of the integration.',
    empty: 'No worksite in your zones.',
  },
  fr: {
    none: 'Aucun chantier',
    until: ({ date }) => `jusqu'au ${date}`,
    from: ({ date }) => `à partir du ${date}`,
    upcoming: 'À venir',
    zoneNone: ({ zone }) => `${zone} : aucun chantier en cours.`,
    zoneSome: ({ zone, count, first }) =>
      `${zone} : ${count} ${pluralFr(count, 'chantier en cours', 'chantiers en cours')}, dont ${first}.`,
    zoneNext: ({ count }) => `${count} à venir.`,
    noData: 'Les chantiers ne sont pas encore lus.',
    pickZone: "Ajoutez une zone dans l'onglet Découverte de l'intégration, puis choisissez-la ici.",
    gone: "Cette zone n'est plus suivie.",
    noZone: "Aucune zone n'est suivie : ajoutez-en une dans l'onglet Découverte de l'intégration.",
    empty: 'Aucun chantier dans vos zones.',
  },
  de: {
    none: 'Keine Baustelle',
    until: ({ date }) => `bis ${date}`,
    from: ({ date }) => `ab ${date}`,
    upcoming: 'Geplant',
    zoneNone: ({ zone }) => `${zone}: keine laufende Baustelle.`,
    zoneSome: ({ zone, count, first }) =>
      `${zone}: ${count} ${plural(count, 'laufende Baustelle', 'laufende Baustellen')}, darunter ${first}.`,
    zoneNext: ({ count }) => `${count} geplant.`,
    noData: 'Die Baustellen wurden noch nicht abgerufen.',
    pickZone: 'Füge eine Zone im Tab „Entdecken“ der Integration hinzu und wähle sie hier.',
    gone: 'Diese Zone wird nicht mehr verfolgt.',
    noZone: 'Keine Zone wird verfolgt: füge eine im Tab „Entdecken“ der Integration hinzu.',
    empty: 'Keine Baustelle in deinen Zonen.',
  },
  es: {
    none: 'Ninguna obra',
    until: ({ date }) => `hasta el ${date}`,
    from: ({ date }) => `a partir del ${date}`,
    upcoming: 'Prevista',
    zoneNone: ({ zone }) => `${zone}: ninguna obra en curso.`,
    zoneSome: ({ zone, count, first }) =>
      `${zone}: ${count} ${plural(count, 'obra en curso', 'obras en curso')}, entre ellas ${first}.`,
    zoneNext: ({ count }) => `${count} ${plural(count, 'prevista', 'previstas')}.`,
    noData: 'Las obras aún no se han leído.',
    pickZone: 'Añada una zona en la pestaña Descubrir de la integración y luego elíjala aquí.',
    gone: 'Esta zona ya no se sigue.',
    noZone: 'No se sigue ninguna zona: añada una en la pestaña Descubrir de la integración.',
    empty: 'Ninguna obra en sus zonas.',
  },
};

// Answer of the "Status" configuration action.
export const REPORTS = {
  en: {
    noCity: 'No city chosen: tick one or more cities above, then save.',
    city: ({ name, active, upcoming }) => `■ ${name}: ${active} in progress, ${upcoming} upcoming`,
    read: ({ hours }) => `Last reading ${hours} h ago.`,
    waiting: 'Not read yet.',
    error: ({ error }) => `Last error: ${error}`,
    noHouse: 'Around the house: no located house in Gladys.',
    noZone: 'No zone: choose a radius around the house or type streets, then save.',
    watched: ({ count }) => `${count} zone${count === 1 ? '' : 's'} added to Gladys.`,
  },
  fr: {
    noCity: 'Aucune ville choisie : cochez une ou plusieurs villes ci-dessus, puis enregistrez.',
    city: ({ name, active, upcoming }) => `■ ${name} : ${active} en cours, ${upcoming} à venir`,
    read: ({ hours }) => `Dernière lecture il y a ${hours} h.`,
    waiting: 'Pas encore lu.',
    error: ({ error }) => `Dernière erreur : ${error}`,
    noHouse: 'Autour de la maison : aucune maison localisée dans Gladys.',
    noZone:
      'Aucune zone : choisissez un rayon autour de la maison ou tapez des rues, puis enregistrez.',
    watched: ({ count }) =>
      `${count} zone${count > 1 ? 's' : ''} ajoutée${count > 1 ? 's' : ''} à Gladys.`,
  },
  de: {
    noCity: 'Keine Stadt gewählt: kreuze oben eine oder mehrere Städte an und speichere.',
    city: ({ name, active, upcoming }) => `■ ${name}: ${active} laufend, ${upcoming} geplant`,
    read: ({ hours }) => `Zuletzt abgerufen vor ${hours} h.`,
    waiting: 'Noch nicht abgerufen.',
    error: ({ error }) => `Letzter Fehler: ${error}`,
    noHouse: 'Rund ums Haus: kein Haus mit Standort in Gladys.',
    noZone: 'Keine Zone: wähle einen Umkreis ums Haus oder gib Straßen ein und speichere.',
    watched: ({ count }) => `${count} ${count === 1 ? 'Zone' : 'Zonen'} zu Gladys hinzugefügt.`,
  },
  es: {
    noCity: 'Ninguna ciudad elegida: marque una o varias ciudades arriba y guarde.',
    city: ({ name, active, upcoming }) =>
      `■ ${name}: ${active} en curso, ${upcoming} prevista${upcoming === 1 ? '' : 's'}`,
    read: ({ hours }) => `Última lectura hace ${hours} h.`,
    waiting: 'Todavía no se ha leído.',
    error: ({ error }) => `Último error: ${error}`,
    noHouse: 'Alrededor de la casa: ninguna casa localizada en Gladys.',
    noZone: 'Ninguna zona: elija un radio alrededor de la casa o escriba calles y guarde.',
    watched: ({ count }) =>
      `${count} zona${count === 1 ? '' : 's'} añadida${count === 1 ? '' : 's'} a Gladys.`,
  },
};

/** One text of a table, in a language (English when missing). */
export function say(table, language, key, params = {}) {
  const entry = table[language]?.[key] ?? table.en[key];
  return typeof entry === 'function' ? entry(params) : entry;
}

/** The same text in every language of the table: `{ en, fr, de, es }`. */
export function render(table, key, params = {}) {
  return Object.fromEntries(
    Object.keys(table).map((language) => [language, say(table, language, key, params)]),
  );
}

/** Joins rendered messages (or plain strings), language by language, one per line. */
export function lines(...messages) {
  const languages = Object.keys(messages.find((m) => typeof m === 'object' && m) ?? { en: '' });
  return Object.fromEntries(
    languages.map((language) => [
      language,
      messages
        .filter((message) => message !== null && message !== undefined)
        .map((message) => (typeof message === 'string' ? message : message[language]))
        .join('\n'),
    ]),
  );
}

/** "13 nov.", "13 Nov", "13. Nov." in the time zone of the container. */
export function shortDate(ms, language) {
  return new Intl.DateTimeFormat(LOCALES[language] ?? LOCALES.en, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(ms));
}

/** "350 m", "1.2 km" (with a comma in French, German and Spanish). */
export function distanceText(metres, language) {
  const rounded = Math.round(metres / 10) * 10;
  if (rounded < 1000) {
    return `${rounded} m`;
  }
  const km = (Math.round(metres / 100) / 10).toString();
  return `${language === 'en' ? km : km.replace('.', ',')} km`;
}
