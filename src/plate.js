/**
 * PRESS / plate
 *
 * The chase. It holds the frame, the safe area, the header, the footer and the
 * registration marks, and it is the only thing that calls the solver and the
 * validator. An author writes the body; the chase guarantees everything
 * around it.
 *
 * A plate is declared, solved, connected, then locked, in that order:
 *
 *   build(t)      -> a node tree, no coordinates anywhere
 *   compose()     -> the named layout arranges the chase around it
 *   solve()       -> every node gets a rect
 *   connect(ref)  -> connectors derived from those rects
 *   validate()    -> the quoin. Fails loudly or the plate prints.
 *
 * ## Layouts
 *
 * `spec.layout` names a composition. There are four, and there are four rather
 * than a column API, because a composition an author can parameterise freely is
 * a composition that drifts: two plates in the same article end up with title
 * columns eleven pixels apart and nobody can say which one is right.
 *
 *   stacked      header, body, footer in one vertical run. The default.
 *   split        two columns. See below for which two.
 *   full-bleed   the body takes the whole frame, past the safe area to the
 *                edge, with the header and footer overlaid on it.
 *   centred      one narrow measure in the middle of the frame.
 *
 * `split` puts two things side by side. The right column is the aside when the
 * plate declares one, and the body otherwise. The left column always carries
 * the title block, plus the body when the body is not in the right column.
 * There is no three column form: at 1600px a third column falls under the
 * measure a 26px face needs, so it is not a composition, it is a mistake with
 * more steps.
 *
 * ## Backgrounds
 *
 * `spec.background` is the ground behind the content. It is always full bleed,
 * because a ground that stops at the safe area is a panel, and a panel is
 * content. Three kinds:
 *
 *   { type: 'field', ...params }   the dithered screen, cleared around the type
 *   { type: 'image', src, alt }    a picture, resolved through the same screen
 *   { type: 'band', fill, pad }    a stripe behind the body, derived from it
 *
 * ## Asides
 *
 * `spec.aside` is a builder, `(toolkit) => node`, exactly like `spec.build`,
 * for the same reason: the lab rebuilds a plate on every control change, and a
 * node object held across builds carries stale rects from the previous solve.
 * It takes a media node or any component node. Its width is a ratio of the
 * content width, so the attachment is sized by the composition and its own
 * aspect never has to be reconciled with a number an author typed.
 */

import { ruleAcross } from "./connect.js";
import { Rect } from "./geometry.js";
import { flatten, measureNode, row, solve, spacer, stack, text } from "./solve.js";
import { measure } from "./text.js";
import {
	asideSide,
	COLOR,
	columnAlign,
	DASH,
	FRAME,
	ground,
	PressError,
	ratio,
	SAFE,
	STROKE,
	snap,
	space,
} from "./tokens.js";
import { resolveChrome } from "./theme.js";
import { validate } from "./validate.js";

/* --------------------------------------------------------------------------
 * The vocabulary of composition
 * ------------------------------------------------------------------------ */

export const LAYOUTS = ["stacked", "split", "full-bleed", "centred"];
export const BACKGROUND_TYPES = ["field", "image", "band"];

/** The space step between two columns. One value, so every split matches. */
const GUTTER = 5;

/**
 * What `ratio` means, per layout. It is always the share of the content width
 * given to the column that is not the body:
 *
 *   split      the title column, or the aside when the plate has one
 *   stacked    the aside column
 *   centred    the measure, which is the only column there is
 */
const DEFAULT_RATIO = {
	stacked: "2/5",
	split: "2/5",
	centred: "3/5",
	"full-bleed": "2/5",
};

/**
 * @param {object} spec
 * @param {string} spec.id          stable slug, used for the PNG filename
 * @param {string} spec.frame       'landscape' | 'portrait' | 'square'
 * @param {string} [spec.layout]    'stacked' | 'split' | 'full-bleed' | 'centred'
 * @param {string} [spec.ratio]     a ratio step: 1/3, 2/5, 1/2, 3/5, 2/3
 * @param {string} [spec.kicker]    small utility label, upper left
 * @param {string} [spec.number]    frame number, upper right
 * @param {string} [spec.title]     optional claim; hosts may keep it and not paint it
 * @param {string} [spec.lead]      one line of explanation under the title
 * @param {string} [spec.footnote]  optional source line, right of the brand
 * @param {Function} spec.build     (toolkit) => node
 * @param {Function} [spec.aside]   (toolkit) => node, the attachment column
 * @param {object} [spec.background] { type: 'field' | 'image' | 'band', ... }
 * @param {Function} [spec.connect] (refs) => { links, rails, rules }
 * @param {object} [spec.field]     legacy alias for background { type: 'field' }
 */
export function definePlate(spec) {
	return { ...spec, __press: true };
}

export function buildPlate(spec, { validateNow = true, chrome: chromeOpt } = {}) {
	const chrome = resolveChrome(chromeOpt);
	const frame = FRAME[spec.frame || "landscape"];
	if (!frame) {
		throw new PressError(
			"UNKNOWN_FRAME",
			`frame '${spec.frame}' does not exist. Use ${Object.keys(FRAME).join(", ")}.`,
		);
	}

	const layout = spec.layout || "stacked";
	if (!LAYOUTS.includes(layout)) {
		throw new PressError(
			"UNKNOWN_LAYOUT",
			`layout '${spec.layout}' does not exist. The compositions are: ${LAYOUTS.join(", ")}. ` +
				`A frame that seems to need a fifth one usually needs less content instead.`,
		);
	}

	const safe = new Rect(SAFE, SAFE, frame.w - SAFE * 2, frame.h - SAFE * 2);
	const page = new Rect(0, 0, frame.w, frame.h);

	// The legibility floor is derived from the frame width, so the placement pass
	// is told which frame it is placing on rather than assuming the landscape one.
	const ctx = { frameWidth: frame.w };

	/* ---- header ---------------------------------------------------------
     Kicker and number on one utility line, then the title. The header is
     identical on every plate, which is most of what makes a set look like a
     set rather than seventeen frames that happen to share a palette.

     `centred` centres the title and the lead but leaves the kicker line
     spanning the measure, because that line is what tells the reader how wide
     the measure is. */

	const centred = layout === "centred";

	/* Chase chrome is host-level. Spec may carry a title the article already stated;
     resolveChrome decides whether it paints. Never pass '' into text() — TEXT_MISSING. */
	const kickerText = chrome.kicker && spec.kicker && String(spec.kicker).trim();
	const numberText = chrome.number && spec.number != null && String(spec.number).trim();
	const titleText = chrome.title && spec.title && String(spec.title).trim();
	const leadText = chrome.lead && spec.lead && String(spec.lead).trim();
	const footnoteText = chrome.footnote && spec.footnote && String(spec.footnote).trim();
	const showBrand = chrome.brand;

	const kickerLine =
		kickerText || numberText
			? row({
					gap: 3,
					align: "baseline",
					children: [
						kickerText
							? text(kickerText, "utility", { color: COLOR.quiet, grow: true })
							: null,
						numberText
							? text(numberText, "utility", { color: COLOR.red, align: "right" })
							: null,
					].filter(Boolean),
				})
			: null;

	const headerChildren = [
		kickerLine,
		titleText
			? text(titleText, "display", {
					color: COLOR.text,
					floorRole: "head",
					isTitle: true,
					...(centred ? { align: "center" } : {}),
				})
			: null,
		leadText
			? text(leadText, "body", {
					color: COLOR.muted,
					...(centred ? { align: "center" } : {}),
				})
			: null,
	].filter(Boolean);
	const header = headerChildren.length ? stack({ gap: 3, children: headerChildren }) : null;

	/* ---- footer ---------------------------------------------------------
     Always present, always inside the safe area. A frame whose content
     overflows silently pushes this outside the canvas and the screenshot
     still looks plausible, so the validator checks for it by geometry and
     the raster linter checks for it again in the pixels.

     It is pinned to the bottom of the safe area in every layout, including
     full-bleed, where it is the one thing that does not bleed. */

	/* ---- readout ---------------------------------------------------------
     A metadata strip in the labs idiom: uppercase mono, wide tracking, a blue
     accent on each value, separated from the content by a dashed rule because
     a dashed rule reads as a measurement rather than as a division.

     It reports the plate's own facts, and it reports them from the solved
     plate rather than from the spec, so it cannot describe a frame that was
     not built. A strip that could disagree with its own plate would be
     decoration wearing a lab coat. */

	/* Opt in, not automatic. Turning it on for the whole set cost every plate
     54px of vertical budget and pushed seven of them past the safe area, which
     is the chase spending content's space on chrome. `readout: true` takes the
     derived pair; an array adds your own. */
	const readoutPairs = !spec.readout
		? null
		: [
				["FRAME", `${frame.w}x${frame.h}`],
				["LAYOUT", layout.toUpperCase()],
				...(Array.isArray(spec.readout) ? spec.readout : []),
			];

	const readout =
		readoutPairs &&
		row({
			gap: 4,
			align: "baseline",
			children: readoutPairs.flatMap(([k, v]) => [
				text(String(k), "utility", { color: COLOR.quiet }),
				text(String(v), "utility", { color: COLOR.blueText }),
			]),
		});

	/* The brand is a fixed mark, so it is the one thing in the footer that never
     gives way. It used to be the growing child, which meant a long footnote
     squeezed its track until "mega.dev" itself wrapped to "mega.de / v": the
     footnote won an argument it should never have been in.

     Now the brand holds its measured width and the footnote takes the slack.
     A footnote too long for what is left is refused rather than wrapped, since
     a two line footer is the same defect one step later. */
	const brandWidth = showBrand ? snap(measure("mega.dev", "brand")) : 0;

	/* Checked here rather than left to the generic line-budget refusal, because
     that one advises widening the column and the footer's measure is the safe
     area. There is nothing to widen. The only move is a shorter footnote. */
	if (footnoteText) {
		const room = safe.w - brandWidth - (showBrand ? space(3) : 0);
		const want = measure(footnoteText, "utility");
		if (want > room) {
			throw new PressError(
				"FOOTNOTE_TOO_LONG",
				`the footnote "${footnoteText}" measures ${Math.ceil(want)}px and the footer has ` +
					`${Math.floor(room)}px${showBrand ? " beside the brand" : ""}. Shorten it by about ` +
					`${Math.ceil((want - room) / (want / footnoteText.length))} characters. ` +
					`The footer is one line and the brand does not move.`,
			);
		}
	}

	const footerChildren = [
		showBrand ? text("mega.dev", "brand", { color: COLOR.red, width: brandWidth }) : null,
		footnoteText
			? text(footnoteText, "utility", {
					color: COLOR.quiet,
					align: "right",
					grow: true,
					maxLines: 1,
				})
			: null,
	].filter(Boolean);
	const footer = footerChildren.length
		? row({ gap: 3, align: "baseline", children: footerChildren })
		: null;

	/* ---- body and aside -------------------------------------------------- */

	const refs = {};
	const toolkit = {
		/** Register a node so connect() can find it after placement. */
		ref: (name, node) => {
			refs[name] = node;
			return node;
		},
		refs,
		frame,
		safe,
		width: safe.w,
	};

	const body = spec.build(toolkit);

	let aside = null;
	if (spec.aside) {
		if (typeof spec.aside !== "function") {
			throw new PressError(
				"ASIDE_NOT_A_BUILDER",
				`spec.aside must be a function returning a node, like spec.build. A node object ` +
					`held across builds carries the rects from the previous solve, and a plate solved ` +
					`twice would then validate against geometry it is not drawing.`,
			);
		}
		if (layout === "centred" || layout === "full-bleed") {
			throw new PressError(
				"ASIDE_WITHOUT_COLUMN",
				`layout '${layout}' has no second column, so there is nowhere to put an aside. ` +
					`Use 'split' to place an attachment beside the body, or 'stacked' to place one ` +
					`beside the body under a full width title.`,
			);
		}
		aside = spec.aside(toolkit);
	}

	/* ---- compose and solve ----------------------------------------------- */

	const gap = spec.gap ?? 5;
	const r = ratio(spec.ratio || DEFAULT_RATIO[layout]);
	const track = snap(safe.w * r);

	/* The readout rides with the footer as one chase block, so every layout
     places it correctly without knowing it exists. */
	const footerBlock = readout && footer
		? stack({ gap: 2, chase: true, children: [readout, footer] })
		: (footer ?? readout ?? null);

	if (readout) {
		footerBlock.press = {
			connect: () => ({
				rules: [
					ruleAcross(readout, {
						at: "top",
						offset: space(2) / 2,
						weight: STROKE.divider,
						color: COLOR.black2,
						dash: DASH.technical,
						chase: true,
					}),
				],
			}),
		};
	}

	const composed = COMPOSE[layout]({
		header,
		footer: footerBlock,
		body,
		aside,
		safe,
		page,
		gap,
		track,
		ctx,
		align: columnAlign(spec.align),
		side: asideSide(spec.asideSide),
	});
	const { root, bodySlot, asideSlot } = composed;

	// Pin the footer to the bottom of the safe area. The body is elastic; the
	// brand is not. Doing this after the solve keeps the measure pass honest.
	if (footer) {
		const footerShift = safe.bottom - footer.rect.bottom;
		if (footerShift > 0) shift(footer, 0, footerShift);
	}

	/* Which zone a node belongs to. The validator reads these, because two of
     the invariants mean different things for the chase and for content that
     is deliberately running past the safe area. */
	if (header) markZone(header, { chase: true });
	if (footer) markZone(footer, { chase: true });
	if (layout === "full-bleed") markZone(bodySlot, { bleed: true });

	/* ---- connect ---------------------------------------------------------
     Only now, when every rect exists. */

	const links = [],
		rails = [],
		rules = [];

	/* Every component that owns a connector emits it here, automatically. This
     is the property that makes a missing rail or a missing arrow impossible
     rather than merely discouraged: the author never draws one, so the author
     can never forget one. */
	for (const n of flatten(root)) {
		if (!n.press || typeof n.press.connect !== "function") continue;
		const out = n.press.connect() || {};
		if (out.links) links.push(...out.links);
		if (out.rails) rails.push(...out.rails);
		if (out.rules) rules.push(...out.rules);
	}

	/* Then any cross-component connectors the plate itself declares. */
	if (spec.connect) {
		const out = spec.connect(refs, { ruleAcross, safe }) || {};
		if (out.links) links.push(...out.links);
		if (out.rails) rails.push(...out.rails);
		if (out.rules) rules.push(...out.rules);
	}

	const regions = {
		header: header ? header.rect : null,
		body: bodySlot ? bodySlot.rect : null,
		aside: asideSlot ? asideSlot.rect : null,
		footer: footer ? footer.rect : null,
	};

	const plate = {
		id: spec.id,
		frame,
		safe,
		page,
		layout,
		ratio: spec.ratio || DEFAULT_RATIO[layout],
		regions,
		root,
		nodes: flatten(root),
		links,
		rails,
		rules,
		background: resolveBackground(spec, { frame, page, regions }),
		field: spec.field || null,
		marks: chrome.marks === false || spec.marks === false ? null : { inset: 40, arm: 70 },
		chrome,
		spec,
	};

	plate.report = validate(plate);
	if (validateNow) plate.report.throwIfFailed(spec.id);

	return plate;
}

/* --------------------------------------------------------------------------
 * The compositions
 *
 * Each one arranges the same four things and then solves. None of them takes a
 * coordinate: a column is a ratio step times a width the chase already knew.
 * ------------------------------------------------------------------------ */

const COMPOSE = {
	/**
	 * The original, and the default. Header, body, footer in one vertical run
	 * inside the safe area. With an aside, the body band becomes two columns.
	 */
	stacked({ header, footer, body, aside, safe, gap, track, ctx }) {
		const bodySlot = { ...body, grow: true };
		let asideSlot = null;
		let band = bodySlot;

		if (aside) {
			aside.width = track;
			asideSlot = aside;
			band = row({ gap: GUTTER, align: "start", children: [bodySlot, asideSlot] });
		}

		const root = stack({ gap, children: [header, band, footer].filter(Boolean) });
		solve(root, safe, ctx);
		return { root, bodySlot, asideSlot };
	},

	/**
	 * Two columns. The right one is the aside when there is one, and the body
	 * otherwise; the left one always carries the title block, and carries the
	 * body too when the body is not on the right.
	 */
	split({ header, footer, body, aside, safe, gap, track, ctx, align, side }) {
		const bodySlot = { ...body, grow: true };
		let asideSlot = null;
		let band;

		/* Where the two columns sit against each other, and which side the
       attachment takes. An aside shorter than its body used to pin to the top
       with dead space under it and no way to say otherwise. Both come off a
       fixed set: "a bit lower" is not a position. */
		const columns = (a, b) => (side === "left" ? [b, a] : [a, b]);

		if (aside) {
			aside.width = track;
			asideSlot = aside;
			band = row({
				gap: GUTTER,
				align,
				children: columns(
					stack({ gap, grow: true, children: [header, bodySlot].filter(Boolean) }),
					asideSlot,
				),
			});
		} else if (header) {
			header.width = track;
			band = row({ gap: GUTTER, align, children: columns(header, bodySlot) });
		} else {
			band = bodySlot;
		}

		const root = stack({ gap, children: [band, footer].filter(Boolean) });
		solve(root, safe, ctx);
		return { root, bodySlot, asideSlot };
	},

	/**
	 * The body takes the whole frame, past the safe area to the edge. The header
	 * and the footer are solved into the safe area as usual and overlaid on it,
	 * so the chase reads identically to every other plate in the set while the
	 * content behind it runs edge to edge.
	 *
	 * The body is centred vertically when it is shorter than the frame, which is
	 * the only case where a full-bleed composition has slack to distribute.
	 */
	"full-bleed"({ header, footer, body, safe, page, gap, ctx }) {
		const bodySlot = { ...body, grow: true };

		const h = measureNode(bodySlot, page.w).h;
		const top = h < page.h ? snap((page.h - h) / 2) : 0;
		solve(bodySlot, new Rect(page.x, top, page.w, h), ctx);

		const chaseKids = [header, footer].filter(Boolean);
		const chase = chaseKids.length ? stack({ gap, children: chaseKids }) : null;
		if (chase) solve(chase, safe, ctx);

		// Not solved itself: its two halves were solved into different rects, which
		// is the whole point of the composition. It exists so the renderer and the
		// validator still walk one tree.
		const root = stack({ gap, children: [bodySlot, chase].filter(Boolean) });
		root.rect = page;
		return { root, bodySlot, asideSlot: null };
	},

	/**
	 * One narrow measure, centred horizontally. The footer still spans the full
	 * safe width and still pins to the bottom, because the brand line is the
	 * chase and the chase does not move with the composition.
	 *
	 * The kicker still starts at the top of the safe area, on this layout as on
	 * every other, because that is the property that makes twenty four frames
	 * read as one set and the audit checks it.
	 *
	 * The BODY, though, centres in what is left between the header and the
	 * footer. Holding it to the top as well left a square frame with its lower
	 * half empty and a 4:5 frame worse, which reads as a plate that ran out
	 * rather than one that was composed. Registration stays fixed; content
	 * takes the slack.
	 */
	centred({ header, footer, body, safe, gap, track, ctx }) {
		const bodySlot = { ...body, grow: true };
		const block = stack({ gap, children: [header, bodySlot].filter(Boolean) });
		const x = safe.x + snap((safe.w - track) / 2);

		// The footer is solved at its own height, at the bottom of the safe area.
		let fh = 0;
		if (footer) {
			fh = measureNode(footer, safe.w).h;
			solve(footer, new Rect(safe.x, safe.bottom - fh, safe.w, fh), ctx);
		}

		/* Header and body centre together, as one block.
       Two earlier attempts were both wrong in instructive ways. Holding the
       whole block to the top left the lower half of a square frame empty and
       read as a plate that ran out. Pinning the kicker to the top and centring
       only the body opened a void between the title and the content, so the
       two halves stopped belonging to each other.
       This layout exists for a statement plate, and a statement sits in the
       middle of its frame. The kicker travels with the block it introduces. */
		const from = safe.y;
		const to = safe.bottom - fh - (footer ? space(gap) : 0);
		const bh = measureNode(block, track).h;
		const slack = to - from - bh;
		const top = slack > 0 ? snap(from + slack / 2) : from;
		solve(block, new Rect(x, top, track, bh), ctx);

		const root = stack({ gap, children: [block, footer].filter(Boolean) });
		root.rect = safe;
		return { root, bodySlot, asideSlot: null };
	},
};

/* --------------------------------------------------------------------------
 * Backgrounds
 *
 * Resolved after the solve, because a band is derived from the body it sits
 * behind in exactly the way a rail is derived from the dots it threads. The
 * renderer is handed a rect, never a pair of edges to work out for itself.
 * ------------------------------------------------------------------------ */

function resolveBackground(spec, { page, regions }) {
	// `spec.field` predates `spec.background` and means the same thing.
	const declared = spec.background || (spec.field ? { type: "field", ...spec.field } : null);
	if (!declared) return null;

	if (!BACKGROUND_TYPES.includes(declared.type)) {
		throw new PressError(
			"UNKNOWN_BACKGROUND",
			`background type '${declared.type}' does not exist. The grounds are: ` +
				`${BACKGROUND_TYPES.join(", ")}.`,
		);
	}

	if (declared.type === "image") {
		if (!declared.src) {
			throw new PressError("BACKGROUND_NO_SRC", "an image background needs a src.");
		}
		if (!declared.alt) {
			throw new PressError(
				"BACKGROUND_NO_ALT",
				"an image background needs alt text. Describe the information the picture " +
					"carries, not that it is a picture.",
			);
		}
		return { ...declared, rect: page };
	}

	if (declared.type === "field") {
		return { ...declared, rect: page };
	}

	/* A band is a stripe behind the middle of the frame, so its extent is the
     body's extent, opened up by a step on the spacing scale. Nobody writes the
     two edges: they are the body's edges, which is why a band cannot drift off
     the block it belongs to. */
	const pad = space(declared.pad ?? 4);
	const fill = ground(declared.fill || "raised");
	const body = regions.body;
	if (!body) {
		throw new PressError(
			"BAND_WITHOUT_BODY",
			"a band background is derived from the body region, and this plate has none.",
		);
	}
	const top = snap(body.top - pad);
	const bottom = snap(body.bottom + pad);
	return {
		type: "band",
		fill,
		pad: declared.pad ?? 4,
		rect: new Rect(page.x, top, page.w, bottom - top),
	};
}

/* --------------------------------------------------------------------------
 * helpers
 * ------------------------------------------------------------------------ */

function shift(node, dx, dy) {
	if (node.rect) node.rect = node.rect.translate(dx, dy);
	if (node.children) {
		node.children.forEach((c) => {
			shift(c, dx, dy);
		});
	}
}

/** Tag a subtree, so the validator can tell the chase from the content. */
function markZone(node, props) {
	for (const n of flatten(node)) Object.assign(n, props);
}

export { row, spacer, stack, text };
