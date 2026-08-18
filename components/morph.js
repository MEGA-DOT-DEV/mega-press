/**
 * PRESS / components / morph
 *
 * One series, three encodings, and the geometry that turns any of them into
 * any other.
 *
 * ## Why this exists
 *
 * A bar chart, a stacked bar and a donut are usually three components. They
 * are not three things. They are one set of fractions under three coordinate
 * maps, and a reader who has never been shown that believes a pie chart is a
 * different kind of fact from a bar chart rather than the same fact making a
 * different claim.
 *
 * So this component holds the series once and holds three maps over it. Each
 * map takes a mark's own parameter space, `(u, v)` in the unit square, and
 * returns a point on the plate:
 *
 *   bars       u runs along the mark's length, from the left margin
 *   segments   u runs along the mark's length, from where the previous mark ended
 *   donut      u runs around an arc, v runs across the ring's thickness
 *
 * A morph is then the lerp of two maps at the same `(u, v)`, sampled densely
 * enough that an arc is an arc. Nothing is keyframed and no shape is tweened
 * into another shape: every intermediate frame is the *same datum* evaluated
 * under a coordinate system that happens to be halfway between two others.
 * The mark that leaves a bar and arrives as a donut slice is numerically the
 * same mark the whole way, which is the property that makes this teach
 * something instead of just moving.
 *
 * That is also why the correspondence cannot break. There is no matching step
 * and no heuristic pairing of shapes: mark `i` is mark `i` in every encoding,
 * because there is only one series and the encodings are functions of it.
 *
 * ## Ink
 *
 * The marks are screened on the plate's own lattice, two channels as
 * everywhere else in this system: an ink and a coverage. A part is never told
 * apart by hue alone, so the encoding can change without the series changing
 * colour, and the reader tracks a part through the morph by the one thing that
 * did not move.
 */

import { BAYER_4 } from "../src/screen.js";
import { custom, row, stack, text } from "../src/solve.js";
import { CATEGORICAL, COLOR, PressError, space, UNIT } from "../src/tokens.js";

export const ENCODINGS = ["bars", "segments", "donut", "pie"];

const TAU = Math.PI * 2;

/** The screen cell, matching the rest of the chart library. */
const CELL = UNIT * 2;

/** A legend swatch, in cells. */
const SWATCH = CELL * 5;

/**
 * Channel one: ink. Channel two: coverage, off the screen's own levels.
 *
 * The ink channel comes from the cabinet and is shared with chart.js. It used
 * to be a private copy in each file, and both copies carried pure blue at
 * 2.44:1 against the page, which is a category a reader cannot see.
 */
const INKS = CATEGORICAL;
const BANDS = [12, 6, 3];

const seriesStyle = (rank, count) => {
	const inks = count > 4 ? INKS : INKS.slice(0, 2);
	return {
		color: inks[rank % inks.length],
		level: BANDS[Math.min(Math.floor(rank / inks.length), BANDS.length - 1)],
	};
};

/* --------------------------------------------------------------------------
 * The series
 * ------------------------------------------------------------------------ */

/**
 * Fractions of the whole, plus each mark's cumulative span. Every encoding
 * reads exactly this, which is what makes them the same data by construction
 * rather than by agreement.
 */
function series(items) {
	const total = items.reduce((sum, i) => sum + Number(i.value), 0);
	if (!(total > 0)) {
		throw new PressError("SERIES_EMPTY", "an encoding chart needs a series that sums above zero.");
	}
	let acc = 0;
	return items.map((item, i) => {
		const f = Number(item.value) / total;
		const mark = {
			...item,
			i,
			value: Number(item.value),
			f,
			c0: acc,
			c1: acc + f,
			...seriesStyle(i, items.length),
		};
		acc += f;
		return mark;
	});
}

/* --------------------------------------------------------------------------
 * The maps
 *
 * Each takes (mark, u, v) and the derived geometry of the region, and returns
 * a point. These are the whole component: everything else is sampling.
 * ------------------------------------------------------------------------ */

/**
 * The three encodings are not three unrelated maps. They are three points on
 * one continuous parameter, and that is the whole reason this component can
 * move between them without anything being tweened:
 *
 *   p = 0   bars       every mark on its own row, from a shared left vertical
 *   p = 1   segments   the rows slid together into one band
 *   p = 2   donut      that band curled until its two ends meet
 *   p = 3   pie        the ring's inner edge drawn in to the centre
 *
 * The fourth point earns its place by settling an argument the card would
 * otherwise leave open. A pie and a donut look like two chart types and are one
 * mark at two thicknesses: the hole is the band's inner edge, and closing it
 * changes nothing about the angles, which are the only thing either chart
 * encodes. Watching it close is the cheapest possible way to say so.
 *
 * The second half is the part worth stating plainly. **A bar is a ring of
 * infinite radius.** Wrapping a band of length L onto a circle subtending Θ
 * needs radius L/Θ, so as Θ goes to zero the radius goes to infinity and the
 * arc becomes a straight line. Curling is therefore not a transition between
 * two shapes, it is one shape evaluated at a curvature, and the arc length is
 * conserved the whole way: the band does not stretch to become a ring, it
 * closes into one.
 *
 * The first attempt lerped Cartesian points between a row rectangle and an
 * annular sector and is worth recording as a failure. The two quads disagree
 * about which edge is which, so halfway through they turn inside out and the
 * marks collapse to slivers: measured ink went 55k, 25k, 6.5k, 39k, 76k across
 * the morph. Walking the chain instead keeps every intermediate a real
 * distribution, and it also means a morph from bars to a donut passes through
 * the stacked bar, which is exactly the thing a reader needs to see to
 * understand that all three are one series.
 */
const ENCODING_P = { bars: 0, segments: 1, donut: 2, pie: 3 };

/**
 * A band of the region's own width, wrapped at curvature `k` and hollowed by
 * `fill`.
 *
 * `k = 0` is flat and `k = 1` is closed; arc length is the band's width the
 * whole way. `fill = 0` keeps the band's own thickness and `fill = 1` draws the
 * inner edge all the way to the centre, which is the only difference between a
 * donut and a pie. The outer edge does not move while it happens.
 */
function curled(s, v, g, k, fill = 0) {
	const cy0 = g.bandY + g.rowH / 2; // the flat band's centre line
	const T = g.rowH;

	if (k <= 1e-4) {
		return { x: g.cx + (s - 0.5) * g.bandW, y: cy0 + (v - 0.5) * T };
	}

	const theta = (s - 0.5) * k * TAU;
	const R = g.bandW / (k * TAU); // arc length conserved

	/* v runs from the outer edge to the inner one. Hollowing moves only the
     inner end of that span, so the outer radius is a fixed point of the whole
     deformation and the slice keeps the angle it encodes. */
	const outer = R + T / 2;
	const ring = R - (v - 0.5) * T;
	const solid = outer * (1 - v);
	const Rv = ring + (solid - ring) * fill;

	/* Recentred as it closes, so the ring ends up in the middle of the region
     rather than hanging off the bottom of it. Zero when flat, and exactly the
     offset that centres the closed ring when k is one. */
	const shift = k * (g.cy - cy0 - g.ringR);

	return {
		x: g.cx + Rv * Math.sin(theta),
		y: cy0 + R - Rv * Math.cos(theta) + shift,
	};
}

/**
 * Each mark on its own row, every one starting at the same left vertical.
 *
 * Measured against the band's width rather than the region's, so a mark is
 * exactly the same size as the segment it becomes and the first half of the
 * chain is a pure translation.
 */
const barsPoint = (m, u, v, g) => ({
	x: g.bandX0 + u * m.f * g.bandW,
	y: g.y + m.i * (g.rowH + g.rowGap) + v * g.rowH,
});

/**
 * A point on mark `m`, at `(u, v)` in its own unit square, anywhere along the
 * chain. Everything else in this file is sampling this function.
 */
function pointAt(m, u, v, g, p) {
	const s = m.c0 + u * m.f; // position along the whole series

	if (p <= 1) {
		const a = barsPoint(m, u, v, g);
		const b = curled(s, v, g, 0);
		return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
	}
	if (p <= 2) return curled(s, v, g, p - 1);
	return curled(s, v, g, 1, p - 2);
}

/* --------------------------------------------------------------------------
 * Time along the chain
 *
 * Two things shape it, and both come from what the chain is rather than from
 * taste.
 *
 * A journey that crosses a waypoint **stops there**. Going from bars to a pie
 * passes through the stacked bar and the donut, and those are the whole
 * argument: a reader who is shown them at full speed on the way past has been
 * shown nothing. Each leg eases on its own and each interior waypoint is held,
 * so the intermediate encodings read as places rather than as blur.
 *
 * Marks **stagger only while they are separate**. On the first leg each mark
 * is its own row travelling to its own place in the band, so letting them
 * leave in sequence lets the eye follow one. From the band onwards they are
 * joined edge to edge and staggering would tear the band into pieces that no
 * longer sum to a whole, so past that point they move as one thing. The rule
 * is the same one the rest of this system runs on: the motion is allowed to
 * say only what is true of the geometry.
 * ------------------------------------------------------------------------ */

/** How long a waypoint is held, as a fraction of one leg's travel. */
const HOLD = 0.32;

/** How much of the first leg separates the first mark's start from the last's. */
const STAGGER = 0.34;

const easeLeg = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * How long a journey is, in legs, counting the pauses.
 *
 * A morph across three encodings is three distinct movements and two stops, so
 * running it in the time of one leg makes every part of it three times too
 * fast. The driver multiplies its base duration by this, which keeps one step
 * of the chain at exactly the duration the card declared however far the reader
 * jumps.
 */
export function journeySpan(from, to) {
	const legs = Math.abs(ENCODING_P[to] - ENCODING_P[from]);
	return legs === 0 ? 0 : legs + (legs - 1) * HOLD;
}

/**
 * The chain position for one mark, at linear time `t`.
 *
 * The driver hands over linear time on purpose. The shape of the motion is a
 * property of the chain, so it belongs to the component that owns the chain,
 * and easing it twice in two places is how a transition ends up with a rhythm
 * nobody chose.
 */
function chainAt(m, count, from, to, t) {
	const p0 = ENCODING_P[from];
	const p1 = ENCODING_P[to];
	const legs = Math.abs(p1 - p0);
	if (legs === 0) return p0;

	const dir = Math.sign(p1 - p0);
	const total = legs + (legs - 1) * HOLD;
	let cursor = clamp01(t) * total;
	let p = p0;

	for (let leg = 0; leg < legs; leg++) {
		if (cursor <= 1) {
			/* Separate marks may leave in sequence. Joined ones may not. The leg
         between bars and the band is the only one where they are separate,
         whichever direction it is being travelled in. */
			const separable = Math.min(p, p + dir) < 1;
			if (!separable || count < 2) return p + dir * easeLeg(cursor);

			const window = 1 - STAGGER;
			const offset = (m.i / (count - 1)) * STAGGER;
			return p + dir * easeLeg(clamp01((cursor - offset) / window));
		}
		cursor -= 1;
		p += dir;
		if (leg < legs - 1) {
			if (cursor <= HOLD) return p; // held at the waypoint
			cursor -= HOLD;
		}
	}
	return p1;
}

function assertEncoding(name) {
	if (!ENCODINGS.includes(name)) {
		throw new PressError(
			"ENCODING_UNKNOWN",
			`encoding '${name}' does not exist. The maps are: ${ENCODINGS.join(", ")}. ` +
				`A fourth encoding is a fourth map over the same series, not a new component.`,
		);
	}
	return name;
}

/**
 * Everything the maps need, derived from the rect the solver handed over.
 * Nobody writes a coordinate here either: the row height falls out of how many
 * marks there are, and the ring falls out of the shorter side of the region.
 */
/**
 * How far a band of length L and thickness T reaches from its own centre, at
 * the worst point of the curl.
 *
 * The outer edge of the band rides a radius half a thickness larger than the
 * centre line, so its arc is longer than the band and its chord can be wider
 * than the band ever is flat. The widest moment is therefore neither end of the
 * morph but somewhere early in it, which is why bounding this by L/2 + T/2 is
 * far too pessimistic and why guessing it produced slivers of ink in the
 * neighbouring column.
 */
function maxHalfExtent(L, T) {
	let worst = L / 2; // the flat limit, as k goes to 0
	for (let i = 1; i <= 96; i++) {
		const a = (i / 96) * TAU;
		const e = (L / a + T / 2) * Math.sin(a / 2);
		if (e > worst) worst = e;
	}
	return worst;
}

/* Geometry is asked for once per painted frame and the inset below costs a
   short sweep, so the result is kept. Keyed by everything it depends on. */
const geometryCache = new Map();

function geometry(rect, count) {
	const key = `${rect.x}|${rect.y}|${rect.w}|${rect.h}|${count}`;
	const hit = geometryCache.get(key);
	if (hit) return hit;

	const rowGap = space(1);
	const rowH = (rect.h - rowGap * (count - 1)) / count;

	/* The band gives up exactly the room its own curl needs and no more, so the
     widest intermediate touches the region edge and nothing crosses it. Solved
     rather than assumed: the extent is not monotonic in the curl, so the inset
     is found by pulling the band in until its worst moment fits. */
	let bandW = rect.w;
	for (let i = 0; i < 4; i++) {
		const over = maxHalfExtent(bandW, rowH) - rect.w / 2;
		if (over <= 0) break;
		bandW -= 2 * over;
	}

	const g = {
		x: rect.x,
		y: rect.y,
		w: rect.w,
		h: rect.h,
		rowGap,
		rowH,
		bandW,
		bandX0: rect.x + (rect.w - bandW) / 2,
		bandY: rect.y + (rect.h - rowH) / 2,
		cx: rect.cx,
		cy: rect.cy,
		/* The closed ring's radius is not chosen. It is what a band of this width
       has to have in order to close, which is why the donut cannot be resized
       without the band it came from changing width. */
		ringR: bandW / TAU,
	};

	geometryCache.set(key, g);
	return g;
}

/**
 * A mark's outline at morph parameter `t` between two encodings.
 *
 * Sampled along `u` rather than drawn as a primitive, because a rectangle and
 * an annular sector have no primitive in common. The sample count is derived
 * from the mark's own share of the whole, so a slice that wraps most of a
 * circle gets the points it needs and a sliver does not pay for them.
 */
function outline(m, count, from, to, t, g) {
	const p = chainAt(m, count, from, to, t);
	const steps = Math.max(6, Math.ceil(m.f * 96));
	const at = (u, v) => pointAt(m, u, v, g, p);
	const pts = [];
	for (let k = 0; k <= steps; k++) pts.push(at(k / steps, 0));
	for (let k = steps; k >= 0; k--) pts.push(at(k / steps, 1));
	return pts;
}

/**
 * Fill an outline with screened ink on the plate lattice.
 *
 * Clipped rather than computed per cell, so the mark's own edge stays exact
 * while the ink inside it stays on the same grid every other screened mark in
 * the frame is on.
 */
function screenFill(ctx, pts, { color, level }) {
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(pts[0].x, pts[0].y);
	for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
	ctx.closePath();
	ctx.clip();

	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	for (const p of pts) {
		if (p.x < minX) minX = p.x;
		if (p.x > maxX) maxX = p.x;
		if (p.y < minY) minY = p.y;
		if (p.y > maxY) maxY = p.y;
	}

	ctx.fillStyle = color;
	const cx0 = Math.floor(minX / CELL),
		cx1 = Math.ceil(maxX / CELL);
	const cy0 = Math.floor(minY / CELL),
		cy1 = Math.ceil(maxY / CELL);
	for (let cy = cy0; cy < cy1; cy++) {
		for (let cx = cx0; cx < cx1; cx++) {
			if (BAYER_4[(cy & 3) * 4 + (cx & 3)] < level) {
				ctx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
			}
		}
	}
	ctx.restore();
}

/** Paint the whole series at a point between two encodings. */
export function paintSeries(ctx, rect, marks, from, to, t) {
	const g = geometry(rect, marks.length);
	for (const m of marks) screenFill(ctx, outline(m, marks.length, from, to, t, g), m);
}

/* --------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------ */

function assertSeries(items, who) {
	if (!items || items.length < 2) {
		throw new Error(`${who} needs at least two parts. One part is not a distribution.`);
	}
	if (items.length > 5) {
		throw new Error(
			`${who} got ${items.length} parts and the cap is five. Past that a donut is ` +
				`unreadable at any size and the set wanted a table.`,
		);
	}
	return items;
}

/**
 * The marks, drawn in one of their encodings and carrying the geometry to
 * become any of the others.
 *
 * @param {object[]} items   { label, value }
 * @param {string}   as      'bars' | 'segments' | 'donut'
 * @param {number}   height  the region the marks are drawn in
 */
export function encodingChart({ items, as = "segments", height = 480 } = {}) {
	assertSeries(items, "encodingChart");
	assertEncoding(as);

	const marks = series(items);

	const region = custom({
		measure: (w) => ({ w, h: height }),
		paint: (ctx, rect) => paintSeries(ctx, rect, marks, as, as, 1),
	});

	/* What a morph driver needs, published rather than kept: the encoding this
     state is in, and a painter that will evaluate the series anywhere between
     it and another. `src/interact.js` reads these to repaint the region
     between two states. A static plate never asks. */
	region.encodingKey = as;
	region.encodingMarks = marks;
	region.encodingPaint = (ctx, rect, from, to, t) =>
		paintSeries(ctx, rect, marks, assertEncoding(from), assertEncoding(to), t);
	region.encodingSpan = (from, to) => journeySpan(assertEncoding(from), assertEncoding(to));

	return region;
}

/**
 * The legend, which is the constant.
 *
 * It does not take an encoding, because it does not have one. It is what lets
 * a reader hold on to a part while the mark carrying that part turns into a
 * different kind of shape, so it is the one thing on the plate that must not
 * move when the encoding changes. Ordinary DOM text on solved coordinates,
 * like every other run of type in the system.
 *
 * This and `encodingChart` both derive from `series(items)`, which is a pure
 * function of the same input, so the two cannot disagree about a value or a
 * colour however they are composed on the plate. Splitting them is what lets
 * the marks take a column and the legend take another, which is the only way
 * a donut gets a radius worth looking at on a 16:10 frame.
 */
export function encodingLegend({ items, unit } = {}) {
	assertSeries(items, "encodingLegend");
	if (!unit) {
		throw new Error(
			"encodingLegend needs a unit. A distribution without one says how much but not of what.",
		);
	}

	const marks = series(items);

	return stack({
		gap: 4,
		children: [
			stack({
				gap: 2,
				children: marks.map((m) =>
					stack({
						gap: 1,
						unit: true,
						children: [
							row({
								gap: 3,
								align: "baseline",
								children: [
									custom({
										baselineFrom: "list",
										/* Five cells square. Under about four the ordered screen
                     stops being a coverage and becomes noise, and a swatch
                     that cannot show its own band is not a key. */
										measure: () => ({ w: SWATCH, h: SWATCH }),
										paint: (ctx, r) =>
											screenFill(
												ctx,
												[
													{ x: r.x, y: r.y },
													{ x: r.right, y: r.y },
													{ x: r.right, y: r.bottom },
													{ x: r.x, y: r.bottom },
												],
												m,
											),
									}),
									text(m.label, "list", { color: COLOR.text, grow: true, key: `legend-${m.i}` }),
								],
							}),
							row({
								gap: 2,
								align: "baseline",
								children: [
									text(String(m.value), "datum", {
										color: COLOR.text,
										grow: true,
										key: `value-${m.i}`,
									}),
									text(`${Math.round(m.f * 100)}%`, "utility", {
										color: COLOR.quiet,
										key: `pct-${m.i}`,
									}),
								],
							}),
						],
					}),
				),
			}),
			text(unit, "utility", { color: COLOR.quiet }),
		],
	});
}
