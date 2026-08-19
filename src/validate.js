/**
 * PRESS / validate
 *
 * The quoin. A forme that is not locked does not go on the press.
 *
 * Everything here is checked against the solved geometry, not against the
 * source, so a rule that reads the same numbers the renderer will draw cannot
 * be fooled by a component that meant well. Each invariant names the failure
 * it exists to prevent, because a validator that only says "invalid" teaches
 * nobody anything.
 *
 * These are the checks that a model producing a plate cannot talk its way
 * past. They are not style advice; they are the difference between a plate
 * that prints and one that does not.
 */

import { EM_DASH } from "./text.js";
import {
	COLOR,
	COMMENTARY_ROLE,
	CONTRAST,
	contrast,
	MIN_RULE_SEPARATION,
	MIN_SEMANTIC_STROKE,
	minTypeSize,
	phoneScale,
	TYPE_ROLES,
	type as typeOf,
	typeSize,
	UNIT,
	UNIT_BUDGET,
	UNIT_BUDGET_RULED,
} from "./tokens.js";

export class Report {
	constructor() {
		this.errors = [];
		this.warnings = [];
	}

	error(code, message, detail = {}) {
		this.errors.push({ code, message, detail });
		return this;
	}
	warn(code, message, detail = {}) {
		this.warnings.push({ code, message, detail });
		return this;
	}

	get ok() {
		return this.errors.length === 0;
	}

	format() {
		const lines = [];
		for (const e of this.errors) lines.push(`  ERROR  ${e.code}  ${e.message}`);
		for (const w of this.warnings) lines.push(`  warn   ${w.code}  ${w.message}`);
		lines.push(`\n  ${this.errors.length} error(s), ${this.warnings.length} warning(s)`);
		return lines.join("\n");
	}

	throwIfFailed(name) {
		if (!this.ok) {
			const err = new Error(`Plate "${name}" did not lock:\n${this.format()}`);
			err.report = this;
			throw err;
		}
		return this;
	}
}

/* --------------------------------------------------------------------------
 * The invariants
 * ------------------------------------------------------------------------ */

export function validate(plate) {
	const r = new Report();
	const {
		frame,
		safe,
		nodes,
		links = [],
		rails = [],
		rules = [],
		layout = "stacked",
		background = null,
	} = plate;

	const page = plate.page || {
		left: 0,
		top: 0,
		right: frame.w,
		bottom: frame.h,
		contains: () => true,
	};

	const texts = nodes.filter((n) => n.kind === "text");
	const painted = nodes.filter((n) => n.rect && n.kind !== "stack" && n.kind !== "grid");

	/* 1. Containment.

        A frame whose content overflows silently pushes the footer outside the
        canvas, and the screenshot still looks plausible.

        Two boxes, not one, because `full-bleed` means what it says: the body
        is meant to run past the safe area to the frame edge. The check is not
        dropped for it, it is moved. Content that bleeds is held to the frame,
        which is the edge that actually crops, and everything else, including
        the whole chase in every layout, is still held to the safe area. A
        bleed layout that ran 20px past the frame edge would still be refused,
        and the header and footer overlaid on it are still refused if they
        leave the safe area by a pixel.

        One overflow produces one error. Reporting every element that got
        pushed past the bottom edge turns a single "this frame carries too
        much" into a wall of consequences, and the author then fixes the last
        line instead of the cause. */
	const held = painted.filter((n) => !n.bleed);
	const contentBottom = held.length ? Math.max(...held.map((n) => n.rect.bottom)) : safe.bottom;
	const overflow = contentBottom - safe.bottom;
	if (overflow > 0.5) {
		r.error(
			"CONTENT_OVERFLOW",
			`The plate runs ${Math.ceil(overflow)}px past the bottom of its safe area ` +
				`(content ends at ${contentBottom.toFixed(0)}, the safe area ends at ${safe.bottom}). ` +
				`Remove information before reducing typography: drop an information unit, ` +
				`a lead line, or a note.`,
			{ overflow, contentBottom, safeBottom: safe.bottom },
		);
	}

	for (const n of painted) {
		const box = n.bleed ? page : safe;

		// Bottom breaks are all consequences of the single overflow above.
		const bottomOnly =
			n.rect.bottom > box.bottom &&
			n.rect.left >= box.left - 0.5 &&
			n.rect.right <= box.right + 0.5 &&
			n.rect.top >= box.top - 0.5;
		if (bottomOnly && !n.bleed) continue;

		if (!box.contains(n.rect)) {
			const over = {
				left: Math.max(0, box.left - n.rect.left),
				top: Math.max(0, box.top - n.rect.top),
				right: Math.max(0, n.rect.right - box.right),
				bottom: Math.max(0, n.rect.bottom - box.bottom),
			};
			const worst = Object.entries(over).sort((a, b) => b[1] - a[1])[0];
			if (n.bleed) {
				r.error(
					"OUTSIDE_FRAME",
					`${describe(n)} bleeds ${worst[1].toFixed(1)}px past the ${worst[0]} edge of the ` +
						`frame. A full-bleed body may leave the safe area, but nothing may leave the ` +
						`frame: past this edge it is cropped, not printed.`,
					{ node: n.id, over },
				);
			} else {
				r.error(
					"OUTSIDE_SAFE_AREA",
					`${describe(n)} leaves the safe area by ${worst[1].toFixed(1)}px on the ${worst[0]}. ` +
						`Remove information before enlarging the frame.`,
					{ node: n.id, over },
				);
			}
		}
	}

	/* 2. Legibility floor.
        The most common failure in this system was body copy at 13 to 15px,
        which lands around 3px on a phone. */
	const floor = minTypeSize(frame.w);
	const scale = phoneScale(frame.w);
	for (const n of texts) {
		const size = typeSize(n.role);
		if (size < floor) {
			r.error(
				"TYPE_BELOW_FLOOR",
				`${describe(n)} is ${size}px, which is ${(size * scale).toFixed(1)}px on a ` +
					`390px phone. The floor for a ${frame.w}px frame is ${floor}px.`,
				{ node: n.id, size, onPhone: size * scale },
			);
		}
	}

	/* 2b. The contrast floor.
         The twin of the check above, and the same argument. That one asks
         whether a run is big enough to see; this one asks whether it is
         separated enough from what it sits on to see. Both are arithmetic, and
         both exist because a plate is judged at full size on a good display by
         the person who made it and read at a quarter of that size by everybody
         else.

         The ground is resolved, not assumed. A run inside a filled box sits on
         that box, a run over a band sits on the band, and everything else sits
         on the page. A field or a picture ground is skipped on purpose: both
         clear themselves around the solved rects of the type, so the ink under
         a run is not the ink beside it, and a single ratio would describe
         neither. */
	const parentOf = new Map();
	(function link(n) {
		if (!n?.children) return;
		for (const c of n.children) {
			parentOf.set(c, n);
			link(c);
		}
	})(plate.root);

	/** The colour a run is actually painted in, matching render.js exactly. */
	const inkOf = (n) => n.color || (typeOf(n.role).family === "mono" ? COLOR.text : COLOR.muted);

	const bandRect = background && background.type === "band" ? background.rect : null;
	const skipGround = background && (background.type === "field" || background.type === "image");

	function groundOf(n) {
		for (let p = parentOf.get(n); p; p = parentOf.get(p)) {
			if (p.kind === "box" && p.fill) return p.fill;
		}
		if (bandRect && n.rect && bandRect.contains?.(n.rect)) {
			return background.fill;
		}
		return COLOR.page;
	}

	if (!skipGround) {
		for (const n of texts) {
			const fg = inkOf(n),
				bg = groundOf(n);
			let ratio;
			try {
				ratio = contrast(fg, bg);
			} catch {
				continue;
			}
			if (ratio + 1e-9 < CONTRAST.text) {
				r.error(
					"CONTRAST_BELOW_FLOOR",
					`${describe(n)} is ${fg} on ${bg}, which is ${ratio.toFixed(2)}:1. The floor is ` +
						`${CONTRAST.text}:1, because every run on a plate is small text by the time it is ` +
						`published. Use a lighter ink or a darker ground: both come out of the cabinet, ` +
						`so neither is a colour anybody has to choose.`,
					{ node: n.id, fg, bg, ratio },
				);
			}
		}
	}

	/* 3. One title, one focal numeral.
        A long title is allowed to step from 'display' down to 'head', so its
        identity travels on a flag rather than on the size it ended up at.
        What must stay unique is the claim, not the point size. */
	const titles = texts.filter((n) => n.isTitle);
	if (titles.length === 0) {
		if (plate.chrome?.title !== false) {
			r.error("NO_TITLE", "The plate has no title. Every frame states exactly one claim.");
		}
	} else if (titles.length > 1) {
		r.error(
			"MULTIPLE_TITLES",
			`${titles.length} texts are marked as the title (${titles.map((t) => `"${short(t.text)}"`).join(", ")}). ` +
				`Exactly one per frame.`,
			{ ids: titles.map((t) => t.id) },
		);
	}

	const rogueDisplay = texts.filter((n) => !n.isTitle && n.role === "display");
	if (rogueDisplay.length) {
		r.error(
			"DISPLAY_NOT_TITLE",
			`${rogueDisplay.length} non-title text(s) set at 'display' ` +
				`(${rogueDisplay.map((t) => `"${short(t.text)}"`).join(", ")}). ` +
				`'display' is the frame title only.`,
			{ ids: rogueDisplay.map((t) => t.id) },
		);
	}

	const heroes = texts.filter((n) => n.role === "datumHero");
	if (heroes.length > 1) {
		r.error(
			"MULTIPLE_HERO_NUMERALS",
			`${heroes.length} numerals set at 'datumHero'. There is one focal numeral per frame.`,
			{ ids: heroes.map((t) => t.id) },
		);
	}

	/* 4. Commentary never outranks content.
        Takeaway bars at head annotating content at list made every aside
        louder than its own frame. */
	const commentarySize = typeSize(COMMENTARY_ROLE);
	for (const n of texts) {
		if (n.commentary && typeSize(n.role) > commentarySize) {
			r.error(
				"COMMENTARY_TOO_LOUD",
				`${describe(n)} is marked commentary but set at '${n.role}' (${typeSize(n.role)}px). ` +
					`Commentary is always '${COMMENTARY_ROLE}' (${commentarySize}px).`,
				{ node: n.id },
			);
		}
	}

	/* 5. House style. */
	for (const n of texts) {
		if (EM_DASH.test(n.text)) {
			r.error(
				"EM_DASH",
				`${describe(n)} contains an em or en dash. Use a full stop, a comma, or a colon.`,
				{ node: n.id },
			);
		}
	}

	/* 6. Rule discipline.
        Within one frame, horizontal rules either span the same measure or
        there is only one of them. Two near-parallel lines at slightly
        different widths read as a rendering fault. */
	const horizontal = rules.filter((x) => Math.abs(x.points[0].y - x.points[1].y) < 0.5);
	if (horizontal.length > 1) {
		const measures = [...new Set(horizontal.map((x) => Math.round(x.measure)))];
		if (measures.length > 1) {
			r.error(
				"RULE_MEASURE_MISMATCH",
				`${horizontal.length} horizontal rules span ${measures.length} different measures ` +
					`(${measures.join(", ")}px). Rules either share a measure or there is only one.`,
				{ measures },
			);
		}
		// Two rules closer than s3 read as one broken double line.
		const ys = horizontal.map((x) => x.y).sort((a, b) => a - b);
		for (let i = 1; i < ys.length; i++) {
			const gap = ys[i] - ys[i - 1];
			if (gap > 0.5 && gap < MIN_RULE_SEPARATION) {
				r.error(
					"RULES_TOO_CLOSE",
					`Two horizontal rules sit ${gap.toFixed(1)}px apart at y=${ys[i - 1].toFixed(0)} and ` +
						`y=${ys[i].toFixed(0)}. Anything under ${MIN_RULE_SEPARATION}px reads as one broken ` +
						`double line. Give the block an explicit margin.`,
					{ gap },
				);
			}
		}
	}

	/* 7. Connectors survive reduction.
        A 1px red hairline is 0.23px on a phone and disappears. */
	for (const l of [...links, ...rails]) {
		if (l.kind === "link" && l.weight < MIN_SEMANTIC_STROKE) {
			r.error(
				"STROKE_TOO_THIN",
				`A connector is ${l.weight}px, which is ${(l.weight * scale).toFixed(2)}px on a phone.`,
				{ weight: l.weight },
			);
		}
	}

	/* 8. Rails are derived, not placed.
        Recomputed here from the marker rects the renderer will use, so a rail
        that drifted between authoring and placement is caught. */
	for (const rl of rails) {
		const marks = rl.markers.map((id) => nodes.find((n) => n.id === id)).filter(Boolean);
		if (marks.length < 2) continue;
		const key = rl.axis === "y" ? "cx" : "cy";
		for (const m of marks) {
			const drift = Math.abs(m.rect[key] - rl.at);
			if (drift > 0.5) {
				r.error(
					"RAIL_OFF_CENTRE",
					`The rail sits at ${rl.at.toFixed(1)} but marker ${m.id} has its centre at ` +
						`${m.rect[key].toFixed(1)} (drift ${drift.toFixed(1)}px). Derive the rail from the ` +
						`marker; do not position it beside one.`,
					{ drift, marker: m.id },
				);
			}
		}
	}

	/* 9. Nothing overlaps.
        A flex column compresses its children rather than reporting an error,
        so elements overlap while nothing looks broken in the DOM.

        `full-bleed` overlays the chase on the content on purpose, so one pair
        of zones is exempt: a chase node over a bleeding body node. The
        exemption stops exactly where legibility does. Type over type is never
        readable at any opacity, in any layout, so a chase text run sitting on
        a body text run is still refused, under its own code, because the
        author's fix is different: it is not "move this box", it is "this
        picture cannot carry a header". */
	const solid = painted.filter((n) => n.kind === "text" || n.kind === "box" || n.kind === "marker");
	for (let i = 0; i < solid.length; i++) {
		for (let j = i + 1; j < solid.length; j++) {
			const a = solid[i],
				b = solid[j];
			if (isAncestor(a, b) || isAncestor(b, a)) continue;
			const area = a.rect.overlap(b.rect);
			if (area <= UNIT * UNIT) continue;

			const overlay = (a.chase && b.bleed) || (b.chase && a.bleed);
			if (overlay) {
				if (a.kind === "text" && b.kind === "text") {
					r.error(
						"OVERLAY_ILLEGIBLE",
						`${describe(a)} and ${describe(b)} overlap by ${Math.round(area)}px² and both ` +
							`are text. A '${layout}' layout overlays the chase on the content, but type ` +
							`over type is unreadable. Give the body fewer words, or a composition that ` +
							`does not put the header on top of them.`,
						{ a: a.id, b: b.id, area },
					);
				}
				continue;
			}

			r.error(
				"OVERLAP",
				`${describe(a)} and ${describe(b)} overlap by ${Math.round(area)}px². ` +
					`Nothing on a plate may sit on top of anything else.`,
				{ a: a.id, b: b.id, area },
			);
		}
	}

	/* 10. Unit budget.
         A card, a step, a stat or a legend row each count as one. */
	const units = nodes.filter((n) => n.unit).length;
	const ruled = nodes.filter((n) => n.unit && n.ruledRow).length;
	const budget = ruled === units && units > 0 ? UNIT_BUDGET_RULED : UNIT_BUDGET;
	if (units > budget) {
		r.error(
			"OVER_BUDGET",
			`The plate carries ${units} information units and the budget is ${budget}. ` +
				`Split the frame rather than shrinking the type.`,
			{ units, budget },
		);
	}

	/* 11. Grid rules never break at a gap.
         Never draw a rule with a cell border inside a gapped grid: it breaks
         at every column gap and produces a dashed line nobody asked for. */
	const PARTIAL_SIDES = ["top", "right", "bottom", "left"];
	for (const g of nodes.filter((n) => n.kind === "grid")) {
		// A full border on a cell is the correct pattern and is not a rule. Only a
		// single-edge border inside a gapped grid produces the dashed line.
		const kids = (g.children || []).filter((c) => PARTIAL_SIDES.includes(c.borderSides));
		if (kids.length && g.gap) {
			r.error(
				"RULE_BREAKS_AT_GAP",
				`Grid ${g.id} has ${g.cols} gapped columns whose cells draw their own edge rule. ` +
					`That rule breaks at every column gap. Draw one rule across the grid instead.`,
				{ grid: g.id },
			);
		}
	}

	/* 12. Every size came from the scale. */
	for (const n of texts) {
		if (!TYPE_ROLES.includes(n.role)) {
			r.error("TYPE_OFF_SCALE", `${describe(n)} uses role '${n.role}', which is not on the scale.`);
		}
	}

	/* 13. Brand. Host chrome may hide it (article embed). */
	if (plate.chrome?.brand !== false && !texts.some((n) => /mega\.dev/i.test(n.text))) {
		r.error("NO_BRAND", `The plate has no mega.dev footer. Artifacts are branded mega.dev.`);
	}

	/* 14. A ground is full bleed.
         A background that stops short of the frame edge is not a ground, it is
         a panel that failed to reach, and it shows up as a hairline of page
         black down one side of the printed image. Checked from the resolved
         rect the renderer will fill, not from the author's intent. */
	if (background?.rect) {
		const g = background.rect;
		if (g.left > 0.5 || g.right < frame.w - 0.5) {
			r.error(
				"BACKGROUND_NOT_FULL_BLEED",
				`The ${background.type} background spans x ${g.left.toFixed(0)} to ${g.right.toFixed(0)} ` +
					`on a ${frame.w}px frame. A ground runs to both edges or it is a panel, and a panel ` +
					`is content.`,
				{ left: g.left, right: g.right },
			);
		}

		/* 15. A band is a band.
           The whole point of the band is that it marks the middle of the frame,
           so the reader sees the header and the footer sitting on the page and
           the body sitting on a plate. One that reaches the top or bottom edge
           has quietly become a full ground and no longer says anything. */
		if (background.type === "band" && (g.top <= 0.5 || g.bottom >= frame.h - 0.5)) {
			r.error(
				"BAND_NOT_A_BAND",
				`The band runs y ${g.top.toFixed(0)} to ${g.bottom.toFixed(0)} on a ${frame.h}px ` +
					`frame, so it reaches an edge and reads as a full ground rather than as a stripe ` +
					`behind the body. Reduce its pad, or use a field ground if the whole frame was ` +
					`the intention.`,
				{ top: g.top, bottom: g.bottom },
			);
		}
	}

	return r;
}

/* --------------------------------------------------------------------------
 * helpers
 * ------------------------------------------------------------------------ */

function isAncestor(a, b) {
	if (!a.children) return false;
	for (const c of a.children) {
		if (c === b || isAncestor(c, b)) return true;
	}
	return false;
}

const short = (s, n = 28) => (String(s).length > n ? `${String(s).slice(0, n)}…` : String(s));

function describe(n) {
	if (n.kind === "text") return `text "${short(n.text)}" (${n.role})`;
	return `${n.kind} ${n.id}`;
}
