# Gladys Worksites (Chantiers)

External integration for [Gladys Assistant](https://gladysassistant.com): the
**roadworks that disrupt traffic** near you, read from the open data of French
cities: **Paris, Lyon metropolitan area, Toulouse Métropole, Rennes Métropole,
Tours Métropole** and **Angers**. Around the house or in the streets you
follow. **No account, no key.**

Unofficial: not affiliated with the cities. The six sources were checked live
on 2026-10-29, not yet on many Gladys installations: feedback welcome.

Not to be confused with
[gladys-bison-fute](https://github.com/William-De71/gladys-bison-fute) (events
on the national road network): this one reads the local worksites the cities
publish.

User documentation: [English](docs/en.md) · [français](docs/fr.md) ·
[Deutsch](docs/de.md) · [español](docs/es.md).

## What you get in Gladys

| Kind                 | Content                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------- |
| Devices              | one per zone: worksites in progress and upcoming, the nearest (or current) one, the next |
| Zones                | around the house (200 m to 2 km of the house located in Gladys) and one per street typed |
| Dashboard widget     | "Worksites": the worksites of your zones, nearest first, then the upcoming ones          |
| Scene triggers       | a worksite is announced / starts / ends in a zone                                        |
| Scene action         | the worksites of your zones in one sentence, with the numbers in progress and upcoming   |
| Configuration action | status: cities read, worksites known, last readings, errors                              |

Requires Gladys **5.3.0** or later.

## Installation

In Gladys: **Integrations → Install from GitHub**, then
`https://github.com/guim31/gladys-chantiers`. Tick your cities, choose a radius
around the house and/or type streets in the configuration, then add the zones
from the **Discover** tab.

## How it works

- One adapter per portal (`src/sources.js`): five Opendatasoft Explore v2.1
  exports and the WFS service of data.grandlyon.com, one request per city.
- Each city is read twice a day (the portals update once a day at most). Every
  hour, without reading anything, the worksites are sorted again against the
  clock (started, ended), the states are published when they change and the
  triggers fire. Devices are published with `should_poll: false`: the
  container runs its own timer.
- Dates are days of the time zone of Gladys (Angers publishes hours).

| City     | Dataset                                                                                                              | Kept                                   |
| -------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Paris    | [Chantiers perturbants](https://opendata.paris.fr/explore/dataset/chantiers-perturbants/information/)                | all                                    |
| Lyon     | [Chantiers perturbants](https://data.grandlyon.com) (`pvo_patrimoine_voirie.pvochantierperturbant`)                  | not finished                           |
| Toulouse | [Chantiers (ORION)](https://data.toulouse-metropole.fr/explore/dataset/chantiers-en-cours/information/)              | touching the roadway (sidewalks aside) |
| Rennes   | [Travaux de voirie, 6 prochains jours](https://data.rennesmetropole.fr/explore/dataset/travaux_6_jours/information/) | impact other than "Impact nul"         |
| Tours    | [Travaux](https://data.tours-metropole.fr/explore/dataset/travaux_lineaire_tmvl/information/)                        | impact other than "Sans impact"        |
| Angers   | [Info Travaux](https://data.angers.fr/explore/dataset/info-travaux/information/)                                     | traffic slowed or diverted, not ended  |

Bordeaux, Nantes, Strasbourg, Montpellier and Lille published no up-to-date
worksite dataset on 2026-10-29.

## Limitations

- The dates are the ones the cities publish, often planned. Rennes only
  publishes the next 6 days, Tours only planned dates. A worksite ending before
  it starts in the data is left out.
- The texts of the worksites stay in French, as published.
- The distance is measured to the centre of the worksite.
- After a restart, the triggers start again from what is there.
- Read only.

## Development

```bash
npm install
npm test               # node --test, no network access
npm run lint           # ESLint
npm run format:check   # Prettier, as the CI runs it
npx github:GladysAssistant/integration-store .   # store admission checks
```

See [CLAUDE.md](CLAUDE.md) for the architecture and the conventions. The test
fixtures (`test/fixtures/sources`) are the real answers of the six portals,
captured on 2026-10-29.

## Credits

- Data: Ville de Paris, Rennes Métropole and Ville d'Angers (ODbL); Métropole
  de Lyon, Toulouse Métropole and Tours Métropole Val de Loire (Licence Ouverte
  v2.0, Etalab).
- Built from the official
  [integration template](https://github.com/GladysAssistant/integration-template-js).

## License

[Apache 2.0](LICENSE).
