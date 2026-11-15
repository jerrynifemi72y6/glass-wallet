// The glass of liquid: a row of coupled springs makes a believable
// sloshing surface, and the level itself moves on its own spring so
// spending makes the liquid visibly sink.

const N = 34;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class Liquid {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.h = new Float32Array(N);
    this.v = new Float32Array(N);
    this.level = 0;
    this.levelTarget = 0;
    this.levelV = 0;
    this.tilt = 0;
    this.tiltTarget = 0;
    this.time = 0;
    this.acc = 0;
    this.raf = 0;
    this.colorTop = "#3ce9b0";
    this.colorBottom = "#0b7a63";
    this.w = 1;
    this.hgt = 1;

    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
    this.resize();
    this.loop();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.hgt = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.hgt * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setLevel(x, instant = false) {
    const next = clamp(x, 0, 1);
    if (instant) {
      this.level = next;
      this.levelTarget = next;
      this.levelV = 0;
      return;
    }
    if (Math.abs(next - this.levelTarget) > 0.001) this.levelV += (next - this.levelTarget) * 0.3;
    this.levelTarget = next;
  }

  setTilt(t) {
    this.tiltTarget = clamp(t, -1, 1);
  }

  splash(power = 1) {
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * 2 - 1;
      this.v[i] += (Math.random() - 0.5) * power * 1.6 + Math.sin(x * 3.1) * power * 0.9;
    }
    this.levelV += power * 0.004;
  }

  tint(top, bottom) {
    this.colorTop = top;
    this.colorBottom = bottom;
  }

  loop() {
    if (this.raf) return;
    const run = (t) => {
      this.raf = requestAnimationFrame(run);
      if (document.hidden) return;
      const last = this.last || t;
      this.last = t;
      this.acc += Math.min(0.05, (t - last) / 1000);
      let steps = 0;
      while (this.acc >= 1 / 60 && steps < 3) {
        this.step(1 / 60);
        this.acc -= 1 / 60;
        steps += 1;
      }
      this.draw();
    };
    this.raf = requestAnimationFrame(run);
  }

  step(dt) {
    this.time += dt;

    // level on its own spring
    this.levelV += (this.levelTarget - this.level) * 20 * dt;
    this.levelV *= 1 - 5.5 * dt;
    this.level += this.levelV * dt * 60 * 0.5;
    this.level = clamp(this.level, 0, 1);

    // tilt eases toward the sensor value
    this.tilt += (this.tiltTarget - this.tilt) * Math.min(1, dt * 7);

    const amp = Math.min(26, this.w * 0.12);
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * 2 - 1;
      const target = this.tilt * amp * x;
      this.v[i] += (target - this.h[i]) * 2.1 * dt;
      this.v[i] *= 1 - 3.2 * dt;
      this.h[i] += this.v[i] * dt * 60;
    }

    // neighbours pull on each other so waves travel across the surface
    const before = this.h.slice();
    for (let i = 0; i < N; i++) {
      const l = before[i - 1] ?? before[i];
      const r = before[i + 1] ?? before[i];
      this.h[i] = before[i] * 0.62 + (l + r) * 0.19;
    }
  }

  draw() {
    const { ctx, w, hgt: H } = this;
    ctx.clearRect(0, 0, w, H);

    const level = this.level;
    const surface = H - level * (H - 6) - 4;
    const idle = (x, t) =>
      Math.sin(t * 1.5 + x * 2.4) * 0.35 + (level > 0 ? Math.sin(t * 2.3 - x * 3.1) * 0.25 : 0);

    const pts = [];
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * w;
      const nx = (i / (N - 1)) * 2 - 1;
      pts.push([x, surface + this.h[i] + idle(nx, this.time)]);
    }

    ctx.beginPath();
    ctx.moveTo(0, H + 2);
    ctx.lineTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < N - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      ctx.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2);
    }
    ctx.lineTo(w, pts[N - 1][1]);
    ctx.lineTo(w, H + 2);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, surface, 0, H);
    grad.addColorStop(0, this.colorTop);
    grad.addColorStop(1, this.colorBottom);
    ctx.fillStyle = grad;
    ctx.fill();

    // lit surface line
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < N - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      ctx.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2);
    }
    ctx.lineTo(w, pts[N - 1][1]);
    ctx.strokeStyle = "rgba(255,255,255,0.62)";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // glow just under the surface
    const sheen = ctx.createLinearGradient(0, surface, 0, surface + 46);
    sheen.addColorStop(0, "rgba(255,255,255,0.3)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, surface, w, 46);
    ctx.clip();
    ctx.fillStyle = sheen;
    ctx.fillRect(0, surface, w, 46);
    ctx.restore();
  }
}
