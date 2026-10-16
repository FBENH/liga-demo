# Liga de demo

Sitio de una liga de básquet hecho solo con la [API pública de StatsApp](https://github.com/FBENH/ApiStatsApp), para mostrar cómo la usa un cliente externo en otro dominio.

- Tabla de posiciones, MVP de la semana, del mes y de la temporada, fixture con resultados y líderes por estadística.
- Los partidos en vivo se actualizan al instante con SignalR: cuando cambia un tanteador o termina un partido, se actualiza la tabla.
- Cada partido jugado o en curso enlaza a su vista en vivo en StatsApp, con el relato jugada a jugada, los tiros en la cancha y la planilla.

Es HTML, CSS y JavaScript sin frameworks ni compilación. La única dependencia es el cliente de SignalR desde un CDN.

## Usarlo con otra liga

En `config.js`:

```js
window.LIGA = {
  api: 'https://la-api-de-statsapp',   // dirección de la API
  slug: 'mi-liga',                      // la "dirección pública" de la liga en StatsApp
  app: 'https://el-front-de-statsapp',  // para los enlaces a cada partido
};
```

Para probarlo local, con la API corriendo:

```sh
python3 -m http.server 8080
```

## Qué usa de la API

| Pedido | Para qué |
|---|---|
| `GET /publico/ligas/{slug}` | Nombre, descripción y temporada actual |
| `GET /publico/ligas/{slug}/partidos` | Fixture, resultados y MVP de cada partido |
| `GET /publico/ligas/{slug}/posiciones` | Tabla, general o por división |
| `GET /publico/ligas/{slug}/mvp` | MVP de la semana, del mes y de la temporada |
| `GET /publico/ligas/{slug}/lideres` | Líderes por estadística |
| Hub `/hubs/partidos`, `SeguirLiga(slug)` | Evento `partido` con el tanteador y el estado de cada partido |

Ninguno pide login.
