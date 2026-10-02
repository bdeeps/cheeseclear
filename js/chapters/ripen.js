// Chapter 5: ripening. A young cheese is rubbery and bland. In the cave, enzymes and microbes cut its
// protein and fat into the small molecules we taste, at a pace set by temperature, while humidity
// decides how fast the rind dries.
// Models in cheese.js: ripeness = share of nitrogen made soluble (typical end values from Fox et al.,
// Fundamentals of Cheese Science), speeding up about 2.3 times per 10 °C; lactose gone in days to a
// few weeks; Emmental's CO₂ from the propionic fermentation, about 120 L for an 80 kg wheel (typical:
// Fröhlich-Wyder & Bachmann); blue mould needing air from piercing; drying loss (illustrative).
// Typical caves: Cheddar 8–12 °C; Emmental 20–24 °C warm room for 3–6 weeks, then about 10–13 °C;
// blue 8–10 °C at 90–95% humidity; Camembert 11–13 °C at 90–95% for 3–5 weeks.
// The cut face of each wheel is a drawing that follows the model: eyes grow with the gas, blue veins
// follow the needle holes, Camembert turns creamy from the rind inwards.
import { THREE, M } from '../kit.js';
import {
  COL, CHEESES, ripeness, lactoseLeft, weightLoss, eyeGas, blueGrowth, rindState, fmtAge, hex, rng, crowd, chamber, wheel, thermometer,
  board, panelBg, axes, title, line, dot, note, dashV, fitNarrow, reelChart, inReel, clamp, lerp, smooth, box, beam, TAU,
} from '../cheese.js';

const VIEW = { pos: [0.6, 2.6, 7.7], target: [0.6, 2.0, 0] };
const weeksOf = (s) => Math.pow(clamp(s.age, 0, 1), 2) * CHEESES[s.type].max;
const ageOf = (type, weeks) => Math.sqrt(clamp(weeks / CHEESES[type].max, 0, 1));
const DIM = { cheddar: { R: 1.0, H: 1.0 }, swiss: { R: 1.55, H: 0.62 }, blue: { R: 0.95, H: 0.95 }, camembert: { R: 1.1, H: 0.42 } };
function stageName(type, weeks, sn) {
  if (type === 'cheddar') return weeks < 8 ? 'Young and rubbery' : weeks < 22 ? 'Mild' : weeks < 44 ? 'Medium to mature' : weeks < 78 ? 'Mature, sharp' : 'Vintage, with crunchy crystals';
  if (type === 'swiss') return weeks < 3 ? 'Young, no eyes yet' : weeks < 10 ? 'Eyes forming' : 'Ripe: nutty and sweet';
  if (type === 'blue') return weeks < 3 ? 'Young and white' : weeks < 9 ? 'Veins spreading' : 'Ripe: sharp and blue';
  return weeks < 1.2 ? 'Fresh curd, no coat yet' : weeks < 3 ? 'White coat, chalky centre' : weeks < 6 ? 'Ripe: creamy almost to the centre' : 'Over-ripe: runny, smells of ammonia';
}

export default {
  id: 'ripen',
  short: 'Ripening',
  title: 'Ripening: time in the cave',
  subtitle: 'Enzymes and microbes slowly cut protein and fat into flavour. Temperature sets the pace, humidity guards the rind.',
  view: VIEW,
  learn: `<p>Fresh from the press, a cheese tastes of little but salt and sour milk. Flavour is made later, in a cool, damp room: the <b>cave</b>.</p>
    <p>Inside the cheese, <b>enzymes</b> keep working. Some are left over from the rennet, some come from the milk, and most come from the starter bacteria as they die and break open. They cut the long casein chains into shorter <b>peptides</b> and then into single <b>amino acids</b>. Other enzymes cut fat into fatty acids. These small molecules, and what they turn into, are the taste and smell of cheese. The body softens too, because the protein net is being snipped.</p>
    <p><b>Temperature</b> sets the speed: roughly double for every 8 to 10 °C. Too warm and it races into bitter or rotten flavours. <b>Humidity</b> looks after the rind. Dry air cracks it and shrinks the cheese. Very damp air grows slime and unwanted moulds.</p>
    <p>Some cheeses get extra helpers. In <b>Emmental</b>, propionic bacteria eat lactic acid in a warm room and give off <b>carbon dioxide</b>, which blows the holes, called eyes. <b>Blue cheese</b> is pierced with needles so the mould <i>Penicillium roqueforti</i> gets air and grows along the channels. <b>Camembert</b> wears a coat of white mould that ripens it from the outside in.</p>
    <p>The starter bacteria finish off the <b>lactose</b> in the first days to weeks. Long-aged cheeses such as Parmesan and mature Cheddar test at close to zero lactose.</p>
    <p class="tip"><b>Try it:</b> pick Emmental and slide the age: the eyes swell in the warm room. Cool the cave to 8 °C and they stop. Pick Blue and switch piercing off. Then age a Cheddar for two years.</p>`,
  terms: [
    { t: 'Ripening (affinage)', d: 'Keeping cheese at a chosen temperature and humidity while its flavour and texture develop.' },
    { t: 'Proteolysis', d: 'Enzymes cutting protein into peptides and amino acids. The main engine of cheese flavour and softening.' },
    { t: 'Lipolysis', d: 'Enzymes cutting fat into fatty acids. Strong in blue cheeses and hard Italian cheeses.' },
    { t: 'Eyes', d: 'The round holes in Swiss-type cheese, blown by carbon dioxide from propionic bacteria.' },
    { t: 'Penicillium roqueforti', d: 'The blue-green mould of blue cheese. It needs oxygen, so the cheese is pierced.' },
    { t: 'Rind', d: 'The outer skin of a cheese: dried curd, cloth, wax, or a living coat of mould or bacteria.' },
  ],
  defaults: { type: 'cheddar', age: ageOf('cheddar', 39), T: 9, RH: 85, pierce: true },
  controls: [
    { key: 'type', type: 'seg', label: 'Cheese', options: Object.entries(CHEESES).map(([v, c]) => ({ v, label: c.n })) },
    { key: 'age', type: 'range', label: 'Age', min: 0, max: 1, step: 0.005, ends: ['fresh', 'very old'], fmt: (v, s) => fmtAge(weeksOf(s)) },
    { key: 'T', type: 'range', label: 'Cave temperature', min: 2, max: 26, step: 1, ends: ['2 °C', '26 °C'], fmt: (v) => `${v} °C` },
    { key: 'RH', type: 'range', label: 'Cave humidity', min: 60, max: 99, step: 1, ends: ['60% dry', '99% dripping'], fmt: (v) => `${v}%` },
    { key: 'pierce', type: 'toggle', label: 'Pierce the blue cheese with needles', hint: 'Lets air in for the blue mould.' },
  ],
  onChange(s, key) {
    if (key === 'type') { const c = CHEESES[s.type]; s.T = c.T; s.RH = c.RH; s.age = ageOf(s.type, c.weeks); }
    if (key === 'pierce') { if (s.type !== 'blue') { s.type = 'blue'; const c = CHEESES.blue; s.T = c.T; s.RH = c.RH; s.age = ageOf('blue', c.weeks); } }
  },
  quiz: [
    { q: 'Where does most of the flavour of an aged cheese come from?', options: ['The salt', 'Enzymes cutting protein and fat into small molecules', 'The colour added to the milk', 'The whey'], answer: 1, why: 'Proteolysis and lipolysis make peptides, amino acids and fatty acids, which taste and smell. That takes weeks to years.' },
    { q: 'What makes the holes in Emmental?', options: ['Air beaten into the curd', 'Mice', 'Carbon dioxide from propionic bacteria', 'Needles'], answer: 2, why: 'Propionic bacteria turn lactic acid into propionic acid, acetic acid and CO₂. The gas collects into bubbles in the warm, elastic cheese.' },
    { q: 'Why is blue cheese pierced with needles?', options: ['To let whey out', 'To let air in for the blue mould', 'To add salt', 'To check if it is ripe'], answer: 1, why: 'Penicillium roqueforti needs oxygen. The needle channels carry air into the cheese and the mould grows along them.' },
  ],
  reel: [
    { ms: 5600, caption: 'In the cave, enzymes cut protein and fat into flavour. It takes weeks, months or years.', set: { type: 'cheddar', T: 9, RH: 85 }, anim: { age: [0, 1] }, view: { pos: [-0.9, 2.0, 5.6], target: [-0.9, 1.25, 0] }, spin: 0.12 },
    { ms: 5200, caption: 'The holes in Swiss cheese are bubbles of carbon dioxide made by bacteria.', set: { type: 'swiss', T: 22, RH: 82 }, anim: { age: [0, 0.6] }, view: { pos: [-1.2, 1.9, 5.2], target: [-1.2, 1.05, 0] }, spin: 0.05 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(59);
    const floor = box(10.4, 0.1, 3.6, M.matte(0x33302c)); floor.position.set(0.6, 0.05, 0.1); root.add(floor);
    // cave wall and a shelf of ageing wheels behind
    const wall = box(5.6, 2.35, 0.12, M.matte(0x3d3832)); wall.position.set(-1.1, 1.27, -1.55); root.add(wall);
    const wood = M.matte(0x6b4a2f);
    [1.15, 1.85].forEach((y) => { const sh = box(5.4, 0.07, 0.6, wood); sh.position.set(-1.1, y, -1.2); root.add(sh); });
    const bgMat = new THREE.MeshStandardMaterial({ color: 0xd9b25c, roughness: 0.8 });
    const bg = [];
    [1.15, 1.85].forEach((y) => { for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 24), bgMat); m.position.set(-3.35 + i * 0.9, y + 0.17, -1.2); root.add(m); bg.push(m); } });
    const board0 = box(3.3, 0.08, 2.5, wood); board0.position.set(-1.55, 0.14, 0.15); root.add(board0);

    // ---------------------------------------------------------------- four wheels, each with a drawn cut face
    const FW = 320, FH = 200;
    const feat = {
      eyes: Array.from({ length: 16 }, () => ({ x: 0.08 + rnd() * 0.84, y: 0.14 + rnd() * 0.72, r: 0.5 + rnd() * 0.8, t0: rnd() * 0.5 })),
      veins: Array.from({ length: 9 }, (_, i) => ({ x: 0.08 + (i / 8) * 0.84 + (rnd() - 0.5) * 0.04, blobs: Array.from({ length: 7 }, () => ({ y: 0.08 + rnd() * 0.84, dx: (rnd() - 0.5) * 0.09, r: 0.5 + rnd() })) })),
      cryst: Array.from({ length: 60 }, () => ({ x: rnd(), y: rnd(), t0: 0.5 + rnd() * 0.5 })),
    };
    const W = {};
    const X0 = -1.55, Y0 = 0.18, GAP = 1.7, ROT = 0.6;
    Object.keys(CHEESES).forEach((type) => {
      const d = DIM[type], g = wheel(d.R, d.H, 0xe0b85a, 0xf2c75c, GAP);
      g.position.set(X0, Y0 + d.H / 2, 0.15); g.rotation.y = ROT; root.add(g);
      const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH;
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      g.paste.map = tex; g.paste.color.set(0xffffff);
      W[type] = { g, cv, tex, d };
    });
    // needle holes on top of the blue, mould specks
    const holes = crowd(18, new THREE.CylinderGeometry(0.022, 0.022, 0.02, 8), { basic: true }); W.blue.g.add(holes);
    const hp = Array.from({ length: 18 }, () => { let a; do { a = rnd() * TAU; } while (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.95); const r = 0.15 + rnd() * 0.7; return [Math.sin(a) * r, Math.cos(a) * r]; });
    const needle = beam([0, 0, 0], [0, 1.0, 0], 0.012, M.metal(0xe0e4ea), 6); root.add(needle);

    function drawFace(type, s) {
      const { cv, tex } = W[type], g = cv.getContext('2d'), c = CHEESES[type], wk = weeksOf(s), sn = ripeness(type, wk, s.T), f = sn / c.snMax;
      const base = new THREE.Color(type === 'cheddar' ? 0xf5d06a : type === 'swiss' ? 0xf7e596 : type === 'blue' ? 0xf6f0dc : 0xfbf6e6);
      const ripe = new THREE.Color(type === 'cheddar' ? 0xe08a1e : type === 'swiss' ? 0xedc85a : type === 'blue' ? 0xefe3bd : 0xf3dc98);
      const col = base.clone().lerp(ripe, f);
      g.fillStyle = '#' + col.getHexString(); g.fillRect(0, 0, FW, FH);
      if (type === 'camembert') {                         // creamy from the rind inwards, chalky core
        const dep = clamp(f * 1.15, 0, 1), d = DIM.camembert, my = (dep * FH) / 2, mx = ((dep * d.H) / 2) * (FW / d.R);
        if (dep < 0.98) { g.fillStyle = '#fdfbf2'; g.fillRect(0, my, FW - mx, FH - 2 * my); }
        g.fillStyle = `rgba(255,255,255,${clamp(wk / 1.5, 0, 1)})`; g.fillRect(0, 0, FW, 7); g.fillRect(0, FH - 7, FW, 7); g.fillRect(FW - 7, 0, 7, FH);
      }
      if (type === 'swiss') {
        const gas = eyeGas(wk, s.T) / 120;
        feat.eyes.forEach((e) => { const k = clamp((gas - e.t0 * 0.6) / 0.5, 0, 1); if (k <= 0) return; const r = e.r * 15 * Math.sqrt(k); g.fillStyle = '#b98a2e'; g.beginPath(); g.ellipse(e.x * FW, e.y * FH, r, r * 1.0, 0, 0, TAU); g.fill(); g.fillStyle = '#8c6420'; g.beginPath(); g.ellipse(e.x * FW, e.y * FH - r * 0.15, r * 0.8, r * 0.75, 0, 0, TAU); g.fill(); });
      }
      if (type === 'blue') {
        const b = blueGrowth(wk, s.T, s.pierce);
        feat.veins.forEach((v) => {
          if (s.pierce) { g.strokeStyle = `rgba(60,110,120,${0.25 + 0.5 * b})`; g.lineWidth = 2; g.beginPath(); g.moveTo(v.x * FW, 0); g.lineTo(v.x * FW, FH * 0.92); g.stroke(); }
          v.blobs.forEach((q) => { const r = q.r * 13 * b; if (r < 0.6) return; g.fillStyle = 'rgba(47,104,112,.8)'; g.beginPath(); g.ellipse((v.x + q.dx) * FW, q.y * FH, r * 1.3, r * 0.7, q.dx * 20, 0, TAU); g.fill(); });
        });
        if (!s.pierce) { g.fillStyle = `rgba(47,104,112,${0.6 * clamp(wk / 6, 0, 1)})`; g.fillRect(0, 0, FW, 5); g.fillRect(FW - 5, 0, 5, FH); }
      }
      if (type === 'cheddar') {
        feat.cryst.forEach((q) => { const k = clamp((wk / 104 - q.t0) * 6, 0, 1); if (k <= 0) return; g.fillStyle = `rgba(255,255,255,${0.9 * k})`; g.fillRect(q.x * FW, q.y * FH, 3, 3); });
        if (s.RH < c.RH - 12 && wk > 6) { g.strokeStyle = 'rgba(90,60,20,.7)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(FW - 2, 30 + i * 45); g.lineTo(FW - 40 - i * 9, 44 + i * 45); g.stroke(); } }
      }
      tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- one casein chain being cut (right)
    const C = { x0: 1.75, x1: 4.75, y0: 0.3, y1: 1.85, d: 0.8 };
    chamber(root, C.x0, C.x1, C.y0, C.y1, C.d, { color: 0xf4f1e8, opacity: 0.06 });
    const NBD = 44, beads = crowd(NBD, new THREE.SphereGeometry(0.055, 10, 8), { rough: 0.5 }); root.add(beads);
    const bd = Array.from({ length: NBD }, (_, i) => ({ ord: rnd(), ph: rnd() * TAU, dx: (rnd() - 0.5), dy: (rnd() - 0.5) }));
    const cutOrder = bd.map((b, i) => [b.ord, i]).sort((a, b) => a[0] - b[0]).map((q) => q[1]);
    const cChain = new THREE.Color(COL.casein), cPep = new THREE.Color('#ffd166'), cAA = new THREE.Color('#ff7a59');
    const lChain = stage.label('', [(C.x0 + C.x1) / 2, C.y1 + 0.24, 0], root, 'hot'); lChain.element.style.setProperty('--c', '#ffd166');
    const lChain2 = stage.label('one casein chain (a model, not to scale)', [(C.x0 + C.x1) / 2, C.y0 - 0.2, C.d / 2], root);
    const th = thermometer(root, 1.3, 0.5, -1.0, 1.2);
    const lWheel = stage.label('', [X0, 0, 0], root, 'hot');

    // ---------------------------------------------------------------- chart
    let S = { type: 'cheddar', age: 0.6, T: 9, RH: 85, pierce: true }, key = '';
    const chart = board(root, 3.3, 2.0, 560, 340, (g, w, h) => {
      panelBg(g, w, h); const c = CHEESES[S.type]; title(g, c.n + ' in the cave', '');
      const mx = c.max, ticks = mx > 60 ? [0, 26, 52, 78, 104] : mx > 30 ? [0, 13, 26, 39, 52] : mx > 20 ? [0, 10, 20, 30, 40] : [0, 3, 6, 9, 12];
      const { X, Y, x0, x1 } = axes(g, w, h, { x0: 62, y1: 66, y0: h - 46, xMin: 0, xMax: mx, yMin: 0, yMax: 50, xTicks: ticks, yTicks: [0, 10, 20, 30, 40, 50], xFmt: (v) => (mx > 30 ? (v / 4.345).toFixed(0) + (v === mx ? ' mo' : '') : v + (v === mx ? ' wk' : '')), yFmt: (v) => v + '%' });
      const a = [], b = [], d = []; for (let i = 0; i <= 100; i++) { const t = (i / 100) * mx; a.push([t, ripeness(S.type, t, S.T)]); b.push([t, lactoseLeft(t, S.T) * 10]); d.push([t, Math.min(50, weightLoss(S.type, t, S.T, S.RH))]); }
      line(g, a, X, Y, '#ffd166', 5); line(g, d, X, Y, '#8fb0ff', 3, [7, 5]); line(g, b, X, Y, '#ff7a59', 3);
      g.font = 'bold 15px sans-serif'; g.fillStyle = '#ffd166'; g.fillText('protein broken down', x0 + 6, 58); g.fillStyle = '#8fb0ff'; g.fillText('weight lost', x0 + 170, 58); g.fillStyle = '#ff7a59'; g.fillText('lactose left (×10)', x0 + 268, 58);
      const wk = weeksOf(S); dashV(g, X(wk), Y(50), Y(0), '', 'rgba(255,255,255,.5)'); dot(g, X(wk), Y(ripeness(S.type, wk, S.T)), '#ffd166', 9);
    }, [3.2, 3.95, 0]);

    let shown = '';
    return {
      update(dt, s, time) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        const narrow = fitNarrow(stage, [lChain2, lChain]);
        chart.mesh.visible = reelChart(stage, chart) && (inReel() || stage.host.clientWidth >= 560);
        const c = CHEESES[s.type], wk = weeksOf(s), sn = ripeness(s.type, wk, s.T), f = sn / c.snMax, d = DIM[s.type];
        if (shown !== s.type) { shown = s.type; Object.entries(W).forEach(([k, w]) => { w.g.visible = k === s.type; }); }
        const w = W[s.type];
        // rind
        const rs = rindState(s.type, s.RH), loss = weightLoss(s.type, wk, s.T, s.RH);
        const rind = new THREE.Color(s.type === 'cheddar' ? 0xb1905a : s.type === 'swiss' ? 0xe3b94f : s.type === 'blue' ? 0xe9e2c8 : 0xe8dcae);
        if (s.type === 'camembert') rind.lerp(new THREE.Color(0xffffff), clamp(wk / 1.5, 0, 1));
        if (s.type === 'blue') rind.lerp(new THREE.Color(0x9fb7ae), 0.35 * blueGrowth(wk, s.T, true));
        if (s.RH > Math.max(c.RH + 7, 96)) rind.lerp(new THREE.Color(0x8a9a5a), clamp(wk / 6, 0, 0.6));
        if (s.RH < c.RH - 12) rind.lerp(new THREE.Color(0x9a7a4a), clamp(wk / 10, 0, 0.6));
        w.g.rind.color.copy(rind);
        const sc = 1 - clamp(loss, 0, 30) / 100 / 3;      // drying shrinks it a little
        w.g.scale.setScalar(sc); w.g.position.y = Y0 + (d.H * sc) / 2;
        // Emmental domes as the gas pushes
        if (s.type === 'swiss') w.g.scale.y = sc * (1 + 0.12 * eyeGas(wk, s.T) / 120);
        // needles on the blue
        const showN = s.type === 'blue' && s.pierce;
        holes.visible = showN; needle.visible = showN;
        if (showN) { hp.forEach((p, i) => holes.put(i, p[0], d.H / 2 + 0.012, p[1])); holes.done(); const u = (time * 0.5) % 1, p = hp[Math.floor(time * 0.5) % hp.length]; const wx = X0 + p[0] * Math.cos(ROT) + p[1] * Math.sin(ROT), wz = 0.15 - p[0] * Math.sin(ROT) + p[1] * Math.cos(ROT); needle.position.set(wx, Y0 + d.H * (1 - 0.8 * Math.sin(u * Math.PI)) + 0.02, wz); }
        lWheel.position.set(X0, Y0 + d.H + 0.5 + (s.type === 'blue' && s.pierce ? 0.9 : 0), 0.15);
        lWheel.element.style.setProperty('--c', rs.col === COL.good ? COL.fat : rs.col);
        lWheel.element.innerHTML = `<b>${c.n}</b>, ${fmtAge(wk)}: ${stageName(s.type, wk, sn).toLowerCase()}`;
        // the casein chain: beads in a wave; cuts open gaps, and single beads turn into amino acids
        const nCut = Math.round(f * (NBD - 1) * 0.8), cutSet = new Set(cutOrder.slice(0, nCut));
        let seg = 0, off = 0; const L = C.x1 - C.x0 - 0.5, gap = 0.035;
        const totalGap = nCut * gap, pitch = (L - totalGap) / NBD;
        for (let i = 0; i < NBD; i++) {
          const cutBefore = cutSet.has(i), cutAfter = cutSet.has(i + 1) || i === NBD - 1;
          if (cutBefore) { off += gap; seg++; }
          const single = (cutBefore || i === 0) && cutAfter && f > 0.25;
          const x = C.x0 + 0.25 + i * pitch + off, drift = single ? 1 : cutSet.size ? 0.35 * f : 0;
          const y = (C.y0 + C.y1) / 2 + 0.42 * Math.sin(i * 0.5) * (1 - 0.3 * f) + drift * (bd[i].dy * 0.7 + Math.sin(time * 1.3 + bd[i].ph) * 0.06) + (seg % 2 ? 0.07 : -0.07) * Math.min(1, f * 3);
          beads.put(i, x + drift * bd[i].dx * 0.12, y, drift * bd[i].dx * 0.25, single ? 0.85 : 1);
          beads.tint(i, single ? cAA : cutSet.size && (cutBefore || cutAfter) ? cPep : cChain);
        }
        beads.done();
        lChain.element.innerHTML = nCut === 0 ? 'whole casein chain: bland and rubbery' : f < 0.5 ? `cut into <b>${nCut + 1}</b> peptides: softer, more taste` : `peptides and <b style="color:#ff7a59">amino acids</b>: full flavour`;
        th.set((s.T - 0) / 30);
        const k = `${s.type}|${s.age}|${s.T}|${s.RH}|${s.pierce}`;
        if (k !== key) { key = k; chart.redraw(); drawFace(s.type, s); }
      },
      readout: (s) => {
        const c = CHEESES[s.type], wk = weeksOf(s), sn = ripeness(s.type, wk, s.T), rs = rindState(s.type, s.RH);
        const extra = s.type === 'swiss' ? `<div class="row"><span>CO₂ made by an 80 kg wheel</span><b>${eyeGas(wk, s.T).toFixed(0)} litres</b></div>`
          : s.type === 'blue' ? `<div class="row"><span>Blue mould through the cheese</span><b>${(blueGrowth(wk, s.T, s.pierce) * 100).toFixed(0)}%</b></div>`
          : s.type === 'camembert' ? `<div class="row"><span>Creamy from the rind inwards</span><b>${Math.min(100, (sn / c.snMax) * 115).toFixed(0)}% of the way</b></div>`
          : `<div class="row"><span>Lactose left</span><b>${lactoseLeft(wk, s.T) < 0.05 ? 'close to zero' : lactoseLeft(wk, s.T).toFixed(1) + '%'}</b></div>`;
        return `<div class="big">${stageName(s.type, wk, sn)}</div>
          <div class="row"><span>${c.n}, aged</span><b>${fmtAge(wk)} at ${s.T} °C</b></div>
          <div class="row"><span>Protein broken down</span><b>${sn.toFixed(0)}% soluble</b></div>
          ${extra}
          <div class="row"><span>Weight lost by drying</span><b>${weightLoss(s.type, wk, s.T, s.RH).toFixed(1)}%</b></div>
          <div class="row"><span>Rind at ${s.RH}% humidity</span><b style="color:${rs.col}">${rs.n}</b></div>
          <small>${c.note}</small>`;
      },
      dispose() { stage.setShift(0, 0); },
    };
  },
};
