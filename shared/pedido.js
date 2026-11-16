/* Pedido para el salón — módulo compartido por todas las cartas (demo de front, sin backend).
   Cada plato se marca con data-pd (ver Pedido.attr); init() agrega el + / −, la barra "Ver pedido",
   la hoja "Mi pedido" (con aclaraciones para el mozo), el resumen para mostrar en la mesa,
   el diálogo del plato y el buscador.

   Pedido.init({
     theme:      {btn, btnFg, bg, fg, mute, line, price, font, head, field, radius, sheet},
     root:       '#menu'            contenedor de la carta
     search:     false              sin buscador (la carta trae el suyo)
     searchText: '¿Qué tenés…?'     texto del buscador
     searchBefore, containers       dónde va el buscador / qué bloques se ocultan al filtrar
     nav:        '#nav'             lista de secciones (se le agregan los bordes difuminados)
     unit:       ['plato','platos'] cómo se cuentan los ítems (por defecto: producto/productos)
     pickText:   'Elegí el tamaño'  título del selector de variantes
     seed:       false | ['Nombre'] pedido de ejemplo al abrir (demo)
     whatsapp:   '5493510000000'    agrega "Enviar por WhatsApp" al resumen
     key:        'x'                clave propia para guardar el pedido
   }) */
(() => {
'use strict';

const fmt = n => '$ ' + n.toLocaleString('es-AR');
const norm = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+/g, ' ').trim(); };
const escAttr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const buzz = () => { try { navigator.vibrate?.(8); } catch {} };
const pop = el => { if (!el) return; el.classList.remove('pd-pop'); void el.offsetWidth; el.classList.add('pd-pop'); };

const T = {
  add: n => `Agregar ${n} al pedido`, less: n => `Quitar una unidad de ${n}`, more: n => `Agregar una unidad de ${n}`,
  pick: n => `Elegir opciones de ${n}`, pickText: 'Elegí una opción', view: 'Ver pedido', ready: 'Pedido listo', dine: 'Pedido para el salón',
  items: n => n === 1 ? '1 producto' : `${n} productos`,
  title: 'Mi pedido', hint: 'Ajustá las cantidades y, cuando esté listo, mostráselo al mozo.',
  empty: 'Tu pedido está vacío', emptyHint: 'Tocá + en lo que quieras pedir y aparece acá.', seeMenu: 'Ver la carta',
  total: 'Total estimado', make: 'Hacer pedido', each: 'c/u',
  show: 'Mostrale esta pantalla al mozo cuando se acerque a tu mesa.', done: 'Listo', edit: 'Modificar pedido',
  note: 'Aclaraciones para el mozo', notePh: 'Ej.: sin sal, alergia a frutos secos, punto de la carne…',
  clear: 'Vaciar pedido', cleared: 'Vaciaste el pedido', undo: 'Deshacer',
  addOrder: 'Agregar al pedido', inOrder: 'En tu pedido', close: 'Cerrar', back: 'Volver', ask: 'Consultá el precio con el mozo.',
  search: '¿Qué tenés ganas de comer?', searchLabel: 'Buscar en la carta', clearSearch: 'Borrar búsqueda',
  results: n => n === 1 ? '1 resultado' : `${n} resultados`, none: q => `No encontramos nada con “${q}”.`,
  wa: 'Enviar por WhatsApp', waHi: 'Hola, quiero hacer este pedido:',
};

const svg = (d, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  plus: svg('<path d="M12 5v14M5 12h14"/>', 2.4),
  minus: svg('<path d="M5 12h14"/>', 2.4),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>', 2.2),
  back: svg('<path d="M19 12H5M12 19l-7-7 7-7"/>', 2.2),
  chev: svg('<path d="M9 6l6 6-6 6"/>', 2.4),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 2.6),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  bag: svg('<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 11h4M12 16h4M8 11h.01M8 16h.01"/>'),
  wa: svg('<path d="M3.6 20.4l1.2-4.1a8.4 8.4 0 1 1 3.1 3z"/><path d="M9.2 8.6c-.3 2.9 2.600 5.900 5.900 6.200l1.100-1.400-1.900-1-.8.800c-.9-.5-1.500-1.100-2-2l.8-.8-1-1.900z" fill="currentColor" stroke="none"/>', 1.8),
};

// h('div', {class: 'x', onclick, html}, hijos...) — hijos: nodos o textos (los falsy se ignoran)
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}
const icon = (name, cls) => h('span', {class: 'pd-i' + (cls ? ' ' + cls : ''), html: ICON[name], 'aria-hidden': 'true'});

// ---------- precios: [[etiqueta, precio]] a partir de los formatos que usan las cartas ----------
function variants(p, cols) {
  if (typeof p === 'number') return [['', p]];
  if (Array.isArray(p)) return p.flatMap((v, i) => typeof v === 'number' ? [[(cols?.[i]?.l ?? cols?.[i]) || '', v]] : []);
  if (p && typeof p === 'object') return Object.entries(p).filter(([, v]) => typeof v === 'number');
  return [];
}

// Atributo para el <li>/<tr> de cada plato: Pedido.attr(nombre, precio, {d: descripción, cols, img})
function attr(name, p, o = {}) {
  const data = {n: plain(String(name)), v: variants(p, o.cols)};
  if (o.d) data.d = plain(String(o.d));
  if (o.img) data.i = o.img;
  return ` data-pd="${escAttr(JSON.stringify(data))}"`;
}

// ---------- estado del pedido (queda guardado en el dispositivo por unas horas) ----------
const store = {lines: {}, mode: 'none', note: ''}; // mode: none · chosen (eligió salón) · done (tocó "Listo")
const subs = new Set();
const TTL = 8 * 3600e3;
let KEY = 'pedido:' + location.pathname;
let opts = {};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object' || (raw.t && Date.now() - raw.t > TTL)) return;
    for (const [k, l] of Object.entries(raw.lines || {}))
      if (l && typeof l.n === 'string' && Number.isFinite(l.p) && Number.isInteger(l.q) && l.q > 0) store.lines[k] = l;
    const any = Object.keys(store.lines).length;
    store.mode = ['chosen', 'done'].includes(raw.mode) && any ? raw.mode : 'none';
    store.note = any && typeof raw.note === 'string' ? raw.note.slice(0, 240) : '';
  } catch {}
}
function save() { try { localStorage.setItem(KEY, JSON.stringify({...store, t: Date.now()})); } catch {} }
function emit() { save(); [...subs].forEach(fn => fn()); }

const lineKey = (sec, n, label, p) => [sec, n, label || p].join('|');
const qtyOf = key => store.lines[key]?.q || 0;
const settle = () => { if (!Object.keys(store.lines).length) { store.mode = 'none'; store.note = ''; } };
function bump(info, [label, p], d) {
  const key = lineKey(info.sec, info.n, label, p), cur = store.lines[key];
  const q = (cur?.q || 0) + d;
  if (q <= 0) delete store.lines[key];
  else store.lines[key] = {n: info.n, s: info.sec, o: cur?.o ?? info.order, l: label, p, q};
  settle(); emit();
}
const bumpLine = (key, d) => {
  const l = store.lines[key]; if (!l) return;
  l.q += d; if (l.q <= 0) delete store.lines[key];
  settle(); emit();
};
function clearAll() {
  const snap = JSON.stringify(store);
  store.lines = {}; settle(); emit();
  toast(T.cleared, T.undo, () => { Object.assign(store, JSON.parse(snap)); emit(); });
}
const sorted = () => Object.entries(store.lines).sort(([, a], [, b]) => (a.o ?? 0) - (b.o ?? 0));
const count = () => Object.values(store.lines).reduce((s, l) => s + l.q, 0);
const total = () => Object.values(store.lines).reduce((s, l) => s + l.q * l.p, 0);
const lineName = l => l.l ? `${l.n} · ${l.l}` : l.n;

// ---------- aviso breve (con "Deshacer") ----------
let toastEl, toastT;
function toast(msg, action, fn) {
  toastEl?.remove(); clearTimeout(toastT);
  const el = toastEl = h('div', {class: 'pd-toast', role: 'status'}, h('span', {}, msg),
    action && h('button', {type: 'button', onclick: () => { el.remove(); fn(); }}, action));
  document.body.append(el);
  toastT = setTimeout(() => el.remove(), 5500);
}

// ---------- ventanas ----------
// Cada ventana suma una entrada al historial: el botón "atrás" del teléfono la cierra en vez de salir de la carta.
const stack = [];
let skipPop = 0, viaKey = false;
addEventListener('keydown', () => { viaKey = true; }, true);
addEventListener('pointerdown', () => { viaKey = false; }, true);
addEventListener('popstate', () => { if (skipPop) { skipPop--; return; } stack[stack.length - 1]?.close(true); });

function modal(render, {label} = {}) {
  const prev = document.activeElement;
  const box = h('div', {class: 'pd-box', role: 'dialog', 'aria-modal': 'true', 'aria-label': label || null, tabindex: '-1'});
  const ov = h('div', {class: 'pd-ov'}, box);
  let closed = false, dragged = false;
  const api = {
    close(fromPop) {
      if (closed) return; closed = true;
      subs.delete(api.paint); document.removeEventListener('keydown', onKey, true);
      const at = stack.indexOf(api); if (at >= 0) stack.splice(at, 1);
      if (fromPop !== true) { skipPop++; history.back(); }
      const end = () => { ov.remove(); if (!stack.length) document.body.classList.remove('pd-lock'); };
      if (calm()) end();
      else { ov.classList.add('pd-out'); box.style.transition = ''; box.style.transform = `translateY(${dragged ? '100%' : '36px'})`; setTimeout(end, 200); }
      prev?.focus?.({preventScroll: true});
    },
    paint() {
      const sc = box.querySelector('.pd-scroll'), y = sc ? sc.scrollTop : 0;
      const k = box.contains(document.activeElement) ? document.activeElement.closest('[data-k]')?.dataset.k : null;
      box.replaceChildren(h('div', {class: 'pd-grip', 'aria-hidden': 'true'}), render(api));
      const sc2 = box.querySelector('.pd-scroll'); if (sc2) sc2.scrollTop = y;
      if (k) {
        const find = key => [...box.querySelectorAll('[data-k]')].find(e => e.dataset.k === key);
        (find(k) || find(k.replace(/^less\|/, 'more|')) || box.querySelector('[data-first]') || box).focus({preventScroll: true});
      }
    },
  };
  const onKey = e => {
    if (stack[stack.length - 1] !== api) return;
    if (e.key === 'Escape') { e.stopPropagation(); api.close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...box.querySelectorAll('button:not([disabled]), textarea, a[href]')]; if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  ov.addEventListener('mousedown', e => { if (e.target === ov) api.close(); });
  document.addEventListener('keydown', onKey, true);

  // arrastrar la hoja hacia abajo (desde el borde superior) la cierra
  let y0 = null, dy = 0, t0 = 0;
  box.addEventListener('touchstart', e => {
    if (e.target.closest('button, textarea, a')) return;
    const sc = e.target.closest('.pd-scroll');
    if (sc && sc.scrollTop > 0) return; // el contenido todavía tiene para subir
    y0 = e.touches[0].clientY; dy = 0; t0 = Date.now();
  }, {passive: true});
  box.addEventListener('touchmove', e => {
    if (y0 == null) return;
    const d = e.touches[0].clientY - y0;
    if (d < -4 && !dy) { y0 = null; return; } // gesto hacia arriba: es scroll, no arrastre
    if (d < 8 && !dy) return;
    dy = Math.max(1, d); box.style.transition = 'none'; box.style.transform = `translateY(${dy}px)`;
  }, {passive: true});
  const drop = () => {
    if (y0 == null) return; y0 = null; box.style.transition = '';
    if (dy > 110 || (dy > 36 && dy / (Date.now() - t0) > .55)) { dragged = true; api.close(); } else box.style.transform = '';
    dy = 0;
  };
  box.addEventListener('touchend', drop); box.addEventListener('touchcancel', drop);

  api.paint(); subs.add(api.paint);
  document.body.append(ov); document.body.classList.add('pd-lock');
  stack.push(api); history.pushState({pd: stack.length}, '');
  ((viaKey && box.querySelector('[data-first]')) || box).focus({preventScroll: true});
  return api;
}

const stepper = (name, q, onLess, onMore, k, bin) => h('span', {class: 'pd-ctl', role: 'group', 'aria-label': 'Cantidad: ' + name, style: 'margin:0'},
  h('button', {class: 'pd-b', type: 'button', 'aria-label': T.less(name), 'data-k': k ? 'less|' + k : null, onclick: () => onLess(), html: bin && q === 1 ? ICON.trash : ICON.minus}),
  h('span', {class: 'pd-n', 'aria-live': 'polite'}, String(q)),
  h('button', {class: 'pd-b', type: 'button', 'aria-label': T.more(name), 'data-k': k ? 'more|' + k : null, onclick: () => { buzz(); onMore(); }, html: ICON.plus}));

const closeBtn = (m, cls) => h('button', {class: 'pd-x' + (cls ? ' ' + cls : ''), type: 'button', 'aria-label': T.close, onclick: () => m.close(), html: ICON.x});

// líneas agrupadas por sección, en el orden de la carta
function groups() {
  const out = [];
  for (const [key, l] of sorted()) {
    let g = out.find(x => x.s === l.s);
    if (!g) out.push(g = {s: l.s, lines: []});
    g.lines.push([key, l]);
  }
  return out;
}

// ---------- hoja "Mi pedido" ----------
let view = 'list';
function openOrder() {
  view = store.mode === 'none' ? 'list' : 'dine';
  modal(m => !count() ? emptyView(m) : view === 'dine' ? dineView(m) : listView(m), {label: T.title});
}
function header(m, title, hint, back) {
  return h('div', {class: 'pd-hd'},
    h('div', {class: 'pd-tt'}, back && h('button', {class: 'pd-x', type: 'button', 'aria-label': T.back, onclick: back, html: ICON.back}),
      h('div', {}, h('h2', {}, title), hint && h('p', {}, hint))),
    closeBtn(m));
}
const totalRow = () => h('p', {class: 'pd-tot'}, h('span', {}, T.total, h('small', {}, T.items(count()))), h('b', {}, fmt(total())));

function emptyView(m) {
  return h('div', {class: 'pd-view'},
    header(m, T.title),
    h('div', {class: 'pd-empty'}, icon('bag'), h('b', {}, T.empty), h('p', {}, T.emptyHint)),
    h('div', {class: 'pd-ft'}, h('button', {class: 'pd-main', type: 'button', 'data-first': true, onclick: () => m.close()}, T.seeMenu)));
}
function listView(m) {
  const note = h('textarea', {class: 'pd-note', rows: '2', maxlength: '240', placeholder: T.notePh, 'aria-label': T.note, 'data-k': 'note'});
  note.value = store.note;
  note.addEventListener('input', () => { store.note = note.value; save(); }); // sin emit(): no se redibuja mientras se escribe
  return h('div', {class: 'pd-view'},
    header(m, T.title, T.hint),
    h('div', {class: 'pd-scroll'},
      h('div', {class: 'pd-body'}, groups().map(g => h('div', {class: 'pd-grp'}, h('h3', {class: 'pd-eyebrow'}, g.s),
        g.lines.map(([key, l]) => h('div', {class: 'pd-ln'},
          h('div', {class: 'pd-lt'}, h('h4', {}, lineName(l)), h('small', {}, fmt(l.p * l.q), l.q > 1 ? ` · ${fmt(l.p)} ${T.each}` : '')),
          stepper(lineName(l), l.q, () => bumpLine(key, -1), () => bumpLine(key, 1), key, true))))),
        h('label', {class: 'pd-nt'}, h('span', {class: 'pd-eyebrow'}, T.note), note),
        h('button', {class: 'pd-link', type: 'button', 'data-k': 'clear', onclick: clearAll}, icon('trash'), T.clear))),
    h('div', {class: 'pd-ft'}, totalRow(),
      h('button', {class: 'pd-main', type: 'button', 'data-first': true, 'data-k': 'main', onclick: () => { store.note = store.note.trim(); store.mode = 'chosen'; view = 'dine'; emit(); }}, T.make)));
}
function orderText() {
  const rows = groups().flatMap(g => g.lines.map(([, l]) => `• ${l.q}× ${lineName(l)} — ${fmt(l.p * l.q)}`));
  return [T.waHi, '', ...rows, '', `${T.total}: ${fmt(total())}`, store.note && `${T.note}: ${store.note}`].filter(x => x !== false && x != null).join('\n');
}
function dineView(m) {
  const edit = () => { store.mode = 'none'; view = 'list'; emit(); };
  const wa = String(opts.whatsapp || '').replace(/\D/g, '');
  return h('div', {class: 'pd-view pd-dine'},
    header(m, T.dine, T.show, edit),
    h('div', {class: 'pd-scroll'},
      h('div', {class: 'pd-body'}, groups().map(g => h('div', {class: 'pd-grp'}, h('h3', {class: 'pd-eyebrow'}, g.s),
        g.lines.map(([, l]) => h('div', {class: 'pd-ln'},
          h('span', {class: 'pd-q'}, String(l.q)), h('h4', {}, lineName(l)), h('span', {class: 'pd-p'}, fmt(l.p * l.q)))))),
        store.note && h('div', {class: 'pd-said'}, h('span', {class: 'pd-eyebrow'}, T.note), h('p', {}, store.note)))),
    h('div', {class: 'pd-ft'}, totalRow(),
      wa && h('a', {class: 'pd-main pd-wa', href: `https://wa.me/${wa}?text=${encodeURIComponent(orderText())}`, target: '_blank', rel: 'noopener'}, icon('wa'), T.wa),
      store.mode !== 'done' && h('button', {class: wa ? 'pd-ghost' : 'pd-main', type: 'button', 'data-first': true, onclick: () => { store.mode = 'done'; emit(); m.close(); }}, T.done),
      h('button', {class: 'pd-ghost', type: 'button', 'data-first': store.mode === 'done' || null, onclick: edit}, T.edit)));
}

// ---------- diálogo del plato: foto, descripción y cantidades ----------
// Las fotos recortadas (con fondo transparente) se muestran enteras sobre el color de la marca.
function fitPic(img) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 12;
    const g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(img, 0, 0, 12, 12);
    const a = g.getImageData(0, 0, 12, 12).data;
    if ([0, 11, 132, 143].some(i => a[i * 4 + 3] < 200)) img.parentNode.classList.add('pd-cut');
  } catch {}
}
function openProduct(info) {
  modal(m => {
    const one = info.v.length === 1 ? info.v[0] : null;
    const keyOf = v => lineKey(info.sec, info.n, v[0], v[1]);
    const any = info.v.some(v => qtyOf(keyOf(v)));
    let actions;
    if (one) {
      const q = qtyOf(keyOf(one));
      actions = q === 0
        ? h('button', {class: 'pd-main', type: 'button', 'data-first': true, 'data-k': 'more|' + keyOf(one), onclick: () => { buzz(); bump(info, one, 1); }}, T.addOrder, h('span', {class: 'pd-sep'}, fmt(one[1])))
        : [h('div', {class: 'pd-inyour'}, h('span', {class: 'pd-lbl'}, T.inOrder), stepper(info.n, q, () => bump(info, one, -1), () => bump(info, one, 1), keyOf(one))),
           h('button', {class: 'pd-main', type: 'button', 'data-first': true, onclick: () => m.close()}, T.done)];
    } else if (info.v.length) actions = [
      h('p', {class: 'pd-pick'}, T.pickText),
      h('div', {class: 'pd-opts', role: 'group', 'aria-label': T.pickText}, info.v.map(v => {
        const k = keyOf(v), q = qtyOf(k), name = `${info.n} ${v[0]}`.trim();
        const add = () => { buzz(); bump(info, v, 1); };
        return h('div', {class: 'pd-opt' + (q ? ' pd-sel' : ''), onclick: q ? null : add},
          h('span', {class: 'pd-ol'}, v[0] || fmt(v[1]), v[0] ? h('em', {}, fmt(v[1])) : null),
          q ? stepper(name, q, () => bump(info, v, -1), () => bump(info, v, 1), k)
            : h('button', {class: 'pd-b pd-on', type: 'button', 'aria-label': `${T.add(name)}, ${fmt(v[1])}`, 'data-k': 'more|' + k, html: ICON.plus, onclick: e => { e.stopPropagation(); add(); }}));
      })),
      h('button', {class: any ? 'pd-main' : 'pd-ghost', type: 'button', 'data-first': true, onclick: () => m.close()}, any ? T.done : T.close)];
    else actions = [h('p', {class: 'pd-askp'}, T.ask), h('button', {class: 'pd-main', type: 'button', 'data-first': true, onclick: () => m.close()}, T.close)];
    const img = info.i && h('img', {src: info.i, alt: '', onload: e => fitPic(e.target)});
    return h('div', {class: 'pd-view'},
      img && h('div', {class: 'pd-pic'}, img, closeBtn(m)),
      h('div', {class: 'pd-scroll'},
        h('div', {class: 'pd-info' + (img ? '' : ' pd-nopic')},
          !img && closeBtn(m, 'pd-flo'), h('p', {class: 'pd-eyebrow'}, info.sec),
          h('div', {class: 'pd-top'}, h('h2', {}, info.n), one && h('span', {class: 'pd-price'}, fmt(one[1]))),
          info.d && h('p', {class: 'pd-desc'}, info.d), actions)));
  }, {label: info.n});
}

// ---------- platos: + / − al lado del precio ----------
let sections = [];
function infoOf(el, data) {
  const secEl = el.closest('section');
  return {n: data.n, d: data.d, i: data.i, v: data.v, sec: plain(secEl?.querySelector('h2')?.textContent || '') || 'Carta', order: Math.max(0, sections.indexOf(secEl))};
}
function setupItem(el) {
  el.dataset.pdReady = '1';
  let data; try { data = JSON.parse(el.dataset.pd); } catch { return; }
  const info = infoOf(el, data);
  if (!info.v.length) return; // sin precio ("consultar"): solo abre el detalle
  const keyOf = v => lineKey(info.sec, info.n, v[0], v[1]);
  // Si la carta ya muestra cada precio como tarjeta (data-pd-v="n"), cada tarjeta es el botón de esa variante.
  const chips = [...el.querySelectorAll('[data-pd-v]')];
  if (chips.length) {
    for (const c of chips) {
      const v = info.v[+c.dataset.pdV]; if (!v) continue;
      const cnt = h('span', {class: 'pd-cnt'}), name = `${info.n} ${v[0]}`.trim();
      c.classList.add('pd-chip'); c.setAttribute('role', 'button'); c.tabIndex = 0; c.append(cnt);
      const add = e => { e.stopPropagation(); buzz(); bump(info, v, 1); };
      c.addEventListener('click', add);
      c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); add(e); } });
      let last = -1;
      const paint = () => {
        if (!c.isConnected) { subs.delete(paint); return; }
        const q = qtyOf(keyOf(v)); if (q === last) return;
        cnt.textContent = q; cnt.hidden = !q; c.classList.toggle('pd-sel', !!q);
        c.setAttribute('aria-label', `${T.add(name)}${q ? ` (${q})` : ''}`);
        if (last >= 0 && q) pop(cnt);
        last = q;
      };
      subs.add(paint); paint();
    }
    return;
  }
  const ctl = h('span', {class: 'pd-ctl'});
  // El + va pegado al precio de la carta; data-pd-slot elige otro lugar y data-pd-block fuerza una fila propia.
  const prices = [...el.querySelectorAll('.pr, .v')];
  const own = el.hasAttribute('data-pd-block') || info.v.length > 2; // con 3+ precios no entra al lado
  const slot = el.querySelector('[data-pd-slot]') || (own ? null : prices[prices.length - 1]);
  if (slot) slot.append(ctl); else { ctl.classList.add('pd-block'); el.append(ctl); }
  // en una fila propia, si el plato no muestra su precio al lado, se lo agrega acá
  const lead = () => !slot && info.v.length === 1 && !el.hasAttribute('data-pd-nolabel') ? [h('span', {class: 'pd-pr'}, fmt(info.v[0][1]))] : [];
  const stop = fn => e => { e.stopPropagation(); fn(); };
  let last = null;
  const paint = () => {
    if (!el.isConnected) { subs.delete(paint); return; }
    const qs = info.v.map(v => qtyOf(keyOf(v))), sig = qs.join(), n = qs.reduce((a, b) => a + b, 0);
    if (sig === last) return;
    const first = last === null, had = ctl.contains(document.activeElement);
    last = sig;
    el.classList.toggle('pd-in', n > 0);
    if (info.v.length > 1) {
      ctl.replaceChildren(h('button', {class: 'pd-b pd-on pd-badge', type: 'button', 'data-more': true, 'aria-label': T.pick(info.n) + (n ? ` (${n})` : ''), html: ICON.plus, onclick: stop(() => openProduct(info))},
        n ? h('span', {class: 'pd-cnt'}, String(n)) : null));
    } else {
      const v = info.v[0], q = qs[0];
      // data-pd-compact (filas de tabla): un solo botón de ancho fijo que suma 1 y muestra la cantidad en una insignia
      if (!q || el.hasAttribute('data-pd-compact')) ctl.replaceChildren(...lead(), h('button', {class: 'pd-b pd-on' + (q ? ' pd-badge' : ''), type: 'button', 'data-more': true, 'aria-label': T.add(info.n) + (q ? ` (${q})` : ''), html: ICON.plus, onclick: stop(() => { buzz(); bump(info, v, 1); })},
        q ? h('span', {class: 'pd-cnt'}, String(q)) : null));
      else ctl.replaceChildren(...lead(), h('button', {class: 'pd-b', type: 'button', 'aria-label': T.less(info.n), html: ICON.minus, onclick: stop(() => bump(info, v, -1))}),
        h('span', {class: 'pd-n', 'aria-live': 'polite'}, String(q)),
        h('button', {class: 'pd-b', type: 'button', 'data-more': true, 'aria-label': T.more(info.n), html: ICON.plus, onclick: stop(() => { buzz(); bump(info, v, 1); })}));
    }
    if (had) ctl.querySelector('[data-more]')?.focus({preventScroll: true});
    if (!first && n) pop(ctl.querySelector('.pd-n, .pd-cnt'));
  };
  ctl.addEventListener('click', e => e.stopPropagation());
  paint(); subs.add(paint);
}
function bindOpen(el) {
  if (el.dataset.pdOpen) return; el.dataset.pdOpen = '1';
  el.addEventListener('click', e => {
    if (e.target.closest('.pd-ctl, a, button') || getSelection()?.toString()) return;
    let data; try { data = JSON.parse(el.dataset.pd); } catch { return; }
    openProduct(infoOf(el, data));
  });
}

// ---------- barra fija: "Ver pedido" + acceso al buscador ----------
let dock, barBtn, fab, lastN = 0;
function paintBar() {
  const n = count(), done = store.mode === 'done', label = done ? T.ready : T.view;
  barBtn.hidden = !n;
  document.body.style.paddingBottom = n ? '92px' : '';
  if (!n) { lastN = 0; return; }
  barBtn.setAttribute('aria-label', `${label}: ${T.items(n)}, ${fmt(total())}`);
  barBtn.replaceChildren(
    h('span', {class: 'pd-c' + (lastN && n !== lastN ? ' pd-pop' : '')}, done ? icon('check') : String(n)),
    h('span', {class: 'pd-lt'}, label),
    h('span', {class: 'pd-t'}, fmt(total())), icon('chev', 'pd-go'));
  lastN = n;
}

// ---------- buscador ----------
function setupSearch(root, o) {
  if (o.search === false) return;
  const input = h('input', {type: 'search', placeholder: T.search, 'aria-label': T.searchLabel, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'search'});
  const wipe = () => { input.value = ''; input.dispatchEvent(new Event('input', {bubbles: true})); }; // con evento: la carta puede reaccionar
  const clear = h('button', {class: 'pd-sx', type: 'button', 'aria-label': T.clearSearch, hidden: true, html: ICON.x, onclick: () => { wipe(); input.focus(); }});
  const tally = h('p', {class: 'pd-sr', 'aria-live': 'polite', hidden: true});
  const box = h('div', {class: 'pd-search', role: 'search'}, h('div', {class: 'pd-sf'}, h('label', {}, icon('search'), input), clear), tally);
  const noneMsg = h('span', {});
  const none = h('div', {class: 'pd-none', hidden: true}, icon('search'), noneMsg, h('button', {class: 'pd-ghost', type: 'button', onclick: () => { wipe(); input.focus(); }}, T.clearSearch));
  (o.searchBefore ? document.querySelector(o.searchBefore) : root).before(box);
  root.after(none);

  const hiddenByMe = new Set();
  const hide = el => { if (!el.hidden) { el.hidden = true; hiddenByMe.add(el); } };
  // resaltado de coincidencias sin tocar el DOM (CSS Custom Highlight API, donde exista)
  const canMark = typeof Highlight === 'function' && !!CSS.highlights;
  function mark(els, term) {
    if (!canMark) return;
    const ranges = [];
    for (const el of els.slice(0, 80)) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node; (node = walker.nextNode());) {
        if (node.parentElement.closest('.pd-ctl')) continue;
        const txt = [...node.data].map(ch => { const c = norm(ch); return c.length === 1 ? c : ch.length === 1 ? ' ' : ch; }).join('');
        if (txt.length !== node.data.length) continue;
        for (let i = txt.indexOf(term); i >= 0; i = txt.indexOf(term, i + term.length)) {
          const r = new Range(); r.setStart(node, i); r.setEnd(node, i + term.length); ranges.push(r);
        }
      }
    }
    CSS.highlights.set('pd-hit', new Highlight(...ranges));
  }
  const run = () => {
    const raw = input.value.trim(), term = norm(raw);
    hiddenByMe.forEach(el => { el.hidden = false; }); hiddenByMe.clear();
    if (canMark) CSS.highlights.delete('pd-hit');
    clear.hidden = !input.value;
    root.classList.toggle('pd-searching', !!term);
    if (!term) { tally.hidden = none.hidden = true; return; }
    const hits = [], hitsByName = [];
    root.querySelectorAll('[data-pd]').forEach(el => {
      const own = norm(el.textContent);
      if (own.includes(term)) { hits.push(el); hitsByName.push(el); }
      else if (term.length > 2 && norm(el.closest('section')?.querySelector('h2')?.textContent || '').includes(term)) hits.push(el);
      else hide(el);
    });
    // bloques que se quedaron sin platos a la vista: los que la carta declara y cualquier envoltorio intermedio
    root.querySelectorAll(o.containers || 'section, .group, .grp, .board, .items, .cols, .grid').forEach(c => {
      if (!c.querySelector('[data-pd]:not([hidden])')) hide(c);
    });
    for (const el of [...hiddenByMe]) for (let p = el.parentElement; p && p !== root && root.contains(p); p = p.parentElement) {
      if (p.hidden || p.querySelector('[data-pd]:not([hidden])')) break;
      hide(p);
    }
    [...root.children].forEach(c => { if (!c.matches('[data-pd]') && !c.querySelector('[data-pd]')) hide(c); });
    tally.hidden = !hits.length; tally.textContent = T.results(hits.length);
    // buscador fijo arriba (o carta ya desplazada): los resultados arrancan a la vista
    if (root.getBoundingClientRect().top < -40) root.scrollIntoView({block: 'start'});
    none.hidden = !!hits.length; noneMsg.textContent = T.none(raw);
    mark(hitsByName, term);
  };
  input.addEventListener('input', run);
  input.addEventListener('keydown', e => { if (e.key === 'Escape' && input.value) { e.stopPropagation(); wipe(); } else if (e.key === 'Enter') input.blur(); });
  // "/" enfoca el buscador (teclado físico)
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || stack.length || /^(input|textarea|select)$/i.test(document.activeElement?.tagName || '')) return;
    e.preventDefault(); input.focus();
  });
  // botón flotante que vuelve al buscador cuando quedó fuera de la pantalla
  fab = h('button', {class: 'pd-fab', type: 'button', 'aria-label': T.searchLabel, hidden: true, html: ICON.search, onclick: () => {
    input.focus({preventScroll: true});
    box.scrollIntoView({block: 'center', behavior: calm() ? 'auto' : 'smooth'});
  }});
  dock.append(fab);
  new IntersectionObserver(([e]) => { fab.hidden = e.isIntersecting || e.boundingClientRect.top > 0; }).observe(box);
  return run;
}

// ---------- lista de secciones: borde difuminado donde hay más para deslizar ----------
function setupNav(sel) {
  const ul = document.querySelector(sel || '#nav'); if (!ul) return;
  const upd = () => {
    const max = ul.scrollWidth - ul.clientWidth;
    ul.classList.toggle('pd-fl', ul.scrollLeft > 6); ul.classList.toggle('pd-fr', ul.scrollLeft < max - 6);
  };
  ul.addEventListener('scroll', upd, {passive: true});
  addEventListener('resize', upd, {passive: true});
  if (document.fonts?.ready) document.fonts.ready.then(upd);
  upd();
  return upd;
}

// ---------- pedido de ejemplo ----------
// Demo: al abrir la carta el pedido ya tiene 1 o 2 platos (el primero de la carta y otro de una sección distinta),
// para que se vea la barra "Ver pedido". Se puede desactivar con seed:false o elegir platos con seed:['Nombre', ...].
let seeded = false;
function seedOrder(root, o) {
  if (seeded || o.seed === false) return;
  const cands = [...root.querySelectorAll('[data-pd]')].flatMap(el => {
    let d; try { d = JSON.parse(el.dataset.pd); } catch { return []; }
    if (!d.v.length) return [];
    const secEl = el.closest('section');
    return [{d, sec: plain(secEl?.querySelector('h2')?.textContent || '') || 'Carta', order: Math.max(0, sections.indexOf(secEl))}];
  });
  if (!cands.length) return; // la carta todavía no se dibujó (pestañas): se reintenta en el próximo escaneo
  seeded = true;
  let pick;
  if (Array.isArray(o.seed)) pick = o.seed.map(n => cands.find(c => norm(c.d.n) === norm(n))).filter(Boolean);
  else {
    const first = cands[0];
    const second = cands.find((c, i) => i >= Math.floor(cands.length * .35) && c.sec !== first.sec) || cands.find(c => c !== first);
    pick = [first, second].filter(Boolean);
  }
  store.lines = {}; store.mode = 'none'; store.note = '';
  for (const c of pick) {
    const [label, p] = c.d.v[0];
    store.lines[lineKey(c.sec, c.d.n, label, p)] = {n: c.d.n, s: c.sec, o: c.order, l: label, p, q: 1};
  }
  emit();
}

// ---------- arranque ----------
function init(o = {}) {
  opts = o;
  const th = o.theme || {}, map = {btn: 'btn', btnFg: 'btn-fg', bg: 'bg', fg: 'fg', mute: 'mute', line: 'line', price: 'price', font: 'font', head: 'head', field: 'field', radius: 'r', sheet: 'R'};
  for (const [k, v] of Object.entries(th)) if (map[k]) document.documentElement.style.setProperty('--pd-' + map[k], v);
  if (o.key) KEY = 'pedido:' + o.key;
  if (o.pickText) T.pickText = o.pickText;
  if (o.searchText) T.search = o.searchText;
  if (Array.isArray(o.unit)) T.items = n => `${n} ${o.unit[n === 1 ? 0 : 1]}`;
  const root = document.querySelector(o.root || '#menu') || document.querySelector('main');
  load();
  barBtn = h('button', {class: 'pd-bar', type: 'button', hidden: true, onclick: openOrder});
  dock = h('div', {class: 'pd-dock'}, barBtn);
  document.body.append(dock);
  subs.add(paintBar);
  const rerunSearch = setupSearch(root, o);
  const navFade = setupNav(o.nav);
  const scan = () => {
    sections = [...document.querySelectorAll('section')];
    root.querySelectorAll('[data-pd]:not([data-pd-ready])').forEach(el => { setupItem(el); });
    root.querySelectorAll('[data-pd]').forEach(bindOpen);
    seedOrder(root, o);
    paintBar(); rerunSearch?.(); navFade?.();
  };
  scan();
  // algunas cartas vuelven a dibujar el menú (pestañas): se agregan los controles a lo nuevo
  let queued = false;
  new MutationObserver(() => { if (queued) return; queued = true; setTimeout(() => { queued = false; scan(); }, 30); })
    .observe(root, {childList: true, subtree: true});
}

window.Pedido = {init, attr, open: openOrder};
})();
