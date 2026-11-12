"""Extract campus data (buildings, parkings, walking graph, shuttle) from an OSM XML file into data.js."""
import sys, json, math, heapq
import xml.etree.ElementTree as ET

src, out = sys.argv[1], sys.argv[2]
root = ET.parse(src).getroot()
nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in root.iter('node')}
ways = {}
for w in root.iter('way'):
    ways[w.get('id')] = ({t.get('k'): t.get('v') for t in w.iter('tag')}, [x.get('ref') for x in w.iter('nd')])

COS = math.cos(math.radians(46.229))
def dist(a, b):
    return math.hypot((a[0] - b[0]) * 111320, (a[1] - b[1]) * 111320 * COS)
def r6(p):
    return [round(p[0], 6), round(p[1], 6)]
def poly(wid):
    return [r6(nodes[n]) for n in ways[wid][1]]

# --- Walking graph ------------------------------------------------------------
BBOX = (46.2262, 6.0615, 46.2312, 6.0700)  # campus + immediate streets
WALK = {'footway': 1.0, 'pedestrian': 1.0, 'path': 1.0, 'steps': 1.0, 'living_street': 1.0,
        'service': 1.05, 'residential': 1.1, 'unclassified': 1.15, 'tertiary': 1.3,
        'tertiary_link': 1.3, 'secondary': 1.5, 'platform': 1.0, 'cycleway': 1.2, 'track': 1.1}
def inbox(p):
    return BBOX[0] <= p[0] <= BBOX[2] and BBOX[1] <= p[1] <= BBOX[3]

idx, gnodes, edges = {}, [], []
def nid(osm):
    if osm not in idx:
        idx[osm] = len(gnodes); gnodes.append(r6(nodes[osm]))
    return idx[osm]
for wid, (t, nd) in ways.items():
    hw = t.get('highway')
    if hw not in WALK or t.get('foot') == 'no' or t.get('tunnel') == 'yes' or t.get('access') == 'no' and t.get('foot') not in ('yes', 'designated'):
        continue
    for a, b in zip(nd, nd[1:]):
        if a not in nodes or b not in nodes or not (inbox(nodes[a]) or inbox(nodes[b])):
            continue
        L = dist(nodes[a], nodes[b])
        edges.append([nid(a), nid(b), round(L, 1), round(L * WALK[hw], 1), 1 if hw == 'steps' else 0])

# keep the largest connected component only
adj = {}
for e in edges:
    adj.setdefault(e[0], []).append(e[1]); adj.setdefault(e[1], []).append(e[0])
seen, best = set(), []
for s in adj:
    if s in seen: continue
    comp, stack = [], [s]; seen.add(s)
    while stack:
        u = stack.pop(); comp.append(u)
        for v in adj[u]:
            if v not in seen: seen.add(v); stack.append(v)
    if len(comp) > len(best): best = comp
keep = set(best)
remap = {old: i for i, old in enumerate(sorted(keep))}
gn = [gnodes[o] for o in sorted(keep)]
ge = [[remap[a], remap[b], L, c, s] for a, b, L, c, s in edges if a in keep and b in keep]

# --- Shuttle line along the roads (P4 stop -> P1 stop) --------------------------
ROAD = {'unclassified', 'service', 'residential', 'tertiary'}
radj = {}
for wid, (t, nd) in ways.items():
    if t.get('highway') in ROAD and t.get('service') != 'parking_aisle':
        for a, b in zip(nd, nd[1:]):
            if a in nodes and b in nodes:
                L = dist(nodes[a], nodes[b])
                radj.setdefault(a, []).append((b, L)); radj.setdefault(b, []).append((a, L))
_comp = None
def nearest_road(p):
    global _comp
    if _comp is None:
        start = min(radj, key=lambda n: dist(nodes[n], VIA)); _comp = {start}; st = [start]
        while st:
            u = st.pop()
            for v, _ in radj[u]:
                if v not in _comp: _comp.add(v); st.append(v)
    return min(_comp, key=lambda n: dist(nodes[n], p))
def road_path(p, q):
    s, g = nearest_road(p), nearest_road(q)
    D, prev, pq = {s: 0}, {}, [(0, s)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == g: break
        if d > D[u]: continue
        for v, L in radj[u]:
            if d + L < D.get(v, 1e18):
                D[v] = d + L; prev[v] = u; heapq.heappush(pq, (d + L, v))
    path = [g]
    while path[-1] != s: path.append(prev[path[-1]])
    return [r6(nodes[n]) for n in reversed(path)]

STOP_P4 = (46.22905, 6.06420)   # P4 south side, on Rue de Veyrot (official plan)
STOP_P1 = (46.22868, 6.06838)   # between P1 and B1, on Av. J.-D. Maillard (official plan)
VIA = (46.22823, 6.06556)       # Veyrot / Alphonse-Large / Maillard junction
shuttle = road_path(STOP_P4, VIA)[:-1] + road_path(VIA, STOP_P1)

data = {
    'buildings': {
        'B1': poly('27397169'), 'B2': poly('697963075'),
        'B11': poly('80307995'), 'B12': poly('484499931'),
        'JDM1': poly('80308010'), 'JDM9': poly('240258596'), 'JDM11': poly('80308030'),
    },
    'parkings': {
        'P4': poly('313479659'), 'P1': poly('80308028'), 'P11': poly('1279024299'),
    },
    'hospitalArea': poly('484499934'),
    'graph': {'nodes': gn, 'edges': ge},
    'shuttle': {'line': shuttle, 'stops': {'P4': r6(STOP_P4), 'P1': r6(STOP_P1)}},
}
with open(out, 'w') as f:
    f.write('// Generated from OpenStreetMap data (c) OpenStreetMap contributors, ODbL.\n')
    f.write('window.CAMPUS_GEO = ' + json.dumps(data, separators=(',', ':')) + ';\n')
print('graph', len(gn), 'nodes', len(ge), 'edges', 'shuttle pts', len(shuttle),
      'shuttle m', round(sum(dist(a, b) for a, b in zip(shuttle, shuttle[1:]))))
