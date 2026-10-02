// Shared parts for CheeseClear: what milk is made of, how rennet clots it, how cutting and cooking
// set the moisture, how salt creeps into a wheel, how a cheese ripens, and the cheese family.
// Plus chart boards and small 3D pieces. Everything marked "typical" is a textbook mid-range value,
// and everything marked "illustrative" is a simple curve tuned to typical recipes, not a law.
import { THREE, M, box, beam, sphere, arrow, clamp, lerp, smooth } from './kit.js';

export const TAU = Math.PI * 2;

// ---------------------------------------------------------------- milk
// Typical composition, grams in 100 g. Cow: Walstra, Wouters & Geurts, Dairy Science and Technology
// (2nd ed. 2006, table 1.1: water 87.1, fat 4.0, protein 3.3 of which casein 2.6, lactose 4.6,
// minerals 0.7). Buffalo: mid-range of Indian reports (fat 6.5–8, protein 3.9–4.5, lactose 4.5–5.2).
// FSSAI minimums: cow milk fat 3.2%, SNF 8.3%; buffalo milk fat 6.0% (5.0% in some states), SNF 9.0%.
// The same numbers are used in CurdClear, so the two boxes agree.
export const MILK = {
  cow: { n: 'Cow milk', water: 87.2, fat: 3.9, casein: 2.6, whey: 0.7, lactose: 4.8, minerals: 0.8 },
  buffalo: { n: 'Buffalo milk', water: 83.0, fat: 7.0, casein: 3.5, whey: 0.8, lactose: 4.9, minerals: 0.8 },
};
export const PARTS = [
  { k: 'water', n: 'Water', col: '#6fb6ff', keep: 0 },
  { k: 'lactose', n: 'Lactose (milk sugar)', col: '#ffd166', keep: 0 },
  { k: 'whey', n: 'Whey protein', col: '#8ef0c0', keep: 0 },
  { k: 'minerals', n: 'Minerals', col: '#c49bff', keep: 0 },
  { k: 'fat', n: 'Fat', col: '#ffb547', keep: 1 },
  { k: 'casein', n: 'Casein protein', col: '#f4f1e8', keep: 1 },
];
export const RHO_MILK = 1.03;   // kg per litre (cow milk 1.028–1.034 at 20 °C, Walstra)

// Cheese yield: the Van Slyke & Price formula (1910s, still the dairy industry's yardstick for
// Cheddar): kg of cheese from 100 kg of milk = (0.93·F + C − 0.1) × 1.09 ÷ (1 − W).
// F = fat %, C = casein %, W = moisture of the cheese as a fraction. 0.93 = share of the fat that
// stays in the curd, 0.1 = casein lost as fines, 1.09 = salt and other solids that come along.
// Cow milk, W = 0.37: 10.6 kg per 100 kg, so about 9–10 litres of milk for 1 kg of Cheddar.
export const yieldPct = (milk, moisturePct) => ((0.93 * milk.fat + milk.casein - 0.1) * 1.09) / (1 - clamp(moisturePct, 20, 80) / 100);
export const litresPerKg = (milk, moisturePct) => 100 / yieldPct(milk, moisturePct) / RHO_MILK;

// ---------------------------------------------------------------- rennet
// Chymosin cuts one bond in kappa-casein, between phenylalanine 105 and methionine 106. The outer
// part (the "hair", caseinomacropeptide) floats off into the whey. Micelles stay apart until most
// hairs are gone: textbooks give about 85–90% (Dalgleish 1979; Fox et al., Fundamentals of Cheese
// Science), though a 2024 review (Food Science & Nutrition) argues it can be under 80%. We use 85%.
// Two steps with very different temperature habits (Fox et al.):
//   cutting: an enzyme step, Q10 about 2, still runs in the fridge;
//   joining: needs calcium and warm, wobbling micelles, Q10 about 11–12, and all but stops below
//   about 15–18 °C. That is why "cold renneted" milk stays liquid, then sets at once when warmed.
// Times are set so a normal dose at 32 °C and pH 6.6 clots in about 13 minutes and is ready to cut
// at about 35 (cheesemakers cut at roughly 2.5–3 times the clotting time). Typical, not exact.
// pH: chymosin works faster in slightly sour milk; clotting time roughly halves from pH 6.6 to 6.3.
// Above about 50 °C chymosin itself starts to unfold. Milk heated above about 70 °C (boiled, as in
// most Indian homes) clots slowly and weakly, because unfolded whey protein sits on the hairs.
export const HAIRS_NEEDED = 0.85;
export function rennet({ T = 32, dose = 1, pH = 6.6, boiled = false } = {}) {
  const hot = T > 48 ? Math.exp(-(T - 48) / 4) : 1;                       // enzyme unfolding
  const kCut = (Math.log(1 / (1 - HAIRS_NEEDED)) / 8) * dose * Math.pow(2, (T - 32) / 10) * Math.exp(2.3 * (6.6 - pH)) * hot * (boiled ? 0.45 : 1);   // per minute
  const cold = clamp((T - 15) / 5, 0, 1);                                 // joining fades out 20 → 15 °C
  const tJoin = cold <= 0 ? Infinity : (5 * Math.pow(11.5, (32 - Math.min(T, 40)) / 10)) / cold;
  const tCut = kCut > 1e-9 ? Math.log(1 / (1 - HAIRS_NEEDED)) / kCut : Infinity;
  const tClot = tCut + tJoin;
  return { kCut, tCut, tJoin, tClot, strength: boiled ? 0.35 : 1 };
}
// Fraction of hairs cut after t minutes, and gel firmness (0 to 1 = ready to cut) after clotting.
// Firmness follows Scott Blair & Burnett's curve G = G∞·exp(−τ ÷ (t − t_clot)).
export const hairsCut = (r, t) => 1 - Math.exp(-r.kCut * Math.max(0, t));
export function gelFirm(r, t) {
  if (!(t > r.tClot)) return 0;
  const tau = 1.2 * r.tClot;                                               // firms on the same clock it clotted on
  return r.strength * 1.75 * Math.exp(-tau / (t - r.tClot));              // 1 at about 2.9 × clotting time
}
export const timeToCut = (r) => (r.strength < 1 ? Infinity : r.tClot * (1 + 1.2 / Math.log(1.75)));

// ---------------------------------------------------------------- cut, cook, stir
// How wet the young cheese ends up. Smaller cubes have more surface for whey to leave; hotter
// cooking makes the casein net shrink harder; longer stirring gives it time. Illustrative curve
// tuned to typical recipes (University of Guelph Cheese Making Technology e-book; Fox et al.):
//   Camembert: 2 cm cubes, no cooking (32 °C), brief stir                → about 52–55% water
//   Gouda: 1 cm, washed and warmed to 36 °C                              → about 41–43%
//   Cheddar: 6–8 mm, cooked to 39 °C in 30 min, stirred about an hour    → about 37–39% (FSSAI max 39%)
//   Emmental: wheat-grain 3–5 mm, cooked to 52–54 °C                     → about 35–37%
//   Parmesan: rice-grain 2–3 mm, cooked to 55 °C                         → about 30–32% (after ageing)
export function curdMoisture(sizeMm, cookT, stirMin) {
  const s = Math.pow(clamp(sizeMm, 2, 25) / 20, 0.35), c = Math.exp(-(clamp(cookT, 30, 56) - 32) / 30), w = 0.75 + 0.25 * Math.exp(-clamp(stirMin, 0, 120) / 25);
  return 26.6 + 29.8 * s * c * w;
}
export function styleOf(moist) {
  if (moist >= 50) return { n: 'Soft cheese (Camembert, Brie style)', col: '#fff1c9' };
  if (moist >= 43) return { n: 'Semi-soft (young Gouda, Havarti style)', col: '#ffd98a' };
  if (moist >= 39.5) return { n: 'Semi-hard (Gouda, Edam style)', col: '#ffc861' };
  if (moist >= 35) return { n: 'Hard (Cheddar, Emmental style)', col: '#ffb547' };
  return { n: 'Extra hard, for grating (Parmesan style)', col: '#e89a3c' };
}
export const RECIPES = [
  { n: 'Camembert', size: 20, T: 32, stir: 10 },
  { n: 'Gouda', size: 10, T: 36, stir: 40 },
  { n: 'Cheddar', size: 7, T: 39, stir: 60 },
  { n: 'Emmental', size: 4, T: 53, stir: 45 },
  { n: 'Parmesan', size: 2.5, T: 55, stir: 20 },
];

// ---------------------------------------------------------------- salt
// Salt moves through the water in cheese by diffusion, slowly: Geurts, Walstra & Mulder (1974)
// measured about 0.2 cm² per day in Gouda at 12–14 °C (against about 1 cm²/day in plain water).
// A flat face in brine: salt-in-moisture at depth x after t days = c_brine · erfc(x ÷ 2√(Dt)).
// Brines run about 18–23% salt (saturated is 26%). A 10–12 kg Gouda sits in brine about 3–5 days;
// a 38 kg Parmigiano Reggiano 20–25 days (the consortium's figure). Evening out takes weeks more.
export const D_SALT = 0.2;   // cm²/day
export function erfc(x) {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
// Salt-in-moisture (%) across a slab of thickness L cm, brined from both faces for t days.
export function saltAt(x, L, days, brinePct) {
  if (days <= 0) return 0;
  const d = 2 * Math.sqrt(D_SALT * days);
  return clamp(brinePct * (erfc(x / d) + erfc((L - x) / d)), 0, brinePct);
}
export function saltMean(L, days, brinePct) { let s = 0; const N = 40; for (let i = 0; i < N; i++) s += saltAt(((i + 0.5) / N) * L, L, days, brinePct); return s / N; }
// Water activity of the cheese's own water from its salt-in-moisture: a_w ≈ 1 − 0.033 × molality of
// NaCl (Marcos, Alcalá et al. 1981, for cheese). 5% salt-in-moisture → 0.90 mol/kg → a_w about 0.97.
export const awOfSM = (smPct) => 1 - 0.033 * ((smPct * 10) / 58.44 / (1 - smPct / 100));
// Pressing (illustrative): whey between the curd pieces is squeezed out and the pieces knit.
// Typical Cheddar press: overnight at roughly 75–200 kPa (Guelph e-book; Scott's Cheesemaking Practice).
export function pressMoisture(m0, kPa, hours) {
  const drop = 4.5 * (1 - Math.exp(-kPa / 60)) * (1 - Math.exp(-hours / 5));
  return m0 - drop;
}
export const knit = (kPa, hours) => clamp((1 - Math.exp(-kPa / 45)) * (1 - Math.exp(-hours / 4)), 0, 1);

// ---------------------------------------------------------------- ripening
// What the cave does. Enzymes (leftover rennet, milk's own plasmin, and those of starter bacteria
// and moulds) cut casein into peptides and amino acids, and fat into fatty acids. A common yardstick
// is the share of the cheese's nitrogen that has become soluble (at pH 4.6). Typical end values:
// Cheddar about 20–25% at 6–9 months at 8 °C; Camembert and blue cheeses 35% and more in weeks,
// because moulds bring far more enzymes (Fox et al., Fundamentals of Cheese Science, ch. 11–12).
// Warmer caves ripen faster: roughly double for every 8–10 °C (Q10 2–2.5; the basis of
// "accelerated ripening" at 13–15 °C). Curves below are illustrative fits to those figures.
export const CHEESES = {
  cheddar: { n: 'Cheddar', T: 9, RH: 85, weeks: 39, max: 104, snMax: 38, k: 0.022, kg: 20, m0: 37, note: 'Clothbound or waxed. Mild at 3 months, mature at 9–12, vintage at 18 and more.', col: '#f2b24a' },
  swiss: { n: 'Emmental', T: 22, RH: 82, weeks: 12, max: 52, snMax: 30, k: 0.06, kg: 80, m0: 36, note: 'A few weeks in a warm room (about 20–24 °C) wake the propionic bacteria that blow the eyes, then it moves to a cool cellar.', col: '#f5d77a' },
  blue: { n: 'Blue (Roquefort style)', T: 9, RH: 93, weeks: 12, max: 40, snMax: 50, k: 0.09, kg: 2.7, m0: 44, note: 'Pierced with needles so air reaches the blue mould inside.', col: '#f3ead2' },
  camembert: { n: 'Camembert', T: 12, RH: 93, weeks: 4, max: 12, snMax: 45, k: 0.22, kg: 0.25, m0: 53, note: 'A white mould coat ripens it from the outside in, in 3–5 weeks.', col: '#fbf3da' },
};
const q10 = (T, Tref, q = 2.3) => Math.pow(q, (T - Tref) / 10);
// Soluble nitrogen, % of total, after `weeks` at temperature T (°C).
export function ripeness(type, weeks, T) { const c = CHEESES[type]; return c.snMax * (1 - Math.exp(-c.k * weeks * q10(T, c.T))); }
// Lactose left (% of the cheese). Young curd holds about 1%; starter bacteria finish it in days to
// a few weeks, which is why long-aged cheeses test at or near zero (Fox et al.; under 0.1 g per
// 100 g is typical of Parmigiano Reggiano and mature Cheddar).
export const lactoseLeft = (weeks, T) => 1.0 * Math.exp(-weeks * 1.6 * q10(T, 10, 2));
// Weight lost by drying (illustrative): rises with how dry the air is, how long, and how small the
// wheel (more surface per kg). Traditional clothbound Cheddar loses very roughly 8–12% in a year.
export function weightLoss(type, weeks, T, RH) {
  const c = CHEESES[type];
  return clamp(0.09 * (100 - RH) * Math.sqrt(weeks) * Math.pow(20 / c.kg, 0.2) * q10(T, 10, 1.5), 0, 35);
}
// Emmental's eyes. Propionibacterium freudenreichii turns lactate into propionate, acetate and CO₂:
// 3 lactate → 2 propionate + 1 acetate + 1 CO₂ + 1 H₂O (von Freudenreich & Orla-Jensen 1906).
// An 80 kg wheel makes roughly 120 litres of CO₂ in all: about half stays dissolved, a third leaks
// out and only about a sixth (20 L) ends up in the eyes (Fröhlich-Wyder & Bachmann, in Cheese:
// Chemistry, Physics and Microbiology; typical). The bacteria need warmth: little happens below ~15 °C.
export function eyeGas(weeks, T) {
  const warm = clamp((T - 14) / 8, 0, 1.3);
  return 120 * (1 - Math.exp(-weeks * 0.35 * warm));     // litres of CO₂ made by an 80 kg wheel
}
// Blue mould (Penicillium roqueforti) needs oxygen. Without piercing it stays near the rind.
export const blueGrowth = (weeks, T, pierced) => clamp((1 - Math.exp(-weeks * 0.28 * q10(T, 9, 2))) * (pierced ? 1 : 0.12), 0, 1);
// What the humidity does to the rind.
export function rindState(type, RH) {
  const c = CHEESES[type];
  if (RH < c.RH - 12) return { n: 'Too dry: the rind cracks and the cheese shrinks', col: '#ff6b6b' };
  if (RH > Math.max(c.RH + 7, 96)) return { n: 'Too damp: slime and unwanted moulds', col: '#ff6b6b' };
  return { n: 'Good for this cheese', col: '#5ce1a9' };
}

// ---------------------------------------------------------------- the family
// Moisture (% of the cheese, typical) against usual age when eaten (weeks). Melt temperatures after
// McGee, On Food and Cooking (2004): soft cheeses start to flow near 55 °C, Cheddar and Swiss types
// near 65 °C, Parmesan near 82 °C. Acid-set cheeses (paneer, kalari's cousins, ricotta) never flow.
// FSSAI figures (Food Products Standards Regulations 2011, 2.1.17): hard pressed cheese at most 39%
// moisture and at least 48% fat in dry matter; processed cheese at most 47% and 40%.
export const FAMILY = [
  { k: 'mozz', n: 'Mozzarella', kind: 'Pasta filata (stretched curd)', moist: 52, weeks: 0.5, melt: 55, beh: 'stretch', col: '#fbf7ea', how: 'Rennet curd soured to about pH 5.2, then pulled in hot water (curd near 60 °C) so the casein lines up in fibres.' },
  { k: 'camembert', n: 'Camembert', kind: 'Soft, bloomy rind', moist: 52, weeks: 4, melt: 55, beh: 'flow', col: '#fbf3da', how: 'Big, barely drained curd. A white mould coat ripens it from the rind inwards.' },
  { k: 'blue', n: 'Blue', kind: 'Blue-veined', moist: 44, weeks: 14, melt: 58, beh: 'flow', col: '#e9e6d2', how: 'Loose, salty curd pierced with needles so Penicillium roqueforti can breathe.' },
  { k: 'gouda', n: 'Gouda', kind: 'Semi-hard, washed curd', moist: 41, weeks: 12, melt: 62, beh: 'flow', col: '#f6c95c', how: 'Some whey is swapped for warm water, which washes out lactose and keeps it sweet.' },
  { k: 'cheddar', n: 'Cheddar', kind: 'Hard, cheddared', moist: 37, weeks: 40, melt: 65, beh: 'flow', col: '#f2b24a', how: 'Slabs of curd are stacked and turned, milled, dry-salted and pressed.' },
  { k: 'swiss', n: 'Emmental', kind: 'Hard, with eyes', moist: 36, weeks: 20, melt: 65, beh: 'stretch', col: '#f5d77a', how: 'Tiny curd cooked to about 53 °C. Propionic bacteria blow the holes.' },
  { k: 'parmesan', n: 'Parmesan', kind: 'Extra hard, for grating', moist: 31, weeks: 104, melt: 82, beh: 'soften', col: '#e9c877', how: 'Rice-grain curd cooked to 55 °C, brined about three weeks, aged a year or more.' },
  { k: 'processed', n: 'Processed cheese', kind: 'Cheese melted with emulsifying salts', moist: 45, weeks: 0, melt: 60, beh: 'smooth', col: '#ffc24d', how: 'Natural cheese is ground and melted with sodium citrate or phosphates, which take the calcium so fat and water stay mixed.' },
  { k: 'paneer', n: 'Paneer', kind: 'Fresh, acid and heat set', moist: 55, weeks: 0, melt: 999, beh: 'hold', col: '#fdfbf3', how: 'Hot milk curdled with acid, no rennet. See PaneerClear.' },
  { k: 'bandel', n: 'Bandel', kind: 'India: fresh, salted, smoked', moist: 48, weeks: 0.3, melt: 999, beh: 'hold', col: '#c79a62', how: 'West Bengal. Acid-set curd drained in small baskets, heavily salted and often smoked.' },
  { k: 'kalari', n: 'Kalari', kind: 'India: stretched, sun-dried', moist: 45, weeks: 1, melt: 60, beh: 'stretch', col: '#f3e6c0', how: 'Udhampur, Jammu. Sour-whey curd is stretched, flattened and dried, then seared in its own fat.' },
  { k: 'churpi', n: 'Hard churpi', kind: 'India and Nepal: dried, smoked', moist: 12, weeks: 30, melt: 999, beh: 'hold', col: '#d9c9a0', how: 'Himalaya. Yak or cow curd pressed, dried and smoked until rock hard. Chewed for hours.' },
];
export const BEHAVE = {
  stretch: { n: 'Stretches into strings', col: '#5ce1a9' },
  flow: { n: 'Melts and flows', col: '#ffd166' },
  smooth: { n: 'Melts perfectly smooth', col: '#ffb547' },
  soften: { n: 'Softens, hardly flows', col: '#c49bff' },
  hold: { n: 'Holds its shape, browns', col: '#8fb0ff' },
};

// ---------------------------------------------------------------- colours and formats
export const COL = {
  water: '#6fb6ff', whey: '#cfe07a', fat: '#ffb547', casein: '#f4f1e8', lactose: '#ffd166', wheyp: '#8ef0c0',
  calcium: '#c49bff', enzyme: '#ff7a59', hair: '#8fb0ff', salt: '#ffffff', cheese: '#f2b24a', mould: '#5aa0b8',
  good: '#5ce1a9', bad: '#ff6b6b', warn: '#ffd166', text: '#e8eef8', acid: '#ff8a5c',
};
export const hex = (c) => new THREE.Color(c).getHex();
export const fmtMin = (m) => (!isFinite(m) ? 'never' : m < 90 ? `${m < 10 ? m.toFixed(1) : Math.round(m)} min` : `${(m / 60).toFixed(1)} h`);
export function fmtAge(weeks) {
  if (weeks < 1) return `${Math.round(weeks * 7)} days`;
  if (weeks < 9) return `${weeks.toFixed(weeks < 3 ? 1 : 0)} weeks`;
  if (weeks < 52) return `${Math.round(weeks / 4.345)} months`;
  return `${(weeks / 52).toFixed(1)} years`;
}

// ---------------------------------------------------------------- boards (live charts in 3D)
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h); }
export function board(root, w, h, pxW, pxH, draw, pos) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = () => { draw(g, pxW, pxH); tex.needsUpdate = true; };
  redraw();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  m.position.set(...pos); root.add(m);
  return { tex, redraw, canvas: c, mesh: m };
}
export function axes(g, w, h, { x0 = 84, x1 = w - 28, y0 = h - 64, y1 = 70, xMax, yMax, xMin = 0, yMin = 0, xTicks, yTicks, xFmt = String, yFmt = String, xLabel = '', yLabel = '', logX = false }) {
  const L = Math.log10;
  const X = logX ? (x) => x0 + ((L(Math.max(x, 1e-30)) - L(xMin)) / (L(xMax) - L(xMin))) * (x1 - x0) : (x) => x0 + ((x - xMin) / (xMax - xMin)) * (x1 - x0);
  const Y = (y) => y0 - ((y - yMin) / (yMax - yMin)) * (y0 - y1);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '19px sans-serif';
  for (const t of xTicks) { g.beginPath(); g.moveTo(X(t), y1); g.lineTo(X(t), y0); g.stroke(); const s = xFmt(t); g.fillText(s, X(t) - g.measureText(s).width / 2, y0 + 26); }
  for (const t of yTicks) { g.beginPath(); g.moveTo(x0, Y(t)); g.lineTo(x1, Y(t)); g.stroke(); const s = yFmt(t); g.fillText(s, x0 - 10 - g.measureText(s).width, Y(t) + 6); }
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '18px sans-serif';
  if (xLabel) g.fillText(xLabel, x1 - g.measureText(xLabel).width, y0 + 52);
  if (yLabel) g.fillText(yLabel, x0 + 8, y1 - 10);
  return { X, Y, x0, x1, y0, y1 };
}
export function title(g, text, sub = '') {
  g.fillStyle = COL.text; g.font = 'bold 24px sans-serif'; g.fillText(text, 20, 34);
  if (sub) { const x = 34 + g.measureText(text).width; g.font = '17px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(sub, x, 34); }
}
export function line(g, pts, X, Y, col, wdt = 5, dash = null) {
  if (pts.length < 2) return;
  g.strokeStyle = col; g.lineWidth = wdt; g.setLineDash(dash || []); g.lineJoin = 'round'; g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  g.stroke(); g.setLineDash([]);
}
export function dot(g, x, y, col, r = 10) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
export function note(g, text, x, y, col = 'rgba(255,255,255,.8)', font = 17, align = 'left') {
  g.font = `${font}px sans-serif`; g.fillStyle = col;
  const w = g.measureText(text).width;
  g.fillText(text, align === 'right' ? x - w : align === 'center' ? x - w / 2 : x, y);
}
export function dashH(g, X0, X1, y, text = '', col = 'rgba(255,255,255,.5)') {
  g.strokeStyle = col; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke(); g.setLineDash([]);
  if (text) { g.font = '17px sans-serif'; g.fillStyle = col; g.fillText(text, X1 - g.measureText(text).width - 4, y - 8); }
}
export function dashV(g, x, Y0, Y1, text = '', col = 'rgba(255,255,255,.5)') {
  g.strokeStyle = col; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(x, Y0); g.lineTo(x, Y1); g.stroke(); g.setLineDash([]);
  if (text) { g.font = '17px sans-serif'; g.fillStyle = col; g.fillText(text, x + 6, Y1 + 18); }
}

// ---------------------------------------------------------------- random numbers
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------------------------------------------------------------- 3D pieces
// Many copies of one shape, each with its own colour, position, rotation and scale.
export function crowd(n, geometry, { basic = false, rough = 0.5 } = {}) {
  const mat = basic ? new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }) : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough });
  const mesh = new THREE.InstancedMesh(geometry, mat, n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
  const o = new THREE.Object3D(), c = new THREE.Color(0xffffff);
  for (let i = 0; i < n; i++) mesh.setColorAt(i, c);
  mesh.put = (i, x, y, z, sx = 1, sy = sx, sz = sx) => { o.position.set(x, y, z); o.quaternion.identity(); o.scale.set(Math.max(1e-4, sx), Math.max(1e-4, sy), Math.max(1e-4, sz)); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); };
  // aim the shape's +Y axis along a direction
  const UPV = new THREE.Vector3(0, 1, 0), dv = new THREE.Vector3();
  mesh.aim = (i, x, y, z, dx, dy, dz, len = 1, thick = 1) => { o.position.set(x, y, z); dv.set(dx, dy, dz); if (dv.lengthSq() < 1e-12) dv.set(0, 1, 0); o.quaternion.setFromUnitVectors(UPV, dv.normalize()); o.scale.set(thick, Math.max(1e-4, len), thick); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); };
  mesh.hide = (i) => mesh.put(i, 0, -99, 0, 1e-4);
  mesh.tint = (i, col) => mesh.setColorAt(i, col);
  mesh.done = () => { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; };
  return mesh;
}
// A see-through box with bright edges (a view under the microscope, a vat, a brine tank).
export function chamber(parent, x0, x1, y0, y1, d, { color = 0xcfe8ff, opacity = 0.08, edge = 0x9fb4c8, z = 0 } = {}) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, d), M.clear(color, opacity)); glass.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); g.add(glass);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry), new THREE.LineBasicMaterial({ color: edge, transparent: true, opacity: 0.7 }));
  e.position.copy(glass.position); g.add(e);
  parent.add(g); g.glass = glass; g.edges = e;
  return g;
}
// A liquid block that can change level: bottom at y0, footprint w × d.
export function liquid(parent, x, y0, z, w, d, color, opacity = 0.5) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.15, transparent: true, opacity, depthWrite: false });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), mat); parent.add(m);
  m.setLevel = (y) => { const h = Math.max(0.001, y - y0); m.scale.y = h; m.position.set(x, y0 + h / 2, z); m.visible = h > 0.004; };
  m.setLevel(y0 + 1);
  return m;
}
// A cheese wheel with a wedge cut out, lying flat: radius R, height H. Returns group + materials.
export function wheel(R, H, rindCol, pasteCol, gap = 0.9) {
  const g = new THREE.Group();
  const rind = new THREE.MeshStandardMaterial({ color: rindCol, roughness: 0.8 });
  const paste = new THREE.MeshStandardMaterial({ color: pasteCol, roughness: 0.65, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 64, 1, false, gap / 2, TAU - gap), rind); body.castShadow = true; g.add(body);
  [gap / 2, -gap / 2].forEach((a) => {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(R, H), paste);
    f.position.set((Math.sin(a) * R) / 2, 0, (Math.cos(a) * R) / 2); f.rotation.y = a - Math.PI / 2; g.add(f);
  });
  g.rind = rind; g.paste = paste; g.R = R; g.H = H; g.gap = gap;
  return g;
}
// An arrow that ignores depth, aimed from a point along a direction with a length.
const UP = new THREE.Vector3(0, 1, 0), tmpV = new THREE.Vector3();
export function flowArrow(color, r = 0.05, head = 0.28) {
  const a = arrow(color, 1, head, r);
  a.traverse((o) => { if (o.material) { o.material.depthTest = false; o.renderOrder = 10; } });
  a.aim = (from, dir, len) => {
    a.position.set(...from);
    tmpV.set(...dir); if (tmpV.lengthSq() < 1e-9) tmpV.set(1, 0, 0);
    a.quaternion.setFromUnitVectors(UP, tmpV.normalize());
    a.set(Math.max(0.001, len));
    if (len < 0.05) a.visible = false;
  };
  return a;
}
// A simple thermometer: glass stem with a coloured column. set(k) fills it 0 → 1.
export function thermometer(parent, x, y, z, h = 1.6) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  g.add(beam([0, 0, 0], [0, h, 0], 0.05, M.clear(0xffffff, 0.35)));
  const bulb = sphere(0.09, M.glow(0xff5a4e), 12); g.add(bulb);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 10), M.glow(0xff5a4e)); g.add(col);
  g.set = (k) => { const L = Math.max(0.02, clamp(k, 0, 1) * (h - 0.1)); col.scale.y = L; col.position.y = L / 2; };
  g.set(0.5);
  return g;
}

// Casein micelles with their kappa-casein "hairs". n balls of radius r, each with `per` hairs.
// place(i, x, y, z, k, cutUpTo): hairs with index below cutUpTo (0..per) are gone.
export function hairyBalls(n, per, r, hairLen, seed = 7) {
  const rnd = rng(seed), g = new THREE.Group();
  const balls = crowd(n, new THREE.IcosahedronGeometry(r, 2), { rough: 0.9 });
  const hg = new THREE.CylinderGeometry(0.012, 0.012, 1, 5); hg.translate(0, 0.5, 0);
  const hairs = crowd(n * per, hg, { basic: true });
  const hc = new THREE.Color(COL.hair);
  const dirs = [], order = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < per; j++) {
      const u = rnd() * 2 - 1, a = rnd() * TAU, q = Math.sqrt(1 - u * u);
      dirs.push([q * Math.cos(a), u, q * Math.sin(a)]); hairs.tint(i * per + j, hc);
    }
    order.push(rnd());
  }
  g.add(balls, hairs);
  g.place = (i, x, y, z, k = 1, cut = 0) => {
    balls.put(i, x, y, z, k);
    for (let j = 0; j < per; j++) {
      const d = dirs[i * per + j], id = i * per + j;
      if (j < cut) hairs.hide(id); else hairs.aim(id, x + d[0] * r * k, y + d[1] * r * k, z + d[2] * r * k, d[0], d[1], d[2], hairLen * k, k);
    }
  };
  g.done = () => { balls.done(); hairs.done(); };
  g.balls = balls; g.hairs = hairs; g.dirs = dirs; g.order = order; g.per = per; g.n = n;
  return g;
}

// On a phone-width stage: hide minor labels and nudge the picture down, clear of the readout.
export function fitNarrow(stage, minor = [], chartOnTop = true) {
  const narrow = stage.host.clientWidth < 560, r = inReel();
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const y = r ? (tallReel(stage) && chartOnTop ? -0.2 : 0) : narrow ? -0.12 : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  return narrow;
}
export const inReel = () => document.body.classList.contains('gb-reel');
const tallReel = (stage) => inReel() && stage.camera.aspect < 0.75;
// In a tall reel, float the chart board in the empty top part of the frame, sized to the view.
export function reelChart(stage, chart) {
  if (!inReel()) return true;
  if (!tallReel(stage) || !stage.home) return false;
  const { pos, target } = stage.home, asp = stage.camera.aspect;
  const k = Math.min(2.5, Math.max(1, 1.45 / Math.max(0.3, asp)));
  const dist = Math.hypot(pos[0] - target[0], pos[1] - target[1], pos[2] - target[2]) * k;
  const H = 2 * (dist - target[2]) * Math.tan((21 * Math.PI) / 180);
  const { width, height } = chart.mesh.geometry.parameters;
  const sc = Math.min((0.9 * H * asp) / width, (0.3 * H) / height);
  chart.mesh.position.set(target[0], target[1] + 0.2 * H + 0.27 * H, 0);
  chart.mesh.scale.setScalar(sc);
  return true;
}
export { clamp, lerp, smooth, beam, box, sphere };
