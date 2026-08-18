/**
 * PRESS / components / data
 *
 * Ruled rows and card grids: the two shapes that carry quantities.
 *
 * Two rules from the styleguide are structural here rather than advisory.
 * First, every prominent number explains what it counts, so a metric without a
 * unit caption will not build. Second, rules within a frame either share a
 * measure or there is only one of them, so `metrics` draws one rule per row
 * across the same container width and never lets a cell draw its own edge
 * inside a gapped grid.
 */

import { ruleAcross } from "../src/connect.js";
import { box, grid, row, stack, text } from "../src/solve.js";
import { COLOR, GROUND, STROKE, space } from "../src/tokens.js";

/**
 * Label and value rows separated by hairlines of a single shared measure.
 *
 * `emphasis` brings one row forward and holds the rest back. It is the same
 * shape as `activeTo` on a rail and it obeys the same discipline: it changes
 * colour and nothing else, so every row keeps the rect it had. A set of states
 * that differ only in this parameter is provably free of every geometric
 * invariant, which is what `src/interact.js` calls the ink tier.
 *
 * `hit` on an item names the region for a pointer to find. It is inert on a
 * static plate; an interactive one draws a focusable control per named region,
 * so the emphasis is never reachable by hover alone.
 *
 * @param {object[]} items     { label, value, unit, hit? }
 * @param {string}   emphasis  the hit id of the row to bring forward
 */
export function metrics({
	items,
	valueRole = "datum",
	gap = 3,
	divider = true,
	emphasis = null,
} = {}) {
	if (!items?.length) throw new Error("metrics needs at least one row.");

	if (emphasis && !items.some((i) => i.hit === emphasis)) {
		throw new Error(
			`metrics was asked to emphasise "${emphasis}" and no row carries that hit id. ` +
				`A state nothing responds to is a control that does nothing.`,
		);
	}

	for (const item of items) {
		if (item.unit === undefined || item.unit === null || item.unit === "") {
			throw new Error(
				`metric "${item.label}" has a value with no unit. A large isolated number is ` +
					`decoration, not evidence. Say what it counts.`,
			);
		}
	}

	const rows = items.map((item) => {
		/* Held back, forward, or neither. Three colours off the existing palette,
       so an emphasised set cannot introduce a value the page does not have. */
		const held = emphasis !== null && item.hit !== emphasis;
		const label = held ? COLOR.quiet : COLOR.muted;
		const value = held ? COLOR.muted : COLOR.text;
		/* The unit does not step down with the rest. It is already set in the
       quietest ink the palette has, and the step below that was COLOR.black2,
       a border grey at 1.57:1 against the page: a caption held back so far it
       was held out of the plate. The de-emphasis is carried by the two runs
       above, which is enough to read as one row receding. */
		const unit = COLOR.quiet;

		/* Identity, when the row has one.
       A row keyed by what it *is* rather than by where it sits keeps that
       identity when a state inserts another row above it, which is the
       difference between a row that travels to its new position and a row that
       is replaced in place by whatever landed on its index. `item.hit` implies
       an identity, since a region a pointer can name is a region worth
       recognising, but a row can carry a key without being a target. */
		const id = item.key ?? item.hit;

		return row({
			gap: 3,
			// Baseline, not centre: the mono value and the Geist label are different
			// sizes, so centring their boxes leaves the numeral sitting low.
			align: "baseline",
			unit: true,
			ruledRow: true,
			hit: item.hit,
			children: [
				// Label in Geist, because it is a content category.
				text(item.label, "list", { color: label, grow: true, key: id && `${id}-label` }),
				// Value in mono, because it is a quantity. Family and colour separate
				// the two, not size: a white mono numeral beside a muted Geist label
				// already reads as data at the same point size.
				text(String(item.value), valueRole, { color: value, key: id && `${id}-value` }),
				text(item.unit, "utility", { color: unit, key: id && `${id}-unit` }),
			],
		});
	});

	const node = stack({ gap, children: rows });

	if (divider) {
		node.press = {
			connect: () => ({
				// One rule per row, every one spanning the container. Same measure by
				// construction, so RULE_MEASURE_MISMATCH cannot fire.
				rules: rows.slice(0, -1).map((r) =>
					ruleAcross(r, {
						at: "bottom",
						// half the row gap, so the rule sits between rows, not on them
						offset: space(gap) / 2,
						weight: STROKE.divider,
						color: COLOR.black1,
					}),
				),
			}),
		};
	}

	node.rows = rows;
	return node;
}

/**
 * A grid of labelled blocks. The cells carry a full border and a wash, never a
 * single coloured edge: a 2px left rule becomes a 0.5px smear at phone scale
 * and reads as an artefact.
 *
 * @param {object[]} items  { index?, title, body?, accent? }
 */
export function cards({ items, cols = 3, gap = 3, pad = 4 } = {}) {
	if (!items?.length) throw new Error("cards needs at least one item.");

	const cells = items.map((item, i) =>
		box({
			pad,
			border: true,
			borderColor: item.accent ? COLOR.red : COLOR.black2,
			// The wash is a ground like any other: a hex typed here is how variants breed.
			fill: item.accent ? GROUND.accent : COLOR.panel,
			gap: 2,
			unit: true,
			children: [
				item.index !== false
					? text(String(item.index ?? i + 1).padStart(2, "0"), "utility", {
							color: item.accent ? COLOR.red : COLOR.quiet,
						})
					: null,
				text(item.title, "head", { color: COLOR.text }),
				item.body ? text(item.body, "body", { color: COLOR.muted, commentary: true }) : null,
			],
		}),
	);

	// Cells carry their own full border, so no rule is drawn across the grid.
	// Drawing one would break at every column gap and produce a dashed line
	// nobody asked for.
	return grid({ cols, gap, children: cells });
}

/**
 * A single commentary bar. One shared component across the whole set: full
 * border, near-black wash, body text, no leading bullet, no secondary
 * right-hand text. Six frames each inventing their own note bar is how a set
 * stops looking like a system.
 */
export function note(textContent) {
	return box({
		pad: 3,
		border: true,
		borderColor: COLOR.black1,
		fill: COLOR.raised,
		gap: 1,
		children: [text(textContent, "body", { color: COLOR.muted, commentary: true })],
	});
}

/** A focal number. Exactly one per plate, enforced by the title invariant. */
export function hero({ value, caption }) {
	if (!caption) {
		throw new Error("hero() needs a caption. Every prominent number explains what it counts.");
	}
	return box({
		// Containment: the label sits space(1) under the numeral, so the block
		// needs roughly 3x that in padding, which is space(4).
		pad: 4,
		border: true,
		borderColor: COLOR.black2,
		fill: COLOR.panel,
		gap: 1,
		children: [
			text(String(value), "datumHero", { color: COLOR.text }),
			text(caption, "utility", { color: COLOR.quiet }),
		],
	});
}
