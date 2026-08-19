/**
 * PRESS / components / code
 *
 * A verbatim mono block: a snippet, a call, a JSON shape, a config.
 *
 * The rest of the library paraphrases: a rail names steps, a table names rows.
 * Code cannot be paraphrased without stopping to be code, so this component
 * draws each line exactly as given and refuses the two ways a code figure
 * silently lies:
 *
 *   1. A wrapped or reflowed line. Prose wraps; code that wraps has been
 *      rewritten by the renderer. Each line is a single-line custom node, and
 *      a line too wide for the frame refuses by name instead of folding.
 *   2. Lost indentation. The text pipeline strips leading spaces because CSS
 *      line semantics say a line never starts with one; in code the leading
 *      spaces are structure. Lines are painted whole, spaces included, with
 *      the same measure the solver sized them by.
 *
 * The whole block is one information unit. Ten lines of one snippet are one
 * thing the reader takes in, not ten, which is also why the cap is on lines
 * (the block's height) and not on the reader's budget.
 *
 * Blank lines separate groups inside a snippet, so they are kept as vertical
 * space rather than dropped, but they are not drawn as text: press refuses an
 * empty string, and a blank line has no glyphs to refuse.
 */

import { box, custom, stack, text } from "../src/solve.js";
import { measure } from "../src/text.js";
import { COLOR, FAMILY, lineHeight, PressError, space, type, typeSize } from "../src/tokens.js";

const MAX_LINES = 14;
const ROLE = "utility";

/** A blank source line: vertical rhythm with nothing to paint. */
const blank = (h) => custom({ measure: () => ({ w: 0, h }) });

const truncate = (s, n = 40) => (s.length > n ? `${s.slice(0, n)}…` : s);

/**
 * One verbatim line. Painted, not typeset: the wrap pipeline would strip the
 * indentation and re-break the run, and both are rewrites of the code.
 */
const codeLine = (line, accent, index) => {
	const tracking = type(ROLE).tracking * typeSize(ROLE);
	const h = lineHeight(ROLE);
	return custom({
		measure: (w) => {
			const needed = measure(line, ROLE);
			if (needed > w) {
				throw new PressError(
					"CODE_LINE_TOO_WIDE",
					`code line ${index + 1} ("${truncate(line.trim())}") is ${Math.ceil(needed)}px and the ` +
						`column is ${Math.floor(w)}px. Code does not wrap: break the line in the source, ` +
						`shorten it, or cut it.`,
				);
			}
			return { w, h };
		},
		paint: (ctx, rect, C) => {
			ctx.fillStyle = accent ? C.red : C.text;
			ctx.font = `400 ${typeSize(ROLE)}px ${FAMILY.mono}`;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			if ("letterSpacing" in ctx) ctx.letterSpacing = `${tracking}px`;
			ctx.fillText(line, rect.x, rect.cy);
			if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
		},
	});
};

/**
 * @param {object} spec
 * @param {string} spec.code     the snippet, lines separated by \n, drawn verbatim
 * @param {string} [spec.label]  small mono caption above the block (a filename,
 *                               a tool name, "01 value_set"), quiet by default
 * @param {number[]} [spec.accentLines] 1-based line numbers drawn in the accent
 * @param {number} [spec.gap]    scale step between label and block
 */
export function code({ code: source, label, accentLines = [], gap = 2 } = {}) {
	if (typeof source !== "string" || !source.trim()) {
		throw new PressError(
			"CODE_MISSING",
			"code needs a `code` string. A block with nothing verbatim in it is a panel, not a figure.",
		);
	}

	const lines = source.replace(/\t/g, "  ").split("\n");
	while (lines.length && !lines[0].trim()) lines.shift();
	while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

	const drawn = lines.filter((l) => l.trim().length > 0);
	if (drawn.length < 2) {
		throw new PressError(
			"CODE_TOO_SHORT",
			"code needs at least two lines. One line is an expression, and an expression " +
				"belongs in derivation, where it must say what changed.",
		);
	}
	if (lines.length > MAX_LINES) {
		throw new PressError(
			"CODE_TOO_LONG",
			`code was given ${lines.length} lines and ${MAX_LINES} is the cap. Past that the ` +
				`frame is a listing, not a figure: cut the snippet to the lines the claim needs.`,
		);
	}

	const accented = new Set(accentLines.map(Number));

	const body = lines.map((line, i) =>
		line.trim().length === 0 ? blank(space(3)) : codeLine(line, accented.has(i + 1), i),
	);

	const block = box({
		pad: 4,
		border: true,
		borderColor: COLOR.black2,
		fill: COLOR.panel,
		gap: 1,
		unit: true,
		children: body,
	});

	if (!label) return block;

	return stack({
		gap,
		children: [text(label, ROLE, { color: COLOR.quiet }), block],
	});
}
