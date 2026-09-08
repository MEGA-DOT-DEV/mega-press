/**
 * PRESS / theme
 *
 * Host-level skin. Not a slot, not a per-artifact colour picker.
 *
 * A plate locks because the cabinet is a set: contrast, type roles, chrome.
 * The host may swap the cabinet once for a project, or hide chase chrome when
 * the figure sits inside an article that already has a title. The artifact
 * JSON never names a colour, a font, or whether the title paints.
 *
 *   configurePress({ chrome: "embed", color: { page: "#fff", text: "#111" } })
 *   mountArtifact(el, spec, { chrome: "embed" })
 */

import {
	CATEGORICAL,
	CATEGORY_PALETTE,
	CATEGORY_SERIES,
	COLOR,
	CONTRAST,
	contrast,
	FAMILY,
	GROUND,
	PressError,
} from "./tokens.js";
import { DEFAULT_SYNTAX, SYNTAX, SYNTAX_CLASSES } from "./syntax.js";
import { METRICS_TABLE } from "./metrics/table.js";

export const CHROME_PRESETS = {
	/** Standalone specimen: chase chrome paints when the spec provides it. */
	specimen: {
		title: true,
		kicker: true,
		number: true,
		lead: true,
		footnote: true,
		brand: true,
		marks: true,
		numbered: true,
	},
	/** In-article figure: body only. Title may exist on the spec and stay unpainted. */
	embed: {
		title: false,
		kicker: false,
		number: false,
		lead: false,
		footnote: false,
		brand: false,
		marks: false,
		numbered: true,
	},
};

// The default composition skin. Hosts may override it for a project or mount.
export const COMPOSITION_THEME = Object.freeze({
	fonts: Object.freeze({
		heading: FAMILY.heading,
		sans: '"Geist Sans", sans-serif',
		mono: '"Geist Mono", monospace',
	}),
	// Author-supplied Press handoff: use the actual cabinet rather than a
	// second near-black palette. Body/source remain Geist Sans/Mono; the
	// editorial heading takes the handoff's measured Argent Pixel face.
	color: Object.freeze({ ...COLOR }),
	// Same class allocation as mega-dev/apps/web/src/drops/shiki.ts.
	syntax: Object.freeze({ keyword: "#ff5555", string: "#7b7bff", number: "#7b7bff", comment: "#8a8a93", punct: COLOR.text, plain: COLOR.text }),
	chrome: Object.freeze({ brand: false, marks: false }),
});

export const CATEGORY_TONES = Object.freeze({
	...Object.fromEntries(Object.entries(CATEGORY_PALETTE).map(([tone, swatch]) => [tone, swatch.ink])),
	neutral: COLOR.muted,
});

/** Semantic tone names remain stable when a host changes the palette. */
export function categoryColor(tone) {
	if (!Object.hasOwn(CATEGORY_TONES, tone)) throw new PressError("CATEGORY_TONE", `Unknown category tone: ${tone}.`);
	const ink = COLOR[tone === "blue" ? "blueText" : tone === "neutral" ? "muted" : tone];
	for (const ground of [COLOR.page, COLOR.panel, COLOR.raised]) {
		if (contrast(ink, ground) < CONTRAST.text) throw new PressError("CATEGORY_CONTRAST", `Category ${tone} cannot carry readable text on the project ground.`);
	}
	return ink;
}

/** Fills can be darker than their text ink; outlined swatches keep the edge legible. */
export function categoryFill(tone) {
	const ink = categoryColor(tone);
	return tone === "blue" ? COLOR.blue : ink;
}

/** Dark cabinet washes on MEGA; a restrained, checked tint on other skins. */
export function categoryGround(tone) {
	const ink = categoryColor(tone), swatch = CATEGORY_PALETTE[tone];
	const readable = ground => [ink, COLOR.text, COLOR.ink, COLOR.muted].every(fg => contrast(fg, ground) >= CONTRAST.text);
	if (COLOR.page === "#000000" && ink === swatch?.ink && (tone !== "blue" || COLOR.blue === swatch.fill) && readable(swatch.ground)) return swatch.ground;
	const rgb = hex => {
		const h = hex.slice(1), full = h.length === 3 ? [...h].map(c => c + c).join("") : h;
		return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
	};
	const base = rgb(COLOR.panel), color = rgb(ink);
	// A light project skin may need less tint to keep category ink legible.
	// Check the actual ground, including ordinary prose nested in the panel.
	for (let step = 7; step >= 0; step--) {
		const ground = `#${base.map((v, i) => Math.round(v + (color[i] - v) * step * .02).toString(16).padStart(2, "0")).join("")}`;
		if (readable(ground)) return ground;
	}
	throw new PressError("CATEGORY_CONTRAST", `Category ${tone} has no readable project wash.`);
}

export const SUPPORTED_PRESS_FONTS = Object.freeze(Object.keys(METRICS_TABLE.faces));

export const PRESS_THEMES = Object.freeze({
	mega: Object.freeze({
		fonts: Object.freeze({ ...FAMILY, ...COMPOSITION_THEME.fonts }),
		color: Object.freeze({ ...COLOR, ...COMPOSITION_THEME.color }),
		syntax: COMPOSITION_THEME.syntax,
		chrome: Object.freeze({ ...CHROME_PRESETS.specimen, ...COMPOSITION_THEME.chrome }),
	}),
	paper: Object.freeze({
		fonts: Object.freeze({ ...FAMILY, heading: '"Argent Pixel", serif', sans: '"Geist Sans", sans-serif', mono: '"Geist Mono", monospace' }),
		color: Object.freeze({
			page: "#f6f3eb", panel: "#efebe1", raised: "#fffdf6", black1: "#e9e4d8",
			black2: "#d7d0c2", line: "#827c70", zinc: "#827c70",
			text: "#20241f", ink: "#33392f", muted: "#555b50", quiet: "#5c6056",
			red: "#a43d27", blue: "#355dc2", blueText: "#355dc2", knockout: "#fffdf6",
			cyan: "#00636a", yellow: "#786300", magenta: "#920079",
			green: "#00632b", orange: "#9d3c00", violet: "#6c35a8",
		}),
		syntax: Object.freeze({ keyword: "#a43d27", string: "#355dc2", number: "#355dc2", comment: "#5c6056", punct: "#20241f", plain: "#20241f" }),
		chrome: Object.freeze({ ...CHROME_PRESETS.specimen, brand: false, marks: false }),
	}),
});

const DEFAULT_COLOR = Object.freeze({ ...COLOR });
const DEFAULT_FAMILY = Object.freeze({ ...FAMILY });
const DEFAULT_GROUND = Object.freeze({ ...GROUND });
const DEFAULT_CATEGORICAL = Object.freeze([...CATEGORICAL]);

const COLOR_KEYS = Object.keys(DEFAULT_COLOR);
const FAMILY_KEYS = Object.keys(DEFAULT_FAMILY);

const TEXT_INKS = ["text", "ink", "muted"];
const GROUND_KEYS = ["page", "panel", "raised", "black1"];

/** @type {{ chrome: typeof CHROME_PRESETS.specimen }} */
let current = {
	chrome: { ...CHROME_PRESETS.specimen },
};
// Explicit host choices only; legacy defaults must not overwrite the reviewed
// composition preset. Scoped themes snapshot this along with the live tokens.
let projectTheme = {};

const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

const presetName = (value) =>
	value === "embed" || value === "specimen" ? value : null;

/**
 * @param {unknown} [override]
 * @returns {typeof CHROME_PRESETS.specimen}
 */
export function resolveChrome(override) {
	const named = presetName(override);
	if (named) return { ...CHROME_PRESETS[named] };
	if (isRecord(override)) return { ...current.chrome, ...override };
	return { ...current.chrome };
}

const snapshot = () => ({
	projectTheme: mergeThemes(projectTheme),
	chrome: { ...current.chrome },
	color: { ...COLOR },
	family: { ...FAMILY },
	ground: { ...GROUND },
	categorical: [...CATEGORICAL],
	syntax: { ...SYNTAX },
});

const restore = (snap) => {
	projectTheme = snap.projectTheme;
	current.chrome = { ...snap.chrome };
	Object.assign(COLOR, snap.color);
	Object.assign(FAMILY, snap.family);
	Object.assign(GROUND, snap.ground);
	for (let i = 0; i < CATEGORICAL.length; i += 1) CATEGORICAL[i] = snap.categorical[i];
	Object.assign(SYNTAX, snap.syntax);
};

const mergeThemes = (...themes) => {
	const merged = {};
	for (const theme of themes) {
		if (theme == null) continue;
		if (!isRecord(theme)) throw new PressError("THEME", "A project theme must be an object.");
		for (const [key, value] of Object.entries(theme)) {
			if (!["chrome", "color", "fonts", "syntax"].includes(key)) throw new PressError("THEME", `Unknown theme field: ${key}.`);
			if (value === undefined) continue;
			const next = key === "chrome" && presetName(value) ? CHROME_PRESETS[value] : value;
			merged[key] = isRecord(next) ? { ...(isRecord(merged[key]) ? merged[key] : {}), ...next } : next;
		}
	}
	return merged;
};

/** Resolve and validate a detached skin without leaving any process mutation. */
export function resolvePressTheme(override, { composition = false } = {}) {
	const base = composition ? {
		color: DEFAULT_COLOR, fonts: DEFAULT_FAMILY, syntax: DEFAULT_SYNTAX,
		chrome: CHROME_PRESETS.specimen,
	} : getPressTheme();
	const merged = mergeThemes(base, composition ? COMPOSITION_THEME : null, composition ? projectTheme : null, override);
	return withPressTheme(merged, getPressTheme);
}

const assertHex = (key, value) => {
	if (typeof value !== "string" || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())) {
		throw new PressError(
			"THEME_COLOUR",
			`theme.color.${key} must be a #rgb or #rrggbb hex colour, got ${JSON.stringify(value)}.`,
		);
	}
};

const assertPair = (ink, ground, floor, label) => {
	const ratio = contrast(ink, ground);
	if (ratio < floor) {
		throw new PressError(
			"THEME_CONTRAST",
			`${label} is ${ratio.toFixed(2)}:1, below the ${floor}:1 floor.`,
		);
	}
};

function applyColor(partial) {
	if (!isRecord(partial)) {
		throw new PressError("THEME_COLOUR", "theme.color must be an object of hex tokens.");
	}
	const unknown = Object.keys(partial).filter((k) => !COLOR_KEYS.includes(k));
	if (unknown.length) {
		throw new PressError(
			"THEME_COLOUR",
			`unknown color token(s): ${unknown.join(", ")}. Cabinet keys: ${COLOR_KEYS.join(", ")}.`,
		);
	}
	const next = { ...COLOR };
	for (const [key, value] of Object.entries(partial)) {
		assertHex(key, value);
		next[key] = value.trim();
	}

	const grounds = GROUND_KEYS.map((k) => next[k]);
	for (const inkKey of TEXT_INKS) {
		for (const ground of grounds) {
			assertPair(next[inkKey], ground, CONTRAST.text, `${inkKey} on ${ground}`);
		}
	}
	assertPair(next.quiet, next.page, CONTRAST.text, "quiet on page");
	assertPair(next.quiet, next.black1, CONTRAST.text, "quiet on black1");
	assertPair(next.red, next.page, CONTRAST.mark, "red on page");

	Object.assign(COLOR, next);
	GROUND.panel = COLOR.panel;
	GROUND.raised = COLOR.raised;
	GROUND.black1 = COLOR.black1;
	for (let i = 0; i < CATEGORY_SERIES.length; i++) CATEGORICAL[i] = COLOR[CATEGORY_SERIES[i] === "blue" ? "blueText" : CATEGORY_SERIES[i]];
	// Preserve the legacy accent-ground alias across host skins as well.
	GROUND.accent = categoryGround("red");
}

function applyFonts(partial) {
	if (!isRecord(partial)) {
		throw new PressError("THEME_FONT", "theme.fonts must be an object of CSS family strings.");
	}
	const unknown = Object.keys(partial).filter((k) => !FAMILY_KEYS.includes(k));
	if (unknown.length) {
		throw new PressError(
			"THEME_FONT",
			`unknown font role(s): ${unknown.join(", ")}. Roles: ${FAMILY_KEYS.join(", ")}.`,
		);
	}
	for (const [key, value] of Object.entries(partial)) {
		if (typeof value !== "string" || !value.trim()) {
			throw new PressError("THEME_FONT", `theme.fonts.${key} must be a non-empty CSS family.`);
		}
		const parts = value.trim().match(/^(?:"([^"]+)"|'([^']+)'|([^,"']+))(\s*,.*)?$/);
		const first = (parts?.[1] || parts?.[2] || parts?.[3] || "").trim();
		if (!SUPPORTED_PRESS_FONTS.includes(first)) {
			throw new PressError("THEME_FONT_UNMEASURED", `theme.fonts.${key} starts with an unmeasured font "${first}". Use ${SUPPORTED_PRESS_FONTS.join(", ")}; a new family needs baked metrics before it can be used reliably.`);
		}
		// Baked metrics and CSS must see the same first face; single-quoted CSS
		// families are accepted and normalized to the metrics parser's spelling.
		FAMILY[key] = `"${first}"${parts?.[4] || ""}`;
	}
}

/* Cabinet inks a syntax class may name. `zinc` is borders-and-icons-never-text
   by upstream contract, grounds are grounds, so the roster is the text-safe
   inks plus the accent and the knockout. */
const SYNTAX_INK_KEYS = ["text", "ink", "muted", "quiet", "red", "knockout"];

function applySyntax(partial) {
	if (!isRecord(partial)) {
		throw new PressError(
			"THEME_SYNTAX",
			"theme.syntax must map token classes to cabinet ink names or hex colours.",
		);
	}
	const unknown = Object.keys(partial).filter((k) => !SYNTAX_CLASSES.includes(k));
	if (unknown.length) {
		throw new PressError(
			"THEME_SYNTAX",
			`unknown syntax class(es): ${unknown.join(", ")}. Classes: ${SYNTAX_CLASSES.join(", ")}.`,
		);
	}
	const next = { ...SYNTAX };
	for (const [cls, value] of Object.entries(partial)) {
		if (typeof value !== "string" || !value.trim()) {
			throw new PressError("THEME_SYNTAX", `theme.syntax.${cls} must be a non-empty string.`);
		}
		const v = value.trim();
		if (SYNTAX_INK_KEYS.includes(v)) {
			next[cls] = v;
			continue;
		}
		if ((COLOR_KEYS.includes(v) && !SYNTAX_INK_KEYS.includes(v)) || GROUND_KEYS.includes(v)) {
			throw new PressError(
				"THEME_SYNTAX",
				`theme.syntax.${cls} may not use "${v}": code paints as text, and that token is not a text ink. Inks: ${SYNTAX_INK_KEYS.join(", ")}.`,
			);
		}
		assertHex(`syntax.${cls}`, v);
		// Code sits on the panel fill inside its border; hold hex inks to the
		// same floor every other text ink passes.
		assertPair(v, COLOR.panel, CONTRAST.text, `syntax.${cls} on panel`);
		next[cls] = v;
	}
	Object.assign(SYNTAX, next);
}

/**
 * Set the process default theme. Colour and fonts replace the cabinet as a set
 * and must still pass the contrast lock. Chrome hides chase furniture. Syntax
 * re-maps how verbatim code classes paint, in cabinet ink names or checked hex.
 *
 * @param {{ chrome?: object | "specimen" | "embed", color?: object, fonts?: object, syntax?: object }} next
 */
export function configurePress(next = {}) {
	if (!isRecord(next)) {
		throw new PressError("THEME", "configurePress takes an object.");
	}
	const snap = snapshot();
	try {
		const choices = mergeThemes(next);
		if (choices.chrome !== undefined) current.chrome = resolveChrome(choices.chrome);
		if (choices.color !== undefined) applyColor(choices.color);
		if (choices.fonts !== undefined) applyFonts(choices.fonts);
		if (choices.syntax !== undefined) applySyntax(choices.syntax);
		projectTheme = mergeThemes(projectTheme, choices);
		return getPressTheme();
	} catch (error) {
		restore(snap);
		throw error;
	}
}

export function getPressTheme() {
	return {
		chrome: { ...current.chrome },
		color: { ...COLOR },
		fonts: { ...FAMILY },
		syntax: { ...SYNTAX },
	};
}

/** Restore the shipped MEGA cabinet. Tests should call this in afterEach. */
export function resetPressTheme() {
	projectTheme = {};
	current.chrome = { ...CHROME_PRESETS.specimen };
	Object.assign(COLOR, DEFAULT_COLOR);
	Object.assign(FAMILY, DEFAULT_FAMILY);
	Object.assign(GROUND, DEFAULT_GROUND);
	for (let i = 0; i < CATEGORICAL.length; i += 1) CATEGORICAL[i] = DEFAULT_CATEGORICAL[i];
	Object.assign(SYNTAX, DEFAULT_SYNTAX);
	return getPressTheme();
}

/**
 * Apply a theme for the duration of `fn`, then restore.
 * @template T
 * @param {object | null | undefined} partial
 * @param {() => T} fn
 * @returns {T}
 */
export function withPressTheme(partial, fn) {
	if (partial == null) return fn();
	const snap = snapshot();
	try {
		configurePress(partial);
		return fn();
	} finally {
		restore(snap);
	}
}
