/**
 * PRESS / components / uncertainty
 *
 * An estimate and the range it lives in.
 *
 * Every quantity this library could draw before this file was a point: a bar,
 * a slice, a metric row, a numeral. A point says the number is known. Most
 * numbers worth teaching are not known, they are estimated, and the estimate
 * has a width. A framework meant to explain measurement that can only draw
 * certainty will teach the wrong lesson about every measurement it draws.
 *
 * So this is the counterpart to `hero()`. That one refuses a prominent number
 * with no caption, because a large isolated number is decoration rather than
 * evidence. This one refuses a point estimate with no interval, for the same
 * reason one step further in: an estimate printed without its range is a claim
 * wearing the costume of a measurement.
 *
 * ## Why the axis does not start at zero
 *
 * `bars` refuses a negative value and starts its axis at zero, because a bar
 * encodes magnitude by **length**, and a length read from a floating baseline
 * is a lie about ratio. An interval encodes by **position** on a shared axis,
 * and position is legible from any origin. So this component does the opposite
 * of `bars` on purpose, and the difference is not a preference: it falls out of
 * which visual variable is carrying the quantity.
 *
 * The axis is still shared by every row, which is the part that actually makes
 * the comparison honest, and it can be pinned with `from` and `to` so two
 * states of an interactive card cannot silently rescale under each other.
 */

import { ruleAcross } from "../src/connect.js";
import { custom, row, stack, text } from "../src/solve.js";
import { measure } from "../src/text.js";
import { COLOR, PressError, STROKE, snap, space } from "../src/tokens.js";

/** The track a single interval is drawn in. One step on the spacing scale. */
const TRACK = space(3);

/** The end caps, as a share of the track. Derived so they scale with it. */
const CAP = 0.5;

const num = (v) => typeof v === "number" && Number.isFinite(v);

/**
 * @param {object[]} items  { label, lo, mid, hi, accent? }
 * @param {string}   unit   what the numbers count
 * @param {number}   [from] pin the axis low end
 * @param {number}   [to]   pin the axis high end
 */
export function distribution({ items, unit, from, to, gap = 3 } = {}) {
	if (!items || items.length < 2) {
		throw new PressError(
			"DISTRIBUTION_TOO_FEW",
			"distribution needs at least two rows. One interval is a fact, not a comparison, " +
				"and a fact belongs in a metric row.",
		);
	}
	if (!unit) {
		throw new PressError(
			"DISTRIBUTION_NO_UNIT",
			"distribution needs a unit. A range without one says how uncertain but not of what.",
		);
	}

	for (const it of items) {
		if (!num(it.lo) || !num(it.hi) || !num(it.mid)) {
			throw new PressError(
				"ESTIMATE_WITHOUT_INTERVAL",
				`"${it.label}" needs lo, mid and hi as numbers. An estimate printed without its ` +
					`range is a claim wearing the costume of a measurement, which is the one thing ` +
					`this component exists to refuse.`,
			);
		}
		if (it.lo > it.hi) {
			throw new PressError(
				"INTERVAL_INVERTED",
				`"${it.label}" has lo ${it.lo} above hi ${it.hi}. An interval drawn from an ` +
					`inverted pair renders as a zero width mark, which reads as certainty.`,
			);
		}
		if (it.mid < it.lo || it.mid > it.hi) {
			throw new PressError(
				"ESTIMATE_OUTSIDE_INTERVAL",
				`"${it.label}" has mid ${it.mid} outside its own range ${it.lo} to ${it.hi}. ` +
					`The point estimate sits inside the interval it is estimated from.`,
			);
		}
	}

	/* The axis. Shared by every row, which is what makes the rows comparable at
     all, and pinnable so two states of one card cannot rescale under a reader. */
	const lo = from ?? Math.min(...items.map((i) => i.lo));
	const hi = to ?? Math.max(...items.map((i) => i.hi));
	if (!(hi > lo)) {
		throw new PressError(
			"AXIS_HAS_NO_EXTENT",
			`every row sits at ${lo}, so the axis has no extent and every interval would draw ` +
				`at the same point. Pin it with from and to, or use metric rows.`,
		);
	}

	/* Both columns are as wide as their widest member, so every track starts and
     ends on the same two verticals. Derived from the content, never chosen. */
	const labelWidth = snap(Math.max(...items.map((i) => measure(i.label, "list"))) + space(2));
	const midWidth = snap(Math.max(...items.map((i) => measure(String(i.mid), "datum"))) + space(2));

	const at = (v, rect) => rect.x + ((v - lo) / (hi - lo)) * rect.w;

	const rows = items.map((item) => {
		const stroke = item.accent ? COLOR.red : COLOR.ink;

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
					measure: (w) => ({ w, h: TRACK }),
					paint: (ctx, rect) => {
						const y = rect.cy;
						const x0 = at(item.lo, rect),
							x1 = at(item.hi, rect);
						const cap = (TRACK * CAP) / 2;

						/* The interval, then its ends, then the estimate. All at the
               semantic stroke: a range that disappears under reduction takes
               the uncertainty with it and leaves a bare dot, which is the
               claim this component refuses. */
						ctx.strokeStyle = stroke;
						ctx.lineWidth = STROKE.connector;
						ctx.lineCap = "butt";
						ctx.beginPath();
						ctx.moveTo(x0, y);
						ctx.lineTo(x1, y);
						ctx.moveTo(x0, y - cap);
						ctx.lineTo(x0, y + cap);
						ctx.moveTo(x1, y - cap);
						ctx.lineTo(x1, y + cap);
						ctx.stroke();

						/* The page is knocked out behind the estimate so the interval does
               not run visibly through it, the same move the renderer makes for
               a marker on a rail. */
						const r = TRACK * 0.3;
						const mx = at(item.mid, rect);
						ctx.fillStyle = COLOR.page;
						ctx.fillRect(
							mx - r - STROKE.connector,
							y - r - STROKE.connector,
							2 * (r + STROKE.connector),
							2 * (r + STROKE.connector),
						);
						ctx.fillStyle = stroke;
						ctx.fillRect(mx - r, y - r, 2 * r, 2 * r);
					},
				}),
				text(String(item.mid), "datum", { color: COLOR.text, align: "right", width: midWidth }),
			],
		});
	});

	/* The axis reads as two bounds and a unit rather than as a ruler. Ticks would
     need their own text nodes positioned along the track, and a component that
     positions type by interpolation is exactly the thing this system does not
     let anybody write. */
	const foot = row({
		gap: 3,
		align: "baseline",
		children: [
			text(String(lo), "utility", { color: COLOR.quiet, width: labelWidth }),
			text(unit, "utility", { color: COLOR.quiet, grow: true, align: "center" }),
			text(String(hi), "utility", { color: COLOR.quiet, align: "right", width: midWidth }),
		],
	});

	const node = stack({ gap, children: [...rows, foot] });

	/* Ruled rows earn the larger information budget by actually being ruled.
     A row that claims the cheap budget and draws no rule is a plate carrying
     eight units while looking like it carries five. */
	node.press = {
		connect: () => ({
			rules: rows.slice(0, -1).map((r) =>
				ruleAcross(r, {
					at: "bottom",
					offset: space(gap) / 2,
					weight: STROKE.divider,
					color: COLOR.black1,
				}),
			),
		}),
	};

	/* Published so a card that swaps its data between states is refused if the
     axis moves under it. The same contract `bars` carries. */
	node.scale = `${lo}:${hi}`;
	return node;
}
