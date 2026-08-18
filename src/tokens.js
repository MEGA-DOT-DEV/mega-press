/**
 * PRESS / tokens
 *
 * The furniture. In letterpress you cannot invent a spacer: you reach into the
 * cabinet and take a piece that exists. Every dimension in this system works
 * the same way, which is the whole reason a plate cannot drift.
 *
 * Nothing downstream accepts a raw number. Components ask for `space(3)` or
 * `type('list')` and get a value that is guaranteed to be on the scale. Asking
 * for something that is not on the scale throws at author time rather than
 * producing a plate that is 3px wrong in a way nobody notices until it is
 * published.
 */

/** Every position and dimension resolves to a multiple of this. */
export const UNIT = 4;

/** Snap to the unit grid. The only rounding in the system. */
export const snap = (v) => Math.round(v / UNIT) * UNIT;

/* --------------------------------------------------------------------------
 * Frames
 *
 * A plate is authored at 1600 wide. That is the number every other constant
 * here is derived from, so changing it changes the legibility floor with it.
 * ------------------------------------------------------------------------ */

export const FRAME = {
	landscape: { w: 1600, h: 1000 },
	portrait: { w: 1600, h: 2000 }, // 4:5
	square: { w: 1600, h: 1600 },
};

/** Margin between the chase edge and anything that may print. */
export const SAFE = 96;

/* --------------------------------------------------------------------------
 * Legibility
 *
 * An article image on a 390px phone is displayed at about 370 CSS px. On a
 * 1600px artboard that is a scale factor of 0.231, so every source size is
 * multiplied by roughly one quarter. This is the single most useful number in
 * the system: it turns "is this readable?" into arithmetic.
 * ------------------------------------------------------------------------ */

export const PHONE_WIDTH = 370;
export const phoneScale = (frameW) => PHONE_WIDTH / frameW;

/** Below this the text is present but not readable on a phone. */
export const MIN_PHONE_PX = 5.5;

/** Therefore, on a 1600px frame, no type may be smaller than this. */
export const minTypeSize = (frameW) => Math.ceil(MIN_PHONE_PX / phoneScale(frameW));

/* --------------------------------------------------------------------------
 * Space
 *
 * Five values. Five is enough to build any rhythm and few enough that the
 * rhythm survives being reduced to a quarter of its size.
 * ------------------------------------------------------------------------ */

const SPACE_SCALE = { 1: 12, 2: 20, 3: 28, 4: 40, 5: 56 };

export function space(step) {
	const v = SPACE_SCALE[step];
	if (v === undefined) {
		throw new PressError(
			"SPACE_OFF_SCALE",
			`space(${step}) does not exist. The scale is 1..5 (${Object.values(SPACE_SCALE).join(", ")}px). ` +
				`If a layout seems to need a gap between two steps, it needs less content instead.`,
		);
	}
	return v;
}

/** For validators that need to ask "is this a legal gap?" */
export const isSpace = (v) => Object.values(SPACE_SCALE).includes(v);
export const SPACE_VALUES = Object.values(SPACE_SCALE);

/* --------------------------------------------------------------------------
 * Proportion
 *
 * A column split is a dimension like any other, so it comes out of the cabinet
 * rather than out of a calculator. `0.38` is how a two-column plate ends up
 * 11px narrower than the two-column plate beside it in the same article, which
 * is the same drift `space()` exists to prevent, one level up.
 *
 * Five values, and they are the ones the eye already reads as deliberate: a
 * half, a third, two fifths, three fifths, two thirds. Anything between two of
 * them looks like a mistake rather than a decision, because it is.
 * ------------------------------------------------------------------------ */

const RATIO_SCALE = {
	"1/3": 1 / 3,
	"2/5": 2 / 5,
	"1/2": 1 / 2,
	"3/5": 3 / 5,
	"2/3": 2 / 3,
};

export function ratio(key) {
	const v = RATIO_SCALE[key];
	if (v === undefined) {
		throw new PressError(
			"RATIO_OFF_SCALE",
			`ratio('${key}') does not exist. The scale is ${Object.keys(RATIO_SCALE).join(", ")}. ` +
				`A column that seems to need a proportion between two steps needs less content instead.`,
		);
	}
	return v;
}

export const RATIO_KEYS = Object.keys(RATIO_SCALE);

/**
 * Padding inside a bordered block must be roughly 3x the gap between the
 * elements inside it, or the innermost label reads as attached to the rule
 * below it rather than to the value above it.
 */
export const CONTAINMENT_RATIO = 3;
export function containedPadding(innerGap) {
	const target = innerGap * CONTAINMENT_RATIO;
	return SPACE_VALUES.reduce((best, v) =>
		Math.abs(v - target) < Math.abs(best - target) ? v : best,
	);
}

/* --------------------------------------------------------------------------
 * Type
 *
 * Assigned by role, never by desired prominence. Fewer sizes is itself a
 * readability feature: a frame carrying six near-identical sizes has no
 * hierarchy, only noise.
 *
 * `family` is chosen by what the text *is*:
 *   heading  the frame title and section headings only
 *   sans     body copy, data labels, list items, content categories
 *   mono     numerals, identifiers, file paths, technical metadata
 * ------------------------------------------------------------------------ */

const TYPE_SCALE = {
	utility: { size: 26, leading: 1.3, family: "mono", tracking: 0.08, role: "label" },
	brand: { size: 26, leading: 1.3, family: "pixel", tracking: 0.08, role: "label" },
	body: { size: 26, leading: 1.5, family: "sans", tracking: 0, role: "commentary" },
	list: { size: 32, leading: 1.35, family: "sans", tracking: 0, role: "content" },
	head: { size: 40, leading: 1.2, family: "heading", tracking: -0.01, role: "content" },
	datum: { size: 40, leading: 1.1, family: "mono", tracking: 0, role: "content" },
	display: { size: 72, leading: 1.05, family: "heading", tracking: -0.02, role: "title" },
	datumHero: { size: 88, leading: 1.0, family: "mono", tracking: -0.01, role: "title" },
};

export function type(name) {
	const t = TYPE_SCALE[name];
	if (!t) {
		throw new PressError(
			"TYPE_OFF_SCALE",
			`type('${name}') does not exist. Roles are: ${Object.keys(TYPE_SCALE).join(", ")}. ` +
				`A frame that seems to need a size between two roles needs less content instead.`,
		);
	}
	return { ...t, name };
}

export const TYPE_ROLES = Object.keys(TYPE_SCALE);
export const typeSize = (name) => type(name).size;

/** Line box height for a role, snapped so stacked text keeps the unit grid. */
export const lineHeight = (name) => {
	const t = type(name);
	return snap(t.size * t.leading);
};

/**
 * Commentary is never louder than the content it annotates. Takeaway bars set
 * at head (40px) annotating content at list (32px) made every aside louder
 * than its own frame.
 */
export const COMMENTARY_ROLE = "body";

/** Exactly one of these may appear on a plate. */
export const TITLE_ROLES = ["display", "datumHero"];

/* --------------------------------------------------------------------------
 * Stroke
 *
 * A 1px red hairline is 0.23px on a phone and disappears. Anything carrying
 * meaning is 2px or more. Neutral dividers between rows may stay at 1.
 * ------------------------------------------------------------------------ */

export const STROKE = {
	divider: 1, // neutral hairline between rows, decorative only
	rule: 2, // a structural rule
	connector: 2, // anything that must survive reduction
	mark: 2, // registration corner marks
	emphasis: 3,
};

/**
 * Dash patterns, on a scale like everything else.
 *
 * The labs language uses dashed rules alongside solid ones to separate a
 * technical division from a structural one: a solid rule says "these are
 * different sections", a dashed one says "this is a measurement". Both are
 * drawn at the same weights above.
 */
export const DASH = {
	solid: [],
	technical: [8, 8],
	fine: [2, 6],
};

/** Strokes that carry meaning must survive the phone scale. */
export const MIN_SEMANTIC_STROKE = 2;

/* --------------------------------------------------------------------------
 * Colour
 *
 * Read from the live mega.dev stylesheet. Note the shipped red is pure #f00.
 * ------------------------------------------------------------------------ */

export const COLOR = {
	/* surfaces */
	page: "#000000",
	panel: "#050505",
	raised: "#0b0b0b",
	black1: "#1b1b1b",
	black2: "#2f2f2f",
	line: "#292929",

	/* edges and marks, never text.
     `zinc` is the upstream name and carries the upstream rule with it:
     packages/ui/src/base.css says of #71717a, "Borders and icons only, never
     text". This system used to spend it as `quiet`, its most common text ink,
     177 runs across the set, and the contrast arithmetic agrees with the
     contract: 4.35:1 against the page, which is under the floor. */
	zinc: "#71717a",

	/* content inks, brightest to quietest */
	text: "#fafafa", // 20.12:1
	ink: "#d9d9d9", // 14.88:1, the field's binary ink
	muted: "#a1a1a1", // 8.13:1
	/* The de-emphasised text ink, and a role this palette did not used to have.
     Derived, not chosen: the darkest pure neutral that clears the text floor
     against **the palest ground the cabinet permits**, which is #1b1b1b and
     not the page. Deriving against the page alone gives values down to
     #7a7a7a, and the invariant catches those sitting on a panel below 4.5:1.
     A floor that only holds on the best case is not a floor. The requested
     #737373 fails on every ground, 4.43:1 at best, so this is the nearest
     value the arithmetic accepts. */
	quiet: "#848484", // 5.61:1 on the page, 4.61:1 on the palest ground

	/* Knockout. The one place the palette goes past #fafafa, and it is not a text
     ink: it is the glyph on a solid red tile, where the tile is the ground and
     white is the only value that holds its shape after a 0.231 reduction. The
     rule was stated in the icon docs and had no token to say it with, so it was
     typed as a bare #ffffff in two components. */
	knockout: "#ffffff",

	/* accents. Red has no text variant: there is one red. Pure blue is a fill,
     a selection and a focus ring, never a mark a reader has to see, because it
     is 2.44:1 on black. `blueText` is the readable carrier of that category. */
	red: "#ff0000",
	blue: "#0000ff",
	blueText: "#7a7aff",
};

/**
 * How two columns of a split sit against each other, and which side the
 * attachment takes.
 *
 * Discrete, like every other choice here. "A bit lower" is not a position, and
 * an aside nudged down by 18px is the same class of drift as a gap of 26.
 */
export const COLUMN_ALIGN = ["start", "center", "end", "stretch"];
export const ASIDE_SIDES = ["right", "left"];

export function columnAlign(name = "start") {
	if (!COLUMN_ALIGN.includes(name)) {
		throw new PressError(
			"ALIGN_OFF_SCALE",
			`align '${name}' does not exist. A split's columns sit ` +
				`${COLUMN_ALIGN.join(", ")} against each other.`,
		);
	}
	return name;
}

export function asideSide(name = "right") {
	if (!ASIDE_SIDES.includes(name)) {
		throw new PressError(
			"SIDE_OFF_SCALE",
			`asideSide '${name}' does not exist. An attachment takes the ${ASIDE_SIDES.join(" or the ")}.`,
		);
	}
	return name;
}

/**
 * Ground washes, for a background that is a flat area rather than a screen.
 *
 * Three values, all of them near black. A ground is the thing type sits on, so
 * it is chosen from a set that cannot fail the contrast arithmetic: the palest
 * of these is #1b1b1b, and body copy at #a1a1a1 over it still clears 6.6:1. A
 * background is not a place to introduce a colour.
 */
export const GROUND = {
	panel: COLOR.panel, // #050505, barely off the page
	raised: COLOR.raised, // #0b0b0b, reads as a distinct plate
	black1: COLOR.black1, // #1b1b1b, the palest ground that still holds body copy
	/* The accent wash. It was a bare `#150000` written into four components,
     which is how a fourth and fifth variant of it eventually get typed. It is
     a ground like the others and it belongs in the cabinet with them: every
     content ink still clears the text floor on it, red included at 5.09:1. */
	accent: "#150000",
};

export function ground(name) {
	const v = GROUND[name];
	if (!v) {
		throw new PressError(
			"GROUND_OFF_SCALE",
			`ground('${name}') does not exist. The washes are: ${Object.keys(GROUND).join(", ")}. ` +
				`A ground is what type sits on, so it comes from a set that cannot fail the ` +
				`contrast arithmetic rather than from a colour picker.`,
		);
	}
	return v;
}

/* --------------------------------------------------------------------------
 * Contrast
 *
 * B5 turned "is this readable?" into arithmetic for size. This does the same
 * for colour, and it is the same argument: a plate is judged by eye at full
 * size on a bright display by the person making it, and read at a quarter of
 * that size on a phone by everybody else. Eyes are generous about their own
 * work. Ratios are not.
 *
 * The maths is the WCAG relative luminance formula, which is not a matter of
 * taste: sRGB channels linearised, weighted 0.2126 / 0.7152 / 0.0722, and the
 * ratio taken with the 0.05 flare term that models a real screen in a real
 * room rather than an ideal black.
 *
 * Two floors, because two different things are being read:
 *
 *   text  4.5:1   Every run on a plate is small text by the time it is
 *                 published. At 0.231 the largest role on the scale, the 88px
 *                 focal numeral, lands at 20px, and everything else is under
 *                 17px. The relaxed 3:1 allowance for large text therefore
 *                 applies to nothing here, so it is not offered.
 *
 *   mark  3.0:1   A bar, a slice, a rail or a dot carries meaning by its shape
 *                 and position as well as its colour, so it is held to the
 *                 non-text threshold rather than the text one.
 * ------------------------------------------------------------------------ */

const channel = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** Parse #rgb or #rrggbb into three 0..1 channels. */
function channels(hex) {
	const h = String(hex).trim();
	const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h);
	if (!m) {
		throw new PressError(
			"COLOUR_UNREADABLE",
			`contrast() was given '${hex}', which is not a hex colour. Every colour in this ` +
				`system is a hex string from the palette, so a value that is not one has come ` +
				`from somewhere the palette does not reach.`,
		);
	}
	const s = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
	return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
}

/** WCAG relative luminance, 0 for black and 1 for white. */
export function luminance(hex) {
	const [r, g, b] = channels(hex).map(channel);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours. Order does not matter. */
export function contrast(a, b) {
	const la = luminance(a),
		lb = luminance(b);
	const hi = Math.max(la, lb),
		lo = Math.min(la, lb);
	return (hi + 0.05) / (lo + 0.05);
}

export const CONTRAST = { text: 4.5, mark: 3 };

/**
 * The darkest neutral that clears the text floor on the page.
 *
 * Derived rather than picked, in exactly the way the 26px type floor is
 * derived from the phone scale: sweep the neutral ramp, keeping the nine point
 * blue lift the palette's greys carry, and take the first value that passes.
 * The answer is #74747d, and the value it replaced was #71717a at 4.35:1,
 * which failed by three per cent and was the most used ink in the set.
 */
export const QUIET_FLOOR_NEUTRAL = "#74747d";

/* --------------------------------------------------------------------------
 * Series colour
 *
 * One list, in assignment order, and it is the list the components actually
 * use. It did not used to be: `CATEGORICAL` was exported here and printed by
 * `press tokens` as "the series colour", while `chart.js` and `morph.js` each
 * kept their own private copy of a nearly identical array. The documented
 * palette and the drawn palette were different objects, which is the same
 * defect as a rail that is given an x, one level up.
 *
 * Every entry clears the mark floor against the page. The entry that was
 * removed, #0000ff, did not: pure blue on black is 2.44:1, which is below even
 * the non-text threshold, so a blue slice was a slice a reader could not see.
 * #7a7aff carries the same category at 6.06:1.
 *
 * Five is still the cap. A sixth series is a table.
 * ------------------------------------------------------------------------ */

export const CATEGORICAL = [
	COLOR.red, // #ff0000  5.25:1
	COLOR.ink, // #d9d9d9  14.88:1
	COLOR.blueText, // #7a7aff  6.06:1
];

export const FAMILY = {
	heading: '"Argent Pixel", Georgia, "Times New Roman", serif',
	sans: '"Geist Pixel", "Geist Sans", -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
	mono: '"Geist Pixel", "Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
	pixel: '"Geist Pixel", "Geist Mono", ui-monospace, monospace',
};

/* --------------------------------------------------------------------------
 * Budgets
 *
 * One frame, one claim. A card, a step, a stat or a legend row each count as
 * one information unit. Single-line ruled rows are cheaper than cards, so they
 * get a larger allowance.
 * ------------------------------------------------------------------------ */

export const UNIT_BUDGET = 5;
export const UNIT_BUDGET_RULED = 8;

/* --------------------------------------------------------------------------
 * Rule discipline
 *
 * A stack of horizontal rules at slightly different measures reads as a
 * rendering fault rather than as structure.
 * ------------------------------------------------------------------------ */

/** Two rules closer than this read as one broken double line. */
export const MIN_RULE_SEPARATION = SPACE_SCALE[3];

/* --------------------------------------------------------------------------
 * Errors
 * ------------------------------------------------------------------------ */

export class PressError extends Error {
	constructor(code, message, detail = {}) {
		super(message);
		this.name = "PressError";
		this.code = code;
		this.detail = detail;
	}
}
