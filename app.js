// Sitio de una liga hecho solo con la API pública de StatsApp (sin login) y SignalR para lo que pasa en vivo.
const { api, slug, app } = window.LIGA;
const base = `${api}/publico/ligas/${encodeURIComponent(slug)}`;
const $ = (id) => document.getElementById(id);

let partidos = [];

async function pedir(ruta = '') {
  const respuesta = await fetch(base + ruta);
  if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status}`);
  return (await respuesta.json()).data;
}

// Texto que viene de la API: se escapa antes de ponerlo en el HTML.
const escapar = (texto) =>
  String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const jugador = (j) => (!j.nombre || j.nombre === 'N/D' ? `#${j.numero}` : `#${j.numero} ${j.nombre}`);
const dia = (fecha) =>
  fecha ? new Date(fecha).toLocaleDateString('es', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'Día a confirmar';
const enlacePartido = (p) => `${app}/liga/${encodeURIComponent(slug)}/partido/${p.id}`;

async function cargarLiga() {
  const liga = await pedir();
  document.title = liga.nombre;
  $('nombre').textContent = liga.nombre;
  $('descripcion').textContent = [liga.descripcion, liga.temporada.nombre].filter(Boolean).join(' · ');
}

async function cargarPartidos() {
  partidos = await pedir('/partidos');
  pintarEnVivo();
  pintarPartidos();
}

function pintarEnVivo() {
  const vivos = partidos.filter((p) => p.estado === 'EnCurso');
  $('en-vivo').hidden = vivos.length === 0;
  $('en-vivo').innerHTML = vivos
    .map(
      (p) => `
      <a class="vivo" href="${enlacePartido(p)}" data-partido="${p.id}">
        <span class="insignia">● En vivo</span>
        <span class="local">${escapar(p.local.nombre)}</span>
        <strong class="tanteador">${p.local.puntos} – ${p.visitante.puntos}</strong>
        <span>${escapar(p.visitante.nombre)}</span>
      </a>`,
    )
    .join('');
}

function pintarPartidos() {
  const fechas = new Map();
  for (const p of partidos) {
    const clave = p.jornada ?? 0;
    if (!fechas.has(clave)) fechas.set(clave, []);
    fechas.get(clave).push(p);
  }
  $('partidos').innerHTML =
    [...fechas.entries()]
      .sort(([a], [b]) => (a || 1e9) - (b || 1e9))
      .map(
        ([jornada, lista]) => `
        <h3>${jornada ? `Fecha ${jornada}` : 'Otros partidos'}</h3>
        <div class="partidos">${lista.map(tarjetaPartido).join('')}</div>`,
      )
      .join('') || '<p class="suave">Todavía no hay fixture.</p>';
}

function tarjetaPartido(p) {
  const gano = (a, b) => (p.estado === 'Finalizado' && a > b ? ' class="gano"' : '');
  const centro =
    p.estado === 'Programado' ? '<span class="suave">vs</span>' : `<strong>${p.local.puntos} – ${p.visitante.puntos}</strong>`;
  const pie =
    p.estado === 'EnCurso'
      ? '<span class="insignia">● En vivo</span>'
      : p.estado === 'Programado'
        ? `${dia(p.fecha)}${p.lugar ? ' · ' + escapar(p.lugar) : ''}`
        : `Final${p.mvp ? ` · MVP ${escapar(jugador(p.mvp.jugador))} (${p.mvp.puntos} pts)` : ''}`;
  const etiqueta = p.estado === 'Programado' ? 'div' : 'a';
  const destino = p.estado === 'Programado' ? '' : ` href="${enlacePartido(p)}"`;
  return `
    <${etiqueta} class="partido${p.estado === 'EnCurso' ? ' jugando' : ''}"${destino}>
      <div class="cruce">
        <span${gano(p.local.puntos, p.visitante.puntos)}>${escapar(p.local.nombre)}</span>
        ${centro}
        <span${gano(p.visitante.puntos, p.local.puntos)}>${escapar(p.visitante.nombre)}</span>
      </div>
      <div class="suave chico">${pie}</div>
    </${etiqueta}>`;
}

async function cargarPosiciones() {
  const tablas = await pedir('/posiciones');
  $('posiciones').innerHTML = tablas
    .map(
      (tabla) => `
      ${tabla.division ? `<h3>${escapar(tabla.division.nombre)}</h3>` : ''}
      <div class="tabla-envoltorio"><table>
        <thead><tr><th>#</th><th class="izq">Equipo</th><th>PJ</th><th>G</th><th>P</th><th class="ancho">PF</th><th class="ancho">PC</th><th>Dif</th><th>Pts</th></tr></thead>
        <tbody>${tabla.filas
          .map(
            (f, i) => `<tr>
              <td>${i + 1}</td><td class="izq">${escapar(f.equipo.nombre)}</td>
              <td>${f.jugados}</td><td>${f.ganados}</td><td>${f.perdidos}</td>
              <td class="ancho">${f.puntosAFavor}</td><td class="ancho">${f.puntosEnContra}</td>
              <td>${f.diferencia > 0 ? '+' : ''}${f.diferencia}</td><td><strong>${f.puntos}</strong></td>
            </tr>`,
          )
          .join('')}</tbody>
      </table></div>`,
    )
    .join('');
}

async function cargarMvp() {
  const m = await pedir('/mvp');
  const tarjetas = [
    ['MVP de la semana', m.semana.mvp],
    ['MVP del mes', m.mes.mvp],
    ['MVP de la temporada', m.temporada.mvp],
  ];
  $('mvp').innerHTML = tarjetas
    .map(
      ([titulo, x]) => `
      <div class="tarjeta">
        <span class="suave chico">${titulo}</span>
        ${
          x
            ? `<strong>${escapar(jugador(x.jugador))}</strong><span class="suave chico">${escapar(x.jugador.equipo)} · ${x.valoracion} de valoración</span>`
            : '<span class="suave">Todavía no hay partidos.</span>'
        }
      </div>`,
    )
    .join('');
}

async function cargarLideres() {
  const l = await pedir('/lideres');
  $('lideres-nota').textContent = `Promedio por partido, con al menos ${l.minPartidos} ${l.minPartidos === 1 ? 'partido jugado' : 'partidos jugados'}.`;
  $('lideres').innerHTML = l.categorias
    .map(
      (c) => `
      <div class="tarjeta">
        <strong>${escapar(c.nombre)}</strong>
        <ol>${
          c.jugadores
            .slice(0, 5)
            .map((x) => `<li><span>${escapar(jugador(x.jugador))} <span class="suave">${escapar(x.jugador.equipo)}</span></span><b>${x.promedio.toFixed(1)}</b></li>`)
            .join('') || '<li class="suave">Sin datos todavía.</li>'
        }</ol>
      </div>`,
    )
    .join('');
}

const cargarTablas = () => Promise.all([cargarPosiciones(), cargarMvp(), cargarLideres()]);

// En vivo: la API avisa cada cambio de tanteador o de estado de un partido de la liga.
function conectar() {
  const conexion = new signalR.HubConnectionBuilder()
    .withUrl(`${api}/hubs/partidos`, { withCredentials: false })
    .withAutomaticReconnect()
    .build();
  conexion.on('partido', (p) => {
    const i = partidos.findIndex((x) => x.id === p.id);
    if (i === -1) return cargarPartidos();
    const cambioEstado = partidos[i].estado !== p.estado;
    partidos[i] = { ...partidos[i], ...p };
    pintarEnVivo();
    pintarPartidos();
    const tanteador = document.querySelector(`[data-partido="${p.id}"] .tanteador`);
    tanteador?.classList.add('salto');
    if (cambioEstado) cargarPartidos().then(cargarTablas);
  });
  const seguir = () => conexion.invoke('SeguirLiga', slug);
  conexion.onreconnected(() => seguir().then(cargarPartidos).then(cargarTablas));
  const iniciar = () =>
    conexion
      .start()
      .then(seguir)
      .catch(() => setTimeout(iniciar, 5000));
  iniciar();
}

Promise.all([cargarLiga(), cargarPartidos(), cargarTablas()])
  .then(conectar)
  .catch((e) => {
    $('nombre').textContent = 'No se pudo cargar la liga';
    $('descripcion').textContent = e.message;
  });
