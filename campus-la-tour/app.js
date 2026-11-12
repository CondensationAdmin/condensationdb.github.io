(() => {
  'use strict';
  const G = window.CAMPUS_GEO;
  const ANNUAIRE = window.ANNUAIRE || [];
  const $ = (id) => document.getElementById(id);

  // ------------------------------------------------------------------ helpers
  const COS = Math.cos(46.229 * Math.PI / 180);
  const dist = (a, b) => Math.hypot((a[0] - b[0]) * 111320, (a[1] - b[1]) * 111320 * COS);
  const centroid = (poly) => {
    const closed = poly.length > 3 && poly[0][0] === poly[poly.length - 1][0] && poly[0][1] === poly[poly.length - 1][1];
    const pts = closed ? poly.slice(0, -1) : poly;
    return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  };
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const WALK_M_PER_MIN = 65; // ~4 km/h : rythme d'un patient, pas d'un sportif
  const CAMPUS_CENTER = [46.2292, 6.0660];
  const CAMPUS_RADIUS = 700; // au-delà : « vous n'êtes pas encore sur le campus »

  // -------------------------------------------------------------- destinations
  const P1_RULE = "Courte durée. Jusqu'au 2e semestre 2028, réservé à : dépose hospitalisation, oncologie-chimiothérapie, radiothérapie, urgences pédiatriques, urgences maternité et personnes à mobilité réduite.";
  const DEST = {
    P4:  { chip: 'P4',  small: 'Principal', kind: 'park', name: 'Parking P4', sub: 'Parking principal', target: centroid(G.parkings.P4),
           notes: [{ cls: 'shuttle', html: "Navette : l'arrêt est au bord du P4, côté rue de Veyrot. Elle vous dépose à l'arrêt P1, devant le B1." }] },
    P11: { chip: 'P11', small: 'Parking', kind: 'park', name: 'Parking P11', sub: 'Devant le B11', target: centroid(G.parkings.P11),
           notes: [{ html: 'Environ 200 m à pied jusqu’au B1.' }] },
    P1:  { chip: 'P1',  small: 'Courte durée', kind: 'park', name: 'Parking P1', sub: 'Courte durée, usage réservé', target: centroid(G.parkings.P1),
           notes: [{ cls: 'warn', html: P1_RULE }] },
    URG: { chip: 'Urgences', small: '24h/24', kind: 'urg', name: 'Urgences', sub: 'Bâtiment B1 · ouvert 24h/24', target: [46.2293708, 6.0672720],
           notes: [{ cls: 'warn', html: 'Urgence vitale : appelez le <b>144</b>.' }] },
    URG_PED: { kind: 'urg', name: 'Urgences pédiatriques', sub: 'Bâtiment B1', target: [46.2288645, 6.0674118],
           notes: [{ html: 'Parking P1 réservé aux urgences pédiatriques, à côté.' }] },
    B1:  { chip: 'B1',  small: 'Bâtiment', name: 'Bâtiment B1', sub: 'Entrée principale', target: [46.2289245, 6.0675340] },
    B2:  { chip: 'B2',  small: 'Bâtiment', name: 'Bâtiment B2', sub: 'Entrée principale', target: [46.2282576, 6.0668843] },
    B11: { chip: 'B11', small: 'Bâtiment', name: 'Bâtiment B11', sub: 'Physiothérapie', target: [46.2301327, 6.0646141] }, // façade côté P11 (le repère Google est côté route de Meyrin)
    B12: { chip: 'B12', small: 'Bâtiment', name: 'Bâtiment B12', sub: 'Entrée principale', target: [46.2283833, 6.0687251],
           notes: [{ html: 'Parking souterrain sous le B12 pour les consultations de ce bâtiment.' }] },
    JDM1:  { name: 'Bâtiment JDM 1 / 1 bis', sub: 'Av. J.-D. Maillard 1 et 1 bis', target: [46.2294279, 6.0679042] },
    JDM9:  { name: 'Bâtiment JDM 9', sub: 'Av. J.-D. Maillard 9', target: centroid(G.buildings.JDM9) },
    JDM11: { name: 'Bâtiment JDM 11', sub: 'Av. J.-D. Maillard 11', target: centroid(G.buildings.JDM11) },
  };
  // Photos des bâtiments (tap sur le bâtiment ou la vignette). Remplacer par des photos dont l'hôpital détient les droits.
  const PHOTOS = {
    B1: 'https://www.la-tour.ch/sites/default/files/styles/large/public/pages_etablissement/Hopital_de_La_Tour.jpg?itok=26BVrF6p',
    B2: 'https://img.rts.ch/articles/2024/image/90tm3r-28622980.image?w=1280&h=960',
    B11: 'https://www.la-tour.ch/sites/default/files/styles/large/public/2022-06/B11-juin-2022-3.png?itok=sCZHMrfW',
  };
  const photoKey = (k) => (k === 'URG' || k === 'URG_PED') ? 'B1' : k;
  const SHORT = (k) => k.startsWith('URG') ? 'B1' : k.startsWith('JDM') ? 'JDM ' + k.slice(3) : k;
  const CHIP_ORDER = ['P4', 'P11', 'P1', 'URG', 'B1', 'B2', 'B11', 'B12'];
  const START_CHOICES = [
    { key: 'P4', label: 'P4' }, { key: 'P11', label: 'P11' }, { key: 'P1', label: 'P1' },
    { key: 'TPG', label: 'Bus Maillard', at: [46.22862, 6.06512] },
    { key: 'B1', label: 'B1' }, { key: 'B2', label: 'B2' }, { key: 'B11', label: 'B11' }, { key: 'B12', label: 'B12' },
  ];
  const SHUTTLE_DESTS = new Set(['B1', 'B2', 'B12', 'P1', 'URG', 'URG_PED']);

  // ---------------------------------------------------------------- graph
  const N = G.graph.nodes;
  const ADJ = N.map(() => []);
  for (const [a, b, len, cost, steps] of G.graph.edges) {
    ADJ[a].push([b, len, cost, steps]);
    ADJ[b].push([a, len, cost, steps]);
  }
  function nearestNode(p) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < N.length; i++) { const d = dist(p, N[i]); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  // Dijkstra with a small binary heap
  function shortest(from, to, avoidSteps) {
    const D = new Float64Array(N.length).fill(Infinity), prev = new Int32Array(N.length).fill(-1);
    const heap = [[0, from]]; D[from] = 0;
    const push = (x) => { heap.push(x); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    while (heap.length) {
      const [d, u] = pop();
      if (u === to) break;
      if (d > D[u]) continue;
      for (const [v, , cost, steps] of ADJ[u]) {
        if (avoidSteps && steps) continue;
        const nd = d + cost;
        if (nd < D[v]) { D[v] = nd; prev[v] = u; push([nd, v]); }
      }
    }
    if (from !== to && prev[to] === -1) return null;
    const path = [to]; while (path[path.length - 1] !== from) path.push(prev[path[path.length - 1]]);
    return path.reverse();
  }
  function walkRoute(start, end, avoidSteps) {
    const a = nearestNode(start), b = nearestNode(end);
    const ids = shortest(a, b, avoidSteps);
    if (!ids) return null;
    const coords = [start, ...ids.map((i) => N[i]), end];
    let len = 0; for (let i = 1; i < coords.length; i++) len += dist(coords[i - 1], coords[i]);
    return { coords, len };
  }

  // ------------------------------------------------------------------ map
  const map = L.map('map', { zoomControl: false, attributionControl: true, minZoom: 15, maxZoom: 20 })
    .setView(CAMPUS_CENTER, 17);
  const swiss = (layer, ext, maxNative) => L.tileLayer(
    `https://wmts.geo.admin.ch/1.0.0/${layer}/default/current/3857/{z}/{x}/{y}.${ext}`,
    { maxNativeZoom: maxNative, maxZoom: 20, attribution: '© swisstopo · © contributeurs OpenStreetMap' });
  const layers = { photo: swiss('ch.swisstopo.swissimage', 'jpeg', 19), plan: swiss('ch.swisstopo.pixelkarte-farbe', 'jpeg', 18) };
  let current = 'photo';
  layers.photo.addTo(map);
  $('btn-layer').addEventListener('click', () => {
    map.removeLayer(layers[current]);
    current = current === 'photo' ? 'plan' : 'photo';
    layers[current].addTo(map).bringToBack();
    $('btn-layer').textContent = current === 'photo' ? 'Plan' : 'Photo';
  });

  const label = (at, html, cls) => L.marker(at, { interactive: true, keyboard: false,
    icon: L.divIcon({ className: 'leaflet-div-icon plain', html: `<span class="lbl ${cls || ''}">${html}</span>`, iconSize: null }) });

  const shapes = {};
  for (const [k, poly] of Object.entries(G.buildings)) {
    shapes[k] = L.polygon(poly, { color: '#ffffff', weight: 2, fillColor: '#344054', fillOpacity: 0.45 }).addTo(map)
      .on('click', () => go(k));
    shapes[k].lbl = label(centroid(poly), SHORT(k), k.startsWith('JDM') ? 'jdm minor' : '').addTo(map).on('click', () => go(k));
  }
  for (const [k, poly] of Object.entries(G.parkings)) {
    shapes[k] = L.polygon(poly, { color: '#ffffff', weight: 2, fillColor: '#1f7a3d', fillOpacity: 0.40, dashArray: '4 4' }).addTo(map)
      .on('click', () => go(k));
    shapes[k].lbl = label(centroid(poly), 'P ' + k.slice(1), 'park').addTo(map).on('click', () => go(k));
  }
  label(DEST.URG.target, 'Urgences', 'urg').addTo(map).on('click', () => go('URG'));

  L.polyline(G.shuttle.line, { color: '#ffffff', weight: 8, opacity: 0.9 }).addTo(map);
  L.polyline(G.shuttle.line, { color: '#f08c00', weight: 5, dashArray: '10 8' }).addTo(map);
  for (const [k, at] of Object.entries(G.shuttle.stops)) label(at, 'Navette ' + k, 'stop minor').addTo(map);
  const zoomClass = () => map.getContainer().classList.toggle('z-lo', map.getZoom() < 18);
  map.on('zoomend', zoomClass); zoomClass();

  // ------------------------------------------------------------ position
  const state = { gps: null, gpsState: 'pending', manualStart: null, dest: null, alts: null, routeAt: null, arrived: false };
  let meMarker = null, accCircle = null, routeLayer = null;

  function setStatus() {
    const el = $('gps-status');
    const s = state.gpsState;
    el.className = 'status' + (s === 'ok' ? ' ok' : s === 'pending' ? '' : ' warn');
    el.textContent = {
      pending: 'Recherche de votre position…',
      ok: `Vous êtes localisé (précision ± ${Math.round(state.gps?.acc || 0)} m)`,
      far: "Vous n'êtes pas encore sur le campus.",
      denied: 'Position non autorisée : choisissez votre point de départ.',
      unavailable: 'Position indisponible : choisissez votre point de départ.',
    }[s];
  }
  function onPos(p) {
    const ll = [p.coords.latitude, p.coords.longitude];
    state.gps = { ll, acc: p.coords.accuracy };
    state.gpsState = dist(ll, CAMPUS_CENTER) > CAMPUS_RADIUS ? 'far' : 'ok';
    if (!meMarker) {
      accCircle = L.circle(ll, { radius: p.coords.accuracy, color: '#1a73e8', weight: 1, fillOpacity: 0.12, interactive: false }).addTo(map);
      meMarker = L.marker(ll, { interactive: false, icon: L.divIcon({ className: 'leaflet-div-icon plain', html: '<div class="me-dot"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }) }).addTo(map);
    } else { meMarker.setLatLng(ll); accCircle.setLatLng(ll).setRadius(p.coords.accuracy); }
    setStatus();
    if (state.dest && !state.manualStart) {
      if (!state.routeAt || dist(state.routeAt, ll) > 8) render(false);
    }
  }
  function onPosErr(e) {
    state.gpsState = e.code === 1 ? 'denied' : 'unavailable';
    setStatus();
    if (state.dest) render(false);
  }
  let watchId = null;
  function startGps() {
    if (!('geolocation' in navigator)) { state.gpsState = 'unavailable'; setStatus(); return; }
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = navigator.geolocation.watchPosition(onPos, onPosErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  }
  $('btn-locate').addEventListener('click', () => {
    if (state.gps && state.gpsState === 'ok') { state.manualStart = null; map.setView(state.gps.ll, 18); if (state.dest) render(true); }
    else if (state.gps) map.setView(state.gps.ll, 15);
    else startGps();
  });

  function startPoint() {
    if (state.manualStart) {
      const c = START_CHOICES.find((s) => s.key === state.manualStart);
      return { ll: c.at || DEST[c.key].target, label: c.label };
    }
    if (state.gps && state.gpsState === 'ok') return { ll: state.gps.ll, label: null };
    return null;
  }

  // ------------------------------------------------------------- routing UI
  const sheetObs = new ResizeObserver(() => document.documentElement.style.setProperty('--sheet-h', $('sheet').offsetHeight + 'px'));
  sheetObs.observe($('sheet'));

  function highlight(key) {
    for (const [k, s] of Object.entries(shapes)) {
      const on = k === key || (key === 'URG' || key === 'URG_PED') && k === 'B1';
      s.setStyle({ weight: on ? 4 : 2, color: on ? '#0b63ce' : '#ffffff' });
      const el = s.lbl.getElement()?.querySelector('.lbl'); if (el) el.classList.toggle('sel', on);
    }
  }

  function go(key, opts = {}) {
    state.dest = key;
    state.alts = opts.alts || null;
    state.title = opts.title || null;
    state.entry = opts.entry || null;
    state.arrived = false;
    $('results').hidden = true;
    render(true);
    const u = new URL(location.href); u.searchParams.set('to', key);
    if (opts.title) u.searchParams.set('service', opts.title); else u.searchParams.delete('service');
    history.replaceState(null, '', u);
  }

  function driveUrl(key) {
    const target = key.startsWith('P') ? DEST[key].target : key.startsWith('URG') ? DEST.URG.target : DEST.P4.target;
    return `https://www.google.com/maps/dir/?api=1&destination=${target[0].toFixed(6)},${target[1].toFixed(6)}&travelmode=driving`;
  }

  function render(fit) {
    const key = state.dest, d = DEST[key];
    $('view-home').hidden = true; $('view-route').hidden = false;
    $('route-kicker').textContent = state.title ? d.name : 'Itinéraire à pied';
    $('route-title').textContent = state.title || d.name;
    highlight(key);

    // alternatives (ex. Admission : B1 ou B2)
    const alt = $('route-alt');
    if (state.alts && state.alts.length > 1) {
      alt.hidden = false;
      alt.innerHTML = '<span>Plusieurs lieux possibles :</span>' + state.alts.map((k) =>
        `<button type="button" data-k="${k}" class="${k === key ? 'on' : ''}">${esc(SHORT(k))}</button>`).join('');
      alt.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => go(b.dataset.k, { alts: state.alts, title: state.title, entry: state.entry })));
    } else alt.hidden = true;

    const notes = [];
    const e = state.entry;
    if (e) {
      const where = [SHORT(key), e.batiments.length > 1 ? null : e.etage].filter(Boolean).join(' · ');
      notes.push({ cls: 'where', html: `<b>${esc(e.type === 'medecin' ? e.service || 'Consultation' : 'Rendez-vous')}</b> : ${esc(where)}${e.batiments.length > 1 && e.etage ? ' · ' + esc(e.etage) : ''}` });
      if (e.note) notes.push({ cls: e.batiments.length ? '' : 'warn', html: esc(e.note) });
      const links = [];
      if (e.plan) links.push(`<a href="${esc(e.plan)}" target="_blank" rel="noopener">Plan d’accès détaillé (PDF)</a>`);
      if (e.url) links.push(`<a href="${esc(e.url)}" target="_blank" rel="noopener">${e.type === 'medecin' ? 'Fiche du médecin' : 'Page du service'}</a>`);
      if (links.length) notes.push({ cls: 'links', html: links.join('') });
    }
    notes.push(...(d.notes || []));
    renderPlace(key);
    const start = startPoint();
    const from = $('route-from');
    const drive = $('btn-drive');
    drive.href = driveUrl(key);
    drive.hidden = !(state.gpsState === 'far' && !state.manualStart);

    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }

    if (!start) {
      from.hidden = false;
      const why = { pending: 'Nous cherchons votre position.', far: "Vous n'êtes pas encore sur le campus.", denied: "La localisation n'est pas autorisée.", unavailable: 'Votre position est indisponible.' }[state.gpsState];
      from.innerHTML = `<p>${why} D’où partez-vous ?</p><div class="row">` +
        START_CHOICES.filter((c) => c.key !== key).map((c) => `<button type="button" data-k="${c.key}">${esc(c.label)}</button>`).join('') + '</div>';
      from.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { state.manualStart = b.dataset.k; render(true); }));
      $('route-stats').innerHTML = '';
      if (state.gpsState === 'far') notes.unshift({ html: 'Le bouton « Y aller en voiture » ouvre l’itinéraire dans votre application de navigation.' });
      setNotes(notes);
      if (fit) fitTo([d.target]);
      return;
    }

    from.hidden = !state.manualStart;
    if (state.manualStart) {
      from.innerHTML = `<p>Départ : <b>${esc(start.label)}</b></p><div class="row"><button type="button" id="use-gps">Utiliser ma position</button></div>`;
      $('use-gps').addEventListener('click', () => { state.manualStart = null; if (!state.gps) startGps(); render(true); });
    }

    const avoid = $('no-steps').checked;
    const r = walkRoute(start.ll, d.target, avoid);
    state.routeAt = start.ll;
    if (!r) { $('route-stats').innerHTML = ''; notes.unshift({ cls: 'warn', html: 'Aucun chemin trouvé.' }); setNotes(notes); return; }

    const remaining = dist(start.ll, d.target);
    if (!state.manualStart && remaining < 25) state.arrived = true;
    const mins = Math.max(1, Math.round(r.len / WALK_M_PER_MIN));
    $('route-stats').innerHTML = state.arrived
      ? ''
      : `<div class="stat"><b>${mins} min</b><span>à pied</span></div><div class="stat"><b>${Math.round(r.len / 10) * 10} m</b><span>distance</span></div>`;
    if (state.arrived) notes.unshift({ cls: 'arrived', html: 'Vous êtes arrivé.' });
    const after = notes.findIndex((n) => n.cls === 'where') + 1; // les notes navette viennent après « Rendez-vous »

    // Suggest the shuttle when starting from P4 towards the B1 / B2 / B12 side.
    const p4c = DEST.P4.target;
    if (SHUTTLE_DESTS.has(key) && dist(start.ll, p4c) < 120 && !state.arrived) {
      const tail = walkRoute(G.shuttle.stops.P1, d.target, avoid);
      const toStop = walkRoute(start.ll, G.shuttle.stops.P4, avoid);
      if (tail && toStop) notes.splice(after, 0, { cls: 'shuttle', html: `<b>Option navette :</b> ${Math.round(toStop.len / 10) * 10} m jusqu’à l’arrêt P4, navette jusqu’à l’arrêt P1, puis ${Math.round(tail.len / 10) * 10} m à pied.` });
    }
    setNotes(notes);

    routeLayer = L.layerGroup([
      L.polyline(r.coords, { color: '#ffffff', weight: 10, opacity: 0.95, lineJoin: 'round' }),
      L.polyline(r.coords, { color: '#0b63ce', weight: 6, lineJoin: 'round' }),
      L.circleMarker(d.target, { radius: 9, color: '#ffffff', weight: 3, fillColor: d.kind === 'urg' ? '#c62828' : '#0b63ce', fillOpacity: 1 }),
      ...(state.manualStart ? [L.circleMarker(start.ll, { radius: 8, color: '#0b63ce', weight: 3, fillColor: '#ffffff', fillOpacity: 1 })] : []),
    ]).addTo(map);
    if (fit) fitTo(r.coords);
  }

  function renderPlace(key) {
    const pk = photoKey(key), url = PHOTOS[pk];
    const ph = $('route-photo');
    if (url) {
      ph.hidden = false;
      ph.innerHTML = `<img src="${esc(url)}" alt="Photo du bâtiment ${esc(SHORT(pk))}" loading="lazy"><span>Agrandir</span>`;
      ph.querySelector('img').onerror = () => { ph.hidden = true; };
      ph.onclick = () => openPhoto(url, SHORT(pk));
    } else ph.hidden = true;
    const inside = ANNUAIRE.filter((x) => x.type === 'service' && x.batiments.some((b) => photoKey(b) === pk));
    const box = $('route-services');
    if (inside.length && !key.startsWith('P')) {
      box.hidden = false;
      box.innerHTML = `<summary>Services dans le ${esc(SHORT(pk))} (${inside.length})</summary><ul>` +
        inside.map((x) => `<li><span>${esc(x.nom)}</span>${x.etage && x.batiments.length === 1 ? `<small>${esc(x.etage)}</small>` : ''}</li>`).join('') + '</ul>';
    } else box.hidden = true;
  }
  function openPhoto(url, name) {
    const lb = $('lightbox');
    lb.querySelector('img').src = url;
    lb.querySelector('img').alt = 'Photo du bâtiment ' + name;
    lb.querySelector('.lb-cap').textContent = 'Bâtiment ' + name;
    lb.hidden = false;
  }
  $('lightbox').addEventListener('click', () => { $('lightbox').hidden = true; });

  function setNotes(list) {
    $('route-notes').innerHTML = list.map((n) => `<li class="${n.cls || ''}">${n.html}</li>`).join('');
  }
  function fitTo(coords) {
    const sheetH = $('sheet').offsetHeight, topH = document.querySelector('.top').offsetHeight;
    const wide = window.innerWidth >= 700;
    const b = L.latLngBounds(coords);
    if (coords.length === 1) { map.setView(coords[0], 18); return; }
    map.fitBounds(b, {
      paddingTopLeft: [wide ? 440 : 24, wide ? 24 : topH + 8],
      paddingBottomRight: [wide ? 24 : 70, wide ? 24 : sheetH + 16],
      maxZoom: 19,
    });
  }

  $('btn-close').addEventListener('click', () => {
    state.dest = null; state.alts = null; state.title = null; state.entry = null;
    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
    highlight(null);
    $('view-route').hidden = true; $('view-home').hidden = false;
    const u = new URL(location.href); u.searchParams.delete('to'); u.searchParams.delete('service'); history.replaceState(null, '', u);
  });
  $('no-steps').addEventListener('change', () => state.dest && render(true));

  // ------------------------------------------------------------------ chips
  $('chips').innerHTML = CHIP_ORDER.map((k) => {
    const d = DEST[k];
    return `<button type="button" class="chip ${d.kind || ''}" data-k="${k}">${esc(d.chip)}<small>${esc(d.small)}</small></button>`;
  }).join('');
  $('chips').querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => go(b.dataset.k)));

  // ----------------------------------------------------------------- search
  // « cardiologue » trouve « Cardiologie » et inversement ; « pédiatrie » trouve les pédiatres, etc.
  const variants = (txt) => norm(txt).split(' ').flatMap((w) => {
    const v = [w];
    if (w.endsWith('ologue')) v.push(w.slice(0, -2) + 'ie');
    if (w.endsWith('ologie')) v.push(w.slice(0, -2) + 'ue');
    if (w.endsWith('iatre')) v.push(w.slice(0, -1) + 'ie');
    if (w.endsWith('iatrie')) v.push(w.slice(0, -2) + 'e');
    if (w === 'chirurgien') v.push('chirurgie');
    if (w === 'anesthesiste') v.push('anesthesie', 'anesthesiologie');
    if (w === 'orthopedique') v.push('orthopedie');
    return v;
  }).join(' ');
  const INDEX = [
    ...ANNUAIRE.map((e) => ({ ...e, hay: variants([e.nom, e.service || '', ...(e.motsCles || [])].join(' ')) })),
    ...['B1', 'B2', 'B11', 'B12', 'JDM1', 'JDM9', 'JDM11'].map((k) => ({ type: 'lieu', nom: DEST[k].name, sub: DEST[k].sub, batiments: [k], hay: norm(`${k} ${SHORT(k)} batiment ${DEST[k].name} ${DEST[k].sub}`) })),
    ...['P4', 'P11', 'P1'].map((k) => ({ type: 'lieu', nom: DEST[k].name, sub: DEST[k].sub, batiments: [k], hay: norm(`${k} parking ${DEST[k].name}`) })),
    { type: 'lieu', nom: 'Navette (arrêt P4)', batiments: ['P4'], hay: 'navette shuttle bus arret p4' },
  ];
  function search(q) {
    const toks = norm(q).split(' ').filter(Boolean);
    if (!toks.length) return [];
    const nq = toks.join(' ');
    return INDEX.map((e) => {
      if (!toks.every((t) => e.hay.includes(t))) return null;
      const n = norm(e.nom);
      const score = n === nq ? 0 : n.startsWith(nq) ? 1 : n.includes(nq) ? 2 : 3;
      return { e, score };
    }).filter(Boolean).sort((a, b) => a.score - b.score || (a.e.type === 'medecin') - (b.e.type === 'medecin') || a.e.nom.localeCompare(b.e.nom, 'fr')).slice(0, 12).map((x) => x.e);
  }
  const badge = (k) => {
    const cls = k.startsWith('URG') ? 'urg' : k.startsWith('P') ? 'park' : k.startsWith('JDM') ? 'jdm' : '';
    return `<span class="badge ${cls}">${esc(SHORT(k))}</span>`;
  };
  function showResults() {
    const q = $('q').value;
    $('q-clear').hidden = !q;
    const list = $('results');
    if (!q.trim()) { list.hidden = true; return; }
    const res = search(q);
    list.hidden = false;
    if (!res.length) { list.innerHTML = '<li class="res-empty">Aucun résultat. Essayez un autre mot, ou demandez à l’accueil.</li>'; return; }
    list.innerHTML = res.map((e, i) => {
      const sub = e.type === 'medecin' ? e.service : e.sub || e.etage || (e.batiments.length > 1 ? 'Plusieurs lieux possibles' : '');
      const badges = e.batiments.length ? e.batiments.map(badge).join('') : '<span class="badge unk">?</span>';
      return `<li role="option"><button type="button" data-i="${i}"><span><span class="res-name">${esc(e.nom)}</span>${sub ? `<span class="res-sub">${esc(sub)}</span>` : ''}</span><span class="badges">${badges}</span></button></li>`;
    }).join('');
    list.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const e = res[+b.dataset.i];
      $('q').blur();
      const bats = e.batiments.length ? e.batiments : ['B1'];
      go(bats[0], { alts: e.batiments, title: e.type === 'lieu' ? null : e.nom, entry: e.type === 'lieu' ? null : e });
    }));
  }
  $('q').addEventListener('input', showResults);
  $('q').addEventListener('focus', showResults);
  $('q').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { const first = $('results').querySelector('button'); if (first) first.click(); }
    if (ev.key === 'Escape') { $('results').hidden = true; $('q').blur(); }
  });
  $('q-clear').addEventListener('click', () => { $('q').value = ''; showResults(); $('q').focus(); });
  map.on('click', () => { $('results').hidden = true; $('q').blur(); });

  // ------------------------------------------------------- deep links / init
  // ?to=B1  ·  ?service=Oncologie  ·  ?q=physio  ·  ?from=P4 (départ imposé, utile sans GPS)
  const params = new URLSearchParams(location.search);
  const from = params.get('from');
  if (from && START_CHOICES.some((c) => c.key === from.toUpperCase())) state.manualStart = from.toUpperCase();
  setStatus();
  // Vue initiale : tout le campus, entre l'en-tête et le panneau du bas
  fitTo([...Object.values(G.buildings).flat(), ...Object.values(G.parkings).flat()]);
  startGps();
  const svc = params.get('service');
  const hit = svc && ANNUAIRE.find((e) => norm(e.nom) === norm(svc));
  const to = (params.get('to') || '').toUpperCase();
  if (hit) go(hit.batiments.includes(to) ? to : (hit.batiments[0] || 'B1'), { alts: hit.batiments, title: hit.nom, entry: hit });
  else if (DEST[to]) go(to);
  else if (params.get('q')) { $('q').value = params.get('q'); showResults(); }
})();
