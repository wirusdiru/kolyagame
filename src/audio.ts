let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, vol = 0.08) {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur);
}

export type Sfx = "shoot" | "bite" | "hit" | "coin" | "wave" | "refill" | "alien";

export function playSfx(name: Sfx) {
  switch (name) {
    case "shoot": tone(520, 0.06, "sine"); break;
    case "bite": tone(180, 0.1, "square", 0.06); tone(90, 0.08, "sawtooth", 0.04); break;
    case "hit": tone(120, 0.12, "square", 0.07); break;
    case "coin": tone(880, 0.05, "sine"); tone(1100, 0.08, "sine", 0.05); break;
    case "wave": tone(440, 0.15, "triangle"); break;
    case "refill": tone(300, 0.2, "sine", 0.05); break;
    case "alien": tone(200, 0.25, "sawtooth", 0.06); break;
  }
}
