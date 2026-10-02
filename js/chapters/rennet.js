// Chapter 2: rennet at work. Chymosin cuts the kappa-casein hairs, then calcium links the bald
// micelles into a gel.
// Microscope window: about 2 µm wide, micelles about 150 nm (drawn 0.4 units). Chymosin is a 35.6 kDa
// protein, about 5 nm, drawn much bigger so you can see it. It cuts one bond, Phe105–Met106.
// The model (cheese.js, rennet()): first-order cutting with Q10 about 2; joining with Q10 about 11–12
// that stops below about 15–18 °C; clotting once about 85% of hairs are gone; firmness by Scott Blair
// & Burnett's curve. Calibrated to a normal dose at 32 °C and pH 6.6: clots in about 13 minutes,
// ready to cut at about 40 (typical make sheets: set 30–45 minutes). Sources: Fox, Guinee, Cogan &
// McSweeney, Fundamentals of Cheese Science; Dalgleish 1979; Walstra et al. 2006.
// The vat test on the right is the cheesemaker's "clean break": a knife lifted through firm curd
// leaves a clean split that fills with clear whey.
import { THREE, M } from '../kit.js';
import {
  COL, HAIRS_NEEDED, rennet, hairsCut, gelFirm, timeToCut, fmtMin, hex, rng, crowd, chamber, hairyBalls, thermometer,
  board, panelBg, axes, title, line, dot, note, dashV, dashH, fitNarrow, reelChart, inReel, clamp, lerp, smooth, box, TAU,
} from '../cheese.js';

const VIEW = { pos: [0.6, 2.6, 7.7], target: [0.6, 2.0, 0] };
const TMAX = 60;
function stateName(r, t) {
  const a = hairsCut(r, t), f = gelFirm(r, t);
  if (f >= 1) return { n: 'Firm curd: ready to cut', col: COL.good };
  if (f > 0.02) return { n: r.strength < 1 ? 'A weak, soft curd' : 'Soft gel, still firming', col: COL.warn };
  if (t > r.tClot) return { n: 'Just clotted', col: COL.warn };
  if (a >= HAIRS_NEEDED) return { n: isFinite(r.tJoin) ? 'Hairs gone: micelles joining' : 'Hairs gone, but too cold to join', col: isFinite(r.tJoin) ? COL.warn : COL.hair };
  return { n: a > 0.02 ? 'Still liquid: hairs being cut' : 'Milk', col: COL.hair };
}

export default {
  id: 'rennet',
  short: 'Rennet',
  title: 'Rennet: cutting the hairs',
  subtitle: 'One enzyme snips the coat off the casein micelles. Calcium then links them into a wobbly gel that holds the whole vat.',
  view: VIEW,
  learn: `<p>Each casein micelle wears a coat of <b>kappa-casein hairs</b>. The hairs carry a negative charge and stick out into the water, so two micelles that bump just bounce apart. That is why milk stays liquid.</p>
    <p><b>Rennet</b> holds an enzyme called <b>chymosin</b>. It cuts each hair at one exact spot. The outer piece drifts off into the whey. Once most of the hairs are gone (roughly 80 to 90%), the bald micelles can touch, and <b>calcium</b> in the milk links them together. In minutes the whole vat sets into one soft, shiny gel: the <b>curd</b>.</p>
    <p>This gel is different from dahi. In <a href="https://glassbox.how/curdclear/">CurdClear</a> acid dissolves the calcium out of the micelles. Here the calcium stays in, so a rennet curd is <b>stretchy and strong</b>. It can be cut, pressed and aged. Paneer uses heat and acid instead (<a href="https://glassbox.how/paneerclear/">PaneerClear</a>), which is why it never melts.</p>
    <p>Temperature matters twice. The cutting works even in a fridge, only slowly. The <b>joining</b> needs warmth and nearly stops below about 15 °C. Most cheeses are set near <b>30 to 35 °C</b>. A little acid from the starter culture speeds things up too.</p>
    <p>Indian homes boil milk, and boiled milk makes poor rennet curd: heat unfolds the whey proteins and they stick to the hairs. Dairies pasteurise cheese milk gently, at about 72 °C for 15 seconds.</p>
    <p class="tip"><b>Try it:</b> slide the minutes and watch the hairs go, then the micelles link. Now set the milk to 8 °C: the hairs are still cut but nothing sets. Warm it back up and it clots almost at once.</p>`,
  terms: [
    { t: 'Chymosin', d: 'The enzyme in rennet. It cuts kappa-casein between amino acids 105 and 106.' },
    { t: 'Kappa-casein', d: 'The casein on the outside of a micelle. Its hairy end keeps micelles apart.' },
    { t: 'Clotting time', d: 'How long after adding rennet the milk first turns from liquid to gel.' },
    { t: 'Calcium bridge', d: 'Calcium linking two micelles together. It gives rennet curd its strength and stretch.' },
    { t: 'Clean break', d: 'The cheesemaker\'s test: firm curd splits cleanly over a knife and clear whey fills the cut.' },
    { t: 'Pasteurisation', d: 'Gentle heating (about 72 °C for 15 seconds) that kills harmful germs but leaves milk able to clot.' },
  ],
  defaults: { t: 0, T: 32, dose: 1, pH: 6.6, boiled: false },
  controls: [
    { key: 't', type: 'range', label: 'Minutes since the rennet went in', min: 0, max: TMAX, step: 0.25, ends: ['0', '60 min'], fmt: (v) => `${v.toFixed(v < 10 ? 1 : 0)} min` },
    { key: 'T', type: 'range', label: 'Milk temperature', min: 4, max: 60, step: 1, ends: ['4 °C fridge', '60 °C'], fmt: (v) => `${v} °C` },
    { key: 'dose', type: 'range', label: 'Rennet dose', min: 0.25, max: 3, step: 0.05, ends: ['a quarter', 'triple'], fmt: (v) => `${v.toFixed(2)} × normal` },
    { key: 'pH', type: 'range', label: 'How sour the milk is (pH)', min: 6.0, max: 6.7, step: 0.05, ends: ['6.0 starter has worked', '6.7 fresh'], fmt: (v) => `pH ${v.toFixed(2)}` },
    { key: 'boiled', type: 'toggle', label: 'The milk was boiled first', hint: 'Heating above about 70 °C makes rennet curd slow and weak.' },
  ],
  quiz: [
    { q: 'What does chymosin, the enzyme in rennet, do?', options: ['It makes lactic acid', 'It cuts the hairy coat off casein micelles', 'It melts the fat', 'It kills bacteria'], answer: 1, why: 'Chymosin cuts kappa-casein at one bond. Without their hairs the micelles can touch and link.' },
    { q: 'Rennet is added to milk at 8 °C. After an hour it is still liquid. Why?', options: ['The enzyme cannot cut hairs in the cold', 'The hairs get cut, but bald micelles need warmth to join', 'Cold milk has no casein', 'Cold milk has no calcium'], answer: 1, why: 'Cutting is slow but works in the cold. Joining almost stops below about 15 °C. Warm the milk and it sets at once.' },
    { q: 'Why is a rennet curd stretchier and stronger than dahi?', options: ['It has more fat', 'The micelles keep their calcium, which links them', 'It has more lactose', 'It is colder'], answer: 1, why: 'Acid dissolves calcium out of the micelles in dahi. In a rennet curd the calcium stays and bridges the micelles.' },
  ],
  reel: [
    { ms: 5600, caption: 'Rennet\'s enzyme, chymosin, cuts the hairy coat off every casein micelle.', set: { T: 32, dose: 1, pH: 6.6, boiled: false }, anim: { t: [0, 9] }, view: { pos: [-1.2, 1.5, 4.6], target: [-1.2, 1.3, 0] }, spin: 0.05 },
    { ms: 5600, caption: 'Bald micelles link up with calcium, and the whole vat sets into curd.', set: { T: 32, dose: 1, pH: 6.6, boiled: false }, anim: { t: [9, 42] }, view: { pos: [0.4, 1.8, 7.6], target: [0.4, 1.35, 0] }, spin: 0.05 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(23);
    const bench = box(10.4, 0.1, 3.2, M.matte(0x2b3039)); bench.position.set(0.6, 0.05, 0.1); root.add(bench);

    // ---------------------------------------------------------------- microscope window
    const W = { x0: -3.55, x1: 1.4, y0: 0.25, y1: 2.4, d: 1.3 };
    chamber(root, W.x0, W.x1, W.y0, W.y1, W.d, { color: 0xf4f1e8, opacity: 0.06 });
    const ROWS = 3, COLS = 11, N = ROWS * COLS + 3, PER = 12, R = 0.2;
    const mic = hairyBalls(N, PER, R, 0.075, 3); root.add(mic);
    const net = [], links = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      net.push([W.x0 + 0.4 + c * 0.415, W.y0 + 0.42 + r * 0.66 + 0.11 * Math.sin(c * 1.3 + r * 2.1), (rnd() - 0.5) * 0.5]);
      if (c) links.push([r * COLS + c - 1, r * COLS + c]);
    }
    [[2, 0], [6, 1], [9, 0]].forEach(([c, r], k) => {           // short uprights tie the strands into a net
      const a = net[r * COLS + c], b = net[(r + 1) * COLS + c], id = ROWS * COLS + k;
      net.push([(a[0] + b[0]) / 2 + 0.05, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
      links.push([r * COLS + c, id], [id, (r + 1) * COLS + c]);
    });
    const P = net.map((n, i) => ({ fx: lerp(W.x0 + 0.3, W.x1 - 0.3, rnd()), fy: lerp(W.y0 + 0.3, W.y1 - 0.3, rnd()), fz: (rnd() - 0.5) * 0.8, ph: rnd() * TAU, ord: rnd(), x: 0, y: 0, z: 0, b: 0 }));
    const bridges = crowd(links.length, new THREE.SphereGeometry(0.055, 8, 6), { basic: true }); root.add(bridges);
    const cCa = new THREE.Color(COL.calcium); links.forEach((_, i) => bridges.tint(i, cCa));
    // cut hairs drifting off into the whey
    const NB = 70, hg = new THREE.CylinderGeometry(0.012, 0.012, 0.075, 5), bits = crowd(NB, hg, { basic: true }); root.add(bits);
    const cH = new THREE.Color(COL.hair); const bp = Array.from({ length: NB }, () => ({ x: lerp(W.x0 + 0.1, W.x1 - 0.1, rnd()), y: lerp(W.y0 + 0.1, W.y1 - 0.1, rnd()), z: (rnd() - 0.5) * 1.0, ph: rnd() * TAU, a: rnd() * 3 }));
    for (let i = 0; i < NB; i++) bits.tint(i, cH);
    // chymosin: a ball with a notch (drawn far bigger than life)
    const NE = 8, enz = crowd(NE, new THREE.SphereGeometry(0.085, 12, 8, 0.5, TAU - 1.0), { rough: 0.4 }); root.add(enz);
    const cE = new THREE.Color(COL.enzyme), cDead = new THREE.Color(0x6a6f7a), tmpC = new THREE.Color();
    const lEnz = stage.label('chymosin', [0, 0, 0], root, 'hot'); lEnz.element.style.setProperty('--c', COL.enzyme);
    const lHair = stage.label('κ-casein hairs', [W.x0 + 0.9, W.y1 + 0.22, 0], root); lHair.element.style.borderColor = COL.hair;
    const lCa = stage.label('calcium bridges', [W.x0 + 2.75, W.y1 + 0.22, 0], root); lCa.element.style.borderColor = COL.calcium;
    const lScale = stage.label('window about 2 µm wide', [W.x0 + 1.3, W.y0 - 0.2, W.d / 2], root);

    // ---------------------------------------------------------------- the vat test
    const VX = 3.2, potR = 0.95, potH = 1.25;
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(potR, potR, potH, 48, 1, true), M.clear(0xe6f6ff, 0.2)); pot.position.set(VX, 0.1 + potH / 2, 0); root.add(pot);
    const potBase = new THREE.Mesh(new THREE.CylinderGeometry(potR, potR, 0.05, 48), M.metal(0xb9bec8)); potBase.position.set(VX, 0.125, 0); root.add(potBase);
    const milkMat = new THREE.MeshStandardMaterial({ color: 0xfdfbf3, roughness: 0.35 });
    const milk = new THREE.Mesh(new THREE.CylinderGeometry(potR - 0.03, potR - 0.03, potH - 0.25, 48), milkMat); milk.position.set(VX, 0.15 + (potH - 0.25) / 2, 0); root.add(milk);
    const topY = 0.15 + potH - 0.25;
    const slit = box(1.5, 0.02, 0.1, new THREE.MeshStandardMaterial({ color: hex(COL.whey), roughness: 0.2 })); slit.position.set(VX, topY + 0.006, 0.05); slit.rotation.y = 0.5; root.add(slit);
    const knife = new THREE.Group(); knife.position.set(VX, topY, 0.05); knife.rotation.y = 0.5; root.add(knife);
    const blade = box(0.9, 0.5, 0.02, M.metal(0xdfe3ea)); blade.position.set(0.1, 0.25, 0); knife.add(blade);
    const handle = box(0.5, 0.12, 0.07, M.matte(0x3a2a20)); handle.position.set(0.78, 0.44, 0); knife.add(handle);
    const th = thermometer(root, VX - 0.7, 0.75, 0.55, 1.3);
    const lVat = stage.label('', [VX, 0.1 + potH + 0.95, 0], root, 'hot');

    // ---------------------------------------------------------------- chart
    let S = { t: 0, T: 32, dose: 1, pH: 6.6, boiled: false }, key = '';
    const chart = board(root, 3.3, 2.0, 560, 340, (g, w, h) => {
      panelBg(g, w, h); title(g, 'From milk to curd', '');
      const r = rennet(S);
      const { X, Y, x0, x1 } = axes(g, w, h, { x0: 66, y1: 62, y0: h - 46, xMin: 0, xMax: TMAX, yMin: 0, yMax: 100, xTicks: [0, 10, 20, 30, 40, 50, 60], yTicks: [0, 50, 100], xFmt: (v) => v + (v === 60 ? ' min' : ''), yFmt: (v) => v + '%' });
      dashH(g, x0, x1, Y(HAIRS_NEEDED * 100), '85% of hairs gone', 'rgba(143,176,255,.75)');
      const a = [], f = []; for (let t = 0; t <= TMAX; t += 0.5) { a.push([t, hairsCut(r, t) * 100]); f.push([t, Math.min(100, gelFirm(r, t) * 100)]); }
      line(g, a, X, Y, COL.hair, 5); line(g, f, X, Y, COL.fat, 5);
      if (r.tClot < TMAX) dashV(g, X(r.tClot), Y(100), Y(0) - 24, 'clots', 'rgba(255,255,255,.75)');
      g.font = 'bold 17px sans-serif'; g.fillStyle = COL.hair; g.fillText('hairs cut', x0 + 165, 34); g.fillStyle = COL.fat; g.fillText('firmness (100% = cut)', x0 + 260, 34);
      dot(g, X(S.t), Y(hairsCut(r, S.t) * 100), COL.hair, 8); dot(g, X(S.t), Y(Math.min(100, gelFirm(r, S.t) * 100)), COL.fat, 8);
    }, [3.2, 3.95, 0]);

    return {
      update(dt, s, time) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        fitNarrow(stage, [lScale, lHair, lCa]);
        chart.mesh.visible = reelChart(stage, chart) && (inReel() || stage.host.clientWidth >= 560);
        const r = rennet(s), a = hairsCut(r, s.t), firm = gelFirm(r, s.t);
        // joining: runs from the moment 85% of hairs are gone, over the joining time
        const join = a < HAIRS_NEEDED || !isFinite(r.tJoin) ? 0 : clamp((s.t - r.tCut) / Math.max(0.3, r.tJoin), 0, 1.6);
        const jig = 0.09 * Math.sqrt((s.T + 273) / 305);
        P.forEach((p, i) => {
          const b = smooth(clamp(join * 1.25 - p.ord * 0.25, 0, 1));
          p.b = b;
          const wob = (1 - b * 0.85) * jig;
          const fx = p.fx + Math.sin(time * 0.9 + p.ph) * 0.25 * (1 - b), fy = p.fy + Math.cos(time * 0.7 + p.ph * 1.3) * 0.18 * (1 - b);
          p.x = lerp(fx, net[i][0], b) + Math.sin(time * 5 + p.ph * 3) * wob * 0.4; p.y = lerp(fy, net[i][1], b) + Math.cos(time * 4.3 + p.ph * 2) * wob * 0.4; p.z = lerp(p.fz, net[i][2], b);
          mic.place(i, p.x, p.y, p.z, 1, Math.round(clamp(a * PER * (0.75 + 0.5 * mic.order[i]), 0, PER)));
        });
        mic.done();
        links.forEach(([i, j], k) => {
          const b = Math.min(P[i].b, P[j].b);
          if (b > 0.8) bridges.put(k, (P[i].x + P[j].x) / 2, (P[i].y + P[j].y) / 2, (P[i].z + P[j].z) / 2, (b - 0.8) * 5); else bridges.hide(k);
        });
        bridges.done();
        const nb = Math.round(a * NB);
        bp.forEach((q, i) => { if (i < nb) bits.aim(i, q.x + Math.sin(time * 0.5 + q.ph) * 0.2, q.y + Math.cos(time * 0.4 + q.ph) * 0.15, q.z, Math.cos(q.a + time * 0.3), Math.sin(q.a + time * 0.3), 0.3, 1, 1); else bits.hide(i); });
        bits.done();
        const ne = clamp(Math.round(2 + s.dose * 2), 2, NE), dead = s.T > 52;
        for (let i = 0; i < NE; i++) {
          if (i >= ne) { enz.hide(i); continue; }
          const sp = 0.35 * Math.pow(2, (s.T - 32) / 10) * (dead ? 0.15 : 1), u = time * sp + i * 0.37, k = Math.floor(u), f = smooth(clamp((u - k) * 1.6, 0, 1));
          const A = P[(k * 7 + i * 5) % N], B = P[((k + 1) * 7 + i * 5) % N];
          const x = lerp(A.x, B.x, f), y = lerp(A.y, B.y, f) + R + 0.11, z = lerp(A.z, B.z, f) + 0.25;
          enz.put(i, x, y, z, a > 0.995 ? 0.8 : 1); enz.tint(i, tmpC.copy(dead ? cDead : cE));
          if (i === 0) lEnz.position.set(x, y + 0.25, z);
        }
        enz.done();
        lEnz.element.innerHTML = dead ? 'chymosin, unfolded by heat' : 'chymosin (drawn bigger)';
        lCa.visible = lCa.visible && join > 0.5;
        // the vat
        const st = stateName(r, s.t);
        lVat.element.style.setProperty('--c', st.col); lVat.element.innerHTML = `<b>${st.n}</b>`;
        const cut = clamp((firm - 0.85) / 0.15, 0, 1);
        slit.visible = cut > 0.02; slit.scale.set(cut, 1, 1);
        knife.position.y = topY + 0.05 + (1 - cut) * 0.5 + (cut > 0 ? 0.12 : 0); knife.rotation.z = cut > 0 ? -0.25 : 0;
        milkMat.roughness = lerp(0.35, 0.15, clamp(firm, 0, 1));
        th.set((s.T - 0) / 60);
        const k = `${s.t}|${s.T}|${s.dose}|${s.pH}|${s.boiled}`;
        if (k !== key) { key = k; chart.redraw(); }
      },
      readout: (s) => {
        const r = rennet(s), st = stateName(r, s.t), cutAt = timeToCut(r);
        return `<div class="big" style="color:${st.col}">${st.n}</div>
          <div class="row"><span>Hairs cut so far</span><b>${(hairsCut(r, s.t) * 100).toFixed(0)}%</b></div>
          <div class="row"><span>Milk clots at</span><b>${fmtMin(r.tClot)}</b></div>
          <div class="row"><span>Firm enough to cut at</span><b>${fmtMin(cutAt)}</b></div>
          <small>${!isFinite(r.tJoin) ? 'Below about 15 °C the bald micelles will not join. Warm the milk and it sets at once.' : s.T > 52 ? 'Too hot: the enzyme itself unfolds and stops working.' : s.boiled ? 'Boiled milk: whey protein sits on the hairs, so the curd stays weak.' : 'Typical for a normal dose. Cheesemakers cut at about three times the clotting time.'}</small>`;
      },
      dispose() { stage.setShift(0, 0); },
    };
  },
};
