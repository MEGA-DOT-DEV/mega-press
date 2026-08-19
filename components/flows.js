/**
 * PRESS / components / flows
 *
 * Two labelled columns side by side, each column its own vertical transcript.
 *
 * This is the most common figure archetype in the reference set: DEDICATED
 * INTEGRATIONS against AGENT BUILDS ITS OWN, JOB against WORKFLOW, REMEMBER
 * against RECALL. The contrast is the claim, and the two flows are the
 * evidence for it, read top to bottom on either side of one gutter.
 *
 * Each column is built from the same per-event rows timelineVertical draws,
 * via transcriptEvents in components/timeline.js. Reuse, not duplication: a
 * transcript event carries the same date column, marker, title, detail, code
 * block and chips here as it does on a single rail, and the two can never
 * drift apart because there is one implementation.
 *
 * Each column derives its own rail from its own markers, exactly as
 * timelineVertical does, so the two rails always run through their own
 * columns' marks and never borrow each other's x.
 */

import { rail as deriveRail } from "../src/connect.js";
import { row, stack, text } from "../src/solve.js";
import { COLOR, PressError, STROKE, space } from "../src/tokens.js";
import { transcriptEvents } from "./timeline.js";

const SIDE_NAMES = ["left", "right"];
const MIN_EVENTS = 2;
const MAX_EVENTS = 6;

export function compareFlows({ left, right, gap = 5, markerSize = space(2) } = {}) {
	const sides = [left, right];

	sides.forEach((side, i) => {
		const name = SIDE_NAMES[i];
		if (!side || typeof side !== "object" || !String(side.label ?? "").trim()) {
			throw new PressError(
				"COMPAREFLOWS_SIDE_MISSING",
				`compareFlows needs both sides, each with a label. The ${name} side is ` +
					`${side && typeof side === "object" ? "missing its label" : "missing"}: an unlabelled ` +
					`column cannot be told from its neighbour, and the contrast is the claim.`,
			);
		}
		const items = side.items;
		if (!Array.isArray(items) || items.length < MIN_EVENTS) {
			throw new PressError(
				"COMPAREFLOWS_TOO_FEW",
				`compareFlows needs at least ${MIN_EVENTS} events on each side (the ${name} side has ` +
					`${Array.isArray(items) ? items.length : 0}). One event is not a flow.`,
			);
		}
		if (items.length > MAX_EVENTS) {
			throw new PressError(
				"COMPAREFLOWS_TOO_MANY",
				`compareFlows has ${items.length} events on the ${name} side and ${MAX_EVENTS} is the ` +
					`cap. A longer run belongs on its own timelineVertical plate.`,
			);
		}
	});

	const column = (side, name) => {
		/* The same event rows timelineVertical draws, with unitPerRow: false: a
		   two-column contrast is ONE claim about two flows, not eight claims
		   about eight events. Counting every event would bust the plate budget
		   for a figure the reader takes in as two strokes, so the whole column
		   is marked as one unit below and the plate carries 2. */
		const { rows, markers } = transcriptEvents(side.items, {
			markerSize,
			unitPerRow: false,
			who: `compareFlows ${name} column "${side.label}"`,
		});

		const events = stack({ gap: 4, children: rows });

		/* The column's own rail, from the column's own markers, the same way
		   timelineVertical derives its. Two columns, two rails, and neither can
		   land in the other's gutter because each is derived from placed marks. */
		events.press = {
			connect: () => ({
				rails: [deriveRail(markers, { axis: "y", weight: STROKE.connector, color: COLOR.black2 })],
			}),
		};
		events.markers = markers;

		return stack({
			gap: 3,
			grow: true,
			unit: true,
			children: [
				text(side.label, "utility", { color: COLOR.quiet }),
				side.intro ? text(side.intro, "body", { color: COLOR.muted, commentary: true }) : null,
				events,
			],
		});
	};

	const leftColumn = column(left, "left");
	const rightColumn = column(right, "right");

	/* The same split compare() uses: two growing columns in one row, so the
	   gutter here is the house gutter and the two archetypes sit on one grid. */
	const node = row({ gap, align: "start", children: [leftColumn, rightColumn] });
	node.columns = { left: leftColumn, right: rightColumn };
	return node;
}
