/**
 * PRESS / components / chips
 *
 * Small bordered mono pills: an error rate, a capability shortlist, a result
 * quality, one member of a named set. A chip is one short label, never a
 * sentence, so it is a single painted line inside a border that hugs it.
 *
 * A box() cannot draw one: box measures to the width it is given, so a row of
 * boxes is a row of full-width panels. A chip is therefore a custom node that
 * reports its own measured width, exactly as a code line reports its own
 * measured overflow, and it paints with the same mono face, tracking and
 * middle baseline codeLine uses so the two verbatim voices cannot drift apart.
 *
 * Two sanctioned layouts, one painter:
 *
 *   chipsRow   hug-width pills in one row under a transcript event, where the
 *              pills are badges and their widths carry no meaning.
 *   chipGrid   pills stretched to a shared column measure, for compareSets
 *              panels where the pills are a roster and the reader counts rows.
 *              Stretching is deliberate there: equal widths make 2 against 6
 *              read as one row against three, which is the plate's argument.
 *
 * Both draw through paintChip, so a pill in a grid and a pill in a row can
 * never drift apart the way two hand-rolled painters would.
 *
 * `accent: true` borders and inks the chip in the accent: the one capability
 * that was chosen, the one badge the claim is about. The rest stay quiet.
 */

import { custom, row } from "../src/solve.js";
import { measure } from "../src/text.js";
import {
	FAMILY,
	lineHeight,
	PressError,
	STROKE,
	space,
	type,
	typeSize,
} from "../src/tokens.js";

const CHIP_ROLE = "utility";
export const CHIP_MAX_CHARS = 32;
export const CHIP_MAX_COUNT = 6;

const chipPad = () => space(1);
const chipHeight = () => lineHeight(CHIP_ROLE) + 2 * chipPad();
const chipIntrinsicWidth = (label) => Math.ceil(measure(label, CHIP_ROLE)) + 2 * chipPad();

/** The one pill painter. Every chip everywhere goes through here. */
function paintChip(ctx, rect, C, { text: label, accent = false }) {
	const pad = chipPad();
	const tracking = type(CHIP_ROLE).tracking * typeSize(CHIP_ROLE);

	ctx.fillStyle = C.panel;
	ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
	ctx.strokeStyle = accent ? C.red : C.black2;
	ctx.lineWidth = STROKE.divider;
	ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);

	ctx.fillStyle = accent ? C.red : C.muted;
	ctx.font = `400 ${typeSize(CHIP_ROLE)}px ${FAMILY.mono}`;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	if ("letterSpacing" in ctx) ctx.letterSpacing = `${tracking}px`;
	ctx.fillText(label, rect.x + pad, rect.y + rect.h / 2);
	if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}

export function chip({ text: label, accent = false }) {
	const w = chipIntrinsicWidth(label);
	const h = chipHeight();
	return custom({
		measure: () => ({ w, h }),
		paint: (ctx, rect, C) => paintChip(ctx, rect, C, { text: label, accent }),
	});
}

/**
 * Validate an event's chips and build the row, or return null when there are
 * none. Refusals are by name, because a chip silently dropped or silently
 * truncated is the accepted-and-not-drawn defect this file keeps refusing.
 */
export function chipsRow(chips, where) {
	if (chips === undefined || chips === null) return null;
	if (!Array.isArray(chips)) {
		throw new PressError(
			"CHIPS_NOT_A_LIST",
			`${where}: chips must be an array of { text, accent? }.`,
		);
	}
	if (chips.length === 0) return null;
	if (chips.length > CHIP_MAX_COUNT) {
		throw new PressError(
			"CHIPS_TOO_MANY",
			`${where} carries ${chips.length} chips and ${CHIP_MAX_COUNT} is the cap. ` +
				`A shortlist longer than that is a table, not a row of pills.`,
		);
	}
	const cleaned = chips.map((c, i) => {
		const item = typeof c === "string" ? { text: c } : c;
		const label = String(item?.text ?? "").trim();
		if (!label) {
			throw new PressError(
				"CHIP_TEXT_MISSING",
				`${where}: chip ${i + 1} has no text. A bordered pill with nothing in it prints ` +
					`as furniture; omit the chip instead.`,
			);
		}
		if (label.length > CHIP_MAX_CHARS) {
			throw new PressError(
				"CHIP_TOO_LONG",
				`${where}: chip "${label.slice(0, 40)}" is ${label.length} characters and ` +
					`${CHIP_MAX_CHARS} is the cap. A chip is one short mono label; a sentence ` +
					`belongs in the event's detail.`,
			);
		}
		return { text: label, accent: Boolean(item.accent) };
	});
	return row({ gap: 2, align: "start", children: cleaned.map(chip) });
}

/**
 * A roster of pills stretched to a shared column measure: two columns filled
 * row-major when the measure allows, one when it does not, so the pills form
 * clean vertical edges and the reader counts rows instead of parsing a ragged
 * run. The whole roster is one custom node because the column count is a
 * measure-time decision — geometry decides, not a character count.
 *
 * Chips are expected pre-validated ({ text, accent? }, text non-empty and
 * inside the chip cap); the one refusal owned here is width, because only the
 * measure pass knows the column.
 */
export function chipGrid(chips, { who } = {}) {
	const colGap = space(2);
	const rowGap = space(1);
	const h1 = chipHeight();
	const widths = chips.map((c) => chipIntrinsicWidth(c.text));

	const layoutFor = (availW) => {
		const widest = Math.max(...widths, 0);
		const twoCol = (availW - colGap) / 2;
		if (widest <= twoCol && chips.length > 1) return { cols: 2, colW: twoCol };
		if (widest <= availW) return { cols: 1, colW: availW };
		const long = chips[widths.indexOf(widest)];
		throw new PressError(
			"TAG_TOO_WIDE",
			`${who ?? "chipGrid"}: tag "${long.text}" measures ${widest}px and the panel ` +
				`offers ${Math.floor(availW)}px. Shorten the tag; a sentence belongs in the intro.`,
		);
	};

	return custom({
		measure: (availW) => {
			const { cols } = layoutFor(availW);
			const rows = Math.ceil(chips.length / cols);
			return { w: availW, h: rows * h1 + (rows - 1) * rowGap };
		},
		paint: (ctx, rect, C) => {
			const { cols, colW } = layoutFor(rect.w);
			chips.forEach((c, i) => {
				const col = i % cols;
				const rowIndex = Math.floor(i / cols);
				paintChip(
					ctx,
					{
						x: rect.x + col * (colW + colGap),
						y: rect.y + rowIndex * (h1 + rowGap),
						w: colW,
						h: h1,
					},
					C,
					c,
				);
			});
		},
	});
}
