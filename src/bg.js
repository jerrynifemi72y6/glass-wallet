// Flowing gradient backdrop. One fullscreen triangle, capped resolution,
// so it stays cheap enough for a 60fps phone GPU.

const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;

float hash(vec2 p){
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p){
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++){
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float t = u_time * 0.055;

  vec2 q = vec2(fbm(p * 1.5 + t), fbm(p * 1.5 + vec2(3.1, 1.7) - t * 0.8));
  float n = fbm(p * 1.9 + q * 1.7 + vec2(t * 1.2, -t * 0.9));

  vec3 col = mix(u_c1, u_c2, smoothstep(0.22, 0.86, n));
  col = mix(col, u_c3, smoothstep(0.5, 1.0, q.x * 0.55 + n * 0.55));

  vec3 glow = vec3(0.0);
  for (int i = 0; i < 3; i++){
    float fi = float(i);
    vec2 c = vec2(sin(t * (2.6 + fi * 0.9) + fi * 2.1),
                  cos(t * (2.1 + fi * 1.3) + fi * 1.7)) * 0.78;
    float d = length(p - c);
    glow += u_c3 * 0.38 / (1.0 + d * d * 10.0) * (0.55 + 0.45 * sin(t * 6.0 + fi * 2.4));
  }
  col += glow;

  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.022;
  col *= 1.0 - dot(p, p) * 0.2;
  col *= 1.2;
  col = pow(max(col, 0.0), vec3(0.92));

  gl_FragColor = vec4(col, 1.0);
}
`;

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  const v = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

const lerp = (a, b, t) => a + (b - a) * t;

export class Backdrop {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl", {
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    if (!this.gl) return;

    const gl = this.gl;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
      }
      return s;
    };

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.u = {
      res: gl.getUniformLocation(prog, "u_res"),
      time: gl.getUniformLocation(prog, "u_time"),
      c1: gl.getUniformLocation(prog, "u_c1"),
      c2: gl.getUniformLocation(prog, "u_c2"),
      c3: gl.getUniformLocation(prog, "u_c3"),
    };

    this.colors = [hexToRgb("#051d24"), hexToRgb("#0a2c3e"), hexToRgb("#1fae86")];
    this.target = [hexToRgb("#051d24"), hexToRgb("#0a2c3e"), hexToRgb("#1fae86")];
    this.start = performance.now();
    this.raf = 0;
    this.paused = false;

    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
    document.addEventListener("visibilitychange", () => {
      this.paused = document.hidden;
      if (!this.paused) this.loop();
    });
    this.resize();
    this.loop();
  }

  setPalette([a, b, c]) {
    if (!this.gl) return;
    this.target = [hexToRgb(a), hexToRgb(b), hexToRgb(c)];
  }

  resize() {
    if (!this.gl) return;
    // Cap the backing store: this is a soft gradient, upscaling is invisible
    // and it keeps fill cost low on mid-range phones.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.min(Math.round(window.innerWidth * dpr), 900);
    const h = Math.min(Math.round(window.innerHeight * dpr), 1600);
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  }

  loop() {
    if (this.raf) return;
    const tick = () => {
      this.raf = 0;
      if (this.paused) return;
      this.draw();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  draw() {
    const gl = this.gl;
    if (!gl) return;
    const t = (performance.now() - this.start) / 1000;

    for (let i = 0; i < 3; i++) {
      for (let k = 0; k < 3; k++) {
        this.colors[i][k] = lerp(this.colors[i][k], this.target[i][k], 0.02);
      }
    }

    gl.uniform2f(this.u.res, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.u.time, t);
    gl.uniform3fv(this.u.c1, this.colors[0]);
    gl.uniform3fv(this.u.c2, this.colors[1]);
    gl.uniform3fv(this.u.c3, this.colors[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
