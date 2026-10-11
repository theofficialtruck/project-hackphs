// Final game screen. Imports only from the engine (src/core). No physics or science text here.
import Globe from 'globe.gl';
import { BufferGeometry, Float32BufferAttribute, Points, PointsMaterial } from 'three';
import type { MeshPhongMaterial } from 'three';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import countriesUrl from 'world-atlas/countries-110m.json?url';
import {
  REGIONAL_PATTERNS,
  countryClimate,
  createGame,
  plainCountryName,
  science,
  type Emissions,
  type FactorId,
  type Game,
  type GameEvent,
  type GameView,
} from '../core';
import { playUpgradeEffect } from './effects';
import './style.css';

// The engine in a repo can be older or newer than the handoff. These local shapes let this screen
// build on any version: a part the engine does not provide (money, preview, milestones, ending) is
// simply not shown. Nothing is calculated here.
interface MilestoneInfo {
  warming: number;
  title: string;
  text: string;
  source: string;
  reached: boolean;
}
interface ObjectiveInfo {
  id: string;
  text: string;
  lesson: string;
  reward: number;
  done: boolean;
}
interface DebriefInfo {
  yearsPlayed: number;
  finalWarming: number;
  finalCo2: number;
  totalCo2Emitted: number;
  realWorld: readonly { text: string; source: string }[];
  gameSimplifications: readonly string[];
}
interface Preview {
  cost: number;
  affordable: boolean;
  years: number;
  extraEmissionsPerYear: Emissions;
  concentrationChange: { co2: number; ch4: number; n2o: number; cfc?: number };
  forcingChange: number;
  warmingChange: number;
  ozoneLossChange?: number;
}
interface ExtraView {
  dollars: number;
  incomePerYear: number;
  savingsCap: number;
  endingWarming: number;
  ended: boolean;
  debrief: DebriefInfo | null;
  milestones: readonly MilestoneInfo[];
  objectives: readonly ObjectiveInfo[];
}
type AnyFactor = GameView['factors'][number] & { upgradeCost?: number | null };
type AnyView = Omit<GameView, 'factors'> & { factors: readonly AnyFactor[] } & Partial<ExtraView>;
type AnyGame = Game & { previewUpgrade?: (factor: FactorId) => Preview | null };
type UiEvent =
  | GameEvent
  | { type: 'milestoneReached'; warming: number }
  | { type: 'objectiveCompleted'; objective: string; reward: number }
  | { type: 'gameEnded'; year: number };

type CountryTopology = Topology<{ countries: GeometryCollection<{ name: string }> }>;

const COLOR_STOPS: readonly (readonly [number, readonly [number, number, number]])[] = [
  [0, [0, 230, 118]],
  [1.5, [255, 230, 0]],
  [3, [255, 145, 0]],
  [5, [255, 23, 68]],
  [10, [41, 121, 255]],
  [20, [170, 0, 255]],
];

function $<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Page is missing ${selector}`);
  return found;
}
const fmt = (value: number, digits = 2): string => value.toFixed(digits);

function warmingRgb(warming: number): number[] {
  const t = Math.max(0, warming);
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    const [w0, c0] = COLOR_STOPS[i - 1]!;
    const [w1, c1] = COLOR_STOPS[i]!;
    if (t <= w1 || i === COLOR_STOPS.length - 1) {
      const k = Math.min(1, (t - w0) / (w1 - w0));
      return c0.map((c, j) => Math.round(c + (c1[j]! - c) * k));
    }
  }
  return [0, 230, 118];
}
const warmingColor = (warming: number): string => `rgb(${warmingRgb(warming).join(', ')})`;
const ATMOSPHERE_COOL = [58, 215, 255];
function atmosphereColor(warming: number): string {
  const k = Math.min(1, warming / 1.5);
  const hot = warmingRgb(warming + 1);
  return `rgb(${ATMOSPHERE_COOL.map((c, j) => Math.round(c + (hot[j]! - c) * k)).join(', ')})`;
}

function describeEmissions(e: Emissions): string {
  const parts: string[] = [];
  if (e.co2 > 0) parts.push(`${fmt(e.co2, 1)} billion tonnes of CO2`);
  if (e.ch4 > 0) parts.push(`${fmt(e.ch4, 1)} million tonnes of methane`);
  if (e.n2o > 0) parts.push(`${fmt(e.n2o, 2)} million tonnes of nitrogen as nitrous oxide`);
  if (e.cfc > 0) parts.push(`${fmt(e.cfc, 0)} thousand tonnes of CFCs`);
  return parts.length > 0 ? parts.join(', ') : 'nothing';
}

function describePreview(p: Preview): string {
  const c = p.concentrationChange;
  const gases: string[] = [];
  if (c.co2 > 0.05) gases.push(`CO2 +${fmt(c.co2, 1)} parts per million`);
  if (c.ch4 > 0.5) gases.push(`methane +${fmt(c.ch4, 0)} parts per billion`);
  if (c.n2o > 0.05) gases.push(`nitrous oxide +${fmt(c.n2o, 1)} parts per billion`);
  if ((c.cfc ?? 0) > 0.0005) gases.push(`CFCs +${fmt((c.cfc ?? 0) * 1000, 0)} parts per trillion`);
  const lines = [
    `1. Releases ${describeEmissions(p.extraEmissionsPerYear)} more per year`,
    `2. After ${p.years} years: ${gases.join(', ') || 'no visible change in gas levels'}`,
    `3. Extra energy trapped: +${fmt(p.forcingChange, 3)} watts per square meter`,
    `4. Extra warming: +${fmt(p.warmingChange, 3)} degrees C`,
  ];
  if ((p.ozoneLossChange ?? 0) > 0) {
    lines.push(`Separately, the ozone layer gets ${fmt(p.ozoneLossChange ?? 0)}% thinner`);
  }
  return lines.join('\n');
}

// ---- State -------------------------------------------------------------------------------
const game = createGame();
const getView = (): AnyView => game.getView() as AnyView;
// Warming at which the game-over screen appears. A game design choice made in this screen.
const UNINHABITABLE_WARMING = 20;
// The warming track always runs from 0 to the game-over warming.
const TRACK_MAX = UNINHABITABLE_WARMING;
const MIN_SPEED = 0.5;
const MAX_SPEED = 1000;
let started = false;
let playing = false;
let speed = MIN_SPEED; // simulated years per real second, set by the slider
let gameOver = false;
let shownWarming = 0;
let coloredAt = NaN;
let selectedCountry: string | null = null;
let hovered: object | null = null;
const cards: UiEvent[] = [];
let cardOpen = false;

// ---- Globe -------------------------------------------------------------------------------
const nameOf = (d: object): string =>
  plainCountryName((d as { properties: { name: string } }).properties.name);
const globe = new Globe($('#globe'))
  .backgroundColor('#000010')
  .showAtmosphere(true)
  .atmosphereColor('#3ad7ff')
  .atmosphereAltitude(0.28)
  .polygonSideColor(() => 'rgba(0, 8, 40, 0.9)')
  .polygonStrokeColor(() => '#ffffff')
  .polygonAltitude(0.02)
  .polygonsTransitionDuration(0)
  .polygonLabel(nameOf)
  .onPolygonHover((d) => {
    hovered = d;
    globe.polygonAltitude((p) => (p === hovered ? 0.06 : 0.02));
  })
  .onPolygonClick((d) => {
    if (!started) return;
    selectedCountry = nameOf(d);
    renderCountry(getView());
  });
const ocean = globe.globeMaterial() as MeshPhongMaterial;
ocean.color.set('#0a1a6b');
ocean.emissive.set('#06124a');
ocean.shininess = 30;
// Star field behind the globe.
const starPositions: number[] = [];
for (let i = 0; i < 2500; i++) {
  const r = 700 + Math.random() * 300;
  const a = Math.random() * Math.PI * 2;
  const z = Math.random() * 2 - 1;
  const xy = Math.sqrt(1 - z * z);
  starPositions.push(r * xy * Math.cos(a), r * xy * Math.sin(a), r * z);
}
const starGeometry = new BufferGeometry();
starGeometry.setAttribute('position', new Float32BufferAttribute(starPositions, 3));
globe.scene().add(new Points(starGeometry, new PointsMaterial({ color: '#bcd8ff', size: 2 })));
globe.controls().autoRotate = true;
globe.controls().autoRotateSpeed = 0.6;
window.addEventListener('resize', () => globe.width(innerWidth).height(innerHeight));

fetch(countriesUrl)
  .then((r) => r.json() as Promise<CountryTopology>)
  .then((t) => globe.polygonsData(feature(t, t.objects.countries).features))
  .catch((error: unknown) => console.error('Could not load country shapes', error));

function recolor(view: AnyView): void {
  const bucket = Math.round(view.surfaceWarming * 20) / 20; // about every 0.05 degrees C
  if (bucket === coloredAt) return;
  coloredAt = bucket;
  globe.atmosphereColor(atmosphereColor(view.surfaceWarming));
  warmingEl.style.color = warmingColor(view.surfaceWarming);
  globe.polygonCapColor((d) => {
    const c = countryClimate(nameOf(d), view.regions);
    return warmingColor(c ? c.warming : view.surfaceWarming);
  });
}

// ---- Intro -------------------------------------------------------------------------------
const plainC = (kelvin: number): number => Math.round(kelvin - 273.15);
$('#temp-cold').textContent = String(plainC(science.noGreenhouseTemperature()));
$('#temp-warm').textContent = String(plainC(science.SCIENCE.averageSurfaceTemperature.value));
$('#start').addEventListener('click', () => {
  started = true;
  playing = true;
  const intro = $('#intro');
  intro.classList.add('leaving'); // fades out, then is removed
  setTimeout(() => {
    intro.hidden = true;
  }, 600);
  $('#hud').hidden = false;
  $('#panel').hidden = false;
  render(getView());
});

// ---- Clock and controls ------------------------------------------------------------------
const playButton = $<HTMLButtonElement>('#play');
const speedInput = $<HTMLInputElement>('#speed');
speedInput.addEventListener('input', () => {
  // Logarithmic: the slider moves evenly from 0.5 to 100 years per second.
  const raw = MIN_SPEED * (MAX_SPEED / MIN_SPEED) ** (Number(speedInput.value) / 100);
  speed = raw >= 10 ? Math.round(raw) : Math.round(raw * 10) / 10;
  paintClock();
});
playButton.addEventListener('click', () => {
  playing = !playing;
  paintClock();
});
function paintClock(): void {
  playButton.textContent = playing ? 'Pause' : 'Play';
  $('#speed-label').textContent = `${speed} years per second`;
}
paintClock();

const warmingEl = $('#warming');
let shownText = '';
let shownClip = '';
let lastRecolor = 0;
// The number and the bar both follow the smoothed value, once per frame. The bar is a fixed
// gradient that is revealed with clip-path, so nothing is re-laid out while it grows.
function paintWarming(now: number): void {
  const text = `+${fmt(shownWarming)}`;
  if (text !== shownText) {
    shownText = text;
    warmingEl.textContent = text;
  }
  const pct = Math.min(100, (shownWarming / TRACK_MAX) * 100);
  const clip = `inset(0 ${(100 - pct).toFixed(2)}% 0 0)`;
  if (clip !== shownClip) {
    shownClip = clip;
    fillBar.style.clipPath = clip;
  }
  // Repainting every country is expensive, so do it at most a few times per second.
  if (now - lastRecolor > 400) {
    lastRecolor = now;
    recolor(getView());
  }
}

let last = performance.now();
function frame(now: number): void {
  const seconds = Math.min((now - last) / 1000, 0.25);
  last = now;
  const view = getView();
  if (started && playing && !cardOpen && !gameOver && !view.ended)
    handle(game.advance(seconds * speed));
  shownWarming += (view.surfaceWarming - shownWarming) * Math.min(1, seconds * 6); // smooth count up
  paintWarming(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---- Activities --------------------------------------------------------------------------
const factorBox = $('#factors');
const previewBox = $('#preview');
previewBox.hidden = typeof (game as AnyGame).previewUpgrade !== 'function';
factorBox.innerHTML = getView()
  .factors.map(
    (f) => `<div class="factor" data-id="${f.id}">
      <div class="factor-head"><strong>${f.name}</strong>
        <button data-act="down" data-id="${f.id}" aria-label="Lower ${f.name}">-</button>
        <button data-act="up" data-id="${f.id}" aria-label="Raise ${f.name}">+</button></div>
      <div class="factor-meta"></div><div class="msg"></div><div class="factor-detail"></div>
    </div>`,
  )
  .join('');

function showPreview(id: FactorId): void {
  const p = (game as AnyGame).previewUpgrade?.(id);
  if (p) previewBox.textContent = describePreview(p);
}
factorBox.addEventListener('mouseover', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act="up"]');
  if (b?.dataset.id) showPreview(b.dataset.id as FactorId);
});
factorBox.addEventListener('focusin', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act="up"]');
  if (b?.dataset.id) showPreview(b.dataset.id as FactorId);
});
factorBox.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('button');
  if (!b?.dataset.id) return;
  const factor = b.dataset.id as FactorId;
  const row = b.closest<HTMLElement>('.factor');
  const msg = row?.querySelector<HTMLElement>('.msg');
  if (msg) msg.textContent = '';
  const result = game.dispatch({
    type: b.dataset.act === 'up' ? 'upgradeFactor' : 'downgradeFactor',
    factor,
  });
  if (result.ok) {
    handle(result.events);
    if (b.dataset.act === 'up') playUpgradeEffect(factor);
    row?.classList.add('flash');
    setTimeout(() => row?.classList.remove('flash'), 600);
    return;
  }
  const f = getView().factors.find((x) => x.id === factor);
  const text: Record<string, string> = {
    NOT_ENOUGH_DOLLARS: 'Not enough dollars yet',
    FACTOR_LOCKED: `Needs: ${f?.requirements.map((r) => r.text).join(', ') ?? ''}`,
    MAX_LEVEL: 'Already at the highest level',
  };
  if (msg) msg.textContent = text[result.error.code] ?? '';
});

function renderFactors(view: AnyView): void {
  for (const f of view.factors) {
    const row = factorBox.querySelector<HTMLElement>(`.factor[data-id="${f.id}"]`);
    if (!row) continue;
    const [meta, , detail] = Array.from(row.querySelectorAll<HTMLElement>('div')).slice(1);
    const down = row.querySelector<HTMLButtonElement>('[data-act="down"]');
    const up = row.querySelector<HTMLButtonElement>('[data-act="up"]');
    if (!meta || !detail || !down || !up) continue;
    row.classList.toggle('locked', !f.unlocked);
    down.disabled = !f.unlocked || f.level === 0 || !!view.ended;
    up.disabled = !f.unlocked || f.level >= f.maxLevel || f.upgradeCost === null || !!view.ended;
    meta.textContent = f.unlocked
      ? `Level ${f.level} of ${f.maxLevel}. ` +
        (f.level >= f.maxLevel
          ? 'Highest level'
          : typeof f.upgradeCost === 'number'
            ? `Next level: ${Math.floor(f.upgradeCost)} dollars`
            : '')
      : '';
    const today =
      f.presentDayLevel === null
        ? 'Not used in the real world today.'
        : `Level ${f.presentDayLevel} is what the real world releases today.`;
    detail.textContent = f.unlocked
      ? `${today} ${f.description}`
      : `Locked. ${f.requirements.map((r) => `[${r.met ? 'x' : ' '}] ${r.text}`).join('  ')}`;
  }
}

// ---- Events, cards, debrief --------------------------------------------------------------
function handle(events: readonly UiEvent[]): void {
  for (const e of events) {
    if (e.type === 'milestoneReached' || e.type === 'objectiveCompleted' || e.type === 'cardShown')
      cards.push(e);
    if (e.type === 'gameEnded') renderDebrief(getView());
    if (e.type === 'gameReset') {
      gameOver = false;
      $('#gameover').hidden = true;
      cards.length = 0;
      shownWarming = 0;
      selectedCountry = null;
      $('#debrief').hidden = true;
    }
  }
  nextCard();
}

function nextCard(): void {
  const e = cards.shift();
  cardOpen = e !== undefined;
  $('#card').hidden = !cardOpen;
  if (!e) return;
  const view = getView();
  if (e.type === 'milestoneReached') {
    const m = (view.milestones ?? []).find((x) => x.warming === e.warming);
    $('#card-title').textContent = `+${e.warming} degrees C: ${m?.title ?? ''}`;
    $('#card-text').textContent = m?.text ?? '';
    $('#card-source').textContent = m ? `Source: ${m.source}` : '';
  } else if (e.type === 'objectiveCompleted') {
    const o = (view.objectives ?? []).find((x) => x.id === e.objective);
    $('#card-title').textContent = `Goal done: +${e.reward} dollars`;
    $('#card-text').textContent = `${o?.text ?? ''} ${o?.lesson ?? ''}`;
    $('#card-source').textContent = '';
  } else if (e.type === 'cardShown') {
    const c = view.cards.find((x) => x.id === e.card);
    $('#card-title').textContent = c?.title ?? '';
    $('#card-text').textContent = c?.text ?? '';
    $('#card-source').textContent = c ? `Source: ${c.source}` : '';
  }
}
$('#card-ok').addEventListener('click', nextCard);

function renderDebrief(view: AnyView): void {
  const d = view.debrief;
  const box = $('#debrief');
  if (!d) return;
  const li = (items: readonly string[]) => `<ul>${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;
  box.innerHTML = `<div class="debrief-body">
    <h2>Earth reached +${fmt(d.finalWarming, 1)} degrees C</h2>
    <p>Years played: ${fmt(d.yearsPlayed, 0)}. CO2 in the air: ${fmt(d.finalCo2, 0)} parts per million.
    Total CO2 released: ${fmt(d.totalCo2Emitted, 0)} billion tonnes.</p>
    <h3>The real world</h3>
    ${`<ul>${d.realWorld.map((r) => `<li>${r.text} <span class="dim">Source: ${r.source}</span></li>`).join('')}</ul>`}
    <h3>Where this game is simpler than reality</h3>${li(d.gameSimplifications)}
    <button id="again" class="primary">Play again</button></div>`;
  box.hidden = false;
  $('#again').addEventListener('click', () => {
    const r = game.dispatch({ type: 'reset' });
    if (r.ok) handle(r.events);
    playing = true;
  });
}

// ---- Country card and science panel ------------------------------------------------------
function renderCountry(view: AnyView): void {
  $('#country').hidden = selectedCountry === null;
  if (selectedCountry === null) return;
  $('#country-name').textContent = selectedCountry;
  const c = countryClimate(selectedCountry, view.regions);
  const global = `Global average: +${fmt(view.surfaceWarming)} degrees C`;
  if (!c) {
    $('#country-text').textContent =
      `No regional climate data for this place, so it shows the global average.\n${global}`;
    return;
  }
  const rain =
    c.rainfallTrend === 'uncertain'
      ? 'climate models disagree on whether it gets wetter or drier'
      : `${fmt(Math.abs(c.rainfallChangePercent), 1)}% ${c.rainfallTrend === 'wetter' ? 'more' : 'less'} rain (most climate models agree)`;
  $('#country-text').textContent = [
    `Warming here: +${fmt(c.warming)} degrees C`,
    `Middle half of climate models: +${fmt(c.warmingLow)} to +${fmt(c.warmingHigh)}`,
    global,
    `Rainfall: ${rain}`,
    `Source: IPCC AR6 Atlas, ${REGIONAL_PATTERNS.value} climate models`,
  ].join('\n');
}
$('#country-close').addEventListener('click', () => {
  selectedCountry = null;
  renderCountry(getView());
});

function renderScience(view: AnyView): void {
  if (!$<HTMLDetailsElement>('#science').open) return;
  const w = (n: number) => `${fmt(n, 2)} watts per square meter`;
  const real = view.realWorld;
  $('#science-text').textContent = [
    `CO2 in the air: ${fmt(view.concentrations.co2, 0)} parts per million (real world 2019: ${real.co2})`,
    `Methane: ${fmt(view.concentrations.ch4, 0)} parts per billion (real world 2019: ${real.ch4})`,
    `Nitrous oxide: ${fmt(view.concentrations.n2o, 0)} parts per billion (real world 2019: ${real.n2o})`,
    `Ozone layer: ${fmt(view.ozone.lossPercent, 1)}% thinner (real world today: about ${view.ozone.realWorldLossPercent}%)`,
    `Extra energy trapped: ${w(view.forcing.total)}`,
    `Energy Earth is still gaining: ${w(view.energyImbalance)}`,
    `Warming locked in: +${fmt(view.equilibriumWarming)} degrees C`,
    `Deep ocean warming: +${fmt(view.deepOceanWarming)} degrees C`,
    `Water vapour feedback: ${w(view.feedbacks.waterVapourLapseRate)}`,
  ].join('\n');
}
$('#science').addEventListener('toggle', () => renderScience(getView()));

// ---- Render ------------------------------------------------------------------------------
const track = $('#track');
const fillBar = $('#fill');
const pctOf = (w: number): string => `${(w / TRACK_MAX) * 100}%`;
track.insertAdjacentHTML(
  'beforeend',
  (getView().milestones ?? [])
    .map(
      (m) =>
        `<i class="tick" data-w="${m.warming}" style="left:${pctOf(m.warming)}" title="${m.title}"></i>`,
    )
    .join('') +
    `<i class="tick today" style="left:${pctOf(getView().realWorld.warming)}" title="Real world, 2011 to 2020: +${getView().realWorld.warming} degrees C"></i>` +
    `<span class="mark today" style="left:${pctOf(getView().realWorld.warming)}">Today</span>` +
    [5, 10, 15, 20]
      .map(
        (w) => `<span class="mark${w === 20 ? ' last' : ''}" style="left:${pctOf(w)}">+${w}</span>`,
      )
      .join(''),
);

function showGameOver(): void {
  gameOver = true;
  playing = false;
  paintClock();
  $('#gameover').hidden = false;
}
$('#gameover-again').addEventListener('click', () => {
  const r = game.dispatch({ type: 'reset' });
  if (r.ok) handle(r.events);
  playing = true;
  paintClock();
});

function render(view: AnyView): void {
  if (!started) return;
  if (!gameOver && view.surfaceWarming >= UNINHABITABLE_WARMING) showGameOver();
  track.querySelectorAll<HTMLElement>('.tick').forEach((t) => {
    const w = Number(t.dataset.w);
    t.classList.toggle(
      'reached',
      (view.milestones ?? []).some((m) => m.warming === w && m.reached),
    );
  });
  $('#year').textContent = `Year ${Math.floor(view.elapsedYears)}`;
  const hasMoney = view.dollars !== undefined && view.incomePerYear !== undefined;
  $('#money').hidden = !hasMoney;
  $('#income').hidden = !hasMoney;
  if (view.dollars !== undefined && view.incomePerYear !== undefined) {
    $('#money').textContent = `${Math.floor(view.dollars)} dollars`;
    $('#income').textContent =
      view.savingsCap !== undefined && view.dollars >= view.savingsCap
        ? `Savings full at ${Math.floor(view.savingsCap)} dollars. Upgrade to raise the limit`
        : `+${Math.floor(view.incomePerYear)} dollars per year`;
  }
  renderFactors(view);
  renderCountry(view);
  renderScience(view);
}

game.subscribe(render);
recolor(getView());
