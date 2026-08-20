/**
 * PRESS / components / converge
 *
 * Several ephemeral runs above one durable panel they all feed. The reference
 * figure is persistence itself: three workers that each set a value and end,
 * drawn in dashed borders because they no longer exist, and under them the one
 * accent-bordered object that survives every worker that touches it, holding
 * the state they left behind.
 *
 * The claim is the arrows. Each source drops a straight connector into the
 * sink directly below itself, so the funnel is drawn, not implied. The
 * connectors are emitted from placed rects the way every press connector is —
 * the author never draws one, so the author can never forget one. They are
 * built by hand rather than through link(): a top face receives each arrow at
 * its giver's x, and ports cannot express "at the giver's x", only even
 * shares of the face.
 *
 * Inside the sink: a name line with an optional bracket tag, an optional
 * framing clause, one or two labelled ledger columns of verbatim lines (the
 * codeLine voice, so the state reads exactly), and an optional takeaway —
 * one ink line, one muted line, both centred, the sentence the whole figure
 * exists to earn.
 */

import { box, row, rule, spacer, stack, text } from "../src/solve.js";
import { COLOR, DASH, GROUND, PressError, STROKE } from "../src/tokens.js";
import { verbatimLines } from "./code.js";

const MIN_SOURCES = 2;
const MAX_SOURCES = 4;
const MAX_SOURCE_LINES = 3;
const MIN_COLUMN_LINES = 2;
const MAX_COLUMN_LINES = 5;

const linesOf = (value) => {
	if (value == null) return [];
	const raw = Array.isArray(value) ? value.join("\n") : String(value);
	return raw
		.split("\n")
		.map((l) => l.replace(/\s+$/, ""))
		.filter((l) => l.trim().length > 0);
};

/** Name left, small mono tag right, one baseline. */
const nameLine = (name, tag, { nameColor, tagColor }) =>
	row({
		gap: 2,
		align: "baseline",
		children: [
			text(name, "utility", { color: nameColor }),
			stack({ grow: true, children: [] }),
			tag ? text(String(tag), "utility", { color: tagColor }) : null,
		],
	});

export function converge({ sources, sink, gap = 4 } = {}) {
	if (!Array.isArray(sources) || sources.length < MIN_SOURCES) {
		throw new PressError(
			"CONVERGE_SOURCES_TOO_FEW",
			`converge needs at least ${MIN_SOURCES} source runs (got ` +
				`${Array.isArray(sources) ? sources.length : 0}). One run converging is just a box ` +
				`over a box; the funnel is the claim.`,
		);
	}
	if (sources.length > MAX_SOURCES) {
		throw new PressError(
			"CONVERGE_SOURCES_TOO_MANY",
			`converge has ${sources.length} source runs and ${MAX_SOURCES} is the cap. ` +
				`Past that the row is a timeline, not a funnel.`,
		);
	}
	if (!sink || typeof sink !== "object" || !String(sink.name ?? "").trim()) {
		throw new PressError(
			"CONVERGE_SINK_MISSING",
			"converge needs a sink with a name: the one durable thing every source feeds.",
		);
	}
	const columns = Array.isArray(sink.columns) ? sink.columns : [];
	if (columns.length < 1 || columns.length > 2) {
		throw new PressError(
			"SINK_COLUMNS_OFF",
			`the sink needs 1 or 2 labelled ledger columns (got ${columns.length}); ` +
				`the surviving state is what the funnel exists to show.`,
		);
	}

	const sourceNodes = sources.map((s, i) => {
		const name = String(s?.name ?? "").trim();
		if (!name) {
			throw new PressError(
				"CONVERGE_SOURCE_MISSING",
				`converge source ${i + 1} has no name; an unnamed run cannot be told from its neighbour.`,
			);
		}
		const lines = linesOf(s.lines ?? s.code);
		if (lines.length > MAX_SOURCE_LINES) {
			throw new PressError(
				"CONVERGE_SOURCE_LINES",
				`source "${name}" carries ${lines.length} verbatim lines; ${MAX_SOURCE_LINES} is the ` +
					`cap inside a run card. A longer snippet is its own code figure.`,
			);
		}
		const note = String(s.note ?? "").trim();
		return box({
			pad: 3,
			border: true,
			borderColor: COLOR.black2,
			borderDash: DASH.technical,
			fill: COLOR.panel,
			gap: 2,
			grow: true,
			unit: true,
			children: [
				nameLine(name, String(s.tag ?? "").trim(), {
					nameColor: COLOR.text,
					tagColor: COLOR.quiet,
				}),
				...(lines.length ? verbatimLines(lines) : []),
				note ? text(note, "utility", { color: COLOR.quiet }) : null,
			],
		});
	});

	const ledger = (col, i) => {
		const label = String(col?.label ?? "").trim();
		if (!label) {
			throw new PressError(
				"SINK_COLUMN_LABEL_MISSING",
				`sink column ${i + 1} has no label; an unlabelled ledger cannot say what it records.`,
			);
		}
		const lines = linesOf(col.lines);
		if (lines.length < MIN_COLUMN_LINES || lines.length > MAX_COLUMN_LINES) {
			throw new PressError(
				"SINK_COLUMN_LINES",
				`sink column "${label}" carries ${lines.length} lines; a ledger holds ` +
					`${MIN_COLUMN_LINES} to ${MAX_COLUMN_LINES}.`,
			);
		}
		return stack({
			gap: 2,
			grow: true,
			children: [
				text(label, "utility", { color: COLOR.quiet }),
				rule({ weight: STROKE.divider, color: COLOR.black2 }),
				...verbatimLines(lines),
			],
		});
	};

	const lead = String(sink.takeaway?.lead ?? "").trim();
	const detail = String(sink.takeaway?.detail ?? "").trim();

	const sinkNode = box({
		pad: 4,
		border: true,
		borderColor: COLOR.red,
		fill: GROUND.accent,
		gap: 2,
		unit: true,
		children: [
			nameLine(sink.name, sink.tag ? `[${String(sink.tag).trim()}]` : "", {
				nameColor: COLOR.text,
				tagColor: COLOR.red,
			}),
			sink.intro
				? text(String(sink.intro), "body", { color: COLOR.muted, commentary: true })
				: null,
			spacer(2),
			row({ gap: 5, align: "start", children: columns.map(ledger) }),
			...(lead
				? [
						spacer(2),
						rule({ weight: STROKE.divider, color: COLOR.black2 }),
						spacer(1),
						stack({
							gap: 1,
							align: "center",
							children: [
								text(lead, "body", { color: COLOR.text }),
								detail
									? text(detail, "body", { color: COLOR.muted, commentary: true })
									: null,
							],
						}),
					]
				: []),
		],
	});

	const sourcesRow = row({ gap: 4, align: "stretch", children: sourceNodes });
	const node = stack({ gap, children: [sourcesRow, sinkNode] });

	/* The funnel itself: one straight connector per source, from the bottom of
	   the run into the sink directly beneath it. Derived from placed rects at
	   connect time, so an arrow cannot miss its panel. */
	node.press = {
		connect: () => ({
			links: sourceNodes.map((s) => {
				const a = { x: s.rect.cx, y: s.rect.bottom };
				const b = { x: s.rect.cx, y: sinkNode.rect.y };
				return {
					kind: "link",
					from: s.id,
					to: sinkNode.id,
					points: [a, b],
					weight: STROKE.connector,
					color: COLOR.red,
					arrow: true,
					length: b.y - a.y,
				};
			}),
		}),
	};

	node.parts = { sources: sourceNodes, sink: sinkNode };
	return node;
}
