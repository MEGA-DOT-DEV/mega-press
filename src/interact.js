/**
 * PRESS / interact
 *
 * The cabinet, applied to time.
 *
 * A plate is a pure function from a spec to a geometry, and the lab has always
 * re-run it on every control change. This file does nothing except give that
 * fact a name, a closed vocabulary and a validator, so an embedded plate can
 * move without any of the guarantees going soft.
 *
 * The whole design is one sentence:
 *
 *   **An interaction is a parameter sweep over a finite domain, and the plate
 *   must lock at every point in that domain.**
 *
 * Not `onClick: e => {...}`. A callback is an open set: nobody, including the
 * author, can enumerate what it produces, so nobody can check it. A declared
 * domain is closed, so every reachable geometry can be solved at build time
 * and put through the same quoin as a static plate. `buildStates()` does
 * exactly that, and refuses the whole card if any one state fails, in the same
 * way a plate is refused if any one node overflows.
 *
 * ## Tiers, discovered rather than declared
 *
 * After solving, the states are compared. If every rect is identical across
 * them, the interaction is **ink**: it changes fill, stroke and colour, and no
 * geometric invariant can possibly be broken by moving between states.
 * `railSteps({ activeTo })` is already this shape, and has been since long
 * before there was any interaction layer: it touches `fill`, `ring` and
 * `color`, and nothing else.
 *
 * Otherwise the interaction is **reflow**: it changes the node tree, so every
 * state is a real layout that had to lock on its own, and two further
 * cross-state invariants apply.
 *
 * The tier is derived from the solved geometry, never written down by an
 * author, for the same reason a rail is derived from its dots.
 *
 * ## The cross-state invariants
 *
 * These are the ones no single state can check about itself. They are the
 * exact analogue of `build/audit.html`, which checks that the kicker starts at
 * the same y on every plate in the set: the same question, asked across the
 * states of one plate instead of across the plates of one article.
 *
 *   STATE_NOT_LOCKED  some reachable state fails the ordinary validator.
 *                     A card is only as locked as its worst state.
 *
 *   CHASE_JITTER      the header or the footer moves between states. The
 *                     chase is registration: if it drifts while the reader
 *                     presses a button, the card reads as breathing rather
 *                     than as answering.
 *
 *   SCALE_JITTER      a chart silently rescales between states. Swapping the
 *                     data under a bar set whose axis re-derives itself makes
 *                     every state internally honest and the comparison between
 *                     them a lie. Pin `max` and the states are comparable.
 *
 *   HOVER_ONLY        an emphasis interaction with no focusable equivalent.
 *                     A pointer is not available to half the readers of an
 *                     article, and hover does not exist on a phone at all.
 *
 * ## Motion
 *
 * Durations come out of a three step cabinet and there is one easing curve,
 * for the reason `space()` has five values: a set where one card eases over
 * 180ms and the next over 240ms has no rhythm, only noise.
 *
 * Motion is also **derived, never authored**. There is no way to say "slide in
 * from the left by 40px". A run of text moves because the solver put it
 * somewhere else in the next state, and the distance it travels is the
 * difference between two rects that both already exist. This is FLIP, except
 * that the final position is computed rather than measured, because this
 * system knew it before anything was drawn.
 */

import { buildPlate } from "./plate.js";
import { mount } from "./render.js";
import { COLOR, PressError } from "./tokens.js";
import { Report } from "./validate.js";

/* --------------------------------------------------------------------------
 * The vocabulary
 * ------------------------------------------------------------------------ */

/**
 * Four verbs. There are four rather than a general state machine for the same
 * reason there are four layouts: an interaction an author can shape freely is
 * an interaction that drifts, and two cards in one article end up with
 * different affordances for the same gesture.
 */
export const INTERACTIONS = {
	steps: {
		summary: "progressive disclosure along a sequence",
		control: "sequence",
		use: "a process, a migration, anything with an order",
	},
	toggle: {
		summary: "two mutually exclusive readings of one frame",
		control: "segmented",
		exactly: 2,
		use: "before and after, old and new",
	},
	select: {
		summary: "one of a small set of readings",
		control: "segmented",
		use: "the same measurement across three segments",
	},
	emphasis: {
		summary: "one part of the frame brought forward, geometry unchanged",
		control: "pointer",
		use: "a dense table or metric set where one row answers the question",
	},
};

export const INTERACTION_KINDS = Object.keys(INTERACTIONS);

/**
 * A domain of more than this is not a card, it is a video, and it should be a
 * sequence of plates the reader can scroll instead. Eight is generous: the
 * cards in the set use three and four.
 */
export const MAX_STATES = 8;

/* --------------------------------------------------------------------------
 * Motion
 * ------------------------------------------------------------------------ */

/**
 * Steps 1 to 3 cover a state swap, where the motion exists only to stop the
 * change being a jump cut. Step 4 is for explanatory motion, where the path
 * between two states *is* the content and a reader who blinks has missed the
 * argument. A morph runs there and nothing else should.
 */
const MOTION_SCALE = { 1: 120, 2: 200, 3: 320, 4: 560 };

export function motion(step) {
	const v = MOTION_SCALE[step];
	if (v === undefined) {
		throw new PressError(
			"MOTION_OFF_SCALE",
			`motion(${step}) does not exist. The scale is 1..4 (${Object.values(MOTION_SCALE).join(", ")}ms). ` +
				`A transition that seems to need a duration between two steps is carrying meaning ` +
				`that belongs in the type.`,
		);
	}
	return v;
}

export const MOTION_VALUES = Object.values(MOTION_SCALE);

/** One curve. Fast out of the old state, settling into the new one. */
export const EASING = "cubic-bezier(0.2, 0, 0, 1)";

const prefersReducedMotion = () =>
	typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* --------------------------------------------------------------------------
 * The declaration
 * ------------------------------------------------------------------------ */

/**
 * Normalise and refuse `spec.interaction` at author time, before anything is
 * solved. These throw rather than reporting, because a malformed declaration
 * is not a plate that failed to lock: it is a plate that cannot be attempted.
 */
export function declare(spec) {
	const decl = spec.interaction;
	if (!decl) return null;

	const { kind } = decl;
	if (!INTERACTION_KINDS.includes(kind)) {
		throw new PressError(
			"INTERACTION_UNKNOWN",
			`interaction kind '${kind}' does not exist. The verbs are: ${INTERACTION_KINDS.join(", ")}. ` +
				`A card that seems to need a fifth one usually wants two cards.`,
		);
	}

	const over = decl.over;
	if (!Array.isArray(over) || over.length < 2) {
		throw new PressError(
			"INTERACTION_NOT_ENUMERABLE",
			`interaction '${kind}' needs an "over" array of at least two states. An interaction ` +
				`is a sweep over a finite domain, because a domain that cannot be enumerated ` +
				`cannot be validated, and an interaction that cannot be validated is a callback.`,
		);
	}
	if (over.length > MAX_STATES) {
		throw new PressError(
			"TOO_MANY_STATES",
			`interaction '${kind}' declares ${over.length} states and the cap is ${MAX_STATES}. ` +
				`Past this a card is a video. Split it, or let the reader scroll a sequence of plates.`,
		);
	}

	const rule = INTERACTIONS[kind];
	if (rule.exactly && over.length !== rule.exactly) {
		throw new PressError(
			"WRONG_STATE_COUNT",
			`'${kind}' is exactly ${rule.exactly} states and this one declares ${over.length}. ` +
				`Use 'select' for a small set, or 'steps' for a sequence.`,
		);
	}

	const labels = decl.labels || over.map((v) => String(v));
	if (labels.length !== over.length) {
		throw new PressError(
			"LABELS_MISMATCH",
			`interaction '${kind}' has ${over.length} states and ${labels.length} labels. ` +
				`Every state a reader can reach is named, because an unlabelled control is a ` +
				`guess with a cursor on it.`,
		);
	}

	const initial = decl.initial ?? 0;
	if (!Number.isInteger(initial) || initial < 0 || initial >= over.length) {
		throw new PressError(
			"INITIAL_OUT_OF_RANGE",
			`initial ${initial} is not an index into ${over.length} states. It is also the ` +
				`state the exported PNG prints, so it is the one a reader with no JavaScript sees.`,
		);
	}

	/* Refused here rather than at mount, so a duration off the scale is caught
     by `press check` and by the violation suite instead of surviving until
     something is on screen. */
	const motionStep = decl.motion ?? 2;
	motion(motionStep);

	return { kind, over, labels, initial, legend: decl.legend || null, motion: motionStep };
}

/* --------------------------------------------------------------------------
 * Keys
 *
 * Two states can only be tweened between if a run of text in one can be
 * recognised in the other. `src/spec.js` already computes a stable path for
 * every node while compiling, purely to make error messages navigable; this is
 * the same idea promoted to an identity.
 *
 * An explicit `key` on a node wins and is absolute, so a node that genuinely
 * moves in the tree keeps its identity across the move. Everything else is
 * keyed structurally, which is correct exactly while the shape is stable and
 * is supposed to stop matching when it is not: an unmatched node is a node
 * that entered or left, and it should fade rather than fly.
 * ------------------------------------------------------------------------ */

export function assignKeys(root) {
	walkKeys(root, "r");
	return root;
}

function walkKeys(node, path) {
	node._key = node.key ? `#${node.key}` : path;
	if (node.children) {
		node.children.forEach((child, i) => {
			walkKeys(child, `${path}.${i}${child.kind[0]}`);
		});
	}
}

/* --------------------------------------------------------------------------
 * Build every state
 * ------------------------------------------------------------------------ */

const rectSig = (r) => (r ? `${r.x},${r.y},${r.w},${r.h}` : "-");

function geometrySignature(plate) {
	return plate.nodes.map((n) => `${n._key}=${rectSig(n.rect)}`).join("|");
}

/** Every node that published a derived scale, by key. */
function scalesOf(plate) {
	const out = new Map();
	for (const n of plate.nodes) if (n.scale !== undefined) out.set(n._key, n.scale);
	return out;
}

/**
 * Solve the plate once per state, then put the whole set through the quoin.
 *
 * Nothing is reused between states. `spec.build` is called fresh for each one,
 * exactly as `plate.js` demands of `spec.aside`, because a node object carries
 * the rects of the solve it was last part of and a state validated against
 * geometry it is not drawing is worse than no validation at all.
 */
export function buildStates(spec) {
	const decl = declare(spec);
	if (!decl) {
		throw new PressError(
			"NOT_INTERACTIVE",
			`buildStates() needs spec.interaction. A plate without one is a static plate: ` +
				`build it with buildPlate().`,
		);
	}

	const report = new Report();
	const states = decl.over.map((value, i) => {
		const patched = {
			...spec,
			build: (toolkit) => spec.build(toolkit, value),
			aside: spec.aside ? (toolkit) => spec.aside(toolkit, value) : undefined,
		};

		let plate = null,
			thrown = null;
		try {
			plate = buildPlate(patched, { validateNow: false });
		} catch (err) {
			thrown = err;
		}

		if (plate) assignKeys(plate.root);
		return { index: i, value, label: decl.labels[i], plate, thrown };
	});

	/* 1. Every reachable state locks on its own. */
	for (const s of states) {
		if (s.thrown) {
			report.error(
				"STATE_NOT_LOCKED",
				`State ${s.index} ("${s.label}") threw while building: ${s.thrown.message} ` +
					`A card is only as locked as its worst state.`,
				{ state: s.index, code: s.thrown.code },
			);
			continue;
		}
		if (!s.plate.report.ok) {
			for (const e of s.plate.report.errors) {
				report.error(
					"STATE_NOT_LOCKED",
					`State ${s.index} ("${s.label}") does not lock: ${e.code}. ${e.message}`,
					{ state: s.index, code: e.code },
				);
			}
		}
	}

	const solved = states.filter((s) => s.plate);
	if (solved.length < 2) {
		report.error(
			"STATE_UNREACHABLE",
			`Fewer than two states solved, so there is nothing to move between.`,
		);
		return { decl, states, tier: "reflow", report };
	}

	/* 2. The chase does not move.

        Registration is the whole reason twenty five plates read as one set,
        and a card whose title hops 12px when the reader presses "next" has
        thrown that away at the one moment the reader is looking hardest. */
	const base = solved[0];
	for (const s of solved.slice(1)) {
		for (const zone of ["header", "footer"]) {
			const a = base.plate.regions[zone];
			const b = s.plate.regions[zone];
			if (!a || !b) continue;
			if (rectSig(a) !== rectSig(b)) {
				report.error(
					"CHASE_JITTER",
					`The ${zone} moves between state ${base.index} ("${base.label}") and state ` +
						`${s.index} ("${s.label}"): ${rectSig(a)} against ${rectSig(b)}. The chase is ` +
						`registration and does not move with the content. Reserve the body slot across ` +
						`every state, usually by giving the shorter states the same number of rows.`,
					{ zone, from: base.index, to: s.index },
				);
			}
		}
	}

	/* 3. A chart does not silently rescale.

        Every state is internally honest here and the set of them is not: bar
        lengths that mean different things in state 1 and state 2 make the
        comparison the interaction exists to invite into a lie. */
	const baseScales = scalesOf(base.plate);
	for (const s of solved.slice(1)) {
		for (const [key, value] of scalesOf(s.plate)) {
			const was = baseScales.get(key);
			if (was !== undefined && was !== value) {
				report.error(
					"SCALE_JITTER",
					`A chart rescales from ${was} in state ${base.index} ("${base.label}") to ${value} ` +
						`in state ${s.index} ("${s.label}"). Every state is honest on its own and the ` +
						`comparison between them is not. Pin the axis with an explicit max so the ` +
						`states are measured against one scale.`,
					{ key, from: was, to: value },
				);
			}
		}
	}

	/* 4. Tier, derived from the solved geometry. */
	const signatures = solved.map((s) => geometrySignature(s.plate));
	const tier = signatures.every((sig) => sig === signatures[0]) ? "ink" : "reflow";

	/* 5. An emphasis interaction has to name what it emphasises, because the
        controller draws a focusable button per region from exactly this list.
        Hover alone is not an affordance: it does not exist on a phone, and it
        is not reachable from a keyboard on anything. */
	if (decl.kind === "emphasis") {
		const hits = base.plate.nodes.filter((n) => n.hit && n.rect);
		if (!hits.length) {
			report.error(
				"HOVER_ONLY",
				`An 'emphasis' interaction declares no hit regions, so the only way to reach its ` +
					`states is to guess with a pointer. Mark the regions with hit: '<id>' and every ` +
					`one gets a focusable control.`,
			);
		}
	}

	return { decl, states, tier, report };
}

/* --------------------------------------------------------------------------
 * The embed
 * ------------------------------------------------------------------------ */

const EMBED_STYLE = `
.press-embed { display: flex; flex-direction: column; gap: 20px; }
.press-embed__frame { position: relative; overflow: hidden; }
.press-embed__scale { transform-origin: top left; position: relative; }
.press-embed__layer { position: absolute; inset: 0; }
.press-embed__layer[hidden] { display: none; }
.press-embed__controls {
  display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
  font-family: "Geist Pixel", ui-monospace, monospace;
}
.press-embed__legend {
  font-size: 12px; letter-spacing: 0.08em; color: #848484;
  text-transform: uppercase; margin-right: 4px;
}
.press-embed__group { display: flex; flex-wrap: wrap; gap: 0; border: 1px solid #2f2f2f; }
.press-embed__btn {
  appearance: none; border: 0; border-right: 1px solid #2f2f2f; background: #000;
  color: #a1a1a1; font: inherit; font-size: 12px; letter-spacing: 0.06em;
  padding: 9px 14px; cursor: pointer; transition: color 0.15s, background 0.15s;
}
.press-embed__btn:last-child { border-right: 0; }
.press-embed__btn:hover { color: #fafafa; background: #0b0b0b; }
.press-embed__btn[aria-pressed="true"] { color: #fff; background: #ff0000; }
.press-embed__btn:focus-visible { outline: 2px solid #ff0000; outline-offset: 2px; }
.press-embed__btn[disabled] { color: #2f2f2f; cursor: default; background: #000; }
.press-embed__refusal {
  border: 1px solid #ff0000; background: #150000; color: #ffb4b4;
  font-family: "Geist Pixel", ui-monospace, monospace; font-size: 13px; line-height: 1.7;
  padding: 20px 28px; white-space: pre-wrap;
}
@media (prefers-reduced-motion: reduce) {
  .press-embed__layer, .press-embed__layer * { transition: none !important; }
}
`;

let embedStyled = false;
function ensureEmbedStyle(doc) {
	if (embedStyled) return;
	const el = doc.createElement("style");
	el.textContent = EMBED_STYLE;
	doc.head.appendChild(el);
	embedStyled = true;
}

/* --------------------------------------------------------------------------
 * The exploded view
 *
 * `mount()` composes a plate from three layers that occupy exactly the same
 * rect: the ground, the vector ink, and the DOM type. Flat, that is the whole
 * point, and a reader has no way to know the plate is made of anything.
 *
 * Tilting the stack and pushing the layers apart on z turns the architecture
 * into something you can look at. It is the only view in the system where the
 * plate is not the subject: the construction is.
 *
 * Nothing is re-solved and no geometry changes. Every layer keeps the rect it
 * was given, and the transform is applied to the mounted elements, so what is
 * being separated is demonstrably the same plate rather than a diagram of one.
 * ------------------------------------------------------------------------ */

const EXPLODE_STYLE = `
.press-plate { transform-style: preserve-3d; transition: transform 520ms ${EASING}; }
.press-plate > canvas, .press-plate > .press-dom, .press-plate > .press-ground {
  transition: transform 520ms ${EASING}, opacity 260ms linear;
}
/* The perspective belongs here rather than on whatever page is embedding, so
   an exploded view looks the same in the lab and in an article. */
.press-exploded { overflow: visible !important; perspective: 2200px; }
/* An overflow other than visible forces transform-style back to flat, and a
   plate clips by default so it never bleeds. Without this the layers get their
   translateZ and the browser quietly flattens them onto one plane: the stack
   tilts and nothing separates. */
.press-exploded .press-plate {
  overflow: visible;
  /* The plate paints its own black page, and in 3D that background sits in the
     plate's own plane at z 0. Any layer pushed behind it is then occluded by
     it, which is how the first exploded view showed the type floating over an
     ink plane that was empty. Separated, the page is the page behind. */
  background: transparent;
  transform: rotateX(58deg) rotateZ(-28deg) scale(0.58);
}
.press-strata {
  position: absolute; left: 0; top: 0; pointer-events: none;
  font-family: "Geist Pixel", ui-monospace, monospace; font-size: 22px;
  letter-spacing: 0.1em; color: #ff0000; white-space: nowrap;
  opacity: 0; transition: opacity 260ms linear;
}
.press-exploded .press-strata { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .press-plate, .press-plate > *, .press-strata { transition: none !important; }
}
`;

let explodeStyled = false;
function ensureExplodeStyle(doc) {
	if (explodeStyled) return;
	const el = doc.createElement("style");
	el.textContent = EXPLODE_STYLE;
	doc.head.appendChild(el);
	explodeStyled = true;
}

/**
 * What a layer is called, read off the element rather than off its position.
 *
 * A plate with no declared background has two layers and a plate with a
 * dithered ground has three, so naming them by index labels the ink as the
 * ground on most of the set.
 */
function stratumName(el) {
	if (el.classList.contains("press-ground")) return "GROUND";
	if (el.classList.contains("press-dom")) return "TYPE";
	if (el.dataset.pressLayer === "vector") return "INK";
	return "SCREEN";
}

/**
 * Separate, or reassemble, the layers of a mounted plate.
 *
 * @param {Element} host      anything containing a `.press-plate`
 * @param {boolean} on        exploded or flat
 * @param {number}  [spread]  z distance between layers, in plate px
 */
export function explodeLayers(host, on, { spread = 120 } = {}) {
	const doc = host.ownerDocument;
	ensureExplodeStyle(doc);

	for (const plate of host.querySelectorAll(".press-plate")) {
		const strata = [...plate.children].filter(
			(el) =>
				el.tagName === "CANVAS" ||
				el.classList.contains("press-dom") ||
				el.classList.contains("press-ground"),
		);

		/* Centred on the stack's own middle rather than pushed off one end. A
       layer at a large positive z sits close enough to the camera that the
       perspective divide magnifies it off the frame entirely, which is what
       the first attempt did. */
		const mid = (strata.length - 1) / 2;
		strata.forEach((el, i) => {
			el.style.transform = on ? `translateZ(${Math.round((i - mid) * spread)}px)` : "";
			/* Flat, the ground is behind the ink and reads as one image. Separated,
         it is a layer in its own right and wants to be legible as one. */
			el.style.opacity = on && el.tagName === "CANVAS" ? "0.92" : "";
		});

		/* One label per layer, created once and reused, so toggling does not
       accumulate elements. */
		let labels = plate.querySelectorAll(".press-strata");
		if (!labels.length) {
			strata.forEach((el) => {
				const tag = doc.createElement("div");
				tag.className = "press-strata";
				tag.textContent = stratumName(el);
				plate.appendChild(tag);
			});
			labels = plate.querySelectorAll(".press-strata");
		}
		labels.forEach((tag, i) => {
			tag.style.transform = on
				? `translate3d(0px, ${plate.offsetHeight - 40}px, ${Math.round((i - mid) * spread)}px)`
				: "";
		});

		plate.parentElement?.classList.toggle("press-exploded", on);
		let up = plate.parentElement;
		while (up && up !== host.parentElement) {
			if (up.classList.contains("press-embed__frame") || up.classList.contains("plate-frame")) {
				up.classList.toggle("press-exploded", on);
			}
			up = up.parentElement;
		}
	}
}

/** Every positioned run of text in a mounted layer, by key and line. */
function indexLines(layer) {
	const map = new Map();
	for (const el of layer.querySelectorAll("[data-press-key]")) {
		map.set(`${el.dataset.pressKey}#${el.dataset.pressLine}`, el);
	}
	return map;
}

const px = (v) => parseFloat(v) || 0;

/**
 * Mount a plate with its states, its controls and its transitions.
 *
 * Every state is solved once and mounted once, up front. A state change is
 * then a crossfade between two layers that already exist, which is why moving
 * the pointer across a dense metric set does not re-solve anything.
 *
 * @param {object} spec              a plate spec carrying spec.interaction
 * @param {Element} host             where to mount
 * @param {object} [opts]
 * @param {number} [opts.scale]      display scale, 1 = the full 1600px artboard
 * @param {number} [opts.dpr]        device pixel ratio for the vector layer
 * @returns {object} controller      { root, go, current, states, tier, report }
 */
export function mountInteractive(spec, host, { scale = 1, dpr = 2 } = {}) {
	const doc = host.ownerDocument;
	ensureEmbedStyle(doc);

	const built = buildStates(spec);
	const { decl, states, tier, report } = built;

	const root = doc.createElement("div");
	root.className = "press-embed";

	/* A card that does not lock prints its refusal instead of itself, in the
     same voice the CLI uses. An embed that silently rendered its one good
     state would be exactly the failure this system exists to prevent. */
	if (!report.ok) {
		const refusal = doc.createElement("div");
		refusal.className = "press-embed__refusal";
		refusal.textContent =
			`${spec.id} did not lock across its states:\n\n` +
			report.errors.map((e) => `${e.code}\n  ${e.message}`).join("\n\n");
		root.appendChild(refusal);
		host.appendChild(root);
		return { root, report, states, tier, go: () => {}, current: () => -1 };
	}

	const frame = states[0].plate.frame;
	const frameEl = doc.createElement("div");
	frameEl.className = "press-embed__frame";
	frameEl.style.width = `${frame.w * scale}px`;
	frameEl.style.height = `${frame.h * scale}px`;

	const scaleEl = doc.createElement("div");
	scaleEl.className = "press-embed__scale";
	scaleEl.style.transform = `scale(${scale})`;
	scaleEl.style.width = `${frame.w}px`;
	scaleEl.style.height = `${frame.h}px`;
	frameEl.appendChild(scaleEl);
	root.appendChild(frameEl);

	/* Every state, mounted once. */
	const layers = states.map((s, i) => {
		const layer = doc.createElement("div");
		layer.className = "press-embed__layer";
		if (i !== decl.initial) layer.hidden = true;
		layer.style.opacity = i === decl.initial ? "1" : "0";
		scaleEl.appendChild(layer);
		mount(s.plate, layer, { dpr });
		return layer;
	});

	let current = decl.initial;
	const ms = motion(decl.motion);

	/**
	 * A morph, when both states carry the same series under different encodings.
	 *
	 * This is not a crossfade between two pictures of a chart. The incoming
	 * layer's own vector canvas is repainted every frame from the series, at a
	 * coordinate system interpolated between the two encodings, so every
	 * intermediate frame is the same numbers under a map that is genuinely
	 * halfway. Nothing is tweened; the geometry is evaluated.
	 */
	function morphBetween(fromState, toState, layer, baseMs) {
		const a = states[fromState].plate.nodes.find((n) => n.encodingPaint);
		const b = states[toState].plate.nodes.find((n) => n.encodingPaint);
		if (!a || !b?.rect || a.encodingKey === b.encodingKey) return false;

		const canvas = layer.querySelector('canvas[data-press-layer="vector"]');
		if (!canvas) return false;
		const ctx = canvas.getContext("2d"); // already scaled to plate space by mount()
		const rect = b.rect;

		/* One step of the chain always takes the duration the card declared,
       however far the reader jumps, because the component says how many steps
       the jump is. */
		const span =
			typeof b.encodingSpan === "function" ? b.encodingSpan(a.encodingKey, b.encodingKey) : 1;
		const ms = Math.round(baseMs * Math.max(1, span));

		/* Linear time, deliberately. A morph's motion is shaped by the chain it is
       travelling, which the component owns: it eases each leg and holds at each
       waypoint it crosses. Easing here as well would compose two curves nobody
       chose and quietly flatten the pauses that carry the argument. */
		const draw = (t) => {
			ctx.fillStyle = COLOR.page;
			ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
			b.encodingPaint(ctx, rect, a.encodingKey, b.encodingKey, t);
		};

		if (prefersReducedMotion()) {
			draw(1);
			return true;
		}

		/* The timebase is taken from the first frame rather than from a clock read
       before it. The two are the same clock in a browser and are not under a
       virtual time budget, and a morph that silently sat at t=0 for the whole
       transition is not a failure worth being able to have. */
		let start = null;
		let running = true;
		const frame = (now) => {
			if (!running || current !== toState) return;
			if (start === null) start = now;
			const p = ms > 0 ? Math.min(1, (now - start) / ms) : 1;
			draw(p);
			if (p < 1) requestAnimationFrame(frame);
			else running = false;
		};
		requestAnimationFrame(frame);

		/* And the end state is asserted rather than arrived at, so the frame the
       reader stops on is exactly the geometry that was solved and validated,
       never whatever the last animation frame happened to land on. */
		setTimeout(() => {
			if (running && current === toState) {
				running = false;
				draw(1);
			}
		}, ms + 40);

		return true;
	}

	function go(next, { animate = true } = {}) {
		if (next === current || next < 0 || next >= states.length) return;
		const from = layers[current];
		const to = layers[next];
		const previous = current;
		current = next;
		syncControls();

		if (!animate || prefersReducedMotion()) {
			from.hidden = true;
			from.style.opacity = "0";
			to.hidden = false;
			to.style.opacity = "1";
			return;
		}

		/* A morph replaces the crossfade rather than joining it: two encodings
       dissolved through each other is two charts at half opacity, which is the
       one thing a reader cannot read. The incoming layer is shown at once and
       the marks travel. */
		to.hidden = false;
		to.style.transition = "";
		to.style.opacity = "1";
		if (morphBetween(previous, next, to, ms)) {
			from.hidden = true;
			from.style.opacity = "0";
			return;
		}

		/* Reflow only: FLIP, with the destination computed rather than measured.
       A run of text that exists in both states starts at the rect the previous
       state solved for it and travels to the rect this one did. The distance
       is never written down; it is the difference between two solved
       geometries. */
		const moved = [];
		if (tier === "reflow") {
			const before = indexLines(from);
			const after = indexLines(to);
			for (const [key, el] of after) {
				const prev = before.get(key);
				if (!prev) continue;
				const dx = px(prev.style.left) - px(el.style.left);
				const dy = px(prev.style.top) - px(el.style.top);
				if (!dx && !dy) continue;
				el.style.transition = "none";
				el.style.transform = `translate(${dx}px, ${dy}px)`;
				moved.push(el);
			}
		}

		requestAnimationFrame(() => {
			for (const el of moved) {
				el.style.transition = `transform ${ms}ms ${EASING}`;
				el.style.transform = "";
			}
			from.style.transition = `opacity ${ms}ms ${EASING}`;
			to.style.transition = `opacity ${ms}ms ${EASING}`;
			from.style.opacity = "0";
			to.style.opacity = "1";
		});

		setTimeout(() => {
			if (current !== previous) {
				from.hidden = true;
			}
			for (const el of moved) {
				el.style.transition = "";
				el.style.transform = "";
			}
		}, ms + 30);
	}

	/* ---- controls -------------------------------------------------------
     Always real buttons, always focusable, always labelled. The pointer is an
     accelerator on top of them and never the only way in. */

	const controls = doc.createElement("div");
	controls.className = "press-embed__controls";
	controls.setAttribute("role", "group");
	controls.setAttribute("aria-label", `${spec.id} states`);

	if (decl.legend) {
		const legend = doc.createElement("span");
		legend.className = "press-embed__legend";
		legend.textContent = decl.legend;
		controls.appendChild(legend);
	}

	const group = doc.createElement("div");
	group.className = "press-embed__group";
	controls.appendChild(group);

	const button = (label, onClick, aria) => {
		const b = doc.createElement("button");
		b.type = "button";
		b.className = "press-embed__btn";
		b.textContent = label;
		if (aria) b.setAttribute("aria-label", aria);
		b.addEventListener("click", onClick);
		return b;
	};

	let stateButtons = [];
	let prevBtn = null,
		nextBtn = null;

	if (decl.kind === "steps") {
		prevBtn = button("◂", () => go(current - 1), "previous step");
		group.appendChild(prevBtn);
		stateButtons = states.map((s, i) => {
			const b = button(s.label, () => go(i));
			group.appendChild(b);
			return b;
		});
		nextBtn = button("▸", () => go(current + 1), "next step");
		group.appendChild(nextBtn);
	} else {
		stateButtons = states.map((s, i) => {
			const b = button(s.label, () => go(i));
			group.appendChild(b);
			return b;
		});
	}

	function syncControls() {
		stateButtons.forEach((b, i) => {
			b.setAttribute("aria-pressed", String(i === current));
		});
		if (prevBtn) prevBtn.disabled = current === 0;
		if (nextBtn) nextBtn.disabled = current === states.length - 1;
	}
	syncControls();

	/* Arrow keys, once the group has focus. A sequence is a sequence. */
	controls.addEventListener("keydown", (e) => {
		if (e.key === "ArrowRight" || e.key === "ArrowDown") {
			go(current + 1);
			e.preventDefault();
		}
		if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
			go(current - 1);
			e.preventDefault();
		}
	});

	/* ---- the frame itself, as a control ----------------------------------
     A reader looking at a card that clearly has states will try clicking the
     card. Advancing on click is the cheapest possible way to meet that, and it
     costs nothing in guarantees: it reaches the same `go` the buttons do, so a
     click cannot arrive at a state the validator has not already locked.

     It is an accelerator and never the control. The buttons stay, they stay
     focusable and they stay labelled, because a bare click target announces
     nothing to a keyboard or a screen reader and a card whose only affordance
     is "try it and see" is a guess with a cursor on it.

     `emphasis` is excluded: there the pointer already means something, and a
     card cannot have two answers to the same gesture.

     Cycling rather than stopping at the end, so a reader can go round a
     sequence without hunting for the control that resets it. */
	if (decl.kind !== "emphasis") {
		frameEl.style.cursor = "pointer";
		frameEl.addEventListener("click", (e) => {
			/* Text on a plate is real selectable DOM text. A click that ends a drag
         across a paragraph is a selection, not a request for the next state. */
			const selection = doc.defaultView?.getSelection?.();
			if (selection && !selection.isCollapsed) return;
			if (e.target.closest(".press-embed__controls")) return;
			go((current + 1) % states.length);
		});
	}

	/* ---- pointer, for emphasis -------------------------------------------
     Hit tested against the solved rects, because they are right there. The
     regions come from state 0 and every state shares them: an emphasis
     interaction is ink only by definition, and the validator has already
     confirmed the geometry is identical across the set. */
	if (decl.kind === "emphasis") {
		const hits = states[0].plate.nodes.filter((n) => n.hit && n.rect);
		const indexOfHit = (id) => decl.over.indexOf(id);

		const pick = (e) => {
			const box = frameEl.getBoundingClientRect();
			const s = box.width / frame.w;
			const x = (e.clientX - box.left) / s;
			const y = (e.clientY - box.top) / s;
			const found = hits.find(
				(n) => x >= n.rect.left && x <= n.rect.right && y >= n.rect.top && y <= n.rect.bottom,
			);
			if (!found) return;
			const i = indexOfHit(found.hit);
			if (i >= 0) go(i);
		};

		frameEl.addEventListener("pointermove", pick);
		frameEl.addEventListener("pointerdown", pick);
		frameEl.addEventListener("pointerleave", () => go(decl.initial));
	}

	root.appendChild(controls);
	host.appendChild(root);

	return {
		root,
		report,
		states,
		tier,
		decl,
		go,
		current: () => current,
	};
}
