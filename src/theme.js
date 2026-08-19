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
	COLOR,
	CONTRAST,
	contrast,
	FAMILY,
	GROUND,
	PressError,
} from "./tokens.js";

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
	chrome: { ...current.chrome },
	color: { ...COLOR },
	family: { ...FAMILY },
	ground: { ...GROUND },
	categorical: [...CATEGORICAL],
});

const restore = (snap) => {
	current.chrome = { ...snap.chrome };
	Object.assign(COLOR, snap.color);
	Object.assign(FAMILY, snap.family);
	Object.assign(GROUND, snap.ground);
	for (let i = 0; i < CATEGORICAL.length; i += 1) CATEGORICAL[i] = snap.categorical[i];
};

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
	CATEGORICAL[0] = COLOR.red;
	CATEGORICAL[1] = COLOR.ink;
	CATEGORICAL[2] = COLOR.blueText;
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
		FAMILY[key] = value.trim();
	}
}

/**
 * Set the process default theme. Colour and fonts replace the cabinet as a set
 * and must still pass the contrast lock. Chrome hides chase furniture.
 *
 * @param {{ chrome?: object | "specimen" | "embed", color?: object, fonts?: object }} next
 */
export function configurePress(next = {}) {
	if (!isRecord(next)) {
		throw new PressError("THEME", "configurePress takes an object.");
	}
	if (next.chrome !== undefined) current.chrome = resolveChrome(next.chrome);
	if (next.color !== undefined) applyColor(next.color);
	if (next.fonts !== undefined) applyFonts(next.fonts);
	return getPressTheme();
}

export function getPressTheme() {
	return {
		chrome: { ...current.chrome },
		color: { ...COLOR },
		fonts: { ...FAMILY },
	};
}

/** Restore the shipped MEGA cabinet. Tests should call this in afterEach. */
export function resetPressTheme() {
	current.chrome = { ...CHROME_PRESETS.specimen };
	Object.assign(COLOR, DEFAULT_COLOR);
	Object.assign(FAMILY, DEFAULT_FAMILY);
	Object.assign(GROUND, DEFAULT_GROUND);
	for (let i = 0; i < CATEGORICAL.length; i += 1) CATEGORICAL[i] = DEFAULT_CATEGORICAL[i];
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
