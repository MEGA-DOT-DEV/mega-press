/**
 * PRESS / showcase
 *
 * The live demonstration, ported from mega.html into the lab.
 *
 * Plates are static geometry. This is the other half of the system: the
 * generative ground, resolved through the same 4x4 ordered screen, running
 * against a real document rather than against a solved one.
 *
 * Five pieces:
 *
 *   stage     a DOM-aware density field. Every [data-mass] element carves a
 *             clearing, so the texture composes itself around the type instead
 *             of hiding behind it. Threads are capsule SDFs between real
 *             elements, so a connector is derived from the layout here too.
 *   plate     type read back as luminance and resolved through the screen, so
 *             a headline can dissolve into static and precipitate out of it
 *   specimens three density functions, masked into a corner, brightening on
 *             hover
 *   ramp      the seventeen coverage levels of the matrix, shown as itself
 *   tokens    the palette and the type scale
 *
 * Everything is authored at cell resolution and enlarged by CSS with
 * image-rendering: pixelated. The canvases here are tiny.
 */

import { clamp, Rect, sdCapsule, sdRoundBox, smoothstep } from "./geometry.js";
import { hash2, luminance, packHex, threshold } from "./screen.js";
import { COLOR, FAMILY } from "./tokens.js";

const REDUCED =
	typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* --------------------------------------------------------------------------
 * Stage: the DOM-aware field
 * ------------------------------------------------------------------------ */

class Stage {
	constructor(root, params = {}) {
		this.root = root;
		this.canvas = root.querySelector("[data-field]");
		this.ctx = this.canvas.getContext("2d");
		this.p = {
			pixelSize: 4,
			baseDensity: 0.28,
			gradient: 1.15,
			gradientAngle: 0.85,
			contrast: 1.35,
			spacing: 2,
			massStrength: 0.8,
			halo: 110,
			threadInk: 0.7,
			waveStrength: 1,
			verticalFade: 0.06,
			pointerInfluence: 0.55,
			...params,
		};
		this.ink = packHex(COLOR.ink);
		this.accent = packHex(COLOR.red);
		this.pointer = { x: 0.5, y: 0.42, active: false };
		this.pulse = { t: -999, x: 0.5, y: 0.5 };
		this.time = 0;
		this.dirty = true;
		this.visible = true;

		this.pairs = (root.dataset.threads || "")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean)
			.map((s) => s.split(":").map((v) => v.trim()));

		new ResizeObserver(() => this.measure()).observe(root);
		root.addEventListener("pointermove", (e) => {
			const r = root.getBoundingClientRect();
			this.pointer.x = (e.clientX - r.left) / r.width;
			this.pointer.y = 1 - (e.clientY - r.top) / r.height;
			this.pointer.active = true;
		});
		root.addEventListener("pointerleave", () => {
			this.pointer.active = false;
		});
		root.addEventListener("pointerdown", (e) => {
			const r = root.getBoundingClientRect();
			this.pulse = {
				t: this.time,
				x: (e.clientX - r.left) / r.width,
				y: 1 - (e.clientY - r.top) / r.height,
			};
		});

		this.measure();
	}

	measure() {
		const rect = this.root.getBoundingClientRect();
		if (rect.width < 2 || rect.height < 2) return;
		this.w = rect.width;
		this.h = rect.height;
		const px = this.p.pixelSize;
		this.cols = Math.max(2, Math.ceil(this.w / px));
		this.rows = Math.max(2, Math.ceil(this.h / px));
		this.canvas.width = this.cols;
		this.canvas.height = this.rows;
		this.image = this.ctx.createImageData(this.cols, this.rows);
		this.buf = new Uint32Array(this.image.data.buffer);

		const n = this.cols * this.rows;
		this.mass = new Float32Array(n);
		this.thread = new Float32Array(n);
		this.phase = new Float32Array(n);

		this.sinColC = new Float32Array(this.cols);
		this.cosColC = new Float32Array(this.cols);
		this.sinColF = new Float32Array(this.cols);
		this.cosColF = new Float32Array(this.cols);
		this.rowBroad = new Float32Array(this.rows);
		this.sinRowC = new Float32Array(this.rows);
		this.cosRowC = new Float32Array(this.rows);
		this.sinRowF = new Float32Array(this.rows);
		this.cosRowF = new Float32Array(this.rows);

		this.buildLayout(rect);
		// Assigning canvas.width cleared the backing store, so repaint rather than
		// waiting for a clock tick that may never come.
		this.render(this.time);
	}

	/** Reads the real geometry of the DOM and bakes it into two buffers. */
	buildLayout(rect) {
		const px = this.p.pixelSize;
		const local = (el) => {
			const r = el.getBoundingClientRect();
			return new Rect(r.left - rect.left, r.top - rect.top, r.width, r.height);
		};

		const masses = [...this.root.querySelectorAll("[data-mass]")].map((el) => ({
			rect: local(el),
			pad: parseFloat(el.dataset.mass) || 24,
		}));

		const nodes = {};
		this.root.querySelectorAll("[data-node]").forEach((el) => {
			const b = local(el);
			const pad = parseFloat(el.dataset.mass) || 24;
			// Anchored into the gutter, so the spine never crosses a line of type.
			nodes[el.dataset.node] = { x: b.left - pad - 14, y: b.cy };
		});
		const threads = this.pairs
			.map(([a, b]) => (nodes[a] && nodes[b] ? [nodes[a], nodes[b]] : null))
			.filter(Boolean);

		this.mass.fill(0);
		this.thread.fill(0);
		this.phase.fill(0);
		const halo = this.p.halo;

		for (let y = 0; y < this.rows; y++) {
			const py = (y + 0.5) * px,
				off = y * this.cols;
			for (let x = 0; x < this.cols; x++) {
				const pxx = (x + 0.5) * px,
					i = off + x;

				let clear = 0;
				for (const m of masses) {
					const grown = new Rect(
						m.rect.x - m.pad,
						m.rect.y - m.pad,
						m.rect.w + m.pad * 2,
						m.rect.h + m.pad * 2,
					);
					const c = 1 - smoothstep(0, halo, sdRoundBox(pxx, py, grown, 2));
					if (c > clear) clear = c;
				}
				this.mass[i] = clear;

				let best = 1e9,
					bestH = 0;
				for (const [a, b] of threads) {
					const bax = b.x - a.x,
						bay = b.y - a.y;
					const pax = pxx - a.x,
						pay = py - a.y;
					const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay || 1e-6), 0, 1);
					const d = Math.hypot(pax - bax * h, pay - bay * h) - 1.5;
					if (d < best) {
						best = d;
						bestH = h;
					}
				}
				if (threads.length) {
					this.thread[i] = 1 - smoothstep(0, 14, best);
					this.phase[i] = bestH;
				}
			}
		}
	}

	render(time) {
		if (!this.buf || !this.visible) return;
		this.time = time;
		const p = this.p,
			cols = this.cols,
			rows = this.rows,
			buf = this.buf;
		const aspect = this.w / Math.max(1, this.h);

		for (let x = 0; x < cols; x++) {
			const uvx = (x + 0.5) / cols,
				a = uvx * 10.5,
				b = uvx * 23;
			this.sinColC[x] = Math.sin(a);
			this.cosColC[x] = Math.cos(a);
			this.sinColF[x] = Math.sin(b);
			this.cosColF[x] = Math.cos(b);
		}
		for (let y = 0; y < rows; y++) {
			const uvy = (y + 0.5) / rows;
			this.rowBroad[y] = Math.sin(uvy * 8 + time * 0.42) * 0.045;
			const c = uvy * 15 - time * 0.27,
				f = -uvy * 9 + time * 0.18;
			this.sinRowC[y] = Math.sin(c);
			this.cosRowC[y] = Math.cos(c);
			this.sinRowF[y] = Math.sin(f);
			this.cosRowF[y] = Math.cos(f);
		}

		const ramp = p.gradientAngle + Math.sin(time * 0.125) * 0.35;
		const rdx = Math.cos(ramp) * 0.95,
			rdy = Math.sin(ramp) * 0.95;
		const step = Math.max(1, Math.round(p.spacing));
		const age = time - this.pulse.t;
		const live = age >= 0 && age < 2.6;

		buf.fill(0);

		for (let y = 0; y < rows; y += step) {
			const uvy = (y + 0.5) / rows,
				off = y * cols,
				fy = 1 - uvy;
			const broad = this.rowBroad[y];
			const sRC = this.sinRowC[y],
				cRC = this.cosRowC[y];
			const sRF = this.sinRowF[y],
				cRF = this.cosRowF[y];
			const ty = (y / step) | 0;

			for (let x = 0; x < cols; x += step) {
				const i = off + x,
					uvx = (x + 0.5) / cols;
				const cross = (this.sinColC[x] * cRC + this.cosColC[x] * sRC) * 0.022;
				const fine = (this.sinColF[x] * cRF + this.cosColF[x] * sRF) * 0.012;

				let d = p.baseDensity + (uvx * rdx + fy * rdy - 0.2) * p.gradient;
				d += (broad + cross + fine) * p.waveStrength;
				d -= (1 - fy) * p.verticalFade;

				if (this.pointer.active) {
					const dx = (uvx - this.pointer.x) * aspect,
						dy = fy - this.pointer.y;
					const dist = Math.hypot(dx, dy);
					if (dist < 0.34) {
						const well = 1 - smoothstep(0.04, 0.32, dist);
						d += (well + Math.sin(dist * 42 - time * 2.2) * 0.025 * well) * p.pointerInfluence;
					}
				}

				let crest = 0;
				if (live) {
					const dx = (uvx - this.pulse.x) * aspect,
						dy = fy - this.pulse.y;
					const dist = Math.hypot(dx, dy);
					const wave = Math.sin(dist * 26 - age * 7);
					const env = Math.exp(-dist * 1.6) * Math.max(0, 1 - age / 2.6);
					d += wave * env * 0.55;
					crest = Math.max(0, wave) * env;
				}

				d -= this.mass[i] * p.massStrength;
				d = clamp((d - 0.5) * p.contrast + 0.5, 0, 1);

				const thr = threshold((x / step) | 0, ty);
				let accent = this.thread[i] * p.threadInk;
				if (accent > 0) {
					accent *= 0.55 + 0.45 * Math.sin((this.phase[i] - time * 0.28) * Math.PI * 2);
				}
				accent = Math.max(accent, crest * 0.9);

				if (accent >= thr) buf[i] = this.accent;
				else if (d >= thr) buf[i] = this.ink;
			}
		}
		this.ctx.putImageData(this.image, 0, 0);
	}
}

/* --------------------------------------------------------------------------
 * Plate: type as a density field
 * ------------------------------------------------------------------------ */

class TypePlate {
	constructor(el) {
		this.el = el;
		this.canvas = el.querySelector("canvas");
		this.ctx = this.canvas.getContext("2d");
		this.text = el.dataset.plate || "MEGA";
		this.pixelSize = 5;
		this.bias = REDUCED ? 1 : 0;
		this.ink = packHex(COLOR.text);
		this.accent = packHex(COLOR.red);

		el.addEventListener("click", () => this.play());
		new ResizeObserver(() => this.measure()).observe(el);
		this.measure();

		if (!REDUCED) {
			new IntersectionObserver(
				(entries, obs) => {
					entries.forEach((e) => {
						if (e.isIntersecting) {
							this.play();
							obs.disconnect();
						}
					});
				},
				{ threshold: 0.4 },
			).observe(el);
		}
	}

	measure() {
		const r = this.el.getBoundingClientRect();
		if (r.width < 2) return;
		this.cols = Math.max(2, Math.ceil(r.width / this.pixelSize));
		this.rows = Math.max(2, Math.ceil(r.height / this.pixelSize));
		this.canvas.width = this.cols;
		this.canvas.height = this.rows;
		this.image = this.ctx.createImageData(this.cols, this.rows);
		this.buf = new Uint32Array(this.image.data.buffer);
		this.sample();
		this.draw();
	}

	/** Draw the text at cell resolution, then read it back as luminance. */
	sample() {
		const off = document.createElement("canvas");
		off.width = this.cols;
		off.height = this.rows;
		const c = off.getContext("2d", { willReadFrequently: true });
		c.fillStyle = "#000";
		c.fillRect(0, 0, this.cols, this.rows);

		const probe = 100;
		c.font = `600 ${probe}px ${FAMILY.heading}`;
		const w = c.measureText(this.text).width || 1;
		const size = Math.min(((this.cols * 0.9) / w) * probe, this.rows * 0.62);

		c.font = `600 ${size}px ${FAMILY.heading}`;
		c.fillStyle = "#fff";
		c.textAlign = "center";
		c.textBaseline = "middle";
		c.fillText(this.text, this.cols / 2, this.rows / 2);

		const data = c.getImageData(0, 0, this.cols, this.rows).data;
		this.density = new Float32Array(this.cols * this.rows);
		for (let i = 0, j = 0; i < this.density.length; i++, j += 4) {
			this.density[i] = luminance(data[j], data[j + 1], data[j + 2]);
		}
	}

	play() {
		if (this._raf) cancelAnimationFrame(this._raf);
		const start = performance.now(),
			dur = 1500;
		const tick = (now) => {
			const t = Math.min(1, (now - start) / dur);
			this.bias = 1 - (1 - t) ** 3;
			this.draw();
			if (t < 1) this._raf = requestAnimationFrame(tick);
		};
		this.bias = 0;
		this._raf = requestAnimationFrame(tick);
	}

	draw() {
		if (!this.buf) return;
		const cols = this.cols,
			rows = this.rows,
			b = this.bias;
		this.buf.fill(0);
		for (let y = 0; y < rows; y++) {
			const off = y * cols;
			for (let x = 0; x < cols; x++) {
				const i = off + x;
				const noise = hash2(x, y);
				const d = noise * (1 - b) + this.density[i] * b;
				if (d >= threshold(x, y)) {
					this.buf[i] = b < 0.98 && this.density[i] > 0.02 && noise > b ? this.accent : this.ink;
				}
			}
		}
		this.ctx.putImageData(this.image, 0, 0);
	}
}

/* --------------------------------------------------------------------------
 * Specimens: three density functions
 * ------------------------------------------------------------------------ */

class Texture {
	constructor(canvas, kind) {
		this.canvas = canvas;
		this.kind = kind;
		this.ctx = canvas.getContext("2d");
		this.pixelSize = 3;
		this.ink = packHex(COLOR.ink);
		this.accent = packHex(COLOR.blue);
		this.time = 0;
		new ResizeObserver(() => this.measure()).observe(canvas);
		this.measure();
	}

	measure() {
		const r = this.canvas.getBoundingClientRect();
		if (r.width < 2) return;
		this.cols = Math.max(2, Math.ceil(r.width / this.pixelSize));
		this.rows = Math.max(2, Math.ceil(r.height / this.pixelSize));
		this.canvas.width = this.cols;
		this.canvas.height = this.rows;
		this.image = this.ctx.createImageData(this.cols, this.rows);
		this.buf = new Uint32Array(this.image.data.buffer);
		this.render(this.time);
	}

	render(time) {
		if (!this.buf) return;
		this.time = time;
		const cols = this.cols,
			rows = this.rows,
			buf = this.buf;
		buf.fill(0);

		for (let y = 0; y < rows; y += 2) {
			const uvy = (y + 0.5) / rows,
				off = y * cols;
			for (let x = 0; x < cols; x += 2) {
				const uvx = (x + 0.5) / cols;
				let d = 0,
					accent = 0;

				if (this.kind === "radial") {
					const lx = uvx - 0.5,
						ly = uvy - 0.033;
					const luma = clamp(0.855 - Math.hypot(lx, ly) * 0.9, 0, 1);
					d = clamp(luma * 1.532 - 0.056, 0, 1);
				} else if (this.kind === "capsule") {
					const drift = time * 0.24;
					const ax = 0.28 + Math.sin(drift * 0.77) * 0.06,
						ay = 0.3 + Math.sin(drift * 0.61) * 0.07;
					const bx = 0.72 + Math.cos(drift * 0.49) * 0.07,
						by = 0.66 + Math.cos(drift * 0.58) * 0.07;
					let dist = sdCapsule(uvx, uvy, ax, ay, bx, by, 0.075);
					const bux = 0.5 + Math.sin(drift * 0.83) * 0.16,
						buy = 0.5 + Math.cos(drift * 0.57) * 0.14;
					const bd = Math.hypot(uvx - bux, uvy - buy) - 0.09;
					const k = 0.09,
						blend = Math.max(k - Math.abs(dist - bd), 0) / k;
					dist = Math.min(dist, bd) - blend * blend * k * 0.25;
					d = clamp(0.5 - dist * 5.2, 0, 1);
					accent = clamp(0.5 - dist * 9, 0, 1) * 0.55;
				} else {
					const dist = Math.hypot(uvx - 0.5, uvy - 0.5);
					d = clamp(
						0.55 + Math.sin(dist * 24 - time * 1.6) * Math.exp(-dist * 2.2) * 0.9 - dist * 0.5,
						0,
						1,
					);
				}

				const thr = threshold(x >> 1, y >> 1);
				if (accent >= thr) buf[off + x] = this.accent;
				else if (d >= thr) buf[off + x] = this.ink;
			}
		}
		this.ctx.putImageData(this.image, 0, 0);
	}
}

/* --------------------------------------------------------------------------
 * Mount
 * ------------------------------------------------------------------------ */

const HTML = `
<section class="sc-stage sc-marks" data-stage data-threads="kicker:title, title:cta, cta:meta">
  <canvas data-field aria-hidden="true"></canvas>
  <div class="sc-stage__content">
    <p class="sc-kicker" data-mass="26" data-node="kicker">GRAPHICS LAB / 004 &middot; SHARED SCREEN</p>
    <h2 class="sc-display" data-mass="34" data-node="title">Print the document.</h2>
    <p class="sc-lead" data-mass="28">
      The canvas and the DOM are resolved through one 4&times;4 ordered screen.
      The field measures the layout, so the ink composes itself around the type
      instead of hiding behind it. Move the pointer. Click to fire a pulse.
    </p>
    <div class="sc-meta" data-mass="22" data-node="cta">
      <div><span>Screen</span><b>Bayer 4 &times; 4 &middot; dark bias</b></div>
      <div><span>Output</span><b>binary ink</b></div>
      <div><span>Cells</span><b data-cells>0 &times; 0</b></div>
    </div>
    <p class="sc-kicker" data-mass="22" data-node="meta">SIGNED FIELD &middot; DOM MASS &middot; CAPSULE THREADS</p>
  </div>
</section>

<section class="sc-section">
  <p class="sc-label">01 &middot; PLATE</p>
  <h3 class="sc-h">Type is a density field.</h3>
  <p class="sc-body">
    The heading below is not text. It is drawn into a canvas at cell resolution,
    read back as linear luminance, and resolved through the same screen the field
    uses. Because glyph coverage is just another density input, it can be
    dissolved into noise and re-resolved. Click it to run again.
  </p>
  <div class="sc-plate sc-marks" data-plate="Systems, not vibes.">
    <canvas aria-label="The phrase Systems, not vibes resolved through an ordered dither screen"></canvas>
  </div>
</section>

<section class="sc-section">
  <p class="sc-label">02 &middot; SPECIMENS</p>
  <h3 class="sc-h">One screen, three fields.</h3>
  <p class="sc-body">
    The same renderer with a different density function each. The texture is
    masked into the corner with a radial gradient rather than cropped by a
    border, so the panel edge stays soft while the ink stays hard. Hover a card.
  </p>
  <div class="sc-cards">
    <article class="sc-card">
      <canvas class="sc-card__tex" data-texture="radial" aria-hidden="true"></canvas>
      <span class="sc-card__i">01</span>
      <h4 class="sc-h4">Radial plate</h4>
      <p class="sc-body">A light origin below top centre, run through the portrait tone curve.</p>
    </article>
    <article class="sc-card">
      <canvas class="sc-card__tex" data-texture="capsule" aria-hidden="true"></canvas>
      <span class="sc-card__i">02</span>
      <h4 class="sc-h4">Capsule bodies</h4>
      <p class="sc-body">Segment distances joined by a smooth minimum, then gated to hard pixels.</p>
    </article>
    <article class="sc-card">
      <canvas class="sc-card__tex" data-texture="ripple" aria-hidden="true"></canvas>
      <span class="sc-card__i">03</span>
      <h4 class="sc-h4">Concentric pulse</h4>
      <p class="sc-body">A travelling wave with an exponential envelope, sampled per lattice cell.</p>
    </article>
  </div>
</section>

<section class="sc-section">
  <p class="sc-label">03 &middot; THE SCREEN</p>
  <h3 class="sc-h">Seventeen levels, no grey.</h3>
  <p class="sc-body">
    The whole system resolves through this one matrix. Seventeen discrete
    coverage levels, dark biased so near-black regions never brighten by
    accident. Nothing anywhere uses a soft edge: the softness lives in the
    field, the hardness lives in the output.
  </p>
  <div class="sc-ramp" data-ramp></div>
  <p class="sc-kicker">BAYER_4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]</p>
</section>

<section class="sc-section">
  <p class="sc-label">04 &middot; TOKENS</p>
  <h3 class="sc-h">Assign by role.</h3>
  <p class="sc-body">
    Argent Pixel is the frame title and section headings. Geist is body copy and
    content categories. Geist Mono and Geist Pixel carry numerals, identifiers
    and technical metadata. A frame that mixes the conventions for one kind of
    label looks accidental.
  </p>
  <div class="sc-swatches" data-swatches></div>
  <div class="sc-scale">
    <div class="sc-scale__row"><span>display / heading</span><b style="font-family:${FAMILY.heading};font-size:44px">Rethink everything</b></div>
    <div class="sc-scale__row"><span>head / heading</span><b style="font-family:${FAMILY.heading};font-size:26px">Section heading</b></div>
    <div class="sc-scale__row"><span>list / sans</span><b style="font-family:${FAMILY.sans};font-size:20px">Body copy, data labels, content categories</b></div>
    <div class="sc-scale__row"><span>datum / mono</span><b style="font-family:${FAMILY.mono};font-size:18px">920/920 &middot; docs/sales-flow.md &middot; 1600&times;1000</b></div>
    <div class="sc-scale__row"><span>utility / pixel</span><b style="font-family:${FAMILY.pixel};font-size:18px;letter-spacing:.08em">UTILITY LABEL &middot; COUNTER &middot; MEGA.DEV</b></div>
  </div>
</section>
`;

const CSS = `
/* One measure for the whole showcase. Sections run full bleed so the field and
   the specimen grid can, but their content is held to a readable column. */
.sc { display: flex; flex-direction: column; --sc-measure: 1180px; }
.sc-stage__content, .sc-section > * { width: min(100%, var(--sc-measure)); margin-inline: auto; }
.sc-section { align-items: stretch; }
.sc-marks {
  background-repeat: no-repeat;
  background-image:
    linear-gradient(${COLOR.red},${COLOR.red}), linear-gradient(${COLOR.red},${COLOR.red}),
    linear-gradient(${COLOR.black2},${COLOR.black2}), linear-gradient(${COLOR.black2},${COLOR.black2}),
    linear-gradient(${COLOR.black2},${COLOR.black2}), linear-gradient(${COLOR.black2},${COLOR.black2}),
    linear-gradient(${COLOR.black2},${COLOR.black2}), linear-gradient(${COLOR.black2},${COLOR.black2});
  background-size: 70px 2px, 2px 70px, 70px 2px, 2px 70px, 70px 2px, 2px 70px, 70px 2px, 2px 70px;
  background-position: 0 0, 0 0, 100% 0, 100% 0, 0 100%, 0 100%, 100% 100%, 100% 100%;
}
.sc-stage {
  position: relative; isolation: isolate; overflow: hidden;
  min-height: 620px; border-block: 1px solid ${COLOR.black1};
}
.sc-stage canvas[data-field] {
  position: absolute; inset: 0; width: 100%; height: 100%;
  display: block; image-rendering: pixelated; pointer-events: none; z-index: 0;
}
.sc-stage__content {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; justify-content: center; gap: 28px;
  min-height: inherit; padding: 72px 40px 72px 96px;
}
.sc-kicker { margin:0; font-family:${FAMILY.mono}; font-size:12px; letter-spacing:.08em; color:${COLOR.quiet}; }
.sc-label  { margin:0; font-family:${FAMILY.pixel}; font-size:12px; letter-spacing:.08em; color:${COLOR.red}; }
.sc-display{ margin:0; font-family:${FAMILY.heading}; font-size:clamp(40px,6vw,84px); line-height:1.05; font-weight:400; max-width:16ch; }
.sc-h      { margin:0; font-family:${FAMILY.heading}; font-size:clamp(26px,3vw,44px); line-height:1.1; font-weight:400; }
.sc-h4     { margin:0; font-family:${FAMILY.heading}; font-size:22px; font-weight:400; }
.sc-lead   { margin:0; font-size:17px; line-height:1.6; color:${COLOR.muted}; max-width:52ch; }
.sc-body   { margin:0; font-size:15px; line-height:1.6; color:${COLOR.muted}; max-width:64ch; }
.sc-meta   { display:flex; flex-wrap:wrap; gap:40px; padding-top:20px; border-top:1px solid ${COLOR.black1}; max-width:44rem; }
.sc-meta div { display:flex; flex-direction:column; gap:4px; }
.sc-meta span { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:${COLOR.quiet}; }
.sc-meta b { font-family:${FAMILY.mono}; font-size:14px; font-weight:400; color:${COLOR.text}; }

.sc-section { display:flex; flex-direction:column; gap:20px; padding:72px 40px; border-bottom:1px solid ${COLOR.black1}; }
/* The ramp is a specimen of a fixed size, so it keeps fit-content and sits
   flush left rather than being stretched to the measure. */
.sc-ramp { width:fit-content !important; margin-inline:0 !important; }

.sc-plate { position:relative; width:100%; aspect-ratio:16/5; min-height:180px; cursor:crosshair; }
.sc-plate canvas { width:100%; height:100%; display:block; image-rendering:pixelated; }

.sc-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:1px; background:${COLOR.black1}; border:1px solid ${COLOR.black1}; }
.sc-card { position:relative; overflow:hidden; background:#000; padding:32px; min-height:290px;
           display:flex; flex-direction:column; justify-content:flex-end; gap:12px; }
.sc-card__tex {
  position:absolute; top:0; right:0; width:330px; height:230px; display:block;
  image-rendering:pixelated; pointer-events:none; opacity:.45;
  transition:opacity .35s cubic-bezier(.23,1,.32,1);
  -webkit-mask-image:radial-gradient(130% 130% at 100% 0%, #000, transparent 78%);
  mask-image:radial-gradient(130% 130% at 100% 0%, #000, transparent 78%);
}
.sc-card:hover .sc-card__tex { opacity:1; }
.sc-card__i { font-family:${FAMILY.pixel}; font-size:12px; letter-spacing:.08em; color:${COLOR.red}; }

.sc-ramp { display:flex; flex-wrap:wrap; gap:1px; background:${COLOR.black1}; border:1px solid ${COLOR.black1}; width:fit-content; }
.sc-ramp canvas { display:block; width:44px; height:44px; image-rendering:pixelated; background:#000;
                  transition:transform .2s cubic-bezier(.23,1,.32,1); }
.sc-ramp canvas:hover { transform:scale(1.14); position:relative; z-index:2; }

.sc-swatches { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:1px; background:${COLOR.black1}; border:1px solid ${COLOR.black1}; }
.sc-sw { background:#000; padding:14px; }
.sc-sw i { display:block; height:44px; border:1px solid ${COLOR.black2}; margin-bottom:10px; }
.sc-sw span { display:block; font-size:11px; color:${COLOR.muted}; }
.sc-sw b { display:block; font-family:${FAMILY.mono}; font-size:11px; font-weight:400; color:${COLOR.text}; }

.sc-scale { display:flex; flex-direction:column; gap:16px; }
.sc-scale__row { display:flex; align-items:baseline; gap:24px; border-top:1px solid ${COLOR.black1}; padding-top:14px; }
.sc-scale__row span { flex:none; width:15ch; font-family:${FAMILY.mono}; font-size:11px; color:${COLOR.quiet}; }
.sc-scale__row b { font-weight:400; color:${COLOR.text}; }

@media (prefers-reduced-motion: reduce) { .sc * { transition-duration:.01ms !important; } }
`;

let cssInjected = false;

export function mountShowcase(host) {
	if (!cssInjected) {
		const style = document.createElement("style");
		style.textContent = CSS;
		document.head.appendChild(style);
		cssInjected = true;
	}

	const root = document.createElement("div");
	root.className = "sc";
	root.innerHTML = HTML;
	host.appendChild(root);

	const stage = new Stage(root.querySelector("[data-stage]"));
	const plate = new TypePlate(root.querySelector("[data-plate]"));
	const textures = [...root.querySelectorAll("[data-texture]")].map(
		(c) => new Texture(c, c.dataset.texture),
	);

	const cells = root.querySelector("[data-cells]");
	if (cells) cells.textContent = `${stage.cols} × ${stage.rows}`;

	// the seventeen coverage levels, shown as themselves
	const ramp = root.querySelector("[data-ramp]");
	const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
	for (let level = 0; level <= 16; level++) {
		const c = document.createElement("canvas");
		c.width = 44;
		c.height = 44;
		const ctx = c.getContext("2d");
		ctx.fillStyle = COLOR.ink;
		for (let y = 0; y < 4; y++) {
			for (let x = 0; x < 4; x++) {
				if (BAYER[y * 4 + x] < level) ctx.fillRect(x * 11, y * 11, 11, 11);
			}
		}
		c.title = `level ${level} / 16`;
		ramp.appendChild(c);
	}

	const sw = root.querySelector("[data-swatches]");
	for (const [name, hex] of Object.entries({
		page: COLOR.page,
		"black 1": COLOR.black1,
		"black 2": COLOR.black2,
		ink: COLOR.ink,
		offwhite: COLOR.text,
		red: COLOR.red,
		blue: COLOR.blue,
		muted: COLOR.muted,
	})) {
		const d = document.createElement("div");
		d.className = "sc-sw";
		d.innerHTML = `<i style="background:${hex}"></i><span>${name}</span><b>${hex.toUpperCase()}</b>`;
		sw.appendChild(d);
	}

	new IntersectionObserver(
		(entries) => {
			entries.forEach((e) => {
				stage.visible = e.isIntersecting;
			});
		},
		{ threshold: 0 },
	).observe(root.querySelector("[data-stage]"));

	/* One clock for the whole showcase, held at thirty frames a second: the
     lattice is coarse and a higher rate buys nothing the eye can see. */
	if (!REDUCED) {
		const t0 = performance.now();
		let last = 0;
		const loop = (now) => {
			if (!root.isConnected) return;
			if (now - last > 33) {
				last = now;
				const t = (now - t0) / 1000;
				stage.render(t);
				textures.forEach((tex) => {
					tex.render(t);
				});
			}
			requestAnimationFrame(loop);
		};
		requestAnimationFrame(loop);
	} else {
		stage.render(8);
		textures.forEach((tex) => {
			tex.render(8);
		});
	}

	return { root, stage, plate, textures };
}
