// Sound effects for the game screen. The files live in public/sounds and are played through the
// Web Audio API, so each sound gets its own gain: the recordings differ a lot in loudness, and the
// gains below bring them to a similar level (measured from each file's peak and average level).
const SOUNDS = {
  axe: { file: 'axe.mp3', gain: 3.1 },
  cow: { file: 'cow.mp3', gain: 0.26 },
  oilDrop: { file: 'oil-drop.mp3', gain: 0.18 },
  gasBurner: { file: 'gas-burner.mp3', gain: 0.9 },
  plant: { file: 'plant.mp3', gain: 5 },
  concrete: { file: 'concrete.mp3', gain: 8 },
  rubbishBag: { file: 'rubbish-bag.mp3', gain: 3.7 },
  sack: { file: 'sack.mp3', gain: 0.89 },
  smoke: { file: 'smoke.mp3', gain: 0.54 },
  cfcBurst: { file: 'cfc-burst.mp3', gain: 1.7 },
  puff: { file: 'puff.mp3', gain: 3.5 },
  click: { file: 'click.mp3', gain: 0.7 },
  notification: { file: 'notification.mp3', gain: 4.7 },
  goal: { file: 'goal.mp3', gain: 0.21 },
  milestone: { file: 'milestone.mp3', gain: 1.5 },
  start: { file: 'start.mp3', gain: 1.1 },
  gameOver: { file: 'game-over.mp3', gain: 3.9 },
  ambience: { file: 'ambience.mp3', gain: 0.25 },
} as const;
export type SoundName = Exclude<keyof typeof SOUNDS, 'ambience'>;

const FACTOR_SOUNDS: Record<string, SoundName> = {
  deforestation: 'axe',
  livestock: 'cow',
  oil: 'oilDrop',
  naturalGas: 'gasBurner',
  rice: 'plant',
  cement: 'concrete',
  landfills: 'rubbishBag',
  fertilizer: 'sack',
  coal: 'smoke',
  refrigerants: 'cfcBurst',
};

const MASTER_VOLUME = 0.7;
const STORAGE_KEY = 'ozone-inc-muted';
const buffers = new Map<keyof typeof SOUNDS, Promise<AudioBuffer | null>>();
const lastPlayed = new Map<SoundName, number>();
let context: AudioContext | null = null;
let master: GainNode | null = null;
let ambience: AudioBufferSourceNode | null = null;
let ambienceWanted = false;
let muted = false;
try {
  muted = localStorage.getItem(STORAGE_KEY) === '1';
} catch {
  muted = false;
}

function audio(): { context: AudioContext; master: GainNode } | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!context || !master) {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(context.destination);
  }
  if (context.state === 'suspended') context.resume().catch(() => undefined);
  return { context, master };
}

function load(name: keyof typeof SOUNDS): Promise<AudioBuffer | null> {
  let buffer = buffers.get(name);
  if (!buffer) {
    const ready = audio();
    buffer = ready
      ? fetch(`${import.meta.env.BASE_URL}sounds/${SOUNDS[name].file}`)
          .then((r) => r.arrayBuffer())
          .then((data) => ready.context.decodeAudioData(data))
          .catch(() => null)
      : Promise.resolve(null);
    buffers.set(name, buffer);
  }
  return buffer;
}

function start(
  name: keyof typeof SOUNDS,
  volume: number,
  loop: boolean,
): Promise<AudioBufferSourceNode | null> {
  const ready = audio();
  if (!ready) return Promise.resolve(null);
  return load(name).then((buffer) => {
    if (!buffer) return null;
    const source = ready.context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    const gain = ready.context.createGain();
    gain.gain.value = SOUNDS[name].gain * volume;
    source.connect(gain).connect(ready.master);
    source.start();
    return source;
  });
}

export function preloadSounds(): void {
  for (const name of Object.keys(SOUNDS) as (keyof typeof SOUNDS)[]) void load(name);
}

export function playSound(name: SoundName, volume = 1): void {
  if (muted) return;
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? -Infinity) < 80) return;
  lastPlayed.set(name, now);
  void start(name, volume, false);
}

export function playFactorSound(factor: string): void {
  const name = FACTOR_SOUNDS[factor];
  if (name) playSound(name);
}

export function startAmbience(): void {
  ambienceWanted = true;
  if (ambience) return;
  void start('ambience', 1, true).then((source) => {
    if (!source) return;
    if (ambienceWanted && !ambience) ambience = source;
    else source.stop();
  });
}

export function stopAmbience(): void {
  ambienceWanted = false;
  ambience?.stop();
  ambience = null;
}

export function isMuted(): boolean {
  return muted;
}

function remember(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    return;
  }
}

export function setMuted(value: boolean): void {
  muted = value;
  remember(value);
  if (master) master.gain.value = muted ? 0 : MASTER_VOLUME;
}
