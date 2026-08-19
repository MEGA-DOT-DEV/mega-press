/**
 * PRESS / solve
 *
 * The forme. A plate is declared as a tree of intent and solved into a flat
 * list of rectangles. Nobody writes a coordinate.
 *
 * Two passes, which is the oldest layout algorithm there is and still the
 * right one:
 *
 *   measure   bottom up, each node reports the height it needs at a given
 *             width, with text already wrapped and counted
 *   place     top down, each node is handed a rect and distributes it
 *
 * Because measurement happens before placement, a stack knows it does not fit
 * while it still has room to do something about it. A CSS flex column, by
 * contrast, compresses its children rather than reporting an error, so
 * elements overlap while nothing looks broken in the DOM. That failure mode is
 * not reachable from here.
 */

import { Rect } from "./geometry.js";
import { assertHouseStyle, baselineOffset, block, capHeight, fit } from "./text.js";
import { lineHeight, PressError, STROKE, snap, space } from "./tokens.js";

/* --------------------------------------------------------------------------
 * Node constructors
 *
 * Every gap is a scale step, not a pixel value. There is no way to pass 26.
 * ------------------------------------------------------------------------ */

let nextId = 0;
const node = (props) => ({ id: `n${nextId++}`, ...props });

export const stack = ({
	dir = "y",
	gap = 3,
	align = "stretch",
	children = [],
	grow = false,
	...rest
}) => node({ kind: "stack", dir, gap, align, children: children.filter(Boolean), grow, ...rest });

export const row = (props) => stack({ ...props, dir: "x" });

export const grid = ({ cols, gap = 3, rowGap = gap, children = [], ...rest }) =>
	node({ kind: "grid", cols, gap, rowGap, children: children.filter(Boolean), ...rest });

export const text = (
	content,
	role,
	{ weight = 400, color, maxLines, floorRole, align = "left", ...rest } = {},
) =>
	node({
		kind: "text",
		text: assertHouseStyle(assertContent(content, role), `text(${role})`),
		role,
		weight,
		color,
		maxLines,
		floorRole,
		align,
		...rest,
	});

/**
 * A missing string is refused rather than printed.
 *
 * `String(undefined)` is `"undefined"`, which is a perfectly legal five letter
 * word as far as every other invariant in this system is concerned: it wraps,
 * it measures, it sits inside the safe area, and the plate locks and prints
 * with the word `undefined` set in body copy. A JSON spec naming a parameter
 * the component does not take produced exactly that, so the one thing the
 * quoin exists to stop got through it.
 *
 * A component that genuinely has nothing to say passes no text node at all,
 * which every component here already does with a ternary, so refusing this is
 * not in anybody's way.
 */
function assertContent(content, role) {
	if (content === undefined || content === null || content === "") {
		throw new PressError(
			"TEXT_MISSING",
			`text(${role}) was given ${content === "" ? "an empty string" : String(content)}. ` +
				`A missing string prints as the literal word and locks, because every other ` +
				`invariant is about geometry and "undefined" has a perfectly good shape. ` +
				`Check the parameter name against \`press components\`, or omit the node.`,
		);
	}
	return String(content);
}

export const box = ({ pad = 4, border = false, fill, children = [], gap = 1, ...rest }) =>
	node({ kind: "box", pad, border, fill, gap, children: children.filter(Boolean), ...rest });

export const rule = ({ weight = STROKE.rule, color, span = "full" } = {}) =>
	node({ kind: "rule", weight, color, span });

export const spacer = (size) => node({ kind: "spacer", size });

/** A dot on a rail. Its size is fixed here so the rail can be derived from it. */
export const marker = ({ size = 20, fill, ring = false, alignTo } = {}) =>
	node({ kind: "marker", size, fill, ring, alignTo });

/**
 * A picture. Rendered as a DOM element on solved coordinates, like text, so it
 * keeps its own decoding and stays crisp. The height comes from the ratio and
 * the width the layout gives it, so the aspect can never drift.
 */
export const image = ({ src, ratio = 16 / 9, alt, fit = "cover", ...rest }) =>
	node({ kind: "image", src, ratio, alt, fit, ...rest });

/** Escape hatch with the same contract: report a size, accept a rect. */
export const custom = ({ measure, paint, ...rest }) =>
	node({ kind: "custom", measure, paint, ...rest });

/* --------------------------------------------------------------------------
 * Measure
 *
 * Returns { w, h } for a node given the width available to it.
 * ------------------------------------------------------------------------ */

export function measureNode(n, availW) {
	switch (n.kind) {
		case "text": {
			// A fixed width makes a column, so every row in a set starts and ends on
			// the same two verticals rather than on whatever its own label measured.
			if (n.width) availW = n.width;
			if (n.floorRole) {
				// Fitting needs a height budget, so a floored text measures at its
				// start role here and is re-fitted during placement.
				const b = block(n.text, availW, n.role, { weight: n.weight });
				n._block = b;
				return { w: b.width, h: b.height };
			}
			const b = block(n.text, availW, n.role, { weight: n.weight, maxLines: n.maxLines });
			if (b.overflowing) {
				throw new PressError(
					"TEXT_LINE_BUDGET",
					`"${n.text.slice(0, 40)}" wraps to ${b.lines.length} lines but maxLines is ${n.maxLines}. ` +
						`Shorten the string or widen its column.`,
				);
			}
			n._block = b;
			return { w: n.width || b.width, h: b.height };
		}

		case "spacer":
			return { w: 0, h: space(n.size) };

		case "rule":
			return { w: availW, h: n.weight };

		case "marker":
			// A marker beside a line of text occupies a full line box but stays its
			// own size. The rail is derived from the dot, not from the track.
			return { w: n.size, h: n.alignTo ? lineHeight(n.alignTo) : n.size };

		case "image":
			return { w: availW, h: Math.round(availW / n.ratio) };

		case "custom": {
			const size = n.measure(availW);
			n._size = size;
			return size;
		}

		case "box": {
			const pad = space(n.pad);
			const border = n.border ? STROKE.divider : 0;
			const innerW = availW - 2 * pad - 2 * border;
			if (innerW <= 0) {
				throw new PressError(
					"BOX_TOO_NARROW",
					`A box with pad ${pad}px has no room left at width ${availW}px.`,
				);
			}
			const inner = measureStack({ ...n, dir: "y", align: "stretch" }, innerW);
			n._inner = inner;
			return { w: availW, h: inner.h + 2 * pad + 2 * border };
		}

		case "stack":
			return measureStack(n, availW);

		case "grid": {
			const gap = space(n.gap);
			const rowGap = space(n.rowGap);
			const colW = (availW - gap * (n.cols - 1)) / n.cols;
			if (colW <= 0) {
				throw new PressError(
					"GRID_TOO_NARROW",
					`${n.cols} columns with ${gap}px gaps do not fit in ${availW}px.`,
				);
			}
			const sizes = n.children.map((c) => measureNode(c, colW));
			n._colW = colW;
			const rows = Math.ceil(n.children.length / n.cols);
			let h = 0;
			for (let r = 0; r < rows; r++) {
				const slice = sizes.slice(r * n.cols, (r + 1) * n.cols);
				h += Math.max(...slice.map((s) => s.h), 0);
				if (r < rows - 1) h += rowGap;
			}
			n._rowHeights = Array.from({ length: rows }, (_, r) =>
				Math.max(...sizes.slice(r * n.cols, (r + 1) * n.cols).map((s) => s.h), 0),
			);
			return { w: availW, h };
		}

		default:
			throw new PressError("UNKNOWN_NODE", `measureNode does not handle kind '${n.kind}'.`);
	}
}

function measureStack(n, availW) {
	const gap = space(n.gap);
	const kids = n.children;
	if (!kids.length) return { w: 0, h: 0 };

	if (n.dir === "y") {
		let h = 0,
			w = 0;
		for (const c of kids) {
			const s = measureNode(c, availW);
			h += s.h;
			w = Math.max(w, s.w);
		}
		h += gap * (kids.length - 1);
		return { w: n.align === "stretch" ? availW : w, h };
	}

	// Horizontal. Fixed children measure at their intrinsic width; growing
	// children share what is left, so a row never overflows silently.
	//
	// A child carrying `width` is a track, not a hug: it measures at exactly that
	// width whatever it contains. This is how a two column composition gets an
	// unequal split without anybody writing an x. The number still never comes
	// from the author, it comes from a ratio on the scale times the width the
	// chase already had.
	const fixed = [];
	let used = 0;
	for (const c of kids) {
		if (c.grow) {
			fixed.push(null);
			continue;
		}
		const s = measureNode(c, c.width ?? availW);
		fixed.push(s);
		used += s.w;
	}
	const growCount = kids.filter((c) => c.grow).length;
	const remaining = availW - used - gap * (kids.length - 1);
	if (growCount && remaining <= 0) {
		throw new PressError(
			"ROW_OVERFLOW",
			`A row of ${kids.length} items needs ${used + gap * (kids.length - 1)}px ` +
				`but only ${availW}px is available. Remove an item or widen the column.`,
		);
	}
	const growW = growCount ? remaining / growCount : 0;

	let h = 0;
	const sizes = kids.map((c, i) => {
		const s = c.grow ? measureNode(c, growW) : fixed[i];
		c._trackW = c.grow ? growW : s.w;
		return s;
	});

	if (n.align === "baseline") {
		// The row is as tall as the lowest descender once every child has been
		// pushed down onto the shared baseline.
		const bases = kids.map(firstBaseline);
		const common = Math.max(...bases.filter((b) => b !== null), 0);
		kids.forEach((c, i) => {
			const shift = bases[i] === null ? 0 : common - bases[i];
			c._baselineShift = shift;
			h = Math.max(h, shift + sizes[i].h);
		});
	} else {
		sizes.forEach((s) => {
			h = Math.max(h, s.h);
		});
	}

	return { w: availW, h };
}

/* --------------------------------------------------------------------------
 * Baseline resolution
 *
 * `align: 'baseline'` on a row lines the children up on the baseline of their
 * first line rather than on the top or the centre of their boxes. This is what
 * makes a 40px mono numeral sit correctly beside a 32px Geist label: the two
 * line boxes are the same height, but their baselines are not in the same
 * place inside them.
 * ------------------------------------------------------------------------ */

export function firstBaseline(n) {
	switch (n.kind) {
		case "text":
			return baselineOffset(n.role, n.weight);
		case "marker":
			return n.alignTo ? baselineOffset(n.alignTo) : null;
		case "custom":
			// Put the mark's vertical centre on the optical centre of the text it
			// sits beside: half a cap height above the shared baseline.
			return n.baselineFrom ? capHeight(n.baselineFrom) / 2 + (n._size ? n._size.h / 2 : 0) : null;
		case "stack":
			return n.dir === "y" ? firstBaseline(n.children[0] ?? {}) : maxBaseline(n.children);
		case "box": {
			const pad = space(n.pad) + (n.border ? STROKE.divider : 0);
			const inner = firstBaseline(n.children[0] ?? {});
			return inner === null ? null : inner + pad;
		}
		default:
			return null;
	}
}

function maxBaseline(kids = []) {
	const values = kids.map(firstBaseline).filter((v) => v !== null && v !== undefined);
	return values.length ? Math.max(...values) : null;
}

/* --------------------------------------------------------------------------
 * Place
 * ------------------------------------------------------------------------ */

/**
 * `ctx` carries what the whole placement pass needs to know about the page it
 * is being placed on. Today that is the frame width, because the legibility
 * floor is derived from it: a title allowed to step down the scale must never
 * step through the floor for the frame it is actually printing on.
 */
export function placeNode(n, rect, ctx = {}) {
	n.rect = rect;

	switch (n.kind) {
		case "text": {
			if (n.floorRole) {
				const fitted = fit(n.text, rect, n.role, {
					floorRole: n.floorRole,
					weight: n.weight,
					frameWidth: ctx.frameWidth,
				});
				n._block = fitted;
				n.role = fitted.role;
				if (fitted.steppedFrom) n.steppedFrom = fitted.steppedFrom;
			}
			return;
		}

		case "marker": {
			// A marker is never stretched by its container. A stack in 'stretch'
			// hands every child the full column width, and a dot that accepts it
			// becomes a circle the width of the column. Its rect is always exactly
			// its own size, which is also what makes a derived rail correct.
			if (n.alignTo) {
				// Optical centre of the text it sits beside: half a cap height above
				// the baseline. Centring in the line box instead leaves the dot
				// sitting low next to a line of capitals.
				const centre = baselineOffset(n.alignTo) - capHeight(n.alignTo) / 2;
				n.rect = Rect.of(rect.x, rect.y + snap(centre - n.size / 2), n.size, n.size);
			} else {
				n.rect = Rect.of(rect.x, rect.y, n.size, n.size);
			}
			return;
		}

		case "spacer":
		case "rule":
		case "custom":
		case "image":
			return;

		case "box": {
			const pad = space(n.pad);
			const border = n.border ? STROKE.divider : 0;
			const inner = rect.insetBy({
				top: pad + border,
				right: pad + border,
				bottom: pad + border,
				left: pad + border,
			});
			placeStack(
				{ ...n, dir: "y", align: "stretch", children: n.children, gap: n.gap },
				inner,
				ctx,
			);
			return;
		}

		case "stack":
			return placeStack(n, rect, ctx);

		case "grid": {
			const gap = space(n.gap);
			const rowGap = space(n.rowGap);
			const colW = n._colW;
			let y = rect.y;
			n._rowHeights.forEach((rowH, r) => {
				for (let c = 0; c < n.cols; c++) {
					const child = n.children[r * n.cols + c];
					if (!child) continue;
					placeNode(child, Rect.of(rect.x + c * (colW + gap), y, colW, rowH), ctx);
				}
				y += rowH + rowGap;
			});
			return;
		}

		default:
			throw new PressError("UNKNOWN_NODE", `placeNode does not handle kind '${n.kind}'.`);
	}
}

function placeStack(n, rect, ctx = {}) {
	const gap = space(n.gap);
	const kids = n.children;

	if (n.dir === "y") {
		let y = rect.y;
		for (const c of kids) {
			const s = measureNode(c, rect.w);
			const w = n.align === "stretch" ? rect.w : s.w;
			const x =
				n.align === "end"
					? rect.right - w
					: n.align === "center"
						? rect.x + (rect.w - w) / 2
						: rect.x;
			placeNode(c, Rect.of(x, y, w, s.h), ctx);
			y += s.h + gap;
		}
		return;
	}

	let x = rect.x;
	for (const c of kids) {
		const w = c._trackW ?? measureNode(c, rect.w).w;
		const s = measureNode(c, w);
		const h = n.align === "stretch" ? rect.h : s.h;
		const y =
			n.align === "baseline"
				? rect.y + (c._baselineShift || 0)
				: n.align === "end"
					? rect.bottom - s.h
					: n.align === "center"
						? rect.y + (rect.h - s.h) / 2
						: rect.y;
		placeNode(c, Rect.of(x, y, w, h), ctx);
		x += w + gap;
	}
}

/* --------------------------------------------------------------------------
 * Flatten
 *
 * The renderer and the validator both read this, so they cannot disagree
 * about where anything is.
 * ------------------------------------------------------------------------ */

export function flatten(root, out = []) {
	out.push(root);
	if (root.children) {
		root.children.forEach((c) => {
			flatten(c, out);
		});
	}
	return out;
}

export function solve(root, rect, ctx = {}) {
	measureNode(root, rect.w);
	placeNode(root, rect, ctx);
	return { root, nodes: flatten(root) };
}
