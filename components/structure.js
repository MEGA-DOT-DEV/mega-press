/**
 * PRESS / components / structure
 *
 * The shapes a lesson needs that are not sequences, systems or quantities:
 * a two-up comparison, a layered stack, a do and avoid list, and a pull quote.
 *
 * All four follow the same contracts as the rest of the library. They report a
 * size and accept a rect, they mark their information units, and anything that
 * owns a connector emits it rather than leaving it to the author.
 */

import { link } from "../src/connect.js";
import { box, custom, row, stack, text } from "../src/solve.js";
import { COLOR, GROUND, STROKE } from "../src/tokens.js";
import { drawIcon } from "./icon.js";

/* --------------------------------------------------------------------------
 * compare
 *
 * Before and after. The arrow between the two columns is derived from the
 * placed boxes, so it always spans the real gutter.
 * ------------------------------------------------------------------------ */

export function compare({ before, after, arrow = true, gap = 5 } = {}) {
	if (!before || !after) throw new Error("compare needs both a before and an after.");

	const column = (side, accent) =>
		box({
			pad: 4,
			border: true,
			borderColor: accent ? COLOR.red : COLOR.black2,
			fill: accent ? GROUND.accent : COLOR.panel,
			gap: 2,
			grow: true,
			unit: true,
			children: [
				text(side.label, "utility", { color: accent ? COLOR.red : COLOR.quiet }),
				text(side.title, "head", { color: COLOR.text }),
				...(side.items || []).map((i) => text(i, "body", { color: COLOR.muted })),
			],
		});

	const left = column(before, false);
	const right = column(after, true);
	const node = row({ gap, align: "stretch", children: [left, right] });

	if (arrow) {
		node.press = {
			connect: () => ({
				links: [
					link(left, right, {
						fromAnchor: "right",
						toAnchor: "left",
						color: COLOR.red,
						weight: STROKE.connector,
					}),
				],
			}),
		};
	}

	node.columns = { before: left, after: right };
	return node;
}

/* --------------------------------------------------------------------------
 * layers
 *
 * A stack read top to bottom. Every layer spans the full measure, so the edges
 * form one continuous vertical rather than a ragged column.
 * ------------------------------------------------------------------------ */

export function layers({ items, gap = 1, numbered = true } = {}) {
	if (!items || items.length < 2) {
		throw new Error("layers needs at least two layers. One box is not a stack.");
	}

	return stack({
		gap,
		children: items.map((item, i) =>
			box({
				pad: 4,
				border: true,
				borderColor: item.accent ? COLOR.red : COLOR.black2,
				fill: item.accent ? GROUND.accent : COLOR.panel,
				gap: 2,
				unit: true,
				children: [
					row({
						gap: 3,
						align: "baseline",
						children: [
							numbered
								? text(String(items.length - i).padStart(2, "0"), "utility", {
										color: item.accent ? COLOR.red : COLOR.quiet,
									})
								: null,
							text(item.title, "head", { color: COLOR.text, grow: true }),
							item.tag ? text(item.tag, "utility", { color: COLOR.quiet, align: "right" }) : null,
						],
					}),
					item.detail ? text(item.detail, "body", { color: COLOR.muted, commentary: true }) : null,
				],
			}),
		),
	});
}

/* --------------------------------------------------------------------------
 * checklist
 *
 * Do and avoid. The mark is drawn geometry rather than a glyph, so it survives
 * rasterisation and reduction: a font tick at this size becomes a smudge, and
 * an emoji is not in the type system at all.
 * ------------------------------------------------------------------------ */

export function checklist({ items, gap = 3, tile = 36 } = {}) {
	if (!items?.length) throw new Error("checklist needs at least one item.");

	return stack({
		gap,
		children: items.map((item) =>
			row({
				gap: 3,
				align: "baseline",
				unit: true,
				children: [
					custom({
						baselineFrom: "list",
						measure: () => ({ w: tile, h: tile }),
						paint: (ctx, rect) => {
							// The mark is the vendored pixel set's own check and times, so the
							// do and avoid glyphs match every other icon in the language. Both
							// are ~3 grid units thick, which at this tile is over 3px: bold
							// geometry, no interior detail, legible after a 0.231 reduction.
							const glyph = rect.w * 0.72;
							const gx = rect.x + (rect.w - glyph) / 2;
							const gy = rect.y + (rect.h - glyph) / 2;
							if (item.ok) {
								ctx.fillStyle = COLOR.red;
								ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
								drawIcon(ctx, "check", gx, gy, glyph, COLOR.knockout);
							} else {
								ctx.strokeStyle = COLOR.black2;
								ctx.lineWidth = 2;
								ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
								drawIcon(ctx, "times", gx, gy, glyph, COLOR.muted);
							}
						},
					}),
					text(item.text, "list", {
						color: item.ok ? COLOR.text : COLOR.muted,
						grow: true,
					}),
				],
			}),
		),
	});
}

/* --------------------------------------------------------------------------
 * quote
 *
 * A pull quote sits at head, not at display: display is the frame title, and
 * exactly one of those exists per plate.
 * ------------------------------------------------------------------------ */

export function quote({ text: body, attribution, gap = 3 } = {}) {
	if (!body) throw new Error("quote needs text.");
	if (!attribution) {
		throw new Error(
			"quote needs an attribution. An unattributed quotation is a claim in disguise.",
		);
	}

	return stack({
		gap,
		children: [
			custom({
				measure: (w) => ({ w, h: STROKE.emphasis }),
				paint: (ctx, rect) => {
					ctx.fillStyle = COLOR.red;
					ctx.fillRect(rect.x, rect.y, Math.min(rect.w, 160), rect.h);
				},
			}),
			text(body, "head", { color: COLOR.text, unit: true }),
			text(attribution, "utility", { color: COLOR.quiet }),
		],
	});
}
