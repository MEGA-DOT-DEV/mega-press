/**
 * PRESS / components / specs
 *
 * compareSpecs: two specimen cards side by side. Each card is the full
 * anatomy of one mechanism — a quiet label naming its direction or family,
 * a claim in head type, the call shape in the verbatim voice, a two-node
 * flow whose labelled edge says how the parts reach each other, and a spec
 * sheet of key → value rows under a rule.
 *
 * The reference pair is outbound against inbound: an MCP client dialing out
 * over HTTP, a connector session dialed into over WebSocket. What differs is
 * not a list of bullets but the direction of one arrow and four properties,
 * which is exactly what this card draws.
 *
 * Inside a card the accent is structural, the same on both sides: the call
 * shape and the first flow node carry it, because they are the claim's
 * mechanism; the second node is what the mechanism reaches. The edge arrow
 * is drawn with the house arrowhead, pointing down for "out" and up for
 * "in", with its clause beside it in the mono voice.
 */

import { arrowhead } from "../src/connect.js";
import { box, custom, row, rule, spacer, stack, text } from "../src/solve.js";
import { measure } from "../src/text.js";
import { COLOR, GROUND, lineHeight, PressError, STROKE, space } from "../src/tokens.js";
import { verbatimLines } from "./code.js";

const SIDE_NAMES = ["left", "right"];
const MIN_SPECS = 2;
const MAX_SPECS = 5;
const SPEC_KEY_MAX = 16;

/** A small vertical arrow in the accent: down = dials out, up = dials in. */
const edgeArrow = (dir) => {
	const h = lineHeight("utility");
	const w = space(2);
	return custom({
		measure: () => ({ w, h }),
		paint: (ctx, rect, C) => {
			const x = rect.x + rect.w / 2;
			const top = rect.y + 2;
			const bottom = rect.y + rect.h - 2;
			const points =
				dir === "in"
					? [
							{ x, y: bottom },
							{ x, y: top },
						]
					: [
							{ x, y: top },
							{ x, y: bottom },
						];
			ctx.strokeStyle = C.red;
			ctx.lineWidth = STROKE.connector;
			ctx.beginPath();
			ctx.moveTo(points[0].x, points[0].y);
			ctx.lineTo(points[1].x, points[1].y);
			ctx.stroke();
			const head = arrowhead(points, 8);
			if (head) {
				ctx.fillStyle = C.red;
				for (const r of head) ctx.fillRect(r.x, r.y, r.w, r.h);
			}
		},
	});
};

const flowNode = ({ title, detail }, accent) =>
	box({
		pad: 3,
		border: true,
		borderColor: accent ? COLOR.red : COLOR.black2,
		fill: accent ? GROUND.accent : COLOR.raised,
		gap: 1,
		children: [
			text(title, "utility", { color: COLOR.text }),
			detail ? text(String(detail), "utility", { color: COLOR.quiet }) : null,
		],
	});

export function compareSpecs({ left, right, gap = 5 } = {}) {
	const sides = [left, right];

	sides.forEach((side, i) => {
		const name = SIDE_NAMES[i];
		if (
			!side ||
			typeof side !== "object" ||
			!String(side.label ?? "").trim() ||
			!String(side.title ?? "").trim()
		) {
			throw new PressError(
				"SPECCARDS_SIDE_MISSING",
				`compareSpecs needs both sides, each with a label and a title. The ${name} side is ` +
					`incomplete: an unlabelled card cannot be told from its neighbour.`,
			);
		}
		const flow = side.flow;
		if (
			!flow ||
			typeof flow !== "object" ||
			!String(flow.from?.title ?? "").trim() ||
			!String(flow.to?.title ?? "").trim()
		) {
			throw new PressError(
				"SPECCARDS_FLOW_MISSING",
				`compareSpecs needs a flow on the ${name} side: two named nodes and the edge between ` +
					`them. The flow is the mechanism; without it this is a compare, not a spec card.`,
			);
		}
		const edge = flow.edge;
		if (!edge || !String(edge.text ?? "").trim()) {
			throw new PressError(
				"FLOW_EDGE_MISSING",
				`the ${name} flow has no edge clause. The arrow's sentence — who dials, over what — ` +
					`is the difference the card exists to draw.`,
			);
		}
		const specs = Array.isArray(side.specs) ? side.specs : [];
		if (specs.length < MIN_SPECS) {
			throw new PressError(
				"SPECS_TOO_FEW",
				`compareSpecs needs at least ${MIN_SPECS} spec rows on the ${name} side (got ` +
					`${specs.length}). A card with no properties is a graph fragment.`,
			);
		}
		if (specs.length > MAX_SPECS) {
			throw new PressError(
				"SPECS_TOO_MANY",
				`compareSpecs has ${specs.length} spec rows on the ${name} side; ${MAX_SPECS} is the ` +
					`cap. A longer sheet is a table.`,
			);
		}
		specs.forEach((spec, j) => {
			const key = String(spec?.key ?? "").trim();
			const value = String(spec?.value ?? "").trim();
			if (!key || !value) {
				throw new PressError(
					"SPEC_ROW_INCOMPLETE",
					`spec row ${j + 1} on the ${name} side needs both a key and a value.`,
				);
			}
			if (key.length > SPEC_KEY_MAX) {
				throw new PressError(
					"SPEC_KEY_TOO_LONG",
					`spec key "${key}" is ${key.length} characters; ${SPEC_KEY_MAX} is the cap. ` +
						`A key is one short mono label; the sentence belongs in the value.`,
				);
			}
		});
		const call = String(side.call ?? "").trim();
		if (call && call.includes("\n")) {
			throw new PressError(
				"SPECCARDS_CALL_LINES",
				`the ${name} call shape has line breaks; a call shape is one verbatim line. ` +
					`A longer snippet belongs in a code figure.`,
			);
		}
	});

	/* One key column measure across both cards, from the widest key anywhere,
	   so the two spec sheets align and the eye compares values, not layouts. */
	const keyW =
		Math.ceil(
			Math.max(
				...sides.flatMap((side) =>
					side.specs.map((s) => measure(String(s.key).trim(), "utility")),
				),
			),
		) + space(2);

	const card = (side) => {
		const call = String(side.call ?? "").trim();
		const dir = side.flow.edge.dir === "in" ? "in" : "out";
		return box({
			pad: 4,
			border: true,
			borderColor: COLOR.black2,
			fill: COLOR.panel,
			gap: 2,
			grow: true,
			unit: true,
			children: [
				text(String(side.label).toUpperCase(), "utility", { color: COLOR.quiet }),
				text(side.title, "head", { color: COLOR.text }),
				...(call ? verbatimLines(call, { accentLines: [1] }) : []),
				spacer(1),
				flowNode(side.flow.from, true),
				row({
					gap: 2,
					align: "center",
					children: [
						edgeArrow(dir),
						text(String(side.flow.edge.text), "utility", { color: COLOR.muted }),
					],
				}),
				flowNode(side.flow.to, false),
				spacer(1),
				rule({ weight: STROKE.divider, color: COLOR.black2 }),
				spacer(1),
				stack({
					gap: 2,
					children: side.specs.map((s) =>
						row({
							gap: 2,
							align: "baseline",
							children: [
								text(String(s.key).trim(), "utility", { color: COLOR.quiet, width: keyW }),
								text(String(s.value).trim(), "body", { color: COLOR.ink, grow: true }),
							],
						}),
					),
				}),
			],
		});
	};

	const leftCard = card(left);
	const rightCard = card(right);

	/* The same split compare() uses: two growing cards on the house gutter,
	   stretched so both borders run to one baseline. */
	const node = row({ gap, align: "stretch", children: [leftCard, rightCard] });
	node.columns = { left: leftCard, right: rightCard };
	return node;
}
