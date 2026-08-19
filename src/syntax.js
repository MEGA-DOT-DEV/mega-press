/**
 * PRESS / syntax
 *
 * Token colouring for verbatim code, in the cabinet's own inks.
 *
 * This is not a highlighter in the editor sense: no grammar, no language
 * server, no cross-line state. A plate shows at most fourteen lines, and the
 * job is the one the reference figures already do by hand: the keyword that
 * drives the line in the accent, the payload in ink, the braces held back so
 * the shape of the code reads before the characters do.
 *
 * The palette is a theme slot, not a spec slot. A plate's JSON never names a
 * colour; the host may re-map token classes once for a project through
 * configurePress({ syntax }), the same contract the cabinet has. Values are
 * cabinet ink NAMES (so a re-skinned cabinet re-skins its code for free) or
 * raw hex, contrast-checked at configure time like every other ink.
 *
 * Six classes, deliberately few. A scheme that separates every grammar node
 * turns a figure into a christmas tree; the house look is black, red, white.
 */

/** Token classes the painter understands. */
export const SYNTAX_CLASSES = ["plain", "keyword", "string", "number", "comment", "punct"];

/**
 * Default mapping: class -> cabinet ink name.
 * keyword rides the accent, exactly where the reference figures put const,
 * await, return. Strings drop half a step to `ink` so a quoted payload and an
 * identifier separate without a second hue. Punctuation recedes; comments
 * whisper.
 */
export const DEFAULT_SYNTAX = Object.freeze({
	plain: "text",
	keyword: "red",
	string: "ink",
	number: "text",
	comment: "quiet",
	punct: "muted",
});

/** Live palette. theme.js owns writes; components read through syntaxColor. */
export const SYNTAX = { ...DEFAULT_SYNTAX };

/**
 * Resolve a class to a paintable colour against the live cabinet the renderer
 * hands every custom node. A value that names a cabinet ink follows the
 * cabinet; a hex value stands alone.
 */
export function syntaxColor(cls, C) {
	const v = SYNTAX[cls] ?? SYNTAX.plain;
	return C[v] ?? v;
}

const JS_KEYWORDS = new Set(
	(
		"const let var function return await async import from export default if else for " +
		"while new class extends this typeof throw try catch finally switch case break " +
		"continue of in do yield static delete void instanceof null true false undefined"
	).split(" "),
);

const JSON_KEYWORDS = new Set(["true", "false", "null"]);

const isIdentStart = (ch) => /[A-Za-z_$]/.test(ch);
const isIdent = (ch) => /[A-Za-z0-9_$]/.test(ch);
const isDigit = (ch) => /[0-9]/.test(ch);

/**
 * Guess the language of a block from its first drawn line. JSON is the only
 * case worth telling apart: its keyword set is three words and everything
 * quoted is payload.
 */
export function detectLang(source) {
	const first = String(source)
		.split("\n")
		.map((l) => l.trim())
		.find((l) => l.length > 0);
	if (!first) return "js";
	if (/^[{[]/.test(first) || /^"/.test(first)) return "json";
	return "js";
}

/**
 * Tokenize ONE line into [{ text, cls }] runs, adjacent same-class runs
 * merged. Line-based on purpose: a block comment that spans lines is beyond
 * what a fourteen-line figure needs, and cross-line lexer state is exactly the
 * kind of hidden machinery this system refuses.
 *
 * @param {string} line
 * @param {"js" | "json" | "none"} [lang]
 */
export function tokenizeLine(line, lang = "js") {
	if (lang === "none" || line.length === 0) {
		return line.length ? [{ text: line, cls: "plain" }] : [];
	}
	const keywords = lang === "json" ? JSON_KEYWORDS : JS_KEYWORDS;
	const runs = [];
	const push = (text, cls) => {
		const last = runs[runs.length - 1];
		if (last && last.cls === cls) last.text += text;
		else runs.push({ text, cls });
	};

	let i = 0;
	while (i < line.length) {
		const ch = line[i];

		// line and inline block comments, to end of line at worst
		if (ch === "/" && line[i + 1] === "/") {
			push(line.slice(i), "comment");
			break;
		}
		if (ch === "/" && line[i + 1] === "*") {
			const close = line.indexOf("*/", i + 2);
			const end = close === -1 ? line.length : close + 2;
			push(line.slice(i, end), "comment");
			i = end;
			continue;
		}

		// strings, escapes honoured, unterminated runs to end of line
		if (ch === '"' || ch === "'" || ch === "`") {
			let j = i + 1;
			while (j < line.length) {
				if (line[j] === "\\") j += 2;
				else if (line[j] === ch) {
					j += 1;
					break;
				} else j += 1;
			}
			push(line.slice(i, Math.min(j, line.length)), "string");
			i = Math.min(j, line.length);
			continue;
		}

		if (isDigit(ch)) {
			let j = i + 1;
			while (j < line.length && /[0-9a-fA-F_x.]/.test(line[j])) j += 1;
			push(line.slice(i, j), "number");
			i = j;
			continue;
		}

		if (isIdentStart(ch)) {
			let j = i + 1;
			while (j < line.length && isIdent(line[j])) j += 1;
			const word = line.slice(i, j);
			push(word, keywords.has(word) ? "keyword" : "plain");
			i = j;
			continue;
		}

		if (ch === " " || ch === "\t") {
			push(ch, runs.length ? runs[runs.length - 1].cls : "plain");
			i += 1;
			continue;
		}

		push(ch, "punct");
		i += 1;
	}
	return runs;
}
