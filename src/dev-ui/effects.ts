// Short animations played over the globe when the player buys an upgrade. Every click creates its
// own independent element, so animations overlap each other. Icons are inline SVG shapes.
const layer = document.querySelector<HTMLElement>('#fx');

type Motion = 'swing' | 'rise' | 'drop' | 'grow' | 'hop';
interface Effect {
  svg: string;
  motion: Motion;
  color: string; // colour of the sparks
}
interface MotionSpec {
  ms: number;
  origin: string;
  hits: readonly number[]; // moments (milliseconds) when sparks fly out
  keyframes: Keyframe[];
}

const icon = (body: string): string =>
  `<svg viewBox="0 0 64 64" width="84" height="84">${body}</svg>`;

const EFFECTS: Record<string, Effect> = {
  // An axe hacking at the Earth
  deforestation: {
    motion: 'swing',
    color: '#c68642',
    svg: icon(
      '<rect x="29" y="8" width="6" height="54" rx="3" fill="#8b5a2b"/>' +
        '<path d="M35 8 Q60 10 58 30 Q46 36 35 30 Z" fill="#cfd8dc" stroke="#607d8b" stroke-width="2"/>',
    ),
  },
  // Dark smoke rising from coal
  coal: {
    motion: 'rise',
    color: '#78909c',
    svg: icon(
      '<circle cx="22" cy="42" r="14" fill="#263238"/><circle cx="42" cy="36" r="16" fill="#37474f"/>' +
        '<circle cx="32" cy="22" r="12" fill="#546e7a"/>',
    ),
  },
  // A drop of oil falling in
  oil: {
    motion: 'drop',
    color: '#ffb300',
    svg: icon(
      '<path d="M32 6 C46 26 52 34 52 42 A20 20 0 0 1 12 42 C12 34 18 26 32 6Z" fill="#111" stroke="#ffb300" stroke-width="3"/>',
    ),
  },
  // A gas flame
  naturalGas: {
    motion: 'rise',
    color: '#ffe600',
    svg: icon(
      '<path d="M32 4 C40 18 52 26 50 42 A18 18 0 0 1 14 42 C14 32 22 28 24 18 C28 22 30 16 32 4Z" fill="#ff7a00"/>' +
        '<path d="M32 30 C38 38 42 42 40 50 A8 8 0 0 1 24 50 C24 42 30 38 32 30Z" fill="#ffe600"/>',
    ),
  },
  // A cow hopping onto the Earth
  livestock: {
    motion: 'hop',
    color: '#9ccc65',
    svg: icon(
      '<rect x="10" y="24" width="38" height="20" rx="8" fill="#fafafa"/><circle cx="52" cy="30" r="8" fill="#fafafa"/>' +
        '<rect x="14" y="40" width="5" height="16" rx="2" fill="#eceff1"/><rect x="38" y="40" width="5" height="16" rx="2" fill="#eceff1"/>' +
        '<ellipse cx="22" cy="32" rx="5" ry="4" fill="#263238"/><ellipse cx="36" cy="36" rx="4" ry="3" fill="#263238"/>' +
        '<circle cx="55" cy="28" r="1.8" fill="#263238"/><rect x="46" y="18" width="4" height="7" rx="2" fill="#eceff1"/>',
    ),
  },
  // Rice stalks growing
  rice: {
    motion: 'grow',
    color: '#aed581',
    svg: icon(
      '<path d="M16 60 Q16 30 22 10 M32 60 Q32 28 32 6 M48 60 Q48 30 42 10" stroke="#7cb342" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="22" cy="12" rx="4" ry="8" fill="#ffd54f"/><ellipse cx="32" cy="8" rx="4" ry="8" fill="#ffd54f"/>' +
        '<ellipse cx="42" cy="12" rx="4" ry="8" fill="#ffd54f"/>',
    ),
  },
  // Concrete blocks dropping
  cement: {
    motion: 'drop',
    color: '#b0bec5',
    svg: icon(
      '<rect x="8" y="38" width="22" height="18" fill="#90a4ae"/><rect x="34" y="38" width="22" height="18" fill="#78909c"/>' +
        '<rect x="21" y="18" width="22" height="18" fill="#b0bec5"/>',
    ),
  },
  // A bag of rubbish dropping
  landfills: {
    motion: 'drop',
    color: '#8d6e63',
    svg: icon(
      '<path d="M18 22 Q32 4 46 22 L52 56 H12Z" fill="#455a64"/><rect x="27" y="6" width="10" height="9" rx="3" fill="#37474f"/>',
    ),
  },
  // A sack of fertilizer spilling granules
  fertilizer: {
    motion: 'drop',
    color: '#43a047',
    svg: icon(
      '<rect x="16" y="14" width="32" height="44" rx="5" fill="#8d6e63"/><rect x="22" y="26" width="20" height="14" rx="3" fill="#43a047"/>',
    ),
  },
};
const FALLBACK: Effect = { ...EFFECTS['coal']!, color: '#cfd8dc' };

const MOTIONS: Record<Motion, MotionSpec> = {
  swing: {
    ms: 1200,
    origin: '50% 100%',
    hits: [360, 816],
    keyframes: [
      { opacity: 0, transform: 'rotate(-80deg) scale(0.6)', offset: 0 },
      { opacity: 1, transform: 'rotate(-70deg) scale(1)', offset: 0.12 },
      { opacity: 1, transform: 'rotate(30deg) scale(1)', offset: 0.3 },
      { opacity: 1, transform: 'rotate(-50deg) scale(1)', offset: 0.5 },
      { opacity: 1, transform: 'rotate(30deg) scale(1)', offset: 0.68 },
      { opacity: 1, transform: 'rotate(30deg) scale(1)', offset: 0.85 },
      { opacity: 0, transform: 'rotate(30deg) scale(1)', offset: 1 },
    ],
  },
  rise: {
    ms: 1400,
    origin: '50% 50%',
    hits: [],
    keyframes: [
      { opacity: 0, transform: 'translateY(30px) scale(0.5)', offset: 0 },
      { opacity: 0.95, transform: 'translateY(0) scale(1)', offset: 0.25 },
      { opacity: 0, transform: 'translateY(-130px) scale(1.6)', offset: 1 },
    ],
  },
  drop: {
    ms: 1000,
    origin: '50% 100%',
    hits: [550],
    keyframes: [
      { opacity: 0, transform: 'translateY(-150px) scale(1)', offset: 0 },
      { opacity: 1, transform: 'translateY(-110px) scale(1)', offset: 0.15 },
      { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.55 },
      { opacity: 1, transform: 'translateY(0) scale(1.15, 0.8)', offset: 0.65 },
      { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.8 },
      { opacity: 0, transform: 'translateY(10px) scale(0.9)', offset: 1 },
    ],
  },
  grow: {
    ms: 1300,
    origin: '50% 100%',
    hits: [],
    keyframes: [
      { opacity: 0, transform: 'scaleY(0)', offset: 0 },
      { opacity: 1, transform: 'scaleY(1)', offset: 0.4 },
      { opacity: 1, transform: 'scaleY(1)', offset: 0.8 },
      { opacity: 0, transform: 'scaleY(1.05)', offset: 1 },
    ],
  },
  hop: {
    ms: 1300,
    origin: '50% 100%',
    hits: [650, 1100],
    keyframes: [
      { opacity: 0, transform: 'translate(-110px, -40px)', offset: 0 },
      { opacity: 1, transform: 'translate(-85px, -60px)', offset: 0.1 },
      { opacity: 1, transform: 'translate(-60px, -70px)', offset: 0.3 },
      { opacity: 1, transform: 'translate(-20px, 0)', offset: 0.5 },
      { opacity: 1, transform: 'translate(20px, -50px)', offset: 0.7 },
      { opacity: 1, transform: 'translate(50px, 0)', offset: 0.85 },
      { opacity: 0, transform: 'translate(60px, 0)', offset: 1 },
    ],
  },
};

const MAX_ACTIVE = 40;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function burst(host: HTMLElement, color: string, delay: number): void {
  for (let i = 0; i < 9; i++) {
    const spark = document.createElement('i');
    spark.className = 'spark';
    spark.style.background = color;
    host.append(spark);
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 50;
    spark.animate(
      [
        { opacity: 1, transform: 'translate(0, 0) scale(1)' },
        {
          opacity: 0,
          transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0.3)`,
        },
      ],
      { duration: 500 + Math.random() * 300, delay, easing: 'ease-out', fill: 'backwards' },
    );
  }
}

/** Plays the animation for one bought upgrade. Safe to call many times in a row. */
export function playUpgradeEffect(factor: string): void {
  if (!layer || reduceMotion.matches || layer.childElementCount >= MAX_ACTIVE) return;
  const effect = EFFECTS[factor] ?? FALLBACK;
  const motion = MOTIONS[effect.motion];

  // Random spot on the Earth so animations from quick clicks do not sit on top of each other.
  const host = document.createElement('div');
  host.className = 'fx';
  host.style.left = `calc(50% + ${Math.round((Math.random() - 0.5) * 260)}px)`;
  host.style.top = `calc(50% + ${Math.round((Math.random() - 0.5) * 220)}px)`;
  const shape = document.createElement('div');
  shape.className = 'fx-icon';
  shape.style.transformOrigin = motion.origin;
  shape.innerHTML = effect.svg;
  host.append(shape);
  layer.append(host);

  for (const hit of motion.hits) burst(host, effect.color, hit);
  if (motion.hits.length === 0) burst(host, effect.color, motion.ms * 0.3);
  shape.animate(motion.keyframes, { duration: motion.ms, easing: 'ease-in-out', fill: 'forwards' });
  setTimeout(() => host.remove(), motion.ms + 900);
}
