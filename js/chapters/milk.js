// Chapter 1: what is in milk, and the four ingredients of cheese.
// Bench view (1 scene unit ≈ 10 cm for the props). The tall column is 100 g of milk drawn to scale
// by weight (typical composition: Walstra, Wouters & Geurts 2006 for cow; Indian reports for buffalo).
// Sliding "Make cheese" splits it into what the curd keeps and what leaves as whey, by the Van Slyke
// & Price yield formula: cheese per 100 kg milk = (0.93·fat + casein − 0.1) × 1.09 ÷ (1 − moisture).
// So 93% of the fat and all but 0.1 of the casein stay; nearly all the lactose and whey protein leave.
// Microscope view: the window is about 1.5 µm wide. A casein micelle is about 150 nm across (50–600),
// built from roughly 10,000 casein chains with calcium phosphate, and coated with kappa-casein
// "hairs" about 7–10 nm long (de Kruif & Holt; Dalgleish 2011). A fat globule is about 4 µm, so only
// a curve of one fits. Whey proteins (about 4 nm) and lactose (1 nm) are drawn bigger than life.
import { THREE, M } from '../kit.js';
import {
  MILK, PARTS, COL, RHO_MILK, yieldPct, litresPerKg, hex, rng, crowd, chamber, hairyBalls, fitNarrow, inReel,
  clamp, lerp, smooth, box, beam, sphere, TAU,
} from '../cheese.js';

const VIEWS = {
  bench: { pos: [0.6, 2.6, 7.7], target: [0.6, 2.0, 0] },
  micro: { pos: [0.6, 2.3, 7.7], target: [0.6, 2.0, 0] },
};
const STYLES = [{ v: 53, label: 'Soft (53% water)' }, { v: 37, label: 'Cheddar (37%)' }, { v: 31, label: 'Parmesan (31%)' }];
const SCALE = 3.9 / 100;                // scene units per gram: 100 g of milk is 3.9 units tall
const COLX = 2.6, CW = 1.15;

// What each gram of milk does: [key, grams kept in the cheese, grams leaving in the whey]
function split(milk, moist) {
  const Y = yieldPct(milk, moist), W = moist / 100;
  const fatK = 0.93 * milk.fat, casK = milk.casein - 0.1, waterK = Y * W, otherK = Math.max(0, Y - fatK - casK - waterK);
  return {
    Y,
    keep: { casein: casK, fat: fatK, water: waterK, other: otherK },
    whey: { water: milk.water - waterK, lactose: milk.lactose, whey: milk.whey, fat: milk.fat - fatK, rest: Math.max(0, milk.minerals + 0.1 - otherK) },
  };
}

export default {
  id: 'milk',
  short: 'Milk and four ingredients',
  title: 'What is in milk?',
  subtitle: 'Cheese is milk with most of the water taken out. Four ingredients do it: milk, starter culture, rennet and salt.',
  view: VIEWS.bench,
  learn: `<p>Milk looks like one white liquid. It is really <b>water</b> (about 87%) carrying four things: <b>fat</b> in tiny globules, <b>casein</b> protein in even tinier balls, <b>lactose</b> (milk sugar), and a little <b>whey protein</b> and minerals such as calcium.</p>
    <p>Cheese is a way of keeping the best of the milk. The casein is made to join into a soft net, the <b>curd</b>, which traps the fat. Most of the water runs out, carrying the lactose and whey protein with it. That greenish liquid is <b>whey</b>. From about <b>10 litres of cow milk</b> you get roughly <b>1 kg of hard cheese</b>.</p>
    <p>Almost every cheese uses the same four ingredients. <b>Milk</b>. A <b>starter culture</b>, friendly bacteria that turn lactose into lactic acid (the same idea as the jaman in <a href="https://glassbox.how/curdclear/">CurdClear</a>). <b>Rennet</b>, an enzyme that makes the casein clot. And <b>salt</b>. Thousands of cheeses come from changing how much of each, and how hot, how long and how wet.</p>
    <p>Buffalo milk has nearly twice the fat and a third more casein than cow milk, so it gives much more cheese per litre. Italy's mozzarella di bufala and most of India's cheese start with it.</p>
    <p>There are three ways to make casein join. Acid alone gives dahi. Acid with heat gives paneer (see <a href="https://glassbox.how/paneerclear/">PaneerClear</a>). Rennet gives a stretchy, calcium-rich curd that can be pressed and aged, and that is cheese.</p>
    <p class="tip"><b>Try it:</b> slide <b>Make cheese</b> and watch 100 g of milk split into a small slab of curd and a tall column of whey. Switch to buffalo milk and see the slab grow. Then look under the microscope.</p>`,
  terms: [
    { t: 'Casein', d: 'The main milk protein, about 80% of it. It lives in tiny balls called micelles and is what cheese is built from.' },
    { t: 'Casein micelle', d: 'A ball of roughly 10,000 casein chains held by calcium phosphate, about 150 nanometres across.' },
    { t: 'Whey', d: 'The watery, greenish liquid left when curd forms. It holds most of the lactose and the whey proteins.' },
    { t: 'Curd', d: 'The soft solid made when casein joins into a net that traps fat and some water.' },
    { t: 'Starter culture', d: 'Chosen lactic acid bacteria added to milk. They make acid now and flavour later.' },
    { t: 'Rennet', d: 'An enzyme mix (mainly chymosin) that clots milk. It can come from calves, moulds or fermentation.' },
    { t: 'Yield', d: 'How much cheese a given amount of milk makes. About 10% by weight for cow-milk Cheddar.' },
  ],
  defaults: { look: 'bench', milk: 'cow', style: 37, make: 0 },
  controls: [
    { key: 'look', type: 'seg', label: 'Look at', options: [{ v: 'bench', label: '100 g of milk' }, { v: 'micro', label: 'Under the microscope' }] },
    { key: 'milk', type: 'seg', label: 'Milk', options: [{ v: 'cow', label: 'Cow' }, { v: 'buffalo', label: 'Buffalo' }] },
    { key: 'make', type: 'range', label: 'Make cheese', min: 0, max: 1, step: 0.01, ends: ['milk', 'curd + whey'], fmt: (v) => (v < 0.05 ? 'still milk' : v > 0.95 ? 'curd and whey apart' : 'separating') },
    { key: 'style', type: 'seg', label: 'Cheese you are making', options: STYLES },
  ],
  onChange(s, key) { if (key === 'make' || key === 'style') s.look = 'bench'; },
  quiz: [
    { q: 'Roughly how much cow milk goes into 1 kg of hard cheese?', options: ['About 1 litre', 'About 3 litres', 'About 10 litres', 'About 50 litres'], answer: 2, why: 'Milk is about 87% water and most of it leaves as whey. Only the casein, the fat and some water stay, about a tenth of the weight.' },
    { q: 'Which part of milk builds the net that becomes cheese?', options: ['Lactose', 'Casein protein', 'Whey protein', 'Water'], answer: 1, why: 'Casein micelles join into a net that traps the fat. Lactose and whey protein mostly drain away in the whey.' },
    { q: 'Why does buffalo milk give more cheese per litre than cow milk?', options: ['It has more water', 'It has more fat and more casein', 'It is whiter', 'It has more lactose'], answer: 1, why: 'Cheese is mostly casein, fat and trapped water. Buffalo milk has about 7% fat and 3.5% casein against about 3.9% and 2.6%.' },
  ],
  reel: [
    { ms: 5200, caption: 'Milk is 87% water. Cheese keeps the protein and fat and lets the water go.', set: { look: 'bench', milk: 'cow', style: 37 }, anim: { make: [0, 1] }, view: { pos: [1.7, 2.5, 5.7], target: [1.7, 2.1, 0] }, spin: 0.05 },
    { ms: 4800, caption: 'Ten litres of milk make about one kilogram of hard cheese.', set: { look: 'bench', milk: 'cow', style: 37, make: 1 }, view: { pos: [0, 1.9, 5.0], target: [0, 1.2, 0] }, spin: 0.15 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(11);
    const bench = box(11, 0.1, 3.4, M.matte(0x2b3039)); bench.position.set(0.3, 0.05, 0.2); root.add(bench);

    // ---------------------------------------------------------------- bench: props + the 100 g column
    const gB = new THREE.Group(); root.add(gB);
    // the four ingredients, left
    const can = new THREE.Group(); can.position.set(-1.75, 0.1, -0.4); can.scale.setScalar(0.72); gB.add(can);
    const steel = M.metal(0xc9ced6, { roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.7, 40), steel); body.position.y = 0.85; body.castShadow = true; can.add(body);
    const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.62, 0.45, 40), steel); shoulder.position.y = 1.92; can.add(shoulder);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.36, 0.3, 40), steel); neck.position.y = 2.3; can.add(neck);
    const milkTop = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.02, 32), M.matte(0xfdfbf3)); milkTop.position.y = 2.42; can.add(milkTop);
    [-1, 1].forEach((sd) => { const h = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 20), steel); h.position.set(sd * 0.64, 1.5, 0); h.rotation.y = Math.PI / 2; can.add(h); });
    const lMilk = stage.label('<b>1</b> Milk: 10 litres', [0, 2.95, 0], can, 'hot'); lMilk.element.style.setProperty('--c', COL.casein);
    // starter culture: a small sachet with bacteria drawn as dots
    const sach = box(0.5, 0.62, 0.08, M.matte(0x5b7bd6)); sach.position.set(-2.6, 0.42, 1.0); sach.rotation.x = -0.25; gB.add(sach);
    const lSt = stage.label('<b>2</b> Starter culture', [-2.6, 1.05, 1.0], gB, 'hot'); lSt.element.style.setProperty('--c', '#8fb0ff');
    // rennet: a small dropper bottle
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.48, 20), M.clear(0xb9722e, 0.75, { depthWrite: true })); bottle.position.set(-0.85, 0.34, 0.9); gB.add(bottle);
    const capB = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.26, 16), M.matte(0x1c1f26)); capB.position.set(-0.85, 0.71, 0.9); gB.add(capB);
    const lRe = stage.label('<b>3</b> Rennet', [-0.85, 1.2, 0.9], gB, 'hot'); lRe.element.style.setProperty('--c', COL.enzyme);
    // salt: a bowl with a white heap
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.2, 0.2, 28), M.matte(0x8a5a3c)); bowl.position.set(-0.1, 0.2, 1.0); gB.add(bowl);
    const heap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 10, 0, TAU, 0, Math.PI / 2), M.matte(0xffffff)); heap.scale.y = 0.55; heap.position.set(-0.1, 0.28, 1.0); gB.add(heap);
    const lSa = stage.label('<b>4</b> Salt', [-0.1, 0.85, 1.0], gB, 'hot'); lSa.element.style.setProperty('--c', '#ffffff');

    // the column: every layer is a unit box scaled in y
    const mk = (col, op = 1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(CW, 1, CW), new THREE.MeshStandardMaterial({ color: hex(col), roughness: 0.5, transparent: op < 1, opacity: op })); m.castShadow = true; gB.add(m); return m; };
    const L = {
      kCas: mk(COL.casein), kFat: mk(COL.fat), kWat: mk(COL.water, 0.8), kOth: mk('#ffffff'),
      wFat: mk(COL.fat), wRest: mk(COL.calcium), wWhey: mk(COL.wheyp), wLac: mk(COL.lactose), wWat: mk(COL.water, 0.55),
    };
    const lab = (txt, col) => { const l = stage.label(txt, [0, 0, 0], gB); l.element.style.borderColor = col; return l; };
    const LB = { wat: lab('', COL.water), lac: lab('', COL.lactose), wp: lab('', COL.wheyp), fat: lab('', COL.fat), cas: lab('', COL.casein) };
    const lCheese = stage.label('', [0, 0, 0], gB, 'hot'); lCheese.element.style.setProperty('--c', COL.cheese);
    const lWhey = stage.label('', [0, 0, 0], gB, 'hot'); lWhey.element.style.setProperty('--c', COL.whey);
    const lTop = stage.label('100 g of milk, drawn to scale', [COLX, 4.4, 0], gB);

    // ---------------------------------------------------------------- microscope view
    const gM = new THREE.Group(); root.add(gM);
    const W = { x0: -3.45, x1: 4.7, y0: 0.3, y1: 2.75, d: 1.7 };
    chamber(gM, W.x0, W.x1, W.y0, W.y1, W.d, { color: 0x9fc4ff, opacity: 0.07 });
    // one fat globule, 4 µm across: at this scale its radius is 8 units, so only its edge shows
    const fatG = new THREE.Mesh(new THREE.SphereGeometry(8, 64, 32), new THREE.MeshStandardMaterial({ color: hex(COL.fat), roughness: 0.35, transparent: true, opacity: 0.85 }));
    fatG.position.set(W.x0 - 6.9, 1.4, -0.2); gM.add(fatG);
    const clip = [new THREE.Plane(new THREE.Vector3(1, 0, 0), -W.x0), new THREE.Plane(new THREE.Vector3(0, 1, 0), -W.y0), new THREE.Plane(new THREE.Vector3(0, -1, 0), W.y1), new THREE.Plane(new THREE.Vector3(0, 0, 1), W.d / 2), new THREE.Plane(new THREE.Vector3(0, 0, -1), W.d / 2)];
    fatG.material.clippingPlanes = clip; stage.renderer.localClippingEnabled = true;
    const NM = 15, PER = 16;
    const mic = hairyBalls(NM, PER, 0.3, 0.09, 5); gM.add(mic);
    const mp = Array.from({ length: NM }, (_, i) => ({ x: lerp(W.x0 + 1.7, W.x1 - 0.5, (i + 0.5) / NM), y: lerp(W.y0 + 0.45, W.y1 - 0.45, ((i * 0.382) % 1)), z: (rnd() - 0.5) * 1.0, k: 0.55 + rnd() * 0.6, ph: rnd() * TAU }));
    const NW = 70, wp = crowd(NW, new THREE.SphereGeometry(0.035, 6, 5), { basic: true }); gM.add(wp);
    const NL = 160, lac = crowd(NL, new THREE.SphereGeometry(0.018, 5, 4), { basic: true }); gM.add(lac);
    const cW = new THREE.Color(COL.wheyp), cL = new THREE.Color(COL.lactose);
    const dp = Array.from({ length: NW + NL }, () => ({ x: lerp(W.x0 + 1.2, W.x1 - 0.1, rnd()), y: lerp(W.y0 + 0.1, W.y1 - 0.1, rnd()), z: (rnd() - 0.5) * 1.4, ph: rnd() * TAU, sp: 0.6 + rnd() }));
    for (let i = 0; i < NW; i++) wp.tint(i, cW); for (let i = 0; i < NL; i++) lac.tint(i, cL);
    const mLab = [
      stage.label('<b>Casein micelle</b> · about 150 nm', [3.2, 3.5, 0], gM, 'hot'),
      stage.label('<b>Fat globule</b> · about 4 µm (only its edge fits)', [-1.5, 0.0, 0.9], gM, 'hot'),
      stage.label('κ-casein hairs keep micelles apart', [2.0, 0.0, 0.9], gM),
      stage.label('whey protein and lactose: dissolved (drawn bigger)', [2.9, 3.05, 0], gM),
    ];
    mLab[0].element.style.setProperty('--c', COL.casein); mLab[1].element.style.setProperty('--c', COL.fat);
    mLab[2].element.style.borderColor = COL.hair; mLab[3].element.style.borderColor = COL.wheyp;
    const scaleBar = box(0.8, 0.03, 0.03, M.glow(0xffffff)); scaleBar.position.set(W.x1 - 0.6, W.y0 - 0.18, 0.85); gM.add(scaleBar);
    const lBar = stage.label('200 nm', [W.x1 - 0.6, W.y0 - 0.42, 0.85], gM);

    let look = '', kMake = 0;
    return {
      update(dt, s, time) {
        dt = Math.max(0, Math.min(dt, 0.05));
        const narrow = fitNarrow(stage, [lSt, lRe, lSa, mLab[2], mLab[3], lBar, lTop], false);
        if (s.look !== look) { look = s.look; gB.visible = look === 'bench'; gM.visible = look === 'micro'; if (!inReel()) stage.setView(VIEWS[look].pos, VIEWS[look].target, 1); }
        const milk = MILK[s.milk];
        if (look === 'bench') {
          kMake += (s.make - kMake) * (1 - Math.exp(-dt * 8));
          const k = smooth(kMake), sp = split(milk, s.style), y0 = 0.1;
          const dx = -1.7 * k;                                  // the cheese slab slides left
          const hK = (sp.keep.casein + sp.keep.fat + sp.keep.water + sp.keep.other) * SCALE;
          let y = y0;
          const put = (m, grams, x, base) => { const h = Math.max(0.002, grams * SCALE); m.scale.y = h; m.position.set(x, base + h / 2, 0); m.visible = grams > 0.01; return base + h; };
          y = put(L.kCas, sp.keep.casein, COLX + dx, y); const yCas = y;
          y = put(L.kFat, sp.keep.fat, COLX + dx, y); const yFat = y;
          y = put(L.kWat, sp.keep.water, COLX + dx, y);
          y = put(L.kOth, sp.keep.other, COLX + dx, y);
          let yw = y0 + hK * (1 - k);                            // the whey column settles on to the bench
          yw = put(L.wFat, sp.whey.fat, COLX, yw);
          yw = put(L.wRest, sp.whey.rest, COLX, yw);
          yw = put(L.wWhey, sp.whey.whey, COLX, yw); const yWp = yw;
          yw = put(L.wLac, sp.whey.lactose, COLX, yw); const yLac = yw;
          yw = put(L.wWat, sp.whey.water, COLX, yw);
          L.wWat.material.color.set(COL.water).lerp(new THREE.Color(COL.whey), k * 0.7);
          const lx = COLX + CW / 2 + 0.15;
          const setL = (l, html, yy, x = lx) => { l.element.innerHTML = html; l.position.set(x, yy, 0.6); l.center.set(0, 0.5); };
          setL(LB.wat, `water <b>${milk.water.toFixed(0)} g</b>`, (yLac + yw) / 2);
          setL(LB.lac, `lactose <b>${milk.lactose.toFixed(1)} g</b>`, yLac - sp.whey.lactose * SCALE / 2 + 0.06);
          setL(LB.wp, `whey protein <b>${milk.whey.toFixed(1)} g</b>`, yWp - 0.2);
          setL(LB.fat, `fat <b>${milk.fat.toFixed(1)} g</b>`, yFat - sp.keep.fat * SCALE / 2 + 0.13);
          setL(LB.cas, `casein <b>${milk.casein.toFixed(1)} g</b>`, yCas - sp.keep.casein * SCALE / 2 - 0.13);
          LB.fat.visible = LB.cas.visible = k < 0.5 && !narrow;
          LB.wp.visible = LB.lac.visible = LB.wat.visible = !narrow;
          lCheese.visible = k > 0.6; lWhey.visible = k > 0.6;
          lCheese.element.innerHTML = `<b>${sp.Y.toFixed(1)} g</b> of cheese`; lCheese.position.set(COLX + dx, y0 + hK + 0.4, 0);
          lWhey.element.innerHTML = `whey: <b>${(100 - sp.Y).toFixed(0)} g</b> drains away`; lWhey.position.set(COLX, yw + 0.3, 0);
          lTop.visible = k < 0.4 && !narrow; lTop.position.set(COLX, yw + 0.3, 0);
          lMilk.element.innerHTML = `<b>1</b> Milk: ${(litresPerKg(milk, s.style)).toFixed(1)} litres for 1 kg`;
        } else {
          mp.forEach((p, i) => mic.place(i, p.x + Math.sin(time * 0.6 + p.ph) * 0.08, p.y + Math.cos(time * 0.5 + p.ph * 1.7) * 0.08, p.z, p.k * (s.milk === 'buffalo' ? 1.12 : 1), 0));
          mic.done();
          dp.forEach((p, i) => {
            const x = p.x + Math.sin(time * p.sp + p.ph) * 0.12, y = p.y + Math.cos(time * p.sp * 0.8 + p.ph) * 0.12;
            if (i < NW) wp.put(i, x, y, p.z); else lac.put(i - NW, x, y, p.z);
          });
          wp.done(); lac.done();
          fatG.scale.setScalar(s.milk === 'buffalo' ? 1.03 : 1);
          mLab[1].element.innerHTML = `<b>Fat globule</b> · about ${s.milk === 'buffalo' ? 5 : 4} µm (only its edge fits)`;
        }
      },
      readout: (s) => {
        const milk = MILK[s.milk], Y = yieldPct(milk, s.style), lit = litresPerKg(milk, s.style);
        if (s.look === 'micro') {
          return `<div class="big">A drop of ${s.milk} milk</div>
            <div class="row"><span>Casein micelles</span><b>about 150 nm wide</b></div>
            <div class="row"><span>Fat globules</span><b>about ${s.milk === 'buffalo' ? 5 : 4} µm</b></div>
            <div class="row"><span>Casein in 100 g</span><b>${milk.casein.toFixed(1)} g</b></div>
            <div class="row"><span>Fat in 100 g</span><b>${milk.fat.toFixed(1)} g</b></div>
            <small>A micelle is a ball of about 10,000 casein chains. Its hairy coat and electric charge push other micelles away, which is why milk stays liquid. Cheesemaking starts by removing that coat.</small>`;
        }
        return `<div class="big">${lit.toFixed(1)} litres → 1 kg</div>
          <div class="row"><span>${milk.n}</span><b>${milk.fat.toFixed(1)}% fat · ${milk.casein.toFixed(1)}% casein</b></div>
          <div class="row"><span>Cheese from 100 kg of milk</span><b>${Y.toFixed(1)} kg</b></div>
          <div class="row"><span>Fat kept in the curd</span><b>about 93%</b></div>
          <div class="row"><span>In 100 g of milk, the curd keeps</span><b>${(milk.casein - 0.1).toFixed(1)} g casein + ${(0.93 * milk.fat).toFixed(1)} g fat</b></div>
          <small>Van Slyke yield formula: (0.93 × fat + casein − 0.1) × 1.09 ÷ (1 − moisture). Typical milk; real milk changes with breed, feed and season.</small>`;
      },
      dispose() { stage.renderer.localClippingEnabled = false; stage.setShift(0, 0); },
    };
  },
};
