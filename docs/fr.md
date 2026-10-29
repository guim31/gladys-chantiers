# Chantiers

Les **chantiers qui perturbent la circulation** près de chez vous, lus dans l'open data des villes
françaises : Paris, Métropole de Lyon, Toulouse Métropole, Rennes Métropole, Tours Métropole et
Angers. Autour de votre maison ou dans les rues que vous suivez : combien de chantiers sont en cours,
le plus proche, le prochain à démarrer. **Sans compte ni clé.**

Intégration non officielle, sans lien avec les villes. Les sources ont été vérifiées en direct le
29/10/2026 ; les retours des utilisateurs de chaque ville sont les bienvenus. Différente de
l'intégration Bison Futé, qui couvre les événements du réseau routier national : ici, les chantiers
locaux publiés par les villes.

## Ce que vous obtenez

- Une **zone « Autour de la maison »** : les chantiers à 200 m à 2 km de la maison localisée dans Gladys.
- Une **zone par rue** que vous tapez (« Rue de Vaugirard », « Avenue Esquirol »), cherchée dans
  toutes les villes cochées, sans tenir compte des accents ni des majuscules.
- Pour chaque zone, un appareil avec : le nombre de chantiers en cours, le nombre de chantiers
  annoncés, le plus proche (ou, dans une rue, celui en cours) et le prochain à démarrer, chacun en
  une ligne : travaux, rue, distance, date de fin, effet sur la circulation.
- Un **widget** « Chantiers » : les chantiers de vos zones, les plus proches d'abord, puis ceux à venir.
- Trois **déclencheurs de scène** : un chantier est annoncé, commence ou se termine dans une zone.
- Une **action de scène** : les chantiers de vos zones en une phrase, prête à envoyer ou à dire.

## Prérequis

- Gladys Assistant **5.3.0** ou plus récent.
- Un accès à Internet depuis Gladys : les données viennent des portails open data des villes.
- Ni compte ni clé d'API. Pour la zone « Autour de la maison », une maison localisée dans Gladys
  (Paramètres → Maisons) : l'intégration demande l'accès à sa position à l'installation.

## Installation

1. Dans Gladys, ouvrez **Intégrations → Installer depuis GitHub**.
2. Collez l'adresse `https://github.com/guim31/gladys-chantiers` et validez.
3. Ouvrez l'intégration une fois installée : l'onglet **Configuration** s'affiche.

## Configuration

### Réglages

| Réglage                     | Effet                                                                          |
| --------------------------- | ------------------------------------------------------------------------------ |
| Villes                      | Les villes dont les chantiers sont lus. Cochez seulement les vôtres.           |
| Autour de la maison         | Rayon de la zone autour de la maison (200 m, 500 m, 1 km, 2 km), ou désactivé. |
| Rues à suivre               | Une partie du nom de chaque rue, séparée par des virgules (10 au plus).        |
| Langue des noms et messages | Langue des noms de fonctionnalités, des phrases et des dates (français).       |

Les chantiers eux-mêmes (nature des travaux, rue, effet sur la circulation) restent en français,
tels que les villes les publient.

### Ajouter des zones

1. Cochez vos villes, choisissez un rayon et/ou tapez des rues, puis **enregistrez**.
2. Ouvrez l'onglet **Découverte** : un appareil par zone (« Chantiers · Autour de la maison »,
   « Chantiers · Rue de Vaugirard »).
3. Ajoutez à Gladys celles qui vous intéressent. Leurs états apparaissent aussitôt.

Une recherche de rue porte sur une partie du nom : « Vaugirard » trouve « rue de Vaugirard » et
toutes les rues dont le nom le contient. Trois lettres au moins. Changer la recherche plus tard
propose de nouvelles zones ; les zones déjà ajoutées restent.

### Vérifier

L'action **État** de l'onglet Configuration liste les villes lues, les chantiers en cours et
annoncés dans chacune, la dernière lecture, la dernière erreur et les zones ajoutées.

## Appareils

| Fonctionnalité                                | Type     | Contenu                                                |
| --------------------------------------------- | -------- | ------------------------------------------------------ |
| Chantiers en cours                            | compteur | Chantiers commencés et pas terminés                    |
| Chantiers à venir                             | compteur | Chantiers annoncés, pas encore commencés               |
| Chantier le plus proche (autour de la maison) | texte    | Le chantier en cours le plus proche, avec sa distance  |
| Chantier en cours (rue)                       | texte    | Le chantier en cours qui finit le plus tard            |
| Prochain chantier                             | texte    | Le prochain chantier à démarrer, avec son premier jour |

Exemple : `Réfections de tranchées · Avenue Esquirol · 290 m · jusqu'au 6 nov. · Circulation interdite`.
Sans aucun chantier, le texte dit « Aucun chantier » (dans la langue choisie).

## Widget du tableau de bord

**Chantiers** : les chantiers de vos zones (toutes, ou celles choisies), 8 au plus. Ceux en cours
d'abord, les plus proches en tête, avec leur distance en pastille ; puis ceux à venir, marqués « À
venir ». Un appui sur une ligne affiche le détail : travaux, rue, commune, effet, dates, distance,
source. Réglages : les zones affichées, afficher les chantiers à venir, afficher la distance.

## Déclencheurs de scène

| Déclencheur       | Quand                                                                               |
| ----------------- | ----------------------------------------------------------------------------------- |
| Chantier annoncé  | Un nouveau chantier, pas encore commencé, apparaît dans une zone (nouvelle lecture) |
| Chantier commencé | Un chantier d'une zone atteint son premier jour, ou apparaît déjà commencé          |
| Chantier terminé  | Un chantier d'une zone a passé sa fin prévue, ou n'est plus publié                  |

Chacun peut être limité à certaines zones. Variables : zone, travaux, rue, commune, source, impact
sur la circulation, début, fin prévue, distance de la maison (0 pour une rue). Rien ne se déclenche
au démarrage ni au changement des réglages : seulement ce qui arrive ensuite.

## Action de scène

**Chantiers en une phrase** : pour chaque zone choisie (toutes par défaut), le nombre de chantiers
en cours, le plus proche et le nombre de chantiers annoncés. Sorties : la phrase, le nombre de
chantiers en cours et le nombre de chantiers annoncés, pour une étape « Continuer seulement si ».

## Exemples de scènes

- Chaque matin à 7 h 30, envoyer « Chantiers en une phrase » sur votre téléphone.
- Quand un chantier est annoncé autour de la maison, envoyer un message avec sa rue et son premier jour.
- Quand un chantier se termine dans votre rue, l'annoncer sur l'enceinte du salon.

## Données et rafraîchissement

Chaque ville est lue **deux fois par jour** (les portails se mettent à jour une fois par jour au
plus), en une requête. Toutes les heures, sans rien relire, les chantiers sont triés à nouveau selon
l'heure : ceux dont le premier jour est arrivé commencent, ceux qui ont passé leur fin sont
terminés. Une ville qui ne répond pas garde ses derniers chantiers et est relue une heure plus tard.

| Ville              | Jeu de données                                                           |
| ------------------ | ------------------------------------------------------------------------ |
| Paris              | `chantiers-perturbants` (opendata.paris.fr), les chantiers perturbants   |
| Métropole de Lyon  | `pvochantierperturbant` (data.grandlyon.com), chantiers perturbants      |
| Toulouse Métropole | `chantiers-en-cours` (data.toulouse-metropole.fr), hors trottoirs        |
| Rennes Métropole   | `travaux_6_jours` (data.rennesmetropole.fr), les 6 prochains jours       |
| Tours Métropole    | `travaux_lineaire_tmvl` (data.tours-metropole.fr), dates prévisionnelles |
| Angers             | `info-travaux` (data.angers.fr), avec les heures                         |

Les autres villes (Bordeaux, Nantes, Strasbourg, Montpellier, Lille…) ne publiaient pas de jeu de
chantiers à jour le 29/10/2026. Ouvrez une issue si la vôtre le fait.

## Dépannage

- **Aucune zone dans Découverte** : cochez une ville et enregistrez ; pour la zone de la maison,
  localisez la maison dans Gladys.
- **Une rue ne trouve rien** : essayez une partie plus courte de son nom ; les villes l'écrivent
  différemment (« Bd », « Boulevard »). Rennes décrit les lieux en une phrase, que la recherche lit
  aussi.
- **« Dernière erreur » dans État** : le portail de la ville n'a pas répondu ; les derniers chantiers
  sont gardés.
- Logs : dans le conteneur Docker de l'intégration ; `LOG_LEVEL=debug` montre chaque lecture.

## Limites

- Les dates sont celles que publient les villes, souvent prévisionnelles : un chantier peut
  démarrer en retard ou durer plus longtemps.
- Rennes ne publie que les 6 prochains jours, Tours que des dates prévisionnelles. Un chantier dont
  les dates sont inversées dans les données est écarté.
- Le point d'un chantier est le centre de sa forme : dans une longue rue, la distance est approchée.
- Après un redémarrage, les déclencheurs repartent de ce qui est là : ce qui s'est passé entre-temps
  n'est pas déclenché.

## Crédits

Données : Ville de Paris, Rennes Métropole et Ville d'Angers sous Open Database License (ODbL) ;
Métropole de Lyon, Toulouse Métropole et Tours Métropole Val de Loire sous Licence Ouverte v2.0
(Etalab). Intégration par guim31, Apache-2.0.
