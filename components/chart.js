/**
 * PRESS / components / chart
 *
 * Quantities that need a shape rather than a number.
 *
 * Two rules from data visualisation are structural here rather than advisory.
 *
 * A bar encodes value by length, so its axis must start at zero and every bar
 * in one set must share one scale. `bars` computes the scale from the whole
 * set and refuses a negative value, because a negative bar on a zero baseline
 * is not a bar, it is a different chart.
 *
 * A bar is also only honest if the reader can recover the number, so every row
 * prints its value. The bar carries the comparison, the numeral carries the
 * quantity, and neither is asked to do both.
 *
 * The third rule is this system's own, and it is what `segments` and `donut`
 * are set in: a part is told apart by an ink and a coverage together, never by
 * a colour on its own. See "The series screen" below.
 */

import {
	BasicPlatform,
	Chart as ChartJS,
	Legend,
	LinearScale,
	LineController,
	LineElement,
	PointElement,
} from "chart.js";
import { box, custom, grid, row, stack, text } from "../src/solve.js";
import { measure } from "../src/text.js";
import {
	CATEGORICAL,
	COLOR,
	FAMILY,
	GROUND,
	lineHeight,
	ratio,
	STROKE,
	snap,
	space,
	type,
	UNIT,
} from "../src/tokens.js";

ChartJS.register(LinearScale, LineController, LineElement, PointElement, Legend);

/* --------------------------------------------------------------------------
 * The series screen
 *
 * A chart that has to tell four parts apart has two ways to do it: give each
 * part its own hue, or give each part its own weight of the same ink.
 *
 * Four saturated hues on a black page is what an unconfigured charting library
 * does, and what it says is "here are four unrelated things". A part-to-whole chart is
 * making the opposite claim. This system already owns the better answer, and
 * the whole of mega.dev is built on it: one continuous field forced through a
 * 4x4 ordered screen into binary ink, at seventeen discrete levels of coverage
 * and no grey anywhere.
 *
 * So a series carries two channels, not one: an ink and a coverage. Nothing is
 * ever a flat fill, the accent least of all. Red is loud because it is red and
 * because it holds the heaviest screen, not because it is the one solid shape
 * on a plate full of texture.
 *
 * Two channels beat either alone, and they fail in opposite directions, which
 * is the point. At the 0.231 phone reduction a screen resolves into a tone and
 * the coverage difference is what survives; at full size the hue difference is
 * doing the work and the coverage is what makes a pattern of it. A reader who
 * loses one still has the other.
 *
 * `bars` is deliberately left alone. Its series are separated by position on a
 * shared baseline, so the fill carries no category and screening it would be
 * texture for its own sake. There, as here, red still means the one that
 * matters.
 * ------------------------------------------------------------------------ */

/**
 * The screen cell.
 *
 * The unit grid says where a mark may land. It does not say how big a dot is,
 * and those are different questions. Set to UNIT, the cell printed eight device
 * pixels wide in the 3200px export, which is two and a half pixels by the time
 * the plate is looked at. Below roughly a dozen device pixels an ordered screen
 * stops being a halftone and becomes noise: the coverage bands collapse towards
 * one grey, and a curved edge stepping in cells that small reads as damage
 * rather than as a step.
 *
 * Everywhere else in this system the cell is coarse on purpose. The field is
 * authored at pixelSize 4 on a canvas the browser enlarges, and gates its ink
 * to every second cell, so the pitch of the ink on the ground is 8 authoring
 * px. The showcase runs 3 and 4. The ramp specimen draws the matrix at 11px a
 * cell, because under that you cannot see which of the seventeen levels you
 * are looking at, and a specimen you cannot read is not a specimen.
 *
 * These components paint into the plate's vector canvas, which `mount` has
 * already scaled by the device pixel ratio, so an authored cell of two units
 * prints at 16 device px: twice the field's cell, and exactly the field's ink
 * pitch. Two units is still on the unit grid, so every dot still lands where
 * everything else does. One 4x4 period is 32px, which the segments bar carries
 * one and a half of between its chases and the donut band carries five of.
 *
 * Coarser was tried and printed. At three units the segments bar holds four
 * rows of cells, which is one period with nowhere left to repeat, and the key
 * below it wants a 52px swatch: taller than the 44px line box of the row it
 * sits in, so the legend grows and the component starts spending the plate's
 * height on its own texture. Two units is the coarsest cell this composition
 * pays for.
 */
const CELL = UNIT * 2;

/**
 * The lattice these marks are screened on, in plate coordinates.
 *
 * Absolute, so every screened mark in one frame shares one grid and one phase
 * rather than each carrying its own. A key is the one exception, and it says
 * why: see `swatch`.
 */
const PLATE_LATTICE = { x: 0, y: 0 };

/**
 * Channel one: ink.
 *
 * Red and the ink grey are the two the page already has. Blue is held back
 * until a fifth part asks for it, because a chart is the one place the palette
 * lets blue mean a distinct category and nowhere else has earned it.
 */
/* The ink channel, from the cabinet. It used to be a private copy here and a
   second private copy in morph.js, both carrying pure blue at 2.44:1 against
   the page: a category a reader cannot see. */
const SERIES_INKS = CATEGORICAL;

/**
 * Channel two: pattern.
 *
 * These were Bayer coverage levels, and that was the wrong instrument. An
 * ordered dither exists to approximate continuous tone: it scatters its holes
 * precisely so that a gradient shows no structure. Asking two of its levels to
 * be told apart as categories asks them to do the opposite of their job, and
 * at 12 and 6 of 16 the result reads as two kinds of noise rather than as two
 * kinds of thing.
 *
 * A categorical fill wants the opposite property: visible, regular, and
 * unmistakable at a glance. So the patterns are explicit and each halves the
 * one before it, which keeps coverage descending with quantity while making
 * the structure, not the density, the thing a reader recognises.
 *
 * The screen is not abandoned. It still governs the grounds and the images,
 * where tone is what is being approximated and where it is the right tool.
 */
const PATTERNS = [
	{ name: "solid", lit: () => true },
	{ name: "checker", lit: (cx, cy) => ((cx + cy) & 1) === 0 },
	{ name: "grid", lit: (cx, cy) => (cx & 1) === 0 && (cy & 1) === 0 },
];

/**
 * The palette is a product, not a list.
 *
 * Two inks against two bands is four pairs, which is what a four part chart
 * needs and is as far as most of them go. A fifth part brings in the third ink
 * rather than a third band, because hue separates better than coverage does at
 * the sizes these actually print.
 *
 * Rank order then falls out with the property that matters: consecutive parts
 * always differ in ink, and two parts that share an ink are never less than a
 * full band apart. The pair a reader would confuse - same colour, one step of
 * coverage between them - cannot be produced.
 */
function seriesPalette(count) {
	const inks = count > 4 ? SERIES_INKS : SERIES_INKS.slice(0, 2);
	return Array.from({ length: count }, (_, rank) => ({
		color: inks[rank % inks.length],
		pattern: PATTERNS[Math.min(Math.floor(rank / inks.length), PATTERNS.length - 1)],
	}));
}

/** A cell prints at `level` when its threshold in the matrix falls below it. */
const litCell = (cx, cy, pattern) => pattern.lit(cx, cy);

/**
 * Paint a region as screened ink, one whole cell at a time.
 *
 * `at(x, y)` is asked once at the centre of each cell and returns
 * `{ level, color }`, or null where the region is not. Binary in, binary out:
 * a cell is ink or it is page, there is no partial coverage and nothing is
 * anti-aliased into existence. Straight edges stay exact because a cell is
 * clipped to `bounds`, which costs nothing on an axis the lattice already
 * runs along. A curved edge cannot be clipped that way and is not: it steps,
 * in whole cells, which is what a screen does and what the rest of this system
 * looks like.
 *
 * `lattice` is the origin the cells are counted from, and it is the plate by
 * default so every screened mark in one frame lands on one grid in one phase.
 */
function screenFill(ctx, bounds, at, lattice = PLATE_LATTICE) {
	const cx0 = Math.floor((bounds.x - lattice.x) / CELL);
	const cx1 = Math.ceil((bounds.right - lattice.x) / CELL);
	const cy0 = Math.floor((bounds.y - lattice.y) / CELL);
	const cy1 = Math.ceil((bounds.bottom - lattice.y) / CELL);

	for (let cy = cy0; cy < cy1; cy++) {
		const top = lattice.y + cy * CELL;
		const y0 = Math.max(top, bounds.y);
		const y1 = Math.min(top + CELL, bounds.bottom);
		if (y1 <= y0) continue;
		for (let cx = cx0; cx < cx1; cx++) {
			const left = lattice.x + cx * CELL;
			const cell = at(left + CELL / 2, top + CELL / 2);
			if (!cell || !litCell(cx, cy, cell.pattern)) continue;
			const x0 = Math.max(left, bounds.x);
			const x1 = Math.min(left + CELL, bounds.right);
			if (x1 <= x0) continue;
			ctx.fillStyle = cell.color;
			ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
		}
	}
}

/**
 * The pair each part prints in, assigned by rank and never by array order.
 *
 * The lead part - the one flagged, or else the largest - takes rank zero and
 * so takes red at the heaviest band. Within one ink the coverage still
 * descends with the quantity, so of two parts a reader might weigh against
 * each other, the heavier screen is always the bigger number.
 *
 * An explicit `color` still wins, at the heaviest band, because an author
 * naming a colour is naming a category the chart does not know about. It is
 * screened like everything else: there are no flat fills here.
 */
function seriesInk(items) {
	const value = (i) => Number(items[i].value);
	const order = items.map((_, i) => i).sort((a, b) => value(b) - value(a));

	const flagged = items.findIndex((i) => i.accent);
	if (flagged >= 0) {
		order.splice(order.indexOf(flagged), 1);
		order.unshift(flagged);
	}

	const palette = seriesPalette(items.length);
	const ink = new Array(items.length);
	order.forEach((index, rank) => {
		ink[index] = items[index].color
			? { pattern: PATTERNS[0], color: items[index].color }
			: palette[rank];
	});
	return ink;
}

/**
 * The chase around a screened mark.
 *
 * A screened block has no silhouette of its own: at six cells in sixteen the
 * edge is a scatter of dots and the mark stops being a shape. The border is
 * what makes the faintest part in a set still read as a part, and it is drawn
 * as a rule rather than screened, because a boundary is structure and
 * structure in this system is a solid stroke.
 */
const CHASE = STROKE.rule;

/**
 * Page black between one part and the next.
 *
 * `STROKE.emphasis` at 3px is 0.69px once an article image is reduced to 370
 * CSS px, which is the same disappearing hairline the stroke scale exists to
 * refuse. A gutter is not a stroke, it is furniture, and furniture between two
 * screened marks now comes in cells, because the ink does. `space(1)` is 12px,
 * which is a cell and a half: a gap of one cell at one boundary and two at the
 * next, decided by wherever the lattice happens to fall, and three gutters of
 * visibly different widths in one bar read as a fault rather than as furniture.
 *
 * Two cells is 16px, wider than the space step it replaces, and it survives the
 * 0.231 reduction at 3.7px.
 */
const GUTTER = CELL * 2;

/**
 * A boundary is cut symmetrically out of the parts either side of it, and it
 * can only be as exact as the lattice: `d` is the signed distance from a cell
 * centre to the true edge, and a half-open window two cells wide catches
 * exactly two cells wherever inside a cell that edge falls. No part is moved to
 * make room for the gap; the gap is rounded to the grid the ink is on.
 */
const inGutter = (d) => d >= -GUTTER / 2 && d < GUTTER / 2;

/**
 * A legend entry's mark, and the one place the screen is shown rather than
 * used.
 *
 * A swatch at cap height was 24px, which is three cells: not enough of the
 * matrix to tell twelve of sixteen from six of sixteen, and a key whose mark
 * cannot show the pattern it stands for is not a key. So the swatch is exactly
 * one period of the screen, four cells by four, at the same cell size as the
 * mark on the page - the same thing the ramp specimen in the showcase does,
 * for the same reason.
 *
 * One period is also why this is the exception to the shared lattice. A period
 * counted from the plate origin lands on a swatch at whatever phase the row's
 * y happens to give it, so the same level would print with a different crop in
 * every legend row. Counted from its own corner it prints the matrix itself,
 * identically, every time.
 */
const SWATCH = 4 * CELL + 2 * CHASE;

const swatch = (cell) =>
	custom({
		baselineFrom: "list",
		measure: () => ({ w: SWATCH, h: SWATCH }),
		paint: (ctx, rect) => {
			const inside = {
				x: rect.x + CHASE,
				y: rect.y + CHASE,
				right: rect.right - CHASE,
				bottom: rect.bottom - CHASE,
			};
			screenFill(ctx, inside, () => cell, inside);
			ctx.strokeStyle = COLOR.black2;
			// No chase. The patterns carry their own silhouette now that the leading
			// one is solid, and an outline around every mark read as a box drawn round
			// the data rather than as the data.
		},
	});

/**
 * Horizontal bars on a shared zero-based scale.
 *
 * @param {object[]} items  { label, value, accent? }
 * @param {string}   unit   what the numbers count, printed once
 * @param {number}   [max]  override the scale; defaults to the largest value
 */
export function bars({ items, unit, max, barHeight = 28 } = {}) {
	if (!items || items.length < 2) {
		throw new Error("bars needs at least two items. One bar is a number, not a comparison.");
	}
	if (!unit) {
		throw new Error("bars needs a unit. A bar chart without a unit says how much but not of what.");
	}

	const negative = items.find((i) => Number(i.value) < 0);
	if (negative) {
		throw new Error(
			`bars got a negative value for "${negative.label}". A bar encodes length from ` +
				`zero, so a negative value needs a different chart, not a shorter bar.`,
		);
	}

	const scale = max ?? Math.max(...items.map((i) => Number(i.value)));
	if (!(scale > 0)) throw new Error("bars needs at least one value above zero.");

	// The value column is as wide as the widest numeral, so every bar starts and
	// ends on the same two verticals. Derived, not guessed.
	const valueWidth = snap(
		Math.max(...items.map((i) => measure(String(i.value), "datum"))) + space(2),
	);

	// The label column is as wide as the widest label, so every track starts on
	// one vertical. Derived from the content, never chosen.
	const labelWidth = snap(Math.max(...items.map((i) => measure(i.label, "list"))) + space(2));

	const rows = items.map((item) => {
		const fraction = Number(item.value) / scale;
		const fill = item.accent ? COLOR.red : COLOR.ink;

		return row({
			gap: 3,
			align: "baseline",
			unit: true,
			ruledRow: true,
			children: [
				text(item.label, "list", { color: COLOR.muted, width: labelWidth }),
				custom({
					grow: true,
					baselineFrom: "list",
					measure: (w) => ({ w, h: barHeight }),
					paint: (ctx, rect) => {
						// The track, so an empty bar still reads as a zero rather than as
						// a missing row.
						ctx.fillStyle = COLOR.black1;
						ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
						ctx.fillStyle = fill;
						ctx.fillRect(rect.x, rect.y, Math.round(rect.w * fraction), rect.h);
					},
				}),
				text(String(item.value), "datum", { color: COLOR.text, align: "right", width: valueWidth }),
			],
		});
	});

	const node = stack({
		gap: 3,
		children: [...rows, text(unit, "utility", { color: COLOR.quiet })],
	});

	/* The axis this set was measured against, published rather than kept.
     A static plate has no use for it, but a plate whose data can be swapped
     under it does: `src/interact.js` refuses a card whose chart rescales
     between states, because bar lengths that mean two different things make
     every state honest on its own and the comparison between them a lie. */
	node.scale = scale;
	return node;
}

/* --------------------------------------------------------------------------
 * lineChart
 *
 * A line chart is the right shape when both axes carry quantities and the
 * distance between observations matters. Unlike a timeline, its x positions
 * come from the values themselves, not from the number of stops. Unlike bars,
 * its y axis is a position scale rather than a zero baseline, so an explicit
 * domain is honoured and negative values are allowed.
 *
 * The chart is one custom node because a point at a fraction of a shared axis
 * has no box for the solver to place. The node reports its full measure, then
 * gives Chart.js an authored-size canvas with fixed scales, no animation, and
 * no responsive resize. The rendered canvas is copied into the plate layer, so
 * the solver and the chart still share one deterministic rectangle.
 * ------------------------------------------------------------------------ */

const LINE_FORMATS = new Set(["number", "currency", "percent"]);
const LINE_POINT_LIMIT = 12;
const LINE_SERIES_LIMIT = 3;
const LINE_DEFAULT_TICKS = 5;

const asFiniteNumber = (value, fallback = null) => {
	if (value === undefined || value === null || value === "") return fallback;
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
};

const trimNumber = (value, places) => {
	const rounded = Number(Number(value).toFixed(places));
	return rounded.toFixed(places).replace(/(?:\\.0+|(?:(\\.\\d*?)0+))$/, "$1");
};

const lineTickText = (value, axis) => {
	if (axis.format === "currency") return `$${Number(value).toFixed(2)}`;
	if (axis.format === "percent") {
		const step = Math.abs(axis.max - axis.min) / Math.max(1, axis.ticks - 1);
		return `${trimNumber(value, step < 10 && !Number.isInteger(value) ? 1 : 0)}%`;
	}
	const step = Math.abs(axis.max - axis.min) / Math.max(1, axis.ticks - 1);
	const places = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
	return trimNumber(value, places);
};

const lineTicks = (axis) =>
	Array.from({ length: axis.ticks }, (_, i) => {
		const f = i / Math.max(1, axis.ticks - 1);
		return axis.reverse ? axis.max - f * (axis.max - axis.min) : axis.min + f * (axis.max - axis.min);
	});

const lineAxis = (raw, fallback, values, name) => {
	const source = raw && typeof raw === "object" ? raw : fallback;
	const dataMin = Math.min(...values);
	const dataMax = Math.max(...values);
	let min = asFiniteNumber(source?.min);
	let max = asFiniteNumber(source?.max);

	if (min === null) min = name === "y" && dataMin >= 0 ? 0 : dataMin;
	if (max === null) max = name === "y" && dataMax <= 0 ? 0 : dataMax;
	if (min === max) {
		const pad = Math.max(1, Math.abs(min) * 0.1);
		min -= pad;
		max += pad;
	}
	if (min === null || max === null || min >= max) {
		throw new Error(`lineChart ${name} axis needs a finite min below max.`);
	}
	if (values.some((value) => value < min || value > max)) {
		throw new Error(`lineChart ${name} axis domain does not contain every point.`);
	}

	const format = String(source?.format ?? "number").trim().toLowerCase();
	if (!LINE_FORMATS.has(format)) {
		throw new Error(`lineChart ${name} axis format must be number, currency, or percent.`);
	}
	const ticks = source?.ticks === undefined ? LINE_DEFAULT_TICKS : Number(source.ticks);
	if (!Number.isInteger(ticks) || ticks < 3 || ticks > 7) {
		throw new Error(`lineChart ${name} axis ticks must be an integer from 3 to 7.`);
	}

	return {
		label: String(source?.label ?? source?.unit ?? "").trim(),
		format,
		min,
		max,
		ticks,
		reverse: Boolean(source?.reverse),
	};
};

const lineSeries = (rawSeries) => {
	if (!Array.isArray(rawSeries) || rawSeries.length < 1) {
		throw new Error("lineChart needs at least one series.");
	}
	if (rawSeries.length > LINE_SERIES_LIMIT) {
		throw new Error(`lineChart supports at most ${LINE_SERIES_LIMIT} series.`);
	}

	return rawSeries.map((raw, seriesIndex) => {
		const source = raw && typeof raw === "object" ? raw : {};
		const rawPoints = Array.isArray(source.points)
			? source.points
			: Array.isArray(source.data)
				? source.data
				: [];
		if (rawPoints.length < 3) {
			throw new Error(`lineChart series ${seriesIndex + 1} needs at least three points.`);
		}
		if (rawPoints.length > LINE_POINT_LIMIT) {
			throw new Error(
				`lineChart series ${seriesIndex + 1} has ${rawPoints.length} points; ${LINE_POINT_LIMIT} is the cap.`,
			);
		}

		const points = rawPoints.map((point, pointIndex) => {
			const p = point && typeof point === "object" ? point : {};
			const x = asFiniteNumber(p.x);
			const y = asFiniteNumber(p.y);
			if (x === null || y === null) {
				throw new Error(
					`lineChart series ${seriesIndex + 1} point ${pointIndex + 1} needs finite x and y values.`,
				);
			}
			const label = String(p.label ?? "").trim();
			if (label.length > 32) {
				throw new Error(
					`lineChart point label "${label.slice(0, 40)}" is ${label.length} characters; 32 is the cap.`,
				);
			}
			return { x, y, ...(label ? { label } : {}) };
		});

		return {
			label: String(source.label ?? source.name ?? "").trim(),
			accent: Boolean(source.accent),
			points: points
				.map((point, index) => ({ point, index }))
				.sort((a, b) => a.point.x - b.point.x || a.index - b.index)
				.map(({ point }) => point),
		};
	});
};

const lineSeriesColor = (index, accentIndex) => {
	if (index === accentIndex) return CATEGORICAL[0];
	const rank = index > accentIndex ? index - 1 : index;
	return CATEGORICAL[rank + 1] || CATEGORICAL[1];
};

const drawTracked = (ctx, value, x, y, role, family, color, align = "left", baseline = "alphabetic") => {
	const t = type(role);
	ctx.font = `400 ${t.size}px ${family}`;
	ctx.textAlign = align;
	ctx.textBaseline = baseline;
	ctx.fillStyle = color;
	if ("letterSpacing" in ctx) ctx.letterSpacing = `${t.tracking * t.size}px`;
	ctx.fillText(value, x, y);
	if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
};

const createLineCanvas = (ctx, width, height) => {
	const w = Math.max(1, Math.round(width));
	const h = Math.max(1, Math.round(height));
	let canvas = ctx.canvas?.ownerDocument?.createElement?.("canvas");
	if (!canvas && typeof OffscreenCanvas !== "undefined") canvas = new OffscreenCanvas(w, h);
	if (!canvas && typeof ctx.canvas?.constructor === "function") {
		try {
			canvas = new ctx.canvas.constructor(w, h);
		} catch {
			// The browser's HTMLCanvasElement cannot be constructed directly. The
			// owner-document branch above is the normal browser path.
		}
	}
	if (!canvas) throw new Error("lineChart could not create a Chart.js canvas.");
	canvas.width = w;
	canvas.height = h;
	if (canvas.style) {
		canvas.style.width = `${w}px`;
		canvas.style.height = `${h}px`;
	}
	return canvas;
};

export function lineChart({
	series,
	xAxis,
	yAxis,
	xLabel,
	yLabel,
	xFormat,
	yFormat,
	xMin,
	xMax,
	yMin,
	yMax,
	xReverse,
	yReverse,
	xTicks,
	yTicks,
} = {}) {
	const normalizedSeries = lineSeries(series);
	if (normalizedSeries.length > 1 && normalizedSeries.some((s) => !s.label)) {
		throw new Error("lineChart needs a label on every series when it draws a legend.");
	}

	const xValues = normalizedSeries.flatMap((s) => s.points.map((p) => p.x));
	const yValues = normalizedSeries.flatMap((s) => s.points.map((p) => p.y));
	const xAxisValue = lineAxis(
		xAxis,
		{ label: xLabel, format: xFormat, min: xMin, max: xMax, reverse: xReverse, ticks: xTicks },
		xValues,
		"x",
	);
	const yAxisValue = lineAxis(
		yAxis,
		{ label: yLabel, format: yFormat, min: yMin, max: yMax, reverse: yReverse, ticks: yTicks },
		yValues,
		"y",
	);
	const accentIndex = Math.max(0, normalizedSeries.findIndex((s) => s.accent));
	const labelledSeries = normalizedSeries.filter((s) => s.label);
	const legendHeight = labelledSeries.length > 1 ? lineHeight("list") + space(2) : 0;
	const markerSize = space(2);
	const labelHeight = lineHeight("utility");

	const layoutFor = (width) => {
		const yTickLabels = lineTicks(yAxisValue).map((value) => lineTickText(value, yAxisValue));
		const yWidth = snap(Math.max(...yTickLabels.map((label) => measure(label, "utility"))) + space(2));
		const left = yWidth + space(2);
		const right = space(2);
		const top = space(2) + labelHeight + (yAxisValue.label ? lineHeight("utility") + space(1) : 0);
		const bottom =
			labelHeight +
			space(2) +
			(xAxisValue.label ? lineHeight("utility") + space(1) : 0) +
			legendHeight +
			space(2);
		const plotWidth = width - left - right;
		const plotHeight = snap(width * ratio("1/2")) - space(3) - space(1);
		if (plotWidth <= space(5) || plotHeight <= space(5)) {
			throw new Error(`lineChart has no usable plot at ${Math.floor(width)}px wide.`);
		}
		return {
			xTicks: lineTicks(xAxisValue),
			yTicks: lineTicks(yAxisValue),
			xTickLabels: lineTicks(xAxisValue).map((value) => lineTickText(value, xAxisValue)),
			yTickLabels,
			plot: { x: left, y: top, w: plotWidth, h: plotHeight },
			h: top + plotHeight + bottom,
			legendTop: top + plotHeight + labelHeight + space(2) + (xAxisValue.label ? lineHeight("utility") + space(1) : 0) + space(2),
		};
	};

	const node = custom({
		unit: true,
		measure: (width) => ({ w: width, h: layoutFor(width).h }),
		paint: (ctx, rect, C) => {
			const layout = layoutFor(rect.w);
			const canvas = createLineCanvas(ctx, rect.w, layout.h);
			const utility = type("utility");
			const list = type("list");
			const font = (token) => ({
				family: FAMILY[token.family],
				size: token.size,
				weight: 400,
			});
			const labelPlugin = {
				id: "pressLineLabels",
				afterDatasetsDraw(chart) {
					const chartContext = chart.ctx;
					const area = chart.chartArea;
					if (!area) return;
					const gap = space(2);
					const labelPad = space(1);
					const labelLine = lineHeight("utility");
					const labels = [];
					const points = [];
					const segments = [];

					for (let datasetIndex = 0; datasetIndex < chart.data.datasets.length; datasetIndex++) {
						const dataset = chart.data.datasets[datasetIndex];
						const meta = chart.getDatasetMeta(datasetIndex);
						const positions = [];
						for (let pointIndex = 0; pointIndex < meta.data.length; pointIndex++) {
							const point = meta.data[pointIndex];
							const position = point.getProps(["x", "y"], true);
							positions.push(position);
							points.push({ ...position, datasetIndex, pointIndex });
							const raw = dataset.data[pointIndex];
							if (!raw || typeof raw !== "object" || !raw.label) continue;
							labels.push({
								datasetIndex,
								pointIndex,
								text: raw.label,
								x: position.x,
								y: position.y,
								w: measure(raw.label, "utility") + labelPad * 2,
							});
						}
						for (let pointIndex = 1; pointIndex < positions.length; pointIndex++) {
							segments.push({ from: positions[pointIndex - 1], to: positions[pointIndex] });
						}
					}

					labels.sort((a, b) => a.x - b.x || a.y - b.y);
					const occupied = [];
					const collides = (a, b) =>
						a.x < b.x + b.w + gap &&
						a.x + a.w + gap > b.x &&
						a.top < b.y + b.h + gap &&
						a.bottom + gap > b.y;
					const candidate = (item, placement) => {
						const above = placement.startsWith("above");
						const below = placement.startsWith("below");
						const left = placement === "left" || placement.endsWith("-left");
						const right = placement === "right" || placement.endsWith("-right");
						const side = !above && !below && (left || right);
						const distance = placement.endsWith("-far") ? gap + space(2) : gap;
						const x = left ? item.x - item.w - distance : right ? item.x + distance : item.x - item.w / 2;
						const y = below ? item.y + distance : above ? item.y - distance : item.y;
						const top = above ? y - labelLine : below ? y : y - labelLine / 2;
						return {
							x: Math.max(area.left, Math.min(x, area.right - item.w)),
							y,
							w: item.w,
							h: labelLine,
							top,
							bottom: top + labelLine,
							baseline: side ? "middle" : above ? "bottom" : "top",
						};
					};
					const ccw = (a, b, c) =>
						(c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
					const crosses = (a, b, c, d) =>
						ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
					const lineCollides = (box) => {
						const left = box.x - labelPad;
						const right = box.x + box.w + labelPad;
						const top = box.top - labelPad;
						const bottom = box.bottom + labelPad;
						const inside = (point) =>
							point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
						const edges = [
							[{ x: left, y: top }, { x: right, y: top }],
							[{ x: right, y: top }, { x: right, y: bottom }],
							[{ x: right, y: bottom }, { x: left, y: bottom }],
							[{ x: left, y: bottom }, { x: left, y: top }],
						];
						return segments.some(({ from, to }) =>
							inside(from) || inside(to) || edges.some(([edgeFrom, edgeTo]) => crosses(from, to, edgeFrom, edgeTo)),
						);
					};

					for (const item of labels) {
						const placements = [
							"above",
							"below",
							"left",
							"right",
							"above-far",
							"below-far",
							"left-far",
							"right-far",
							"above-left",
							"above-right",
							"below-left",
							"below-right",
							"above-left-far",
							"above-right-far",
							"below-left-far",
							"below-right-far",
						];
						let chosen = null;
						for (const placement of placements) {
							const box = candidate(item, placement);
							const coversPoint = points.some((other) => {
								if (other.datasetIndex === item.datasetIndex && other.pointIndex === item.pointIndex) return false;
								const nearX = Math.max(box.x, Math.min(other.x, box.x + box.w));
								const nearY = Math.max(box.top, Math.min(other.y, box.bottom));
								return Math.hypot(nearX - other.x, nearY - other.y) < markerSize / 2;
							});
							if (
								box.top >= area.top &&
								!coversPoint &&
								!lineCollides(box) &&
								box.bottom <= area.bottom &&
								!occupied.some(
									(other) =>
										other.datasetIndex === item.datasetIndex && other.pointIndex === item.pointIndex
											? false
											: collides(box, other)
								)
							) {
								chosen = box;
								break;
							}
						}
						const box = chosen || candidate(item, "above");
						occupied.push({ ...box, y: box.top });
						drawTracked(
							chartContext,
							item.text,
							box.x + labelPad,
							box.y,
							"utility",
							FAMILY.mono,
							C.quiet,
							"left",
							box.baseline,
						);
					}
				},
			};
			const chart = new ChartJS(canvas, {
				type: "line",
				data: {
					datasets: normalizedSeries.map((s, index) => {
						const color = lineSeriesColor(index, accentIndex);
						return {
							label: s.label,
							data: s.points,
							parsing: false,
							normalized: true,
							borderColor: color,
							backgroundColor: color,
							borderWidth: STROKE.emphasis,
							borderCapStyle: "round",
							borderJoinStyle: "round",
							pointRadius: markerSize / 2,
							pointHoverRadius: markerSize / 2,
							pointBorderColor: C.page,
							pointBorderWidth: STROKE.connector,
							pointBackgroundColor: color,
							pointStyle: "circle",
							showLine: true,
							fill: false,
							spanGaps: false,
							clip: false,
							tension: 0,
						};
					}),
				},
				options: {
					responsive: false,
					maintainAspectRatio: false,
					animation: false,
					devicePixelRatio: 1,
					platform: BasicPlatform,
					events: [],
					layout: {
						padding: {
							top: space(3),
							right: space(1),
							bottom: space(3),
							left: space(1),
						},
					},
					color: C.quiet,
					font: font(utility),
					scales: {
						x: {
							type: "linear",
							min: xAxisValue.min,
							max: xAxisValue.max,
							reverse: xAxisValue.reverse,
							alignToPixels: true,
							grid: {
								color: C.black2,
								lineWidth: STROKE.connector,
								drawTicks: false,
								drawOnChartArea: true,
							},
							border: { color: C.black2, width: STROKE.divider },
							title: {
								display: false,
								text: xAxisValue.label,
								color: C.quiet,
								font: font(utility),
								padding: space(2),
							},
							ticks: {
								color: C.quiet,
								font: font(utility),
								count: xAxisValue.ticks,
								maxTicksLimit: xAxisValue.ticks,
								padding: space(2),
								callback: (value) => lineTickText(Number(value), xAxisValue),
							},
						},
						y: {
							type: "linear",
							min: yAxisValue.min,
							max: yAxisValue.max,
							reverse: yAxisValue.reverse,
							alignToPixels: true,
							grid: {
								color: C.black2,
								lineWidth: STROKE.connector,
								drawTicks: false,
								drawOnChartArea: true,
							},
							border: { color: C.black2, width: STROKE.divider },
							title: {
								display: false,
								text: yAxisValue.label,
								color: C.quiet,
								font: font(utility),
								padding: space(2),
							},
							ticks: {
								color: C.quiet,
								font: font(utility),
								count: yAxisValue.ticks,
								maxTicksLimit: yAxisValue.ticks,
								padding: space(1),
								callback: (value) => lineTickText(Number(value), yAxisValue),
							},
						},
					},
					plugins: {
						legend: {
							display: normalizedSeries.length > 1,
							position: "bottom",
							labels: {
								color: C.text,
								font: font(list),
								boxWidth: space(1),
								boxHeight: space(1),
								padding: space(2),
							},
						},
						tooltip: { enabled: false },
					},
				},
				plugins: [labelPlugin],
			});
			try {
				ctx.drawImage(canvas, rect.x, rect.y, rect.w, rect.h);
			} finally {
				chart.destroy();
			}
		},
	});

	node.scale = `${xAxisValue.min}:${xAxisValue.max}|${yAxisValue.min}:${yAxisValue.max}`;
	return node;
}

/**
 * A two by two framework. The axes are drawn from the grid the cells were
 * placed in, so the crosshair is always exactly on the seam.
 *
 * @param {object[]} cells  four, in reading order: TL, TR, BL, BR
 * @param {string}   x      the horizontal axis label, low to high
 * @param {string}   y      the vertical axis label, low to high
 */
export function quadrant({ cells, x, y, gap = 3 } = {}) {
	if (cells?.length !== 4) {
		throw new Error("quadrant needs exactly four cells, in reading order.");
	}
	if (!x || !y) {
		throw new Error("quadrant needs both axis labels. An unlabelled matrix is a decorative grid.");
	}

	const cellNodes = cells.map((c) =>
		box({
			pad: 4,
			border: true,
			borderColor: c.accent ? COLOR.red : COLOR.black2,
			fill: c.accent ? GROUND.accent : COLOR.panel,
			gap: 2,
			unit: true,
			children: [
				text(c.title, "head", { color: COLOR.text }),
				c.body ? text(c.body, "body", { color: COLOR.muted, commentary: true }) : null,
			],
		}),
	);

	const matrix = grid({ cols: 2, gap, children: cellNodes });

	return stack({
		gap: 2,
		children: [
			text(y, "utility", { color: COLOR.quiet }),
			matrix,
			text(x, "utility", { color: COLOR.quiet, align: "right" }),
		],
	});
}

/* --------------------------------------------------------------------------
 * segments
 *
 * A single bar divided into parts of one whole. This is what a pie chart is
 * usually reaching for, and a reader compares lengths along a common baseline
 * far more accurately than angles, so it is the better default.
 *
 * The parts must be parts: the component checks that they sum to the declared
 * total, because a "100 per cent" bar whose segments sum to 87 is a chart that
 * lies quietly.
 *
 * The bar is set the way a forme is: a chase around the outside, furniture
 * between the parts, screened ink inside. Four colour blocks butted directly
 * against each other is the one arrangement where the reader has to work out
 * where one part stops.
 * ------------------------------------------------------------------------ */

export function segments({ items, total, unit, height = space(5), tolerance = 0.001 } = {}) {
	if (!items || items.length < 2) throw new Error("segments needs at least two parts.");
	if (!unit) throw new Error("segments needs a unit. Parts of what?");

	const sum = items.reduce((a, i) => a + Number(i.value), 0);
	const whole = total ?? sum;

	if (Math.abs(sum - whole) > Math.max(tolerance, whole * tolerance)) {
		throw new Error(
			`segments sum to ${sum} but the declared total is ${whole}. A part-to-whole bar ` +
				`whose parts do not sum to the whole misstates every proportion in it. ` +
				`Either fix the values or add the remainder as an explicit part.`,
		);
	}

	const ink = seriesInk(items);

	const bar = custom({
		measure: (w) => ({ w, h: height }),
		paint: (ctx, rect) => {
			const inside = {
				x: rect.x + CHASE,
				y: rect.y + CHASE,
				right: rect.right - CHASE,
				bottom: rect.bottom - CHASE,
			};
			const w = inside.right - inside.x;

			// Every boundary sits at its true proportion of the whole and the gutter
			// is cut symmetrically out of it. No part is ever moved to make room for
			// the space between parts, so the bar still measures what it claims to.
			const edges = [];
			let acc = 0;
			for (let i = 0; i < items.length - 1; i++) {
				acc += Number(items[i].value) / whole;
				edges.push(inside.x + w * acc);
			}

			screenFill(ctx, inside, (x) => {
				for (const e of edges) if (inGutter(x - e)) return null;
				let i = 0;
				while (i < edges.length && x > edges[i]) i++;
				return ink[i];
			});

			ctx.strokeStyle = COLOR.black2;
			// No chase, for the same reason the swatch has none.
		},
	});

	const legend = items.map((item, i) =>
		row({
			gap: 2,
			align: "baseline",
			unit: true,
			ruledRow: true,
			children: [
				swatch(ink[i]),
				text(item.label, "list", { color: COLOR.muted, grow: true }),
				text(String(item.value), "datum", { color: COLOR.text }),
				text(`${Math.round((Number(item.value) / whole) * 100)}%`, "utility", {
					color: COLOR.quiet,
				}),
			],
		}),
	);

	return stack({
		gap: 4,
		children: [
			bar,
			stack({ gap: 3, children: legend }),
			text(unit, "utility", { color: COLOR.quiet }),
		],
	});
}

/* --------------------------------------------------------------------------
 * donut
 *
 * Angles are read less accurately than lengths, so this is deliberately
 * constrained: at most five slices, sorted by size, every slice labelled with
 * its value directly in the legend, and the whole printed in the middle so the
 * reader never has to infer the denominator.
 *
 * If a set needs more than five slices it is a `bars` or a `table`, and the
 * component says so rather than drawing eleven unreadable wedges.
 *
 * Its proportions come off the ratio scale rather than out of a calculator.
 * The ring is a third of the row it sits in, and its band is a third of its
 * own diameter, so across the widest part the reader gets band, hole, band in
 * equal thirds. A ring drawn thin beside a legend three times its width reads
 * as a diagram somebody added afterwards.
 *
 * A third is not a taste: the next step up the ratio scale is two fifths, and
 * a ring that size overruns the safe area of a landscape plate by 4px and is
 * refused. The scale had the answer and the solver checked it.
 * ------------------------------------------------------------------------ */

const MAX_SLICES = 5;

export function donut({ items, total, unit, size, thickness } = {}) {
	if (!items || items.length < 2) throw new Error("donut needs at least two slices.");
	if (!unit) throw new Error("donut needs a unit. Slices of what?");
	if (items.length > MAX_SLICES) {
		throw new Error(
			`donut got ${items.length} slices and the limit is ${MAX_SLICES}. Angles are read ` +
				`less accurately than lengths, so a set this size is a bars() or a table(). ` +
				`Group the tail into one explicit "other" slice if a donut is still the right shape.`,
		);
	}

	const sum = items.reduce((a, i) => a + Number(i.value), 0);
	const whole = total ?? sum;
	if (!(whole > 0)) throw new Error("donut needs a positive total.");

	const sorted = [...items].sort((a, b) => Number(b.value) - Number(a.value));
	const ink = seriesInk(sorted);

	// Cumulative fractions, twelve o'clock clockwise. The ring is resolved per
	// cell rather than per wedge, so this is what a cell is tested against.
	const cuts = [];
	let acc = 0;
	for (const item of sorted) {
		acc += Number(item.value) / whole;
		cuts.push(acc);
	}

	/* A row measures a fixed child twice: once at the width of the whole row,
     and again at the width the child reported the first time. Deriving the
     ring from `avail` on both calls would give a ring a third of a third. So
     the derivation is latched to the first answer, which is the only one taken
     against the row. */
	let dim = null;
	const ringSize = (avail) => {
		if (!dim) {
			const s = size ?? snap(avail * ratio("1/3"));
			dim = { s, band: thickness ?? snap(s * ratio("1/3")) };
		}
		return dim;
	};

	const ring = custom({
		measure: (avail) => {
			const d = ringSize(avail);
			return { w: d.s, h: d.s };
		},
		paint: (ctx, rect) => {
			const cx = rect.cx,
				cy = rect.cy;
			const outer = Math.min(rect.w, rect.h) / 2;
			const inner = outer - dim.band;

			// One ray per slice start, including the one at twelve o'clock, which is
			// also where the last slice ends. A gutter measured perpendicular to the
			// ray is the same width at the inner edge as at the outer one; an
			// angular gap is not, and the difference is visible.
			const rays = [0, ...cuts.slice(0, -1)].map((f) => {
				const t = -Math.PI / 2 + f * Math.PI * 2;
				return { x: Math.cos(t), y: Math.sin(t) };
			});

			/* A cell is asked about at its centre but printed at its full size, so a
         cell whose centre sits exactly on the band edge puts a corner past it.
         Half a diagonal is how far that reach is, and holding it back by that
         much is what keeps whole cells inside the chase rather than stepping
         across it. The band loses a cell at each edge and keeps seventeen. */
			const reach = (CELL / 2) * Math.SQRT2;
			const fillOuter = outer - CHASE - reach;
			const fillInner = inner + CHASE + reach;

			screenFill(ctx, rect, (x, y) => {
				const dx = x - cx,
					dy = y - cy;
				const r = Math.hypot(dx, dy);
				if (r < fillInner || r > fillOuter) return null;
				for (const d of rays) {
					if (dx * d.x + dy * d.y > 0 && inGutter(dx * d.y - dy * d.x)) return null;
				}
				let t = Math.atan2(dy, dx) + Math.PI / 2;
				if (t < 0) t += Math.PI * 2;
				const f = t / (Math.PI * 2);
				let i = 0;
				while (i < cuts.length - 1 && f > cuts[i]) i++;
				return ink[i];
			});

			// The chase, inside and out. Without it the lightest slice has no
			// silhouette and the ring stops being one shape.
			ctx.strokeStyle = COLOR.black2;
			ctx.lineWidth = CHASE;
			for (const r of []) {
				ctx.beginPath();
				ctx.arc(cx, cy, r, 0, Math.PI * 2);
				ctx.stroke();
			}
		},
	});

	const legend = sorted.map((item, i) =>
		row({
			gap: 2,
			align: "baseline",
			unit: true,
			ruledRow: true,
			children: [
				swatch(ink[i]),
				text(item.label, "list", { color: COLOR.muted, grow: true }),
				text(String(item.value), "datum", { color: COLOR.text }),
				text(`${Math.round((Number(item.value) / whole) * 100)}%`, "utility", {
					color: COLOR.quiet,
				}),
			],
		}),
	);

	return row({
		gap: 5,
		align: "start",
		children: [
			ring,
			stack({
				gap: 3,
				grow: true,
				children: [
					row({
						gap: 2,
						align: "baseline",
						children: [
							text(String(whole), "datumHero", { color: COLOR.text }),
							text(unit, "utility", { color: COLOR.quiet }),
						],
					}),
					...legend,
				],
			}),
		],
	});
}
