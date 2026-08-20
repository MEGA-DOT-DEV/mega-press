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

import { box, custom, row, stack, text } from "../src/solve.js";
import { detectLang, syntaxColor, tokenizeLine } from "../src/syntax.js";
import { measure } from "../src/text.js";
import { COLOR, FAMILY, lineHeight, PressError, space, type, typeSize } from "../src/tokens.js";

const MAX_LINES = 14;
const ROLE = "utility";

const MIN_STEPS = 2;
const MAX_STEPS = 3;

/** A blank source line: vertical rhythm with nothing to paint. */
const blank = (h) => custom({ measure: () => ({ w: 0, h }) });

const truncate = (s, n = 40) => (s.length > n ? `${s.slice(0, n)}…` : s);

/**
 * One verbatim line. Painted, not typeset: the wrap pipeline would strip the
 * indentation and re-break the run, and both are rewrites of the code.
 *
 * Colour comes from the syntax theme slot, one fill per token run. Each run is
 * placed at the measured width of everything before it, the same additive
 * advances the solver sized the line by, so a coloured line and a plain line
 * occupy identical pixels. An accented line stays a single red run: the accent
 * marks the line the claim turns on, and it outranks the grammar.
 */
const codeLine = (line, accent, index, lang) => {
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
			ctx.font = `400 ${typeSize(ROLE)}px ${FAMILY.mono}`;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			if ("letterSpacing" in ctx) ctx.letterSpacing = `${tracking}px`;
			if (accent) {
				ctx.fillStyle = C.red;
				ctx.fillText(line, rect.x, rect.cy);
			} else {
				let consumed = "";
				for (const run of tokenizeLine(line, lang)) {
					ctx.fillStyle = syntaxColor(run.cls, C);
					ctx.fillText(run.text, rect.x + measure(consumed, ROLE), rect.cy);
					consumed += run.text;
				}
			}
			if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
		},
	});
};

/**
 * Bare verbatim lines, no border: for components whose panel already draws
 * the frame (a converge source card, a spec card's call shape) and whose
 * mono runs must still be the one codeLine voice — same face, same syntax
 * inks, same refusal when a line cannot fit unwrapped.
 *
 * @param {string | string[]} source  lines, or one \n-joined string
 * @param {object} [opts]
 * @param {number[]} [opts.accentLines] 1-based line numbers drawn in the accent
 * @param {"js" | "json" | "none" | "auto"} [opts.lang]
 */
export function verbatimLines(source, { accentLines = [], lang = "auto" } = {}) {
	const raw = Array.isArray(source) ? source.join("\n") : String(source ?? "");
	const lines = raw.replace(/\t/g, "  ").split("\n");
	while (lines.length && !lines[0].trim()) lines.shift();
	while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
	const accented = new Set(accentLines.map(Number));
	const resolvedLang =
		lang === "js" || lang === "json" || lang === "none" ? lang : detectLang(raw);
	return lines.map((line, i) =>
		line.trim().length === 0
			? blank(space(3))
			: codeLine(line, accented.has(i + 1), i, resolvedLang),
	);
}

/**
 * The bordered block itself, reusable by any component that carries a
 * verbatim snippet (the `code` figure, a transcript event's call shape).
 *
 * `unit` is the caller's claim about information density: a standalone code
 * figure is one unit; a block inside an event whose row is already a unit
 * must not count twice.
 *
 * @param {string} source          lines separated by \n, drawn verbatim
 * @param {object} [opts]
 * @param {number[]} [opts.accentLines] 1-based line numbers drawn in the accent
 * @param {boolean} [opts.accent]  accent the border: the one block the claim is about
 * @param {boolean} [opts.unit]    count the block as an information unit
 * @param {number} [opts.pad]      scale step inside the border
 * @param {"js" | "json" | "none" | "auto"} [opts.lang] token colouring; auto
 *   sniffs JSON from the first drawn line, none paints every run in plain ink
 */
export function codeBlock(
	source,
	{ accentLines = [], accent = false, unit = false, pad = 4, lang = "auto" } = {},
) {
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
	const resolvedLang =
		lang === "js" || lang === "json" || lang === "none" ? lang : detectLang(source);

	const body = lines.map((line, i) =>
		line.trim().length === 0
			? blank(space(3))
			: codeLine(line, accented.has(i + 1), i, resolvedLang),
	);

	return box({
		pad,
		border: true,
		borderColor: accent ? COLOR.red : COLOR.black2,
		fill: COLOR.panel,
		gap: 1,
		unit,
		children: body,
	});
}

/**
 * @param {object} spec
 * @param {string} spec.code     the snippet, lines separated by \n, drawn verbatim
 * @param {string} [spec.label]  small mono caption above the block (a filename,
 *                               a tool name, "01 value_set"), quiet by default
 * @param {number[]} [spec.accentLines] 1-based line numbers drawn in the accent
 * @param {number} [spec.gap]    scale step between label and block
 */
export function code({ code: source, label, accentLines = [], gap = 2, lang = "auto" } = {}) {
	const block = codeBlock(source, { accentLines, unit: true, lang });

	if (!label) return block;

	return stack({
		gap,
		children: [text(label, ROLE, { color: COLOR.quiet }), block],
	});
}

/**
 * Numbered, labelled code blocks: a sequence read as steps.
 *
 * The numbers are MEANINGFUL, not furniture: 01 stores the value and 02 reads
 * it back, and swapping them breaks the lesson. That is why each header opens
 * with the number in the accent, the one ink reserved for the mark the claim
 * turns on.
 *
 * Units: each STEP is one information unit, header and block together, so the
 * unit sits on the step's wrapper stack and the inner codeBlock is passed
 * unit: false. Counting the block again would charge the reader twice for one
 * thing they take in once; counting the whole figure once would hide that two
 * steps are two things to hold.
 *
 * @param {object} spec
 * @param {Array<{label: string, caption?: string, code: string}>} spec.steps
 *   2 or 3 steps: a short mono label (a call name, a filename), an optional
 *   body-role clause saying what the step does, and the verbatim snippet.
 * @param {number} [spec.gap]  scale step between steps
 */
export function codeSteps({ steps, gap = 4 } = {}) {
	if (!Array.isArray(steps) || steps.length < MIN_STEPS) {
		throw new PressError(
			"CODESTEPS_TOO_FEW",
			`codeSteps needs at least ${MIN_STEPS} steps (got ` +
				`${Array.isArray(steps) ? steps.length : 0}). One block is the code figure, not a sequence.`,
		);
	}
	if (steps.length > MAX_STEPS) {
		throw new PressError(
			"CODESTEPS_TOO_MANY",
			`codeSteps has ${steps.length} steps and ${MAX_STEPS} is the cap. ` +
				`A longer walkthrough belongs across plates, one claim each.`,
		);
	}

	const blocks = steps.map((step, i) => {
		const label = String(step?.label ?? "").trim();
		if (!label) {
			throw new PressError(
				"CODESTEP_LABEL_MISSING",
				`codeSteps step ${i + 1} needs a label. An unnamed block cannot be referred to, ` +
					`and the sequence is the claim.`,
			);
		}
		if (typeof step?.code !== "string" || !step.code.trim()) {
			throw new PressError(
				"CODESTEP_CODE_MISSING",
				`codeSteps step ${i + 1} ("${label}") needs a code string. ` +
					`A numbered header over nothing is a list item, not a step.`,
			);
		}
		const caption = String(step?.caption ?? "").trim();
		const header = row({
			gap: 2,
			align: "baseline",
			children: [
				text(String(i + 1).padStart(2, "0"), ROLE, { color: COLOR.red }),
				text(label, ROLE, { color: COLOR.text }),
				caption ? text(caption, "body", { color: COLOR.muted, commentary: true }) : null,
			],
		});
		return stack({
			gap: 2,
			unit: true,
			children: [header, codeBlock(step.code, { unit: false })],
		});
	});

	return stack({ gap, children: blocks });
}
