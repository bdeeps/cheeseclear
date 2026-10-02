// Chapter 4: press and salt. Two routes to a salted, shaped cheese.
// Left, the Cheddar route: slabs of curd are stacked and turned ("cheddaring") while the starter
// takes the pH from about 6.1 down to about 5.3–5.4, then milled into chips, dry-salted (about 2–3%
// of the curd's weight goes on; about 1.7% ends up in the cheese, which is about 4.5–5.5% of its
// water: Fox et al., Fundamentals of Cheese Science; Guelph Cheese Making Technology e-book) and
// pressed overnight, typically at very roughly 75–200 kPa. The pressing curves here are illustrative.
// Right, the brine route (Gouda, Emmental, Parmesan, feta): the formed wheel floats in strong salt
// water. Salt creeps in by diffusion at about 0.2 cm² per day (Geurts, Walstra & Mulder 1974), so the
// profile across a wheel brined from both faces is c = c_brine·[erfc(x/2√Dt) + erfc((L−x)/2√Dt)].
// The wheel's cut face is coloured by that formula. Water activity from Marcos et al. 1981:
// a_w ≈ 1 − 0.033 × (mol of salt per kg of the cheese's water).
import { THREE, M } from '../kit.js';
import {
  COL, D_SALT, saltAt, saltMean, awOfSM, pressMoisture, knit, hex, rng, crowd, chamber, liquid,
  board, panelBg, axes, title, line, dot, note, dashH, fitNarrow, reelChart, inReel, clamp, lerp, smooth, box, beam, TAU,
} from '../cheese.js';

const VIEW = { pos: [0.6, 2.6, 7.7], target: [0.6, 2.0, 0] };
const M0 = 41;                    // % water in milled Cheddar curd going into the hoop (typical)

export default {
  id: 'press',
  short: 'Press and salt',
  title: 'Press and salt',
  subtitle: 'Pressing knits loose curd into one solid cheese. Salt slows the microbes, firms the body and brings the flavour.',
  view: VIEW,
  learn: `<p>Drained curd is a heap of soft, warm pieces. Two jobs turn it into a cheese: giving it <b>shape</b> and giving it <b>salt</b>.</p>
    <p>For Cheddar, the curd is first <b>cheddared</b>. The matted curd is cut into slabs, and the slabs are stacked and turned every 15 minutes or so. Their own weight stretches the curd into a texture like cooked chicken breast, while the starter bacteria keep making acid. Then the slabs are <b>milled</b> into finger-sized chips, <b>dry-salted</b> and packed into a mould called a hoop.</p>
    <p>The <b>press</b> squeezes out the last free whey and pushes the chips together until they <b>knit</b> into one block. Press too gently and the cheese is full of cracks. Press longer and harder and it closes up.</p>
    <p>Many other cheeses are salted in a <b>brine</b> bath instead. Salt has to travel inwards through the water in the cheese by <b>diffusion</b>, which is very slow: a few millimetres on the first day, and weeks to reach the middle of a big wheel. A wheel of Parmigiano Reggiano floats in brine for about three weeks.</p>
    <p>Why salt at all? It pulls water out, slows the starter so the cheese does not turn too sour, holds back spoilage microbes, and of course it tastes good. Most cheeses end up with 1 to 2% salt. Feta and blue cheeses have more.</p>
    <p class="tip"><b>Try it:</b> raise the press time and watch the chips knit. Then look at the brine tank: leave a thick wheel in for 3 days and see how little salt has reached the centre. How many days until the middle catches up?</p>`,
  terms: [
    { t: 'Cheddaring', d: 'Stacking and turning slabs of curd so they stretch, drain and sour before milling.' },
    { t: 'Milling', d: 'Cutting the cheddared slabs into small chips so salt can be mixed through.' },
    { t: 'Hoop', d: 'The mould, lined with cloth, that holds curd under the press and gives the cheese its shape.' },
    { t: 'Brine', d: 'Strong salt water, about 18 to 23% salt, that wheels are soaked in.' },
    { t: 'Diffusion', d: 'The slow spreading of a substance from where there is more to where there is less.' },
    { t: 'Salt-in-moisture', d: 'Salt as a share of the water in the cheese. It is what microbes actually feel.' },
  ],
  defaults: { focus: 'press', kPa: 100, hours: 6, days: 3, brine: 20, thick: 12 },
  controls: [
    { key: 'focus', type: 'seg', label: 'Look at', options: [{ v: 'press', label: 'Dry salt and press (Cheddar)' }, { v: 'brine', label: 'Brine bath (Gouda, Parmesan)' }] },
    { key: 'kPa', type: 'range', label: 'Press pressure', min: 0, max: 250, step: 5, ends: ['0', '250 kPa'], fmt: (v) => `${v} kPa` },
    { key: 'hours', type: 'range', label: 'Time in the press', min: 0, max: 24, step: 0.5, ends: ['0', '24 hours'], fmt: (v) => `${v} h` },
    { key: 'days', type: 'range', label: 'Days in the brine', min: 0, max: 30, step: 0.5, ends: ['0', '30 days'], fmt: (v) => `${v} days` },
    { key: 'brine', type: 'range', label: 'Brine strength', min: 10, max: 26, step: 1, ends: ['10%', '26% saturated'], fmt: (v) => `${v}% salt` },
    { key: 'thick', type: 'range', label: 'Wheel thickness', min: 4, max: 24, step: 1, ends: ['4 cm', '24 cm'], fmt: (v) => `${v} cm` },
  ],
  onChange(s, key) {
    if (key === 'kPa' || key === 'hours') s.focus = 'press';
    if (key === 'days' || key === 'brine' || key === 'thick') s.focus = 'brine';
  },
  quiz: [
    { q: 'What does pressing do to milled, salted curd?', options: ['It adds salt', 'It squeezes out whey and knits the pieces into one block', 'It makes holes', 'It kills the starter'], answer: 1, why: 'Pressure pushes the chips together so their protein nets fuse, and drives out the last free whey.' },
    { q: 'A thick wheel sits in brine for three days. Where is the salt?', options: ['Spread evenly through the wheel', 'Mostly in the outer centimetre or two', 'Only in the centre', 'Nowhere, salt cannot enter cheese'], answer: 1, why: 'Salt moves by diffusion at about 0.2 cm² per day. In three days it gets about 1.5 cm in. Evening out takes weeks.' },
    { q: 'Which is NOT a reason cheese is salted?', options: ['To slow the starter and spoilage microbes', 'To draw out water', 'To add flavour', 'To make the milk clot'], answer: 3, why: 'Rennet clots the milk, long before salting. Salt controls water, microbes and taste.' },
  ],
  reel: [
    { ms: 5200, caption: 'A press knits the loose curd into one solid cheese, and salt keeps it safe and tasty.', set: { focus: 'press', kPa: 150 }, anim: { hours: [0, 16] }, view: { pos: [-1.3, 2.1, 5.6], target: [-1.3, 1.5, 0] }, spin: 0.15 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(47);
    const floor = box(10.4, 0.1, 3.4, M.matte(0x2b3039)); floor.position.set(0.6, 0.05, 0.1); root.add(floor);

    // ---------------------------------------------------------------- cheddaring slabs
    const slabMat = new THREE.MeshStandardMaterial({ color: 0xf6e7b4, roughness: 0.55 });
    const slabs = [0, 1, 2].map((i) => { const m = box(1.15, 0.2, 0.75, slabMat); m.position.set(-2.75, 0.22 + i * 0.215, 0.1); m.rotation.y = (i - 1) * 0.12; root.add(m); return m; });
    const lSlab = stage.label('cheddaring slabs', [-2.75, 1.15, 0.1], root);
    // milled, salted chips in a tray

    // ---------------------------------------------------------------- the press
    const PX = -0.9, HR = 0.62, H0 = 1.15, BY = 0.38;
    const base = box(1.9, 0.12, 1.5, M.metal(0x7d8694)); base.position.set(PX, 0.16, 0); root.add(base);
    const drip = box(1.6, 0.06, 1.3, M.metal(0xb9bec8)); drip.position.set(PX, 0.26, 0); root.add(drip);
    const frameMat = M.metal(0x8c95a3);
    root.add(beam([PX - 0.85, 0.2, 0], [PX - 0.85, 2.3, 0], 0.06, frameMat), beam([PX + 0.85, 0.2, 0], [PX + 0.85, 2.3, 0], 0.06, frameMat));
    const top = box(1.9, 0.14, 0.3, frameMat); top.position.set(PX, 2.3, 0); root.add(top);
    const hoop = new THREE.Mesh(new THREE.CylinderGeometry(HR, HR, H0, 40, 1, true), M.clear(0xe6f6ff, 0.16)); hoop.position.set(PX, BY + H0 / 2, 0); root.add(hoop);
    const ram = new THREE.Group(); root.add(ram);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(HR - 0.03, HR - 0.03, 0.1, 40), M.metal(0xd0d5dd)); ram.add(plate);
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 14), M.metal(0xd0d5dd)); screw.position.y = 0.8; ram.add(screw);
    const wheelH = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 28), frameMat); wheelH.rotation.x = Math.PI / 2; wheelH.position.set(PX, 2.52, 0); root.add(wheelH);
    const NCH = 240, chips = crowd(NCH, new THREE.BoxGeometry(1, 1, 1), { rough: 0.6 }); root.add(chips);
    const ch = Array.from({ length: NCH }, () => { const a = rnd() * TAU, r = Math.sqrt(rnd()) * (HR - 0.12); return { x: r * Math.cos(a), z: r * Math.sin(a), v: rnd(), ry: rnd() * 3, sx: 0.7 + rnd() * 0.6, sz: 0.7 + rnd() * 0.6 }; });
    const solid = new THREE.Mesh(new THREE.CylinderGeometry(HR - 0.04, HR - 0.04, 1, 40), new THREE.MeshStandardMaterial({ color: 0xf2d98a, roughness: 0.55, transparent: true })); root.add(solid);
    const NDR = 14, wd = crowd(NDR, new THREE.SphereGeometry(0.035, 6, 5), { basic: true }); root.add(wd);
    const cWhey = new THREE.Color(COL.whey); for (let i = 0; i < NDR; i++) wd.tint(i, cWhey);
    const lPress = stage.label('', [PX, -0.12, 0.95], root, 'hot'); lPress.element.style.setProperty('--c', COL.fat);

    // ---------------------------------------------------------------- brine tank with half a wheel
    const BX = 3.15, T = { x0: BX - 1.5, x1: BX + 1.5, y0: 0.12, y1: 1.45, d: 1.6 };
    chamber(root, T.x0, T.x1, T.y0, T.y1, T.d, { color: 0xbfe3ff, opacity: 0.1 });
    const brineL = liquid(root, BX, T.y0, 0, T.x1 - T.x0 - 0.04, T.d - 0.04, 0x9fd0e8, 0.3); brineL.setLevel(1.12);
    const half = new THREE.Group(); root.add(half);
    const WR = 1.15;
    const rindMat = new THREE.MeshStandardMaterial({ color: 0xe9c56a, roughness: 0.7 });
    const halfCyl = new THREE.Mesh(new THREE.CylinderGeometry(WR, WR, 1, 48, 1, false, Math.PI / 2, Math.PI), rindMat); half.add(halfCyl);   // back half
    const face = board(half, 2 * WR, 1, 256, 128, () => {}, [0, 0, 0.002]);
    const drawFace = (S) => {
      const g = face.canvas.getContext('2d'), Wp = 256, Hp = 128, L = S.thick, Wcm = 46;   // a 46 cm wide wheel
      const img = g.createImageData(Wp, Hp);
      for (let j = 0; j < Hp; j++) for (let i = 0; i < Wp; i++) {
        const y = ((j + 0.5) / Hp) * L, x = ((i + 0.5) / Wp) * Wcm;
        const a = saltAt(y, L, S.days, 1), b = saltAt(x, Wcm, S.days, 1), k = clamp(1 - (1 - a) * (1 - b), 0, 1), o = (j * Wp + i) * 4;
        img.data[o] = lerp(240, 70, k); img.data[o + 1] = lerp(205, 150, k); img.data[o + 2] = lerp(110, 255, k); img.data[o + 3] = 255;
      }
      g.putImageData(img, 0, 0); face.tex.needsUpdate = true;
    };
    const lWheel = stage.label('', [BX, 2.05, 0.3], root, 'hot'); lWheel.element.style.setProperty('--c', '#6fb6ff');
    const lBrine = stage.label('', [BX, -0.12, T.d / 2], root);

    // ---------------------------------------------------------------- chart
    let S = { focus: 'press', kPa: 100, hours: 6, days: 3, brine: 20, thick: 12 }, key = '';
    const chart = board(root, 3.3, 2.0, 560, 340, (g, w, h) => {
      panelBg(g, w, h);
      if (S.focus === 'press') {
        title(g, 'In the press', '');
        const { X, Y, x0, x1 } = axes(g, w, h, { x0: 62, y1: 54, y0: h - 46, xMin: 0, xMax: 24, yMin: 0, yMax: 100, xTicks: [0, 6, 12, 18, 24], yTicks: [0, 50, 100], xFmt: (v) => v + (v === 24 ? ' h' : ''), yFmt: (v) => v + '%' });
        const a = [], b = []; for (let t = 0; t <= 24; t += 0.5) { a.push([t, knit(S.kPa, t) * 100]); b.push([t, ((M0 - pressMoisture(M0, S.kPa, t)) / 4.5) * 100]); }
        line(g, a, X, Y, COL.fat, 5); line(g, b, X, Y, COL.whey, 4, [8, 5]);
        g.font = 'bold 17px sans-serif'; g.fillStyle = COL.fat; g.fillText('chips knitted', x0 + 150, 34); g.fillStyle = COL.whey; g.fillText('whey pressed out', x0 + 290, 34);
        dot(g, X(S.hours), Y(knit(S.kPa, S.hours) * 100), COL.fat, 9);
        return;
      }
      title(g, 'Salt across the wheel', '');
      const { X, Y, x0, x1 } = axes(g, w, h, { x0: 62, y1: 54, y0: h - 46, xMin: 0, xMax: S.thick, yMin: 0, yMax: 26, xTicks: [0, S.thick / 4, S.thick / 2, (3 * S.thick) / 4, S.thick], yTicks: [0, 5, 10, 15, 20, 25], xFmt: (v) => (v === S.thick ? v + ' cm' : v === S.thick / 2 ? 'centre' : v === 0 ? 'rind' : ''), yFmt: (v) => v + '%' });
      const pts = []; for (let i = 0; i <= 80; i++) { const x = (i / 80) * S.thick; pts.push([x, saltAt(x, S.thick, S.days, S.brine)]); }
      line(g, pts, X, Y, '#6fb6ff', 5);
      const mean = saltMean(S.thick, S.days, S.brine);
      dashH(g, x0, x1, Y(mean), `evens out to ${mean.toFixed(1)}%`, 'rgba(255,255,255,.7)');
      note(g, 'salt in the cheese\'s water', x0 + 8, 52, 'rgba(255,255,255,.6)', 15);
    }, [3.2, 3.95, 0]);

    const st = { h: 0, k: 0 };
    return {
      update(dt, s, time) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        fitNarrow(stage, [lSlab, lBrine]);
        chart.mesh.visible = reelChart(stage, chart) && (inReel() || stage.host.clientWidth >= 560);
        // press
        const kn = knit(s.kPa, s.hours), squeezed = (M0 - pressMoisture(M0, s.kPa, s.hours)) / 4.5;
        st.k += (kn - st.k) * (1 - Math.exp(-dt * 6));
        const H = H0 * (0.92 - 0.3 * clamp(0.5 * st.k + 0.5 * squeezed, 0, 1)) * (s.kPa > 0 || s.hours > 0 ? 1 : 1.04);
        const cc = new THREE.Color(0xfbf3d2).lerp(new THREE.Color(0xf2d98a), st.k);
        ch.forEach((c, i) => { chips.put(i, PX + c.x, BY + 0.05 + c.v * (H - 0.1), c.z, 0.13 * c.sx * (1 + st.k * 0.5), 0.07 * (1 + st.k * 0.3), 0.13 * c.sz * (1 + st.k * 0.5)); chips.tint(i, cc); });
        chips.done();
        solid.scale.y = H - 0.02; solid.position.set(PX, BY + H / 2, 0); solid.material.opacity = smooth(st.k); solid.visible = st.k > 0.03;
        ram.position.set(PX, BY + H + 0.05 + (s.kPa > 0 ? 0 : 0.35), 0);
        wheelH.rotation.z = -s.hours * 0.5 - s.kPa * 0.02;
        const rate = s.kPa > 0 ? clamp((s.kPa / 100) * Math.exp(-s.hours / 5), 0, 1) : 0;
        for (let i = 0; i < NDR; i++) {
          if (i >= Math.round(rate * NDR)) { wd.hide(i); continue; }
          const u = (time * 0.9 + i * 0.37) % 1, a = (i / NDR) * TAU;
          wd.put(i, PX + (HR + 0.03) * Math.cos(a), BY + 0.1 - u * 0.2, (HR + 0.03) * Math.sin(a), 1 - u * 0.5);
        }
        wd.done();
        slabs.forEach((m, i) => { m.scale.y = 1 - 0.06 * i * (0.5 + 0.5 * Math.sin(time * 0.7)); });
        lPress.element.innerHTML = s.kPa <= 0 ? 'no pressure: loose chips' : `<b>${s.kPa} kPa</b> for <b>${s.hours} h</b>: ${(kn * 100).toFixed(0)}% knitted`;
        // brine
        const th = (s.thick / 24) * 1.0 + 0.0, hh = Math.max(0.16, th);
        half.position.set(BX, 1.12 - hh * 0.38, 0.1); halfCyl.scale.y = hh; face.mesh.scale.y = hh;
        const sm = saltMean(s.thick, s.days, s.brine), centre = saltAt(s.thick / 2, s.thick, s.days, s.brine);
        lWheel.element.innerHTML = `centre: <b>${centre.toFixed(1)}%</b> salt in its water · rind: <b>${s.brine}%</b>`;
        lBrine.element.innerHTML = `brine ${s.brine}% · salt front about ${(2 * Math.sqrt(D_SALT * s.days)).toFixed(1)} cm in`;
        const k = `${s.focus}|${s.kPa}|${s.hours}|${s.days}|${s.brine}|${s.thick}`;
        if (k !== key) { key = k; chart.redraw(); drawFace(s); }
      },
      readout: (s) => {
        if (s.focus === 'press') {
          const kn = knit(s.kPa, s.hours), m = pressMoisture(M0, s.kPa, s.hours);
          return `<div class="big">${kn > 0.9 ? 'One solid block' : kn > 0.5 ? 'Knitting, some cracks' : 'Loose, open curd'}</div>
            <div class="row"><span>Chips knitted together</span><b>${(kn * 100).toFixed(0)}%</b></div>
            <div class="row"><span>Water in the cheese</span><b>${M0}% → ${m.toFixed(1)}%</b></div>
            <div class="row"><span>Salt (1.7%) as a share of that water</span><b>about ${((1.7 / m) * 100).toFixed(1)}%</b></div>
            <small>Illustrative press curves. A typical Cheddar is pressed overnight and ends at 37–39% water with 4.5–5.5% salt in that water.</small>`;
        }
        const sm = saltMean(s.thick, s.days, s.brine), c = saltAt(s.thick / 2, s.thick, s.days, s.brine), depth = 2 * Math.sqrt(D_SALT * s.days);
        return `<div class="big">Depth ≈ 2√(D·t)</div>
          <div class="row"><span>Salt front after ${s.days} days</span><b>about ${depth.toFixed(1)} cm in</b></div>
          <div class="row"><span>Salt in water at the centre</span><b>${c.toFixed(1)}%</b></div>
          <div class="row"><span>Average once it evens out</span><b>${sm.toFixed(1)}%</b></div>
          <div class="row"><span>Water activity then</span><b>${awOfSM(sm).toFixed(3)}</b></div>
          <small>D ≈ 0.2 cm² per day for salt in cheese (Geurts, Walstra and Mulder, 1974). Most cheeses aim for about 4–6% salt in their water.</small>`;
      },
      dispose() { stage.setShift(0, 0); },
    };
  },
};
