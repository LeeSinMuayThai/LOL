// El inicio: arranque (BIOS -> logo de FARO) -> la pantalla de bloqueo. El reloj gigante es el año de la carrera; el
// cliente (una ventana de FARO) junta el login de la carrera nueva y la selección de campeones: nombre de invocador,
// servidor = región, perfil, rol = pestañas de la grilla de Data Dragon, el splash del apuntado de fondo, 3 ranuras y
// BLOQUEAR. "Continuar" es tu última sesión; el desafío del día llega como notificación; el historial es una carpeta.
import { cargarImagen, urlIcono } from '../../comun/arte.js';
import { el, anim, tipeado } from './util.js';
import { icono, logoFaro, notificacion, ventana } from './os.js';
import { vistaPick } from './campeones.js';

const BIOS = [
  'FARO BIOS 2.6 · placa de segunda mano',
  'Memoria ............ alcanza',
  'Ventilador ......... ruidoso, pero anda',
  'Mouse .............. pad gastado en el medio',
  'Teclado ............ la W brilla de tanto uso',
  'Disco .............. lleno de repeticiones',
  'Arrancando FARO 26…',
];
const ROL_ICONO = { top: 'laneo', jungla: 'macro', mid: 'mecanica', adc: 'teamfight', support: 'shotcalling' };

export function pintarInicio(raiz, ctx) {
  const ini = ctx.datos.inicio;
  const j = ini.jugador;
  const cat = ini.catalogos;
  const pieza = ctx.datos.eras?.pieza;
  const meta = ctx.meta;
  const handle = ctx.peor ? ctx.peor.handle : j.handle;
  const estado = { rol: j.rol, region: j.regionId, perfil: j.perfil, mains: j.mains.map((m) => m.ddragon) };

  ctx.fondo({ era: ctx.era, arte: ctx.mainDelHeroe(), org: null, quieto: false, vivo: true, encuadre: 'center 20%' });

  // ---------- la pantalla de bloqueo ----------
  const anio = pieza?.anio ?? 2026;
  const reloj = el('div', { class: 'reloj', 'data-foco': '' },
    el('p', { class: 'reloj-anio', 'aria-label': `Año ${anio}` }, String(anio)),
    el('p', { class: 'reloj-sub' }, `${pieza?.franja?.cuando?.ventana?.texto ?? 'Pretemporada'} · tenés ${pieza?.edad ?? 15} años y una PC`));

  const des = ini.desafio.conMejor ?? ini.desafio.sinJugar;
  const desafio = notificacion({ app: des.kicker, icon: 'temporada', titulo: 'El desafío del día', texto: des.texto, meta: des.textoMejor ?? null, clase: 'noti-desafio' });
  desafio.append(el('button', { class: 'boton-sec', type: 'button' }, des.boton, icono('flecha', 'ico ico-chico')));

  const carpeta = el('details', { class: 'carpeta' },
    el('summary', {}, icono('carpeta', 'ico'), el('span', {}, 'Carreras anteriores'), el('small', {}, String(ini.historial.filas.length))),
    el('p', { class: 'carpeta-titulo' }, ini.historial.titulo),
    el('ul', {}, ...ini.historial.filas.map((f) => el('li', {}, el('b', {}, f.pts), el('span', {}, f.detalle), el('small', {}, f.que)))));
  carpeta.open = true;

  const sesiones = el('div', { class: 'sesiones', role: 'list', 'aria-label': 'Sesiones' },
    el('button', { class: 'sesion', type: 'button', role: 'listitem' },
      el('span', { class: 'sesion-av' }, icono('vos', 'ico')),
      el('span', { class: 'sesion-txt' }, el('b', {}, `${ini.continuar.texto} · ${ini.continuar.partes.handle}`), el('small', {}, `Última sesión: ${ini.continuar.detalle}`))),
    el('button', { class: 'sesion', type: 'button', role: 'listitem', 'aria-current': 'true' },
      el('span', { class: 'sesion-av nueva' }, icono('mas', 'ico')),
      el('span', { class: 'sesion-txt' }, el('b', {}, 'Nueva carrera'), el('small', {}, 'Arrancás a los 15, en 2026'))));

  // ---------- el cliente: login + selección de campeones ----------
  const avatar = el('span', { class: 'login-av' });
  const pintarAvatar = () => cargarImagen(urlIcono(estado.mains[0] ?? j.mains[0].ddragon, meta)).then((img) => img && avatar.replaceChildren(Object.assign(img.cloneNode(), { alt: '' })));
  const nombre = el('span', { class: 'campo-valor' }, tipeado(handle, { delay: 1240, paso: 26 }), el('i', { class: 'caret', 'aria-hidden': 'true' }));
  const ayudaRegion = el('p', { class: 'ayuda' });
  const ayudaPerfil = el('p', { class: 'ayuda' });
  function pintarAyudas() {
    ayudaRegion.textContent = cat.regiones.find((r) => r.regionId === estado.region)?.texto ?? cat.textoSinRegion;
    ayudaPerfil.textContent = cat.perfiles.find((p) => p.id === estado.perfil)?.descripcion ?? '';
  }
  const elegible = (grupo, items, clave, alElegir) => el('div', { class: 'opciones-login', role: 'radiogroup', 'aria-label': grupo },
    ...items.map((it) => el('button', {
      class: 'pastilla', type: 'button', role: 'radio', 'aria-checked': it.id === estado[clave] ? 'true' : 'false', title: it.titulo ?? '',
      onclick: (e) => {
        estado[clave] = it.id;
        e.currentTarget.parentElement.querySelectorAll('.pastilla').forEach((b) => b.setAttribute('aria-checked', String(b === e.currentTarget)));
        pintarAyudas();
        alElegir?.();
      },
    }, it.icono ? icono(it.icono, 'ico ico-chico') : null, it.nombre)));

  // la selección: como el hover-pick del champ select, el apuntado pone su splash y su nombre en la ventana del cliente
  const pick = vistaPick(ctx, { clase: 'sel-fondo', kicker: 'Apuntando' });
  const apuntar = (k) => pick.apuntar(k);
  const grilla = el('div', { class: 'sel-grilla', role: 'listbox', 'aria-label': 'Campeones del rol', 'aria-multiselectable': 'true' });
  const slots = el('div', { class: 'sel-slots' });
  function pintarSlots() {
    slots.replaceChildren(...[0, 1, 2].map((i) => {
      const k = estado.mains[i];
      const s = el('span', { class: 'sel-slot', 'data-lleno': k ? 'si' : null, title: k ?? 'vacía' });
      if (k) cargarImagen(urlIcono(k, meta)).then((img) => img && s.prepend(Object.assign(img.cloneNode(), { alt: k })));
      s.append(el('small', {}, k ?? `main ${i + 1}`));
      return s;
    }));
    pintarAvatar();
  }
  function pintarGrilla() {
    grilla.replaceChildren(...(cat.campeonesPorRol[estado.rol] ?? []).map((c) => {
      const n = estado.mains.indexOf(c.ddragon);
      const b = el('button', {
        class: 'sel-camp', type: 'button', role: 'option', 'aria-selected': String(n >= 0), 'data-n': n >= 0 ? String(n + 1) : null, title: c.name,
        onmouseenter: () => apuntar(c.ddragon), onfocus: () => apuntar(c.ddragon),
        onclick: () => {
          const i = estado.mains.indexOf(c.ddragon);
          if (i >= 0) estado.mains.splice(i, 1);
          else if (estado.mains.length < cat.campeonesAElegir) estado.mains.push(c.ddragon);
          pintarGrilla();
          pintarSlots();
        },
      });
      cargarImagen(urlIcono(c.ddragon, meta)).then((img) => img && b.prepend(Object.assign(img.cloneNode(), { alt: c.name })));
      return b;
    }));
  }
  pintarAyudas();
  pintarGrilla();
  pintarSlots();
  apuntar(estado.mains[0]);

  const bloquear = el('button', { class: 'boton-pri bloquear', type: 'button', onclick: (e) => { login.dataset.bloqueado = 'si'; e.currentTarget.firstChild.textContent = 'BLOQUEADO'; } }, 'BLOQUEAR', el('kbd', {}, 'Enter'));
  const login = ventana({
    app: 'Cliente', icon: 'soloq', titulo: 'nueva-carrera', clase: 'login', pieza: 'inicio', etiqueta: 'Carrera nueva y selección de campeones',
    cuerpo: [pick.nodo, el('div', { class: 'login-cont' },
      el('header', { class: 'login-cab' }, avatar, el('div', {},
        el('p', { class: 'login-k' }, 'Nombre de invocador'),
        el('p', { class: 'login-nombre' }, nombre))),
      campo('Servidor', elegible('Servidor', cat.regiones.map((r) => ({ id: r.regionId, nombre: r.regionId, titulo: `${r.region} · ${r.liga}` })), 'region'), ayudaRegion),
      campo('Perfil', elegible('Perfil', cat.perfiles.map((p) => ({ id: p.id, nombre: p.nombre })), 'perfil'), ayudaPerfil),
      campo('Elegí tus 3 mains', el('div', { class: 'sel' },
        elegible('Rol', cat.roles.map((r) => ({ id: r.id, nombre: r.etiqueta, icono: ROL_ICONO[r.id] })), 'rol', pintarGrilla),
        grilla, el('p', { class: 'ayuda' }, cat.textoDelPool)), null),
      el('footer', { class: 'login-pie' }, slots, bloquear),
      el('p', { class: 'chiste' }, '¿Olvidaste la contraseña? Es tu main al revés.'))],
  });

  const bloqueo = el('div', { class: 'bloqueo', 'data-pieza': 'inicio' },
    el('header', { class: 'bloqueo-barra' }, logoFaro(), el('span', {}, `${handle} no inició sesión`), el('span', { class: 'bloqueo-der' }, `${anio} · ${pieza?.franja?.cuando?.ventana?.texto ?? ''}`)),
    el('div', { class: 'bloqueo-izq' }, reloj, desafio, carpeta),
    login,
    sesiones);

  // ---------- el arranque ----------
  const bios = el('div', { class: 'bios', 'aria-hidden': 'true' }, ...BIOS.map((l) => el('p', {}, l)));
  const arranque = el('div', { class: 'arranque', 'aria-hidden': 'true' }, logoFaro());
  raiz.append(bloqueo, bios, arranque);

  anim(bios, [{ opacity: 1, visibility: 'visible' }, { opacity: 1, visibility: 'visible', offset: 0.9 }, { opacity: 0, visibility: 'visible' }], { duration: 700 });
  bios.querySelectorAll('p').forEach((p, i) => anim(p, [{ opacity: 0 }, { opacity: 1 }], { delay: 40 + i * 78, duration: 1 }));
  anim(arranque, [{ opacity: 0, visibility: 'visible' }, { opacity: 1, visibility: 'visible', offset: 0.25 }, { opacity: 1, visibility: 'visible', offset: 0.8 }, { opacity: 0, visibility: 'visible' }], { delay: 640, duration: 620 });
  anim(arranque.querySelector('.faro-haz'), [{ opacity: 0, transform: 'scaleX(0.2)' }, { opacity: 0.55, transform: 'none' }], { delay: 700, duration: 360, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  anim(bloqueo, [{ opacity: 0 }, { opacity: 1 }], { delay: 1140, duration: 320 });
  anim(reloj, [{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }], { delay: 1160, duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  anim(login, [{ opacity: 0, transform: 'translateY(24px) scale(0.98)' }, { opacity: 1, transform: 'none' }], { delay: 1200, duration: 300, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' });
  [desafio, carpeta].forEach((n, i) => anim(n, [{ opacity: 0, transform: 'translateX(-24px)' }, { opacity: 1, transform: 'none' }], { delay: 1260 + i * 70, duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }));

  const tecla = (e) => {
    if (e.key === 'Enter' && !e.altKey && !(e.target instanceof HTMLButtonElement)) bloquear.click();
  };
  document.addEventListener('keydown', tecla);
  return { listo: pick.listo, destruir: () => document.removeEventListener('keydown', tecla) };
}

function campo(etiqueta, control, ayuda) {
  return el('div', { class: 'campo' }, el('p', { class: 'login-k' }, etiqueta), control, ayuda);
}
