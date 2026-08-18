/**
 * PRESS / field
 *
 * The dithered ground, resolved through the same 4x4 ordered screen as
 * everything else on mega.dev.
 *
 * This is the idea from mega.html, but built on solved geometry rather than on
 * runtime DOM measurement. There the field had to read `getBoundingClientRect`
 * on every element and rebuild on resize. Here the plate has already told us
 * where every rectangle is, so the clearing around the content is exact, free,
 * and cannot disagree with what the renderer draws.
 *
 * The composition, per cell:
 *
 *     base
 *   + directional ramp     the large void, steered by an angle
 *   + travelling waves     three sines, evaluated by angle addition
 *   - content mass         every solved rect carves a clearing around itself
 *   + connector accent     ink pooling along rails and links
 *
 * then contrast, then the spacing lattice, then the screen. The output is
 * binary: a cell is ink, accent, or nothing.
 */

import { clamp, sdCapsule, sdRoundBox, smoothstep } from "./geometry.js";
import { COLOR } from "./tokens.js";

export const FIELD_DEFAULTS = {
	on: false,
	pixelSize: 4,
	baseDensity: 0.3,
	gradient: 1.15,
	gradientAngle: 0.85,
	contrast: 1.35,
	spacing: 2,
	massStrength: 0.9,
	halo: 120,
	waveStrength: 1,
	connectorGlow: 0,
	time: 8,
	ink: COLOR.black2,
	accent: "#3a0000",
};

/**
 * The floor on the clearing, for a ground the plate declares rather than one a
 * slider is exploring.
 *
 * The lab's rail can take the mass clearing to zero, which is useful for
 * looking at what the field is doing on its own. A plate that ships with a
 * background cannot: the ink would run straight through the type, and nothing
 * downstream would notice, because a dithered cell behind a letterform is not
 * an overflow, an overlap, or an off-scale anything. It is simply unreadable.
 * So the clearing is not a parameter of a declared ground. It is a condition
 * of having one.
 */
export const MIN_MASS_STRENGTH = 0.9;
export const MIN_HALO = 96;

/**
 * Every rect the plate actually prints, as a clearing map over the cell grid.
 *
 * Stacks and grids are skipped: they are containers, and clearing their full
 * bounds would erase the whole plate. Everything that puts marks on the page
 * counts, including the custom and image nodes a component draws itself, which
 * is what keeps a ground from running through a chart.
 */
export function contentMass(
	plate,
	cols,
	rows,
	frame,
	{ halo = FIELD_DEFAULTS.halo, strength = 1 } = {},
) {
	const mass = new Float32Array(cols * rows);
	if (!(strength > 0)) return mass;

	const cellW = frame.w / cols;
	const cellH = frame.h / rows;
	const masses = plate.nodes
		.filter((n) => n.rect && MASS_KINDS.includes(n.kind))
		.map((n) => n.rect);
	if (!masses.length) return mass;

	for (let y = 0; y < rows; y++) {
		const py = (y + 0.5) * cellH;
		const off = y * cols;
		for (let x = 0; x < cols; x++) {
			const px = (x + 0.5) * cellW;
			let clear = 0;
			for (let m = 0; m < masses.length; m++) {
				const d = sdRoundBox(px, py, masses[m], 2);
				if (d > halo) continue;
				const c = 1 - smoothstep(0, halo, d);
				if (c > clear) {
					clear = c;
					if (clear >= 1) break;
				}
			}
			mass[off + x] = clear;
		}
	}
	return mass;
}

const MASS_KINDS = ["text", "box", "marker", "rule", "custom", "image"];

/**
 * A ground a plate declares, as opposed to one the lab is exploring.
 *
 * Identical to `plateField` except that the clearing cannot be turned off or
 * shrunk below the point where type stops being readable over it. `background:
 * { type: 'field' }` therefore carries its own legibility rather than relying
 * on whoever wrote the plate having thought about it.
 */
export function plateGround(plate, params = {}) {
	return plateField(plate, {
		...params,
		massStrength: Math.max(params.massStrength ?? FIELD_DEFAULTS.massStrength, MIN_MASS_STRENGTH),
		halo: Math.max(params.halo ?? FIELD_DEFAULTS.halo, MIN_HALO),
	});
}

/**
 * Returns a factory. `mount` calls it with the cell grid so the mass map can
 * be baked once rather than solved per cell per frame.
 */
export function plateField(plate, params = {}) {
	const p = { ...FIELD_DEFAULTS, ...params };

	return (cols, rows, frame) => {
		/* ---- mass -----------------------------------------------------------
       Everything the plate actually prints pushes ink away from itself, so
       the texture can never fight the type. */
		const mass = contentMass(plate, cols, rows, frame, { halo: p.halo, strength: p.massStrength });

		const cellW = frame.w / cols;
		const cellH = frame.h / rows;

		/* ---- connector glow -------------------------------------------------
       Optional. Ink pools along the rails and links the plate already
       derived, so the accent traces the same geometry the vector layer
       strokes. */
		const glow = new Float32Array(cols * rows);
		if (p.connectorGlow > 0) {
			const segments = [];
			for (const c of [...plate.rails, ...plate.links, ...plate.rules]) {
				for (let i = 1; i < c.points.length; i++) {
					segments.push([c.points[i - 1], c.points[i]]);
				}
			}
			if (segments.length) {
				for (let y = 0; y < rows; y++) {
					const py = (y + 0.5) * cellH;
					const off = y * cols;
					for (let x = 0; x < cols; x++) {
						const px = (x + 0.5) * cellW;
						let best = 1e9;
						for (let s = 0; s < segments.length; s++) {
							const [a, b] = segments[s];
							const d = sdCapsule(px, py, a.x, a.y, b.x, b.y, 2);
							if (d < best) best = d;
						}
						glow[off + x] = (1 - smoothstep(0, 60, best)) * p.connectorGlow;
					}
				}
			}
		}

		/* ---- waves ----------------------------------------------------------
       Precomputed per row and per column, then combined per cell with the
       angle addition identity, so three sines per cell become four
       multiplies. */
		const t = p.time;
		const sinColC = new Float32Array(cols),
			cosColC = new Float32Array(cols);
		const sinColF = new Float32Array(cols),
			cosColF = new Float32Array(cols);
		for (let x = 0; x < cols; x++) {
			const uvx = (x + 0.5) / cols;
			const a = uvx * 10.5,
				b = uvx * 23;
			sinColC[x] = Math.sin(a);
			cosColC[x] = Math.cos(a);
			sinColF[x] = Math.sin(b);
			cosColF[x] = Math.cos(b);
		}
		const rowBroad = new Float32Array(rows);
		const sinRowC = new Float32Array(rows),
			cosRowC = new Float32Array(rows);
		const sinRowF = new Float32Array(rows),
			cosRowF = new Float32Array(rows);
		for (let y = 0; y < rows; y++) {
			const uvy = (y + 0.5) / rows;
			rowBroad[y] = Math.sin(uvy * 8 + t * 0.42) * 0.045;
			const c = uvy * 15 - t * 0.27,
				f = -uvy * 9 + t * 0.18;
			sinRowC[y] = Math.sin(c);
			cosRowC[y] = Math.cos(c);
			sinRowF[y] = Math.sin(f);
			cosRowF[y] = Math.cos(f);
		}

		const rdx = Math.cos(p.gradientAngle) * 0.95;
		const rdy = Math.sin(p.gradientAngle) * 0.95;

		return {
			ink: p.ink,
			accent: p.accent,
			spacing: p.spacing,
			density: (uvx, uvy, x, y) => {
				const i = y * cols + x;
				const fy = 1 - uvy; // the field reads bottom up

				const cross = (sinColC[x] * cosRowC[y] + cosColC[x] * sinRowC[y]) * 0.022;
				const fine = (sinColF[x] * cosRowF[y] + cosColF[x] * sinRowF[y]) * 0.012;

				let d = p.baseDensity + (uvx * rdx + fy * rdy - 0.2) * p.gradient;
				d += (rowBroad[y] + cross + fine) * p.waveStrength;
				d -= mass[i] * p.massStrength;
				d = clamp((d - 0.5) * p.contrast + 0.5, 0, 1);

				const accent = glow[i] > 0 ? clamp(glow[i] - mass[i], 0, 1) : 0;
				return accent > 0 ? { d, accent } : d;
			},
		};
	};
}
