// Chapter 3: cut, cook and drain. The set curd is one big gel holding all the water. Cutting it into
// cubes lets whey out, and the size of the cube, the cooking temperature and the stirring time decide
// how wet the cheese will be. The moisture curve is illustrative, tuned to typical recipes (see
// cheese.js, curdMoisture; University of Guelph Cheese Making Technology e-book: Cheddar cooked to
// 39 °C in 30 minutes; Italian grating types cooked to 52–55 °C; Camembert cut large and not cooked).
// A cube shrinks because its casein net tightens and squeezes whey out (syneresis): if a fresh gel is
// 87% water and the curd ends at 40%, the same solids take up about a fifth of the volume.
// Yield from the Van Slyke formula; whey is what is left of the milk.
// The vat (1 unit ≈ 30 cm) is drawn with far fewer, far bigger cubes than a real one. The single
// cube on the right is life size against a ruler: 1 unit = 2 cm.
import { THREE, M } from '../kit.js';
import {
  COL, MILK, RECIPES, curdMoisture, styleOf, yieldPct, RHO_MILK, hex, rng, crowd, chamber, liquid, thermometer, flowArrow,
  board, panelBg, axes, title, line, dot, note, dashH, fitNarrow, reelChart, inReel, clamp, lerp, smooth, box, beam, TAU,
} from '../cheese.js';

const VIEW = { pos: [0.6, 2.6, 7.7], target: [0.6, 2.0, 0] };
const V = { x0: -3.1, x1: 1.2, y0: 0.35, y1: 1.75, d: 1.4 };   // inside of the vat
const NMAX = 900;
const vis = (mm) => 0.083 + 0.0135 * mm;                         // drawn cube edge in the vat
const shrinkOf = (moist) => Math.cbrt(0.13 / (1 - moist / 100)); // linear shrink from an 87% water gel

export default {
  id: 'cut',
  short: 'Cut, cook, drain',
  title: 'Cut, cook and drain',
  subtitle: 'The size of the curd cube and the heat of the vat decide whether you get a soft Camembert or a hard Parmesan.',
  view: VIEW,
  learn: `<p>A freshly set vat is one giant, wobbly gel. All the water is still inside it. To make cheese, the whey has to come out.</p>
    <p>So the cheesemaker <b>cuts</b> the curd with a frame of wires or blades, often called a curd knife or harp. Every cut face is a door for whey. <b>Small cubes</b> have far more surface for their size, so they lose whey fast and make a <b>dry, hard</b> cheese. <b>Big cubes</b> keep their water and make a <b>soft</b> one. Parmesan curd is cut as small as rice grains. Camembert curd is ladled in lumps two centimetres wide.</p>
    <p>Then comes <b>cooking and stirring</b>. Warming the vat makes the casein net tighten and squeeze out whey. This squeezing is called <b>syneresis</b>. Cheddar is cooked gently to about 39 °C. Emmental and Parmesan go up to 52 to 55 °C. Stirring keeps the cubes apart so they shrink evenly instead of matting together.</p>
    <p>All this time the starter bacteria keep making lactic acid, which also helps the curd shrink and will decide how the cheese stretches and ages.</p>
    <p>At last the whey is <b>drained</b>. About nine-tenths of the milk leaves here. Whey is not waste: dairies dry it into whey powder and whey protein, and Italian ricotta is made by heating it.</p>
    <p class="tip"><b>Try it:</b> press a recipe button, then change just the cube size and watch the water in the cheese rise and fall. Then cook hotter. Can you make a cheese under 39% water, the FSSAI limit for hard cheese?</p>`,
  terms: [
    { t: 'Curd knife (harp)', d: 'A frame strung with wires or blades that slices the set curd into even cubes.' },
    { t: 'Syneresis', d: 'A gel shrinking and squeezing out its liquid. In a cheese vat, curd squeezing out whey.' },
    { t: 'Cooking (scalding)', d: 'Slowly warming the cut curd in its whey so that it firms and dries.' },
    { t: 'Whey', d: 'The liquid that drains off: water, lactose, whey proteins and some minerals.' },
    { t: 'Moisture', d: 'The share of a cheese that is water. Above 50% is soft, under about 39% is hard.' },
  ],
  defaults: { size: 7, T: 39, stir: 60, drain: false },
  controls: [
    { key: 'size', type: 'range', label: 'Cube size when cut', min: 2, max: 25, step: 0.5, ends: ['2 mm rice grain', '25 mm'], fmt: (v) => `${v} mm` },
    { key: 'T', type: 'range', label: 'Cook the curd to', min: 30, max: 56, step: 1, ends: ['30 °C no cooking', '56 °C'], fmt: (v) => `${v} °C` },
    { key: 'stir', type: 'range', label: 'Stir for', min: 5, max: 90, step: 5, ends: ['5 min', '90 min'], fmt: (v) => `${v} min` },
    { key: 'drain', type: 'toggle', label: 'Drain the whey' },
    { type: 'buttons', label: 'Typical recipes', items: RECIPES.map((r) => ({ label: r.n, act: (s) => { s.size = r.size; s.T = r.T; s.stir = r.stir; } })) },
  ],
  quiz: [
    { q: 'Why does cutting curd into smaller cubes make a drier cheese?', options: ['Small cubes are colder', 'Small cubes have more surface for their size, so more whey escapes', 'Small cubes contain less fat', 'The knife squeezes them'], answer: 1, why: 'Whey leaves through the cut faces. Halve the cube size and you double the surface for the same amount of curd.' },
    { q: 'What does cooking the curd do?', options: ['Kills all the starter bacteria', 'Makes the casein net tighten and squeeze out more whey', 'Melts the curd into a liquid', 'Adds water to the curd'], answer: 1, why: 'Warmth makes the protein net shrink, which is syneresis. Hotter cooking gives a drier, harder cheese.' },
    { q: 'Roughly how much of the milk leaves the vat as whey when making hard cheese?', options: ['About a tenth', 'About half', 'About nine-tenths', 'None'], answer: 2, why: 'Only about 10 kg of cheese comes from 100 kg of cow milk. The rest drains away as whey.' },
  ],
  reel: [
    { ms: 5600, caption: 'Cutting lets the whey out. Small cubes cooked hot make hard cheese, and big cubes make soft cheese.', set: { T: 39, stir: 60, drain: false }, anim: { size: [24, 3] }, view: { pos: [0, 2.4, 7.4], target: [0, 1.45, 0] }, spin: 0.05 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(31);
    const floor = box(10.4, 0.1, 3.4, M.matte(0x2b3039)); floor.position.set(0.6, 0.05, 0.1); root.add(floor);

    // ---------------------------------------------------------------- the vat
    const steel = M.metal(0xc3c8d0, { roughness: 0.35, side: THREE.DoubleSide });
    const cx = (V.x0 + V.x1) / 2, w = V.x1 - V.x0, h = V.y1 - V.y0;
    const back = box(w + 0.12, h + 0.1, 0.06, steel); back.position.set(cx, V.y0 + h / 2, -V.d / 2 - 0.03); root.add(back);
    const bottom = box(w + 0.12, 0.08, V.d + 0.12, steel); bottom.position.set(cx, V.y0 - 0.04, 0); root.add(bottom);
    [V.x0 - 0.03, V.x1 + 0.03].forEach((x) => { const sd = box(0.06, h + 0.1, V.d + 0.12, steel); sd.position.set(x, V.y0 + h / 2, 0); root.add(sd); });
    const front = box(w + 0.12, h + 0.1, 0.04, M.clear(0xe6f6ff, 0.12)); front.position.set(cx, V.y0 + h / 2, V.d / 2 + 0.02); root.add(front);
    [[V.x0 + 0.3, -0.5], [V.x0 + 0.3, 0.5], [V.x1 - 0.3, -0.5], [V.x1 - 0.3, 0.5]].forEach(([x, z]) => root.add(beam([x, 0.1, z], [x, V.y0 - 0.04, z], 0.06, M.metal(0x8c95a3))));
    const whey = liquid(root, cx, V.y0, 0, w - 0.02, V.d - 0.02, hex(COL.whey), 0.42);
    const cubes = crowd(NMAX, new THREE.BoxGeometry(1, 1, 1), { rough: 0.6 }); cubes.castShadow = false; root.add(cubes);
    const cp = Array.from({ length: NMAX }, () => ({ u: rnd(), v: rnd(), w: rnd(), ph: rnd() * TAU, ry: rnd() * TAU }));
    // the harp: a frame with upright wires, riding a rail above the vat
    const harp = new THREE.Group(); root.add(harp);
    const fm = M.metal(0xe0e4ea);
    harp.add(beam([0, V.y0 + 0.08, -V.d / 2 + 0.12], [0, V.y1 + 0.55, -V.d / 2 + 0.12], 0.025, fm), beam([0, V.y0 + 0.08, V.d / 2 - 0.12], [0, V.y1 + 0.55, V.d / 2 - 0.12], 0.025, fm), beam([0, V.y0 + 0.08, -V.d / 2 + 0.12], [0, V.y0 + 0.08, V.d / 2 - 0.12], 0.025, fm), beam([0, V.y1 + 0.55, -V.d / 2 - 0.1], [0, V.y1 + 0.55, V.d / 2 + 0.1], 0.04, fm));
    for (let i = 1; i < 9; i++) { const z = -V.d / 2 + 0.12 + (i / 9) * (V.d - 0.24); harp.add(beam([0, V.y0 + 0.08, z], [0, V.y1 + 0.5, z], 0.008, fm, 5)); }
    const rail = beam([V.x0 - 0.1, V.y1 + 0.55, -V.d / 2 - 0.1], [V.x1 + 0.1, V.y1 + 0.55, -V.d / 2 - 0.1], 0.03, M.metal(0x8c95a3)); root.add(rail);
    const th = thermometer(root, V.x1 - 0.25, V.y0 + 0.5, V.d / 2 - 0.2, 1.5);
    const lHarp = stage.label('curd knife (harp)', [0, V.y1 + 0.85, 0], harp);
    const lVat = stage.label('', [(V.x0 + V.x1) / 2, V.y0 - 0.22, V.d / 2 + 0.1], root, 'hot'); lVat.element.style.setProperty('--c', COL.whey);

    // ---------------------------------------------------------------- one cube, life size, with a ruler
    const OX = 2.45, OY = 0.45;
    const ruler = box(1.7, 0.03, 0.18, M.matte(0xd8c27a)); ruler.position.set(OX + 0.75, OY - 0.02, 0.5); root.add(ruler);
    for (let i = 0; i <= 3; i++) { const t = box(0.012, 0.04, 0.18, M.matte(0x2b2b2b)); t.position.set(OX + i * 0.5, OY, 0.5); t.castShadow = false; root.add(t); stage.label(`${i}${i === 3 ? ' cm' : ''}`, [OX + i * 0.5, OY - 0.22, 0.62], root).element.style.cssText += 'border:0;background:none;padding:0;font-size:11px;'; }
    const cubeMat = new THREE.MeshStandardMaterial({ color: 0xfdfbf3, roughness: 0.45 });
    const cube = box(1, 1, 1, cubeMat); root.add(cube);
    const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); root.add(ghost);
    const drops = crowd(36, new THREE.SphereGeometry(0.03, 6, 5), { basic: true }); root.add(drops);
    const cWhey = new THREE.Color(COL.whey); for (let i = 0; i < 36; i++) drops.tint(i, cWhey);
    const dd = Array.from({ length: 36 }, () => { const u = rnd() * 2 - 1, a = rnd() * TAU, q = Math.sqrt(1 - u * u); return { d: [q * Math.cos(a), Math.abs(u) * 0.6, q * Math.sin(a)], t: rnd() }; });
    const lCube = stage.label('', [OX + 0.75, OY + 1.7, 0.3], root, 'hot'); lCube.element.style.setProperty('--c', COL.casein);

    // ---------------------------------------------------------------- chart
    let S = { size: 7, T: 39, stir: 60, drain: false }, key = '';
    const chart = board(root, 3.3, 2.0, 560, 340, (g, wd, hh) => {
      panelBg(g, wd, hh); title(g, 'Water in the cheese', '');
      const { X, Y, x0, x1 } = axes(g, wd, hh, { x0: 62, y1: 54, y0: hh - 46, xMin: 2, xMax: 25, yMin: 28, yMax: 58, xTicks: [2, 5, 10, 15, 20, 25], yTicks: [30, 40, 50], xFmt: (v) => v + (v === 25 ? ' mm' : ''), yFmt: (v) => v + '%' });
      dashH(g, x0, x1, Y(39), 'hard cheese: 39% or less', 'rgba(255,255,255,.6)');
      [[32, '#8fb0ff'], [39, '#ffd166'], [55, '#ff7a59']].forEach(([T, c]) => {
        const pts = []; for (let d = 2; d <= 25; d += 0.5) pts.push([d, curdMoisture(d, T, S.stir)]);
        line(g, pts, X, Y, c, 3, [7, 5]); note(g, T + ' °C', X(25) - 4, Y(curdMoisture(25, T, S.stir)) - 8, c, 16, 'right');
      });
      const pts = []; for (let d = 2; d <= 25; d += 0.5) pts.push([d, curdMoisture(d, S.T, S.stir)]);
      line(g, pts, X, Y, '#ffffff', 4);
      dot(g, X(S.size), Y(curdMoisture(S.size, S.T, S.stir)), COL.fat, 9);
      note(g, 'cube size when cut', x1, hh - 6, 'rgba(255,255,255,.6)', 15, 'right');
    }, [3.2, 3.95, 0]);

    const st = { drain: 0, m: 40, d: 0.18 };
    return {
      update(dt, s, time) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        fitNarrow(stage, [lHarp]);
        chart.mesh.visible = reelChart(stage, chart) && (inReel() || stage.host.clientWidth >= 560);
        const moist = curdMoisture(s.size, s.T, s.stir);
        const kk = 1 - Math.exp(-dt * 5);
        st.m += (moist - st.m) * kk; st.d += (vis(s.size) - st.d) * kk;
        st.drain += ((s.drain ? 1 : 0) - st.drain) * (1 - Math.exp(-dt * 1.6));
        const sh = shrinkOf(st.m), d0 = st.d, d = d0 * sh, dr = smooth(st.drain);
        // how many cubes: the gel filled the vat before cutting
        const n = Math.min(NMAX, Math.round((w * h * V.d * 0.8) / (d0 * d0 * d0)));
        const perRow = Math.max(1, Math.floor((w - 0.1) / (d * 1.04))), perZ = Math.max(1, Math.floor((V.d - 0.1) / (d * 1.04)));
        const fillY = V.y0 + (V.y1 - V.y0) * 0.92;
        const curdCol = new THREE.Color(0xfdfbf3).lerp(new THREE.Color(0xf6e3a8), clamp((s.T - 32) / 24, 0, 1) * 0.6);
        for (let i = 0; i < NMAX; i++) {
          if (i >= n) { cubes.hide(i); continue; }
          const p = cp[i];
          const fx = V.x0 + 0.1 + d / 2 + p.u * (w - 0.2 - d) + Math.sin(time * 0.6 + p.ph) * 0.12 * (1 - dr);
          const fy = V.y0 + d / 2 + 0.03 + p.v * (fillY - V.y0 - d - 0.06) * (0.55 + 0.45 * sh) + Math.cos(time * 0.8 + p.ph) * 0.05 * (1 - dr);
          const fz = (p.w - 0.5) * (V.d - 0.2 - d);
          const ix = i % perRow, iz = Math.floor(i / perRow) % perZ, iy = Math.floor(i / (perRow * perZ));
          const px = V.x0 + 0.06 + d * 0.52 + ix * d * 1.04, pz = -V.d / 2 + 0.06 + d * 0.52 + iz * d * 1.04, py = V.y0 + d / 2 + iy * d * 1.02;
          cubes.put(i, lerp(fx, px, dr), lerp(fy, py, dr), lerp(fz, pz, dr), d * 0.96); cubes.tint(i, curdCol);
        }
        cubes.done();
        whey.setLevel(lerp(fillY, V.y0 + 0.02, dr));
        harp.position.x = cx + Math.sin(time * 0.45) * (w / 2 - 0.25) * (1 - dr) + (V.x0 + 0.2 - cx) * dr;
        th.set((s.T - 20) / 40);
        lVat.element.innerHTML = s.drain ? 'whey drained: the curd mats together' : `curd cubes in whey at <b>${s.T} °C</b> (cubes drawn bigger than life)`;
        // the single cube against the ruler: 1 unit = 2 cm
        const a0 = (s.size / 20), a = a0 * shrinkOf(st.m);
        cube.scale.setScalar(a); cube.position.set(OX + a0 / 2, OY + a / 2, 0); cubeMat.color.copy(curdCol);
        ghost.scale.setScalar(a0); ghost.position.set(OX + a0 / 2, OY + a0 / 2, 0);
        dd.forEach((q, i) => { q.t = (q.t + dt * 0.45) % 1; const r = a / 2 + q.t * 0.45; drops.put(i, OX + a0 / 2 + q.d[0] * r, OY + a / 2 + q.d[1] * r - q.t * q.t * 0.25, q.d[2] * r, (1 - q.t) * clamp(a0 * 1.5, 0.4, 1.3)); });
        drops.done();
        lCube.element.innerHTML = `one cube: cut <b>${s.size} mm</b>, shrinks to <b>${(s.size * shrinkOf(moist)).toFixed(1)} mm</b>`;
        const k = `${s.size}|${s.T}|${s.stir}`;
        if (k !== key) { key = k; chart.redraw(); }
      },
      readout: (s) => {
        const m = curdMoisture(s.size, s.T, s.stir), sty = styleOf(m), Y = yieldPct(MILK.cow, m);
        return `<div class="big" style="color:${sty.col}">${sty.n}</div>
          <div class="row"><span>Water in the young cheese</span><b>${m.toFixed(0)}%</b></div>
          <div class="row"><span>Cheese from 100 litres of cow milk</span><b>${(Y * RHO_MILK).toFixed(1)} kg</b></div>
          <div class="row"><span>Whey drained</span><b>${(100 - Y).toFixed(0)}% of the milk</b></div>
          <small>Illustrative curve tuned to typical recipes. Wetter cheese weighs more per litre of milk, but it keeps for a shorter time.</small>`;
      },
      dispose() { stage.setShift(0, 0); },
    };
  },
};
