/**
 * PRESS / text
 *
 * Text is measured before it is placed, never after. That single inversion is
 * what turns overflow from something you discover in a PNG into something the
 * solver knows about while it still has options.
 *
 * When a string does not fit, the system has exactly three moves, in order:
 *
 *   1. wrap it, if the box has height to give
 *   2. step the role down the scale, if the caller allowed a floor
 *   3. fail, naming the string and the overflow in pixels
 *
 * It never clips, never shrinks below the legibility floor, and never quietly
 * lets a flex column compress its children until they overlap.
 *
 * The measuring and line breaking underneath is Pretext (MIT, vendored whole
 * into `vendor/pretext/`), which implements the CSS line breaking model on top
 * of `Intl.Segmenter`: grapheme clusters, per-character breaking for CJK,
 * kinsoku, `word-break`, `overflow-wrap: break-word`, soft hyphens, and
 * `letter-spacing` applied the way the browser applies it. Before this, wrapping
 * was `split(/\s+/)`, which is correct for English and wrong for everything
 * else: it cannot break a Chinese sentence at all, and it treats an emoji or a
 * combining accent as two units.
 */

import {
	clearCache as clearPretextCaches,
	layoutWithLines,
	measureNaturalWidth,
	prepareWithSegments,
} from "../vendor/pretext/layout.js";
import { FAMILY, lineHeight, minTypeSize, PressError, type } from "./tokens.js";

/* --------------------------------------------------------------------------
 * Measurement
 *
 * One offscreen context for the metrics below; Pretext keeps its own, of the
 * same kind. Canvas measureText is the same shaper the DOM uses for a single
 * run, so a measured width and the rendered width agree as long as the family,
 * size, weight and tracking agree.
 *
 * The renderer emits one absolutely positioned element per line at
 * `white-space: pre`, so what has to be true is narrow and checkable: the
 * number returned here must equal the width of that element. Checked against
 * real DOM widths across all eight roles, both weights, tracked and untracked,
 * CJK, emoji and combining marks, the worst disagreement is 0.0156px, which is
 * the 1/64px the DOM quantises to. All 259 lines the seventeen plates render
 * agree to 0.0157px.
 * ------------------------------------------------------------------------ */

let ctx = null;
function context() {
	if (!ctx) {
		const canvas =
			typeof OffscreenCanvas !== "undefined"
				? new OffscreenCanvas(8, 8)
				: document.createElement("canvas");
		ctx = canvas.getContext("2d");
	}
	return ctx;
}

const styleOf = (roleOrStyle) =>
	typeof roleOrStyle === "string" ? type(roleOrStyle) : roleOrStyle;

/**
 * Tracking, in pixels, exactly as `render.js` writes it into `letter-spacing`.
 *
 * CSS adds this space after *every* grapheme cluster including the last, not
 * between them, so a tracked string of n clusters is n gaps wide and not n - 1.
 * Pretext models the same rule: n - 1 gaps inside a segment, plus one terminal
 * gap when the line ends on rendered content. Confirmed rather than assumed,
 * since getting it wrong under-measured every kicker, footer and table header
 * in the set by 2.08px: a 14 cluster run at `list` with 2.08px of tracking
 * measures 29.125px wider in the DOM than without, which is 14 gaps and not 13.
 */
const trackingFor = (style) => (style.tracking || 0) * style.size;

export function fontString(style, weight = 400) {
	return `${weight} ${style.size}px ${FAMILY[style.family]}`;
}

/**
 * Prepared text is Pretext's one-time analysis pass: normalise whitespace,
 * segment, measure every segment through canvas, cache the widths. Laying it
 * out afterwards is arithmetic. Preparing the same string twice would throw
 * that away, so everything goes through this cache, and `resetMetrics()` drops
 * it when the faces finish loading.
 *
 * Two whitespace modes, for two different questions:
 *
 *   pre-wrap   what will this exact string measure when it is rendered?
 *              The renderer sets `white-space: pre`, so a double space is two
 *              spaces and a newline is a break.
 *   normal     where should this run break? CSS collapsing, which is also what
 *              the old `split(/\s+/)` did.
 */
const preparedCache = new Map();

function prepared(text, style, weight, whiteSpace) {
	const font = fontString(style, weight);
	const letterSpacing = trackingFor(style);
	const key = `${whiteSpace}\u0000${font}\u0000${letterSpacing}\u0000${text}`;
	let p = preparedCache.get(key);
	if (p === undefined) {
		p = prepareWithSegments(text, font, { whiteSpace, letterSpacing });
		preparedCache.set(key, p);
	}
	return p;
}

/**
 * The one place canvas is not the truth.
 *
 * Chrome shapes a canvas run and a DOM run through the same font, and for every
 * face in this lab the two agree to 0.016px, which is the DOM's own 1/64px
 * quantisation. They disagree on one thing: the DOM applies the `kern` pairs of
 * the CJK fallback face and the canvas shaper does not. Measured here, the
 * 14 character sample `日本語のテキストと中文的排版` comes back 1.913px wide at
 * `list`, in Pretext and in the canvas arithmetic that preceded it alike;
 * setting `font-kerning: none` on the DOM node closes it to 0.009px, which
 * identifies the cause exactly. Turning kerning off in the renderer is not the
 * fix: it moves Latin by up to 64.8px at `display`.
 *
 * So for text in those scripts the DOM is asked directly, once per distinct
 * string, and the answer is cached with everything else. The reflow is paid at
 * measure time, which in this system is a build step and not a frame.
 *
 * The error without this is in the safe direction, since canvas over-measures,
 * but a system whose contract is "the measured width is the rendered width"
 * does not get to be approximately right.
 */
const KERN_UNSAFE = new RegExp(
	"[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}" +
		"\\p{Script=Bopomofo}\\u3000-\\u303F\\uFE10-\\uFE6F\\uFF00-\\uFFEF]",
	"u",
);

const domCache = new Map();
let probe = null;
function domWidth(text, style, weight) {
	if (typeof document === "undefined" || !document.body) return null;
	if (!probe) {
		probe = document.createElement("p");
		probe.style.cssText =
			"position:absolute;left:-99999px;top:0;margin:0;padding:0;border:0;" +
			"white-space:pre;display:inline-block;visibility:hidden;pointer-events:none";
	}
	probe.style.fontFamily = FAMILY[style.family];
	probe.style.fontSize = `${style.size}px`;
	probe.style.fontWeight = String(weight);
	probe.style.letterSpacing = `${trackingFor(style)}px`;
	probe.textContent = text;
	document.body.appendChild(probe);
	const w = probe.getBoundingClientRect().width;
	probe.remove();
	return w;
}

/** The width of one run of text, as the DOM will render it on a single line. */
export function measure(text, roleOrStyle, weight = 400) {
	const s = String(text);
	if (s === "") return 0;
	const style = styleOf(roleOrStyle);
	if (KERN_UNSAFE.test(s)) {
		const key = `${fontString(style, weight)}\u0000${trackingFor(style)}\u0000${s}`;
		let w = domCache.get(key);
		if (w === undefined) {
			w = domWidth(s, style, weight);
			if (w !== null) domCache.set(key, w);
		}
		if (w !== null && w !== undefined) return w;
	}
	return measureNaturalWidth(prepared(s, style, weight, "pre-wrap"));
}

/**
 * The tightest width that still holds the text without adding a line: the
 * shrink-wrap width, which the previous implementation had no way to express.
 * A box asked to hug its own copy asks for this instead of being handed a
 * column width and leaving the slack visible.
 *
 * Hard breaks still count, so a run carrying newlines reports its widest line
 * rather than its total length.
 */
export function naturalWidth(text, roleOrStyle, weight = 400) {
	const s = String(text);
	if (s.trim() === "") return 0;
	const style = styleOf(roleOrStyle);
	return widest(lay(s, style, weight, Infinity), style, weight);
}

/* --------------------------------------------------------------------------
 * Wrapping
 *
 * CSS line breaking, not word splitting. English breaks at spaces as it always
 * did; Chinese and Japanese break between characters, Thai breaks on the
 * segmenter's word boundaries, a soft hyphen becomes an optional break that
 * materialises a visible hyphen only if it is taken, and a word too long for
 * its column breaks at a grapheme boundary rather than running out of the box.
 * ------------------------------------------------------------------------ */

const usableWidth = (w) => (Number.isFinite(w) && w > 0 ? w : Infinity);

/**
 * The lines a run breaks into at a given width.
 *
 * The space a line broke at hangs past the edge in CSS: it is not painted, not
 * measured, and not counted when the line is aligned. The renderer sets
 * `white-space: pre` on each line, which would paint it, so it comes off here.
 * A right-aligned line carrying an invisible trailing space is shifted left by
 * a space width, which is exactly the class of defect this system exists to
 * make unrepresentable.
 */
function lay(text, style, weight, maxWidth) {
	return layoutWithLines(
		prepared(text, style, weight, "normal"),
		usableWidth(maxWidth),
		1,
	).lines.map((l) => ({ text: l.text.replace(/^[ \t]+|[ \t]+$/g, ""), width: l.width }));
}

/**
 * The widest line, which is the width the box has to be.
 *
 * Two numbers describe a line: what it will measure when it prints, and what
 * the line breaker thought it was worth when it decided to break there. For
 * every Latin, emoji and combining case in the set these agree to the DOM's own
 * 1/64px. They separate only for the kerned CJK case above, where the breaker
 * is the wider of the two, and there the breaker has to win: a box sized to the
 * ink would be a box the same text no longer fits on the same number of lines.
 * Wider by 1.9px is slack. Narrower by 1.9px is a re-break during placement.
 */
function widest(lines, style, weight) {
	let w = 0;
	for (const l of lines) w = Math.max(w, measure(l.text, style, weight), l.width);
	return w;
}

export function wrap(text, maxWidth, roleOrStyle, weight = 400) {
	const s = String(text);
	if (s.trim() === "") return [];
	return lay(s, styleOf(roleOrStyle), weight, maxWidth).map((l) => l.text);
}

/** The widest single word, which is the hard lower bound on a text box. */
export function longestWord(text, roleOrStyle, weight = 400) {
	return String(text)
		.split(/\s+/)
		.filter(Boolean)
		.reduce((max, w) => Math.max(max, measure(w, roleOrStyle, weight)), 0);
}

/* --------------------------------------------------------------------------
 * Block measurement
 * ------------------------------------------------------------------------ */

/**
 * The size a run of text will actually occupy in a box of the given width.
 * Callers use this during the measure pass, so a stack knows its own height
 * before anything is placed.
 *
 * One layout pass answers both questions: the lines to render, and the width
 * each one came out at. The widths are the same numbers the line breaker used
 * to decide the breaks, so the reported box cannot disagree with its contents.
 */
export function block(text, maxWidth, role, { weight = 400, maxLines = Infinity } = {}) {
	const style = styleOf(role);
	const lh = lineHeight(role);
	const s = String(text);
	const lines = s.trim() === "" ? [] : lay(s, style, weight, maxWidth);

	return {
		role,
		lines: lines.map((l) => l.text),
		weight,
		overflowing: lines.length > maxLines,
		width: Math.min(maxWidth, widest(lines, style, weight)),
		height: lines.length * lh,
		lineHeight: lh,
	};
}

/* --------------------------------------------------------------------------
 * Fitting
 *
 * Step down the scale rather than inventing a size between two roles. The
 * caller names the floor, so a title can be allowed to fall to `head` but
 * never to `body`, and nothing can fall through the legibility floor.
 * ------------------------------------------------------------------------ */

const DESCENDING = ["datumHero", "display", "head", "datum", "list", "body", "utility"];

export function fit(
	text,
	box,
	startRole,
	{ floorRole = startRole, weight = 400, frameWidth = 1600 } = {},
) {
	const floorSize = minTypeSize(frameWidth);
	const start = DESCENDING.indexOf(startRole);
	const floor = DESCENDING.indexOf(floorRole);

	if (start < 0) throw new PressError("TYPE_OFF_SCALE", `fit() got unknown role '${startRole}'.`);
	if (floor < start) {
		throw new PressError(
			"FIT_FLOOR_ABOVE_START",
			`floorRole '${floorRole}' is larger than startRole '${startRole}'.`,
		);
	}

	const attempts = [];
	for (let i = start; i <= floor; i++) {
		const role = DESCENDING[i];
		if (type(role).size < floorSize) break; // never step through the phone floor

		const b = block(text, box.w, role, { weight });
		attempts.push({ role, height: b.height, needed: b.height - box.h });
		if (b.height <= box.h) return { ...b, steppedFrom: role === startRole ? null : startRole };
	}

	const best = attempts[attempts.length - 1];
	throw new PressError(
		"TEXT_OVERFLOW",
		`"${truncate(text)}" does not fit ${box.w}x${box.h} at any role from ` +
			`'${startRole}' down to '${floorRole}'. Smallest attempt overflows by ` +
			`${Math.ceil(best.needed)}px. Remove information before reducing typography.`,
		{ text, box: box.toJSON ? box.toJSON() : box, attempts },
	);
}

const truncate = (s, n = 48) => (String(s).length > n ? `${String(s).slice(0, n)}…` : String(s));

/* --------------------------------------------------------------------------
 * House style
 *
 * Em dashes are banned in prose and in visual copy alike, so the check belongs
 * next to the text rather than in a separate review pass that nobody runs.
 * ------------------------------------------------------------------------ */

export const EM_DASH = /[—–]/;

export function assertHouseStyle(text, where = "text") {
	if (EM_DASH.test(text)) {
		throw new PressError(
			"EM_DASH",
			`${where} contains an em or en dash: "${truncate(text)}". ` +
				`Use a full stop, a comma, or a colon instead.`,
			{ text },
		);
	}
	return text;
}

/* --------------------------------------------------------------------------
 * Baselines
 *
 * Two runs of type at different sizes in equal line boxes do not share a
 * baseline. Centring the boxes makes the larger face sit lower, which is
 * exactly the "the numbers look a few pixels off" defect: a 40px mono numeral
 * beside a 32px Geist label, both in 44px boxes, are misaligned by about 3px.
 *
 * CSS puts the baseline at half-leading plus the font ascent, so the same
 * arithmetic reproduces where the browser will actually put it. Rows can then
 * align on the baseline instead of on the box.
 * ------------------------------------------------------------------------ */

const metricsCache = new Map();

export function fontMetrics(roleOrStyle, weight = 400) {
	const style = styleOf(roleOrStyle);
	const key = `${style.family}|${style.size}|${weight}`;
	if (metricsCache.has(key)) return metricsCache.get(key);

	const c = context();
	c.font = fontString(style, weight);
	const m = c.measureText("Hxdp");
	const cap = c.measureText("H");

	const out = {
		// Font metrics, not ink extents: this is what CSS uses to build a line box.
		ascent: m.fontBoundingBoxAscent ?? style.size * 0.8,
		descent: m.fontBoundingBoxDescent ?? style.size * 0.2,
		// Ink extent of a capital, used to centre a marker optically on the text.
		cap: cap.actualBoundingBoxAscent ?? style.size * 0.7,
	};
	metricsCache.set(key, out);
	return out;
}

/** Distance from the top of a line box to its baseline. */
export function baselineOffset(role, weight = 400) {
	const { ascent, descent } = fontMetrics(role, weight);
	return (lineHeight(role) - (ascent + descent)) / 2 + ascent;
}

/** Cap height, for centring a dot on the text rather than on its box. */
export function capHeight(role, weight = 400) {
	return fontMetrics(role, weight).cap;
}

/**
 * Clear the caches when faces finish loading, since every width and every
 * metric measured against a fallback face is wrong once the real one arrives.
 * Pretext caches segment widths per font, so its cache has to go with ours.
 */
export function resetMetrics() {
	metricsCache.clear();
	preparedCache.clear();
	domCache.clear();
	clearPretextCaches();
}
