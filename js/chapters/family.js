// Chapter 6: the cheese family. One map (water against age) holds almost every cheese, and a hot
// tawa shows why they behave so differently when heated.
// Typical moisture and age figures: Fox et al., Fundamentals of Cheese Science; Codex and FSSAI
// standards (FSSAI: hard pressed cheese ≤ 39% moisture, processed cheese ≤ 47%, paneer ≤ 70%).
// Melting points after McGee, On Food and Cooking (2004): soft cheeses about 55 °C, Cheddar and
// Swiss types about 65 °C, Parmesan about 82 °C. Browning (Maillard) needs a dry surface well above
// 120 °C. Mozzarella stretches because its rennet curd was soured to about pH 5.2–5.4, where enough
// calcium has left the casein for it to flow into fibres (Food Technology and Biotechnology 59, 2021).
// Processed cheese: emulsifying salts (sodium citrate, phosphates) bind calcium, so the casein
// spreads out and coats the fat (Gerber & Stettler 1911; Kraft's US patent 1,186,524 of 1916).
// Indian cheeses are placed from descriptions, not lab tables: treat their dots as approximate.
import { THREE, M } from '../kit.js';
import {
  COL, FAMILY, BEHAVE, fmtAge, hex, rng, crowd, board, panelBg, note, dot, fitNarrow, reelChart, inReel, clamp, lerp, smooth, box, beam, TAU,
} from '../cheese.js';

const VIEW = { pos: [0.6, 2.6, 7.7], target: [0.6, 2.0, 0] };
const byKey = Object.fromEntries(FAMILY.map((f) => [f.k, f]));
const WHY = {
  stretch: 'The casein has lost just enough calcium to slide into long fibres, so it pulls into strings.',
  flow: 'Heat melts the fat and loosens the casein net, so the slice slumps and flows.',
  smooth: 'Emulsifying salts have taken the calcium, so casein coats every fat droplet and nothing separates.',
  soften: 'Too little water and a tight, broken-down protein net: it softens and toasts instead of flowing.',
  hold: 'This curd was set by acid, with heat. Its casein sits in tight clumps with whey protein bonded in, and heat does not loosen them.',
};
const xOf = (weeks) => Math.max(0.1, weeks);

export default {
  id: 'family',
  short: 'The cheese family',
  title: 'The cheese family',
  subtitle: 'Wet or dry, young or old: two numbers sort almost every cheese. Put a slice on a hot tawa to see how each one behaves.',
  view: VIEW,
  learn: `<p>There are many hundreds of named cheeses, by some counts over a thousand, but they are all answers to two questions: <b>how much water</b> is left in the curd, and <b>how long</b> is it aged? Wet cheeses are soft and must be eaten young. Dry cheeses are hard and can ripen for years.</p>
    <p><b>Mozzarella</b> belongs to the <i>pasta filata</i>, or stretched-curd, family. Its curd is left to sour to about <b>pH 5.2</b>, then kneaded in hot water. At that acidity just enough calcium has left the casein for it to flow into long, lined-up fibres. That is the pizza pull. India's <b>kalari</b>, from Udhampur in Jammu, is a stretched cheese too.</p>
    <p><b>Processed cheese</b>, the kind in tins, cubes and slices, is real cheese that has been ground and melted with <b>emulsifying salts</b> such as sodium citrate. The salts grab the calcium, the casein unfolds and wraps every droplet of fat, and the result melts smooth without going oily. It was invented in Switzerland in 1911 and patented by James L. Kraft in 1916.</p>
    <p><b>Paneer</b> and Bengal's smoky <b>Bandel</b> are set with acid, not rennet. They hold their shape on a hot tawa and brown instead of melting (see <a href="https://glassbox.how/paneerclear/">PaneerClear</a>). Hard <b>churpi</b> from the Himalaya is dried and smoked until it is like a stone, and is chewed for hours.</p>
    <p>In India the FSSAI standard for cheese names <b>non-animal rennet</b>, so the cheese in shops is made with microbial or fermentation-made enzymes and carries the green vegetarian mark. Its rules also set limits: at most 39% water in hard pressed cheese and 47% in processed cheese.</p>
    <p>Related boxes: <a href="https://glassbox.how/curdclear/">CurdClear</a>, <a href="https://glassbox.how/butterclear/">ButterClear</a>, <a href="https://glassbox.how/gheeclear/">GheeClear</a> and <a href="https://glassbox.how/icecreamclear/">IceCreamClear</a>.</p>
    <p class="tip"><b>Try it:</b> pick mozzarella and heat the tawa past 60 °C to pull strings. Now try paneer: nothing melts. Then find the driest and the oldest cheese on the map.</p>`,
  terms: [
    { t: 'Pasta filata', d: 'Italian for "spun paste": cheeses such as mozzarella whose curd is stretched in hot water.' },
    { t: 'Emulsifying salts', d: 'Sodium citrate or phosphates that bind calcium so melted cheese stays smooth.' },
    { t: 'Processed cheese', d: 'Natural cheese ground, melted with emulsifying salts and set again. It keeps long and melts evenly.' },
    { t: 'Bloomy rind', d: 'A soft white coat of mould, as on Camembert and Brie.' },
    { t: 'Churpi', d: 'A Himalayan cheese of yak or cow milk. The hard kind is dried and smoked.' },
    { t: 'Non-animal rennet', d: 'Clotting enzymes from moulds or fermentation, used for the cheese sold in India.' },
  ],
  defaults: { pick: 'mozz', T: 25 },
  controls: [
    { key: 'pick', type: 'seg', label: 'Cheese', options: FAMILY.map((f) => ({ v: f.k, label: f.n })) },
    { key: 'T', type: 'range', label: 'Heat the tawa to', min: 20, max: 200, step: 1, ends: ['20 °C', '200 °C'], fmt: (v) => `${v} °C` },
  ],
  quiz: [
    { q: 'Why does mozzarella pull into long strings when hot?', options: ['It has extra fat', 'At about pH 5.2 its casein has lost enough calcium to flow into fibres', 'It contains gluten', 'It is made with more rennet'], answer: 1, why: 'The curd is soured to about pH 5.2 to 5.4 and stretched in hot water, which lines the casein up into fibres.' },
    { q: 'What do emulsifying salts do in processed cheese?', options: ['Add flavour only', 'Bind calcium so casein coats the fat and the melt stays smooth', 'Make it harder', 'Kill the mould'], answer: 1, why: 'With its calcium taken, casein spreads out and holds fat and water together, so the cheese does not turn oily.' },
    { q: 'Paneer on a hot tawa browns but does not melt. Why?', options: ['It has no fat', 'It was set with acid and heat, which locks the proteins together', 'It is too salty', 'It is too old'], answer: 1, why: 'Acid-heat curd is tight clumps of casein with whey protein bonded in. Heat does not loosen it, so it keeps its shape.' },
  ],
  reel: [
    { ms: 5400, caption: 'Mozzarella stretches because its casein is lined up in fibres. Paneer just browns.', set: { pick: 'mozz' }, anim: { T: [25, 95] }, view: { pos: [-1.3, 2.2, 5.4], target: [-1.3, 1.35, 0] }, spin: 0.1 },
    { ms: 5200, caption: 'Wet and young or dry and old: every cheese is a point on the same map.', set: { pick: 'parmesan', T: 25 }, view: { pos: [3.18, 2.9, 4.6], target: [3.18, 2.9, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(71);
    const floor = box(10.4, 0.1, 3.4, M.matte(0x2b3039)); floor.position.set(0.6, 0.05, 0.1); root.add(floor);

    // ---------------------------------------------------------------- the tawa on a burner
    const PX = -1.35, PY = 0.62;
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.34, 32), M.metal(0x4a4f5a)); burner.position.set(PX, 0.27, 0); root.add(burner);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff5a1e, transparent: true, opacity: 0, toneMapped: false });
    const glow = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 40), glowMat); glow.rotation.x = Math.PI / 2; glow.position.set(PX, 0.47, 0); root.add(glow);
    const tawa = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.6, 0.1, 56), new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.55, metalness: 0.6 })); tawa.position.set(PX, PY - 0.05, 0); tawa.castShadow = true; root.add(tawa);
    const hnd = beam([PX - 1.7, PY - 0.03, 0], [PX - 2.35, PY + 0.1, 0.5], 0.06, M.matte(0x1c1f26)); root.add(hnd);
    const sliceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.2, 6), sliceMat); slice.rotation.y = Math.PI / 6; slice.castShadow = true; root.add(slice);
    // a fork that lifts a corner
    const fork = new THREE.Group(); root.add(fork);
    const fm = M.metal(0xdfe3ea);
    fork.add(beam([0, 0, 0], [0.9, 0.55, 0.2], 0.035, fm));
    [-0.09, 0, 0.09].forEach((z) => fork.add(beam([0, 0, z], [-0.32, -0.1, z], 0.014, fm, 6)));
    fork.add(beam([0, 0, -0.09], [0, 0, 0.09], 0.016, fm, 6));
    const NS = 7, strings = crowd(NS, (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 8); g.translate(0, 0.5, 0); return g; })(), { rough: 0.35 }); root.add(strings);
    const sp = Array.from({ length: NS }, (_, i) => ({ x: (rnd() - 0.5) * 0.5, z: (rnd() - 0.5) * 0.4, tx: -0.3 + rnd() * 0.12, tz: (i / (NS - 1) - 0.5) * 0.2 }));
    const oil = crowd(26, new THREE.SphereGeometry(0.03, 8, 6), { rough: 0.1 }); root.add(oil);
    const op = Array.from({ length: 26 }, () => { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 0.8; return [r * Math.cos(a), r * Math.sin(a)]; });
    const cOil = new THREE.Color(0xffc23a); for (let i = 0; i < 26; i++) oil.tint(i, cOil);
    const lName = stage.label('', [PX, 2.55, 0], root, 'hot');
    const lTawa = stage.label('', [PX, 0.02, 1.75], root);

    // ---------------------------------------------------------------- the map
    let S = { pick: 'mozz', T: 25 }, key = '';
    const MW = 500, MH = 470;
    const chart = board(root, 3.5, 3.29, MW * 2, MH * 2, (g) => {
      const w = MW, h = MH; g.setTransform(2, 0, 0, 2, 0, 0);
      panelBg(g, w, h);
      g.fillStyle = COL.text; g.font = 'bold 22px sans-serif'; g.fillText('The cheese map', 16, 30);
      const x0 = 52, x1 = w - 14, y0 = h - 48, y1 = 58, L = Math.log10;
      const X = (wk) => x0 + ((L(xOf(wk)) - L(0.1)) / (L(160) - L(0.1))) * (x1 - x0), Y = (m) => y0 - ((m - 5) / 55) * (y0 - y1);
      // bands
      [[50, 60, 'soft', 'rgba(255,241,201,.10)'], [39, 50, 'semi-soft to semi-hard', 'rgba(255,200,97,.10)'], [30, 39, 'hard', 'rgba(255,181,71,.13)'], [5, 30, 'extra hard and dried', 'rgba(232,154,60,.10)']].forEach(([a, b, n, c]) => { g.fillStyle = c; g.fillRect(x0, Y(b), x1 - x0, Y(a) - Y(b)); note(g, n, x1 - 6, a === 5 ? Y(a) - 6 : Y(b) + 16, 'rgba(255,255,255,.4)', 14, 'right'); });
      g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1; g.font = '15px sans-serif'; g.fillStyle = 'rgba(255,255,255,.65)';
      [[0.1, 'fresh'], [1, '1 week'], [4.345, '1 month'], [26, '6 months'], [104, '2 years']].forEach(([t, n]) => { g.beginPath(); g.moveTo(X(t), y1); g.lineTo(X(t), y0); g.stroke(); g.fillText(n, X(t) - g.measureText(n).width / 2, y0 + 24); });
      [10, 20, 30, 40, 50, 60].forEach((m) => { g.beginPath(); g.moveTo(x0, Y(m)); g.lineTo(x1, Y(m)); g.stroke(); const t = m + '%'; g.fillText(t, x0 - 8 - g.measureText(t).width, Y(m) + 6); });
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
      note(g, 'age when eaten →', x1, h - 6, 'rgba(255,255,255,.7)', 15, 'right'); note(g, '↑ water in the cheese', x0 + 4, y1 - 8, 'rgba(255,255,255,.7)', 15);
      const off = { mozz: [12, -10], camembert: [10, 20], paneer: [12, -8], bandel: [12, -1], kalari: [12, 5], processed: [8, 24], blue: [12, -8], gouda: [-14, 6], swiss: [-12, 24], cheddar: [-12, -12], parmesan: [-12, 24], churpi: [-14, -12] };
      FAMILY.forEach((f) => {
        const on = f.k === S.pick, x = X(f.weeks), y = Y(f.moist);
        g.fillStyle = f.col; g.beginPath(); g.arc(x, y, on ? 11 : 7, 0, TAU); g.fill();
        g.strokeStyle = on ? '#ffffff' : 'rgba(0,0,0,.6)'; g.lineWidth = on ? 4 : 1.5; g.stroke();
        const [dx, dy] = off[f.k] || [12, 6]; g.font = `${on ? 'bold 19px' : '15px'} sans-serif`; g.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,.75)';
        const tw = g.measureText(f.n).width; g.fillText(f.n, dx < 0 ? x + dx - tw : x + dx, y + dy);
      });
    }, [3.18, 2.9, 0]);

    const st = { m: 0, T: 25 };
    const tmp = new THREE.Color(), brown = new THREE.Color(0xb06a24), black = new THREE.Color(0x3a2412);
    return {
      update(dt, s, time) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        const narrow = fitNarrow(stage, [lTawa], false);
        chart.mesh.visible = inReel() ? stage.camera.aspect > 0.75 || (stage.home && stage.home.target[0] > 2) : true;
        if (!inReel()) { chart.mesh.scale.setScalar(narrow ? 0.8 : 1); chart.mesh.position.set(narrow ? 3.3 : 3.18, narrow ? 1.42 : 2.9, 0); }
        const f = byKey[s.pick] || FAMILY[0];
        st.T += (s.T - st.T) * (1 - Math.exp(-dt * 6));
        const melts = f.beh !== 'hold';
        const mT = melts ? smooth(clamp((st.T - (f.melt - 6)) / 16, 0, 1)) : 0;
        st.m += (mT - st.m) * (1 - Math.exp(-dt * 4));
        const m = st.m, br = smooth(clamp((st.T - 135) / 55, 0, 1));
        const spread = f.beh === 'flow' ? 0.75 : f.beh === 'smooth' ? 0.85 : f.beh === 'stretch' ? 0.4 : f.beh === 'soften' ? 0.1 : 0;
        const sx = 1 + spread * m, sy = 1 - (spread * 0.75 + (f.beh === 'soften' ? 0.12 : 0)) * m;
        slice.scale.set(sx, sy, sx); slice.position.set(PX + 0.15, PY + 0.1 * sy, 0.1);
        sliceMat.color.set(f.col).lerp(brown, br * (melts ? 0.55 : 0.8)).lerp(black, clamp((st.T - 185) / 40, 0, 0.3));
        sliceMat.roughness = lerp(0.6, f.beh === 'smooth' ? 0.12 : 0.28, m);
        // fork lifts; strings follow for the stretchy ones
        const lift = 0.25 + 1.05 * (f.beh === 'stretch' ? m : 0.25 * m) + Math.sin(time * 1.2) * 0.04 * m;
        const fx = PX + 0.75, fy = PY + 0.2 * sy + lift, fz = 0.3;
        fork.position.set(fx, fy, fz);
        const stretchy = f.beh === 'stretch' && m > 0.05;
        sp.forEach((q, i) => {
          if (!stretchy) { strings.hide(i); return; }
          const bx = PX + 0.15 + q.x, by = PY + 0.2 * sy, bz = 0.1 + q.z, tx = fx + q.tx, ty = fy - 0.1, tz = fz + q.tz;
          const len = Math.hypot(tx - bx, ty - by, tz - bz), thick = 0.05 / (1 + len * 1.6);
          strings.aim(i, bx, by, bz, tx - bx, ty - by, tz - bz, len, thick); strings.tint(i, tmp.set(f.col));
        });
        strings.done();
        // old, fatty cheeses sweat oil when hot; processed cheese does not
        const oily = (f.k === 'cheddar' || f.k === 'parmesan' || f.k === 'swiss' || f.k === 'gouda') ? clamp((st.T - f.melt - 8) / 30, 0, 1) : 0;
        op.forEach((p, i) => { if (i < Math.round(oily * 26)) oil.put(i, PX + 0.15 + p[0] * sx * 0.8, PY + 0.2 * sy + 0.01, 0.1 + p[1] * sx * 0.8, 1, 0.4, 1); else oil.hide(i); });
        oil.done();
        glowMat.opacity = clamp((st.T - 40) / 160, 0, 0.9);
        const beh = BEHAVE[f.beh], state = !melts ? (br > 0.3 ? 'holds its shape and browns' : 'holds its shape') : m < 0.15 ? 'still solid' : beh.n.toLowerCase();
        lName.element.style.setProperty('--c', beh.col);
        lName.element.innerHTML = `<b>${f.n}</b> at ${Math.round(s.T)} °C: ${state}`;
        lTawa.element.innerHTML = melts ? `starts to melt near ${f.melt} °C` : 'acid-set: never flows';
        const k = `${s.pick}`;
        if (k !== key) { key = k; chart.redraw(); }
      },
      readout: (s) => {
        const f = byKey[s.pick] || FAMILY[0], beh = BEHAVE[f.beh];
        return `<div class="big">${f.n}</div>
          <div class="row"><span>Family</span><b>${f.kind}</b></div>
          <div class="row"><span>Water (typical)</span><b>about ${f.moist}%</b></div>
          <div class="row"><span>Eaten at</span><b>${f.weeks <= 0 ? 'fresh, within days' : fmtAge(f.weeks)}</b></div>
          <div class="row"><span>On the tawa</span><b style="color:${beh.col}">${beh.n}${f.melt < 900 ? ` from about ${f.melt} °C` : ''}</b></div>
          <small>${f.how} ${WHY[f.beh]}</small>`;
      },
      dispose() { stage.setShift(0, 0); },
    };
  },
};
