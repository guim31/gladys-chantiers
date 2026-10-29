# Obras

Las **obras que perturban el tráfico** cerca de usted, leídas en los datos abiertos de ciudades
francesas: París, Metrópoli de Lyon, Toulouse Métropole, Rennes Métropole, Tours Métropole y Angers.
Alrededor de su casa o en las calles que sigue: cuántas obras están en curso, la más cercana, la
próxima en empezar. **Sin cuenta ni clave.**

Integración no oficial, sin relación con las ciudades. Las fuentes se comprobaron en directo el
29/10/2026; los comentarios de los usuarios de cada ciudad son bienvenidos. Distinta de la
integración Bison Futé, que cubre los eventos de la red nacional de carreteras: aquí, las obras
locales publicadas por las ciudades.

## Lo que obtiene

- Una **zona «Alrededor de la casa»**: las obras a 200 m a 2 km de la casa ubicada en Gladys.
- Una **zona por calle** que escriba («Rue de Vaugirard», «Avenue Esquirol»), buscada en todas las
  ciudades marcadas, sin importar acentos ni mayúsculas.
- Para cada zona, un dispositivo con: el número de obras en curso, el número de obras anunciadas,
  la más cercana (o, en una calle, la que está en curso) y la próxima en empezar, cada una en una
  línea: trabajos, calle, distancia, fecha de fin, efecto en el tráfico.
- Un **widget** «Obras»: las obras de sus zonas, las más cercanas primero, luego las previstas.
- Tres **disparadores de escena**: una obra se anuncia, empieza o termina en una zona.
- Una **acción de escena**: las obras de sus zonas en una frase, lista para enviar o decir.

## Requisitos

- Gladys Assistant **5.3.0** o posterior.
- Acceso a Internet desde Gladys: los datos vienen de los portales de datos abiertos de las ciudades.
- Sin cuenta ni clave de API. Para la zona «Alrededor de la casa», una casa ubicada en Gladys
  (Ajustes → Casas): la integración pide acceso a su ubicación al instalarla.

## Instalación

1. En Gladys, abra **Integraciones → Instalar desde GitHub**.
2. Pegue la dirección `https://github.com/guim31/gladys-chantiers` y confirme.
3. Abra la integración una vez instalada: aparece la pestaña **Configuración**.

## Configuración

### Ajustes

| Ajuste                       | Efecto                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------- |
| Ciudades                     | Las ciudades cuyas obras se leen. Marque solo las suyas.                        |
| Alrededor de la casa         | Radio de la zona alrededor de la casa (200 m, 500 m, 1 km, 2 km) o desactivado. |
| Calles a seguir              | Parte del nombre de cada calle, separada por comas (10 como máximo).            |
| Idioma de nombres y mensajes | Idioma de los nombres de funciones, las frases y las fechas (francés primero).  |

Las obras en sí (naturaleza de los trabajos, calle, efecto en el tráfico) quedan en francés, tal
como las publican las ciudades.

### Añadir zonas

1. Marque sus ciudades, elija un radio y/o escriba calles, y **guarde**.
2. Abra la pestaña **Descubrir**: un dispositivo por zona («Obras · Alrededor de la casa»,
   «Obras · Rue de Vaugirard»).
3. Añada a Gladys las que le interesen. Sus estados aparecen enseguida.

Una búsqueda de calle se refiere a una parte del nombre: «Vaugirard» encuentra «rue de Vaugirard» y
todas las calles cuyo nombre lo contenga. Tres letras como mínimo. Cambiar la búsqueda más tarde
ofrece nuevas zonas; las zonas ya añadidas se mantienen.

### Comprobar

La acción **Estado** de la pestaña Configuración lista las ciudades leídas, las obras en curso y
anunciadas en cada una, la última lectura, el último error y las zonas añadidas.

## Dispositivos

| Función                                 | Tipo     | Contenido                                      |
| --------------------------------------- | -------- | ---------------------------------------------- |
| Obras en curso                          | contador | Obras empezadas y no terminadas                |
| Obras previstas                         | contador | Obras anunciadas, aún no empezadas             |
| Obra más cercana (alrededor de la casa) | texto    | La obra en curso más cercana, con su distancia |
| Obra en curso (calle)                   | texto    | La obra en curso que termina más tarde         |
| Próxima obra                            | texto    | La próxima obra en empezar, con su primer día  |

Ejemplo: `Réfections de tranchées · Avenue Esquirol · 290 m · hasta el 6 nov · Circulation interdite`.
Sin ninguna obra, el texto dice «Ninguna obra» (en el idioma elegido).

## Widget del panel

**Obras**: las obras de sus zonas (todas o las elegidas), 8 como máximo. Primero las que están en
curso, las más cercanas arriba, con su distancia como etiqueta; luego las previstas, marcadas como
«Prevista». Un toque en una fila muestra el detalle: trabajos, calle, municipio, efecto, fechas,
distancia, fuente. Ajustes: las zonas mostradas, mostrar las obras previstas, mostrar la distancia.

## Disparadores de escena

| Disparador     | Cuándo                                                               |
| -------------- | -------------------------------------------------------------------- |
| Obra anunciada | Una obra nueva, aún no empezada, aparece en una zona (nueva lectura) |
| Obra iniciada  | Una obra de una zona llega a su primer día, o aparece ya empezada    |
| Obra terminada | Una obra de una zona ha pasado su fin previsto, o ya no se publica   |

Cada uno puede limitarse a algunas zonas. Variables: zona, trabajos, calle, municipio, fuente,
impacto en el tráfico, inicio, fin prevista, distancia de la casa (0 para una calle). No se dispara
nada al arrancar ni al cambiar los ajustes: solo lo que ocurre después.

## Acción de escena

**Obras en una frase**: para cada zona elegida (todas por defecto), el número de obras en curso, la
más cercana y el número de obras anunciadas. Salidas: la frase, el número de obras en curso y el
número de obras anunciadas, para un paso «Continuar solo si».

## Ejemplos de escenas

- Cada mañana a las 7:30, enviar «Obras en una frase» a su teléfono.
- Cuando se anuncie una obra alrededor de la casa, enviar un mensaje con su calle y su primer día.
- Cuando termine una obra en su calle, anunciarlo por el altavoz del salón.

## Datos y actualización

Cada ciudad se lee **dos veces al día** (los portales se actualizan una vez al día como máximo), en
una sola petición. Cada hora, sin leer nada, las obras se vuelven a ordenar según la hora: las que
llegan a su primer día empiezan, las que pasan su fin terminan. Una ciudad que no responde conserva
sus últimas obras y se vuelve a leer una hora después.

| Ciudad             | Conjunto de datos                                                     |
| ------------------ | --------------------------------------------------------------------- |
| París              | `chantiers-perturbants` (opendata.paris.fr), las obras perturbadoras  |
| Metrópoli de Lyon  | `pvochantierperturbant` (data.grandlyon.com), obras perturbadoras     |
| Toulouse Métropole | `chantiers-en-cours` (data.toulouse-metropole.fr), sin aceras         |
| Rennes Métropole   | `travaux_6_jours` (data.rennesmetropole.fr), solo los próximos 6 días |
| Tours Métropole    | `travaux_lineaire_tmvl` (data.tours-metropole.fr), fechas previstas   |
| Angers             | `info-travaux` (data.angers.fr), con horas                            |

Las demás ciudades (Burdeos, Nantes, Estrasburgo, Montpellier, Lille…) no publicaban un conjunto de
obras actualizado el 29/10/2026. Abra una issue si la suya lo hace.

## Solución de problemas

- **Ninguna zona en Descubrir**: marque una ciudad y guarde; para la zona de la casa, ubique la casa en Gladys.
- **Una calle no encuentra nada**: pruebe una parte más corta de su nombre; las ciudades lo escriben
  de forma distinta («Bd», «Boulevard»). Rennes describe los lugares en una frase, que la búsqueda
  también lee.
- **«Último error» en Estado**: el portal de la ciudad no respondió; se conservan las últimas obras.
- Registros: en el contenedor Docker de la integración; `LOG_LEVEL=debug` muestra cada lectura.

## Limitaciones

- Las fechas son las que publican las ciudades, a menudo previstas: una obra puede empezar tarde o
  durar más.
- Rennes solo publica los próximos 6 días, Tours solo fechas previstas. Una obra con las fechas
  invertidas en los datos se descarta.
- El punto de una obra es el centro de su forma: en una calle larga, la distancia es aproximada.
- Tras un reinicio o un cambio de ajustes o de la ubicación de la casa, los disparadores parten de lo
  que hay: lo ocurrido entretanto no se dispara. Como máximo 50 eventos por pasada, sin reintento si
  Gladys los rechaza. Una obra que un portal retira y vuelve a publicar se ve terminada y luego iniciada.

## Créditos

Datos: Ville de Paris, Rennes Métropole y Ville d'Angers bajo la Open Database License (ODbL);
Métropole de Lyon, Toulouse Métropole y Tours Métropole Val de Loire bajo la Licence Ouverte v2.0
(Etalab). Integración de guim31, Apache-2.0.
