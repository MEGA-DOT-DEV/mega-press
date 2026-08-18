/**
 * PRESS / components / graph
 *
 * Labelled boxes with connections between them. In the webflow set this was
 * `system-node`, `network-node` and `infra-node`: three names, three
 * stylesheets, three chances to draw an arrow that points at nothing.
 *
 * Here the edges are declared by name and the arrows are derived from the
 * placed boxes. An edge that names a node which does not exist throws at build
 * time, so a missing arrow is not a thing that can happen quietly.
 *
 * Three things this knows that a straight row of boxes does not:
 *
 *   ranks       a node may say which rank it belongs to, so several nodes can
 *               share one position in the flow. That is what makes a fan-in
 *               (three sources into one hub) expressible at all.
 *   routing     every edge is routed around the other boxes. The old three
 *               segment elbow put its turn at the midpoint whether or not a
 *               box was standing there, which is how an arrow ends up running
 *               through a label.
 *   ports       when several edges land on one face they share it, at offsets
 *               derived from how many there are. Three arrows into `left` used
 *               to arrive at the same pixel and read as one thick arrow.
 *
 * None of the three introduces a coordinate. A rank is an integer position, a
 * port is a share of a face, and a route is computed from the same rects the
 * renderer draws.
 */

import { routedLink } from "../src/connect.js";
import { box, custom, grid, text } from "../src/solve.js";
import { COLOR, STROKE } from "../src/tokens.js";

/** Faces whose length runs down the page, so ports on them are ordered by y. */
const VERTICAL_FACE = { left: true, right: true };

/**
 * A cell with nothing in it. Ranks are centred against the longest rank by
 * padding them, and the padding has to be a real node so the grid keeps its
 * shape. It reports no height and paints nothing.
 */
const hole = () => custom({ measure: (w) => ({ w, h: 0 }) });

/**
 * @param {object[]} nodes  { key, title, detail?, accent?, rank?, order? }
 *                          `column` is an alias for `rank` when dir is 'x' and
 *                          `row` is an alias for `rank` when dir is 'y'. The
 *                          other of the pair names the order within the rank.
 * @param {object[]} edges  { from, to, fromAnchor?, toAnchor?, color?, arrow? }
 * @param {string}   dir    'x' runs the ranks left to right, 'y' top to bottom
 * @param {number}   gap      scale step between ranks, and so the width of the
 *                            channel every connector turns in
 * @param {number}   rankGap  scale step between the members of one rank
 */
export function graph({
	nodes: specs,
	edges = [],
	dir = "x",
	gap = 5,
	rankGap = gap,
	pad = 4,
	arrow = true,
} = {}) {
	if (!specs || specs.length < 2) {
		throw new Error("graph needs at least two nodes. A single box is not a system.");
	}
	if (dir !== "x" && dir !== "y") {
		throw new Error(
			`graph dir '${dir}' does not exist. Use 'x' for ranks left to right, 'y' for top to bottom.`,
		);
	}

	const byKey = {};

	const cells = specs.map((spec) => {
		const cell = box({
			pad,
			border: true,
			borderColor: spec.accent ? COLOR.red : COLOR.black2,
			fill: COLOR.panel,
			gap: 1,
			unit: true,
			children: [
				text(spec.title, "head", { color: COLOR.text }),
				spec.detail ? text(spec.detail, "body", { color: COLOR.muted, commentary: true }) : null,
			],
		});
		if (byKey[spec.key]) {
			throw new Error(
				`graph has two nodes with key "${spec.key}". Keys address edges, so they must be unique.`,
			);
		}
		cell.key = spec.key;
		byKey[spec.key] = cell;
		return cell;
	});

	/* ---- ranks -----------------------------------------------------------
     A rank is a position in the flow. Nodes that share one are drawn across
     the other axis, which is the whole of what makes a fan-in or a fan-out
     a shape this component can express.

     If nobody declares a rank the old behaviour is exact: one node per rank,
     in declaration order, which is one row or one column. */

	const rankKey = dir === "x" ? "column" : "row";
	const orderKey = dir === "x" ? "row" : "column";

	const declared = specs.filter((s) => s.rank !== undefined || s[rankKey] !== undefined);
	if (declared.length && declared.length !== specs.length) {
		const missing = specs.filter((s) => s.rank === undefined && s[rankKey] === undefined);
		throw new Error(
			`graph: ${declared.length} of ${specs.length} nodes declare a rank and ` +
				`${missing.map((s) => `"${s.key}"`).join(", ")} do not. Ranks are how the flow is ` +
				`ordered, so either every node states one or none does.`,
		);
	}

	const rankOf = specs.map((s, i) => {
		if (!declared.length) return i;
		const r = s.rank !== undefined ? s.rank : s[rankKey];
		if (!Number.isInteger(r) || r < 0) {
			throw new Error(`graph node "${s.key}" has rank ${r}. A rank is a whole number from 0 up.`);
		}
		return r;
	});

	const rankCount = Math.max(...rankOf) + 1;
	for (let r = 0; r < rankCount; r++) {
		if (!rankOf.includes(r)) {
			throw new Error(
				`graph has nodes at rank ${rankCount - 1} but nothing at rank ${r}. Ranks are ` +
					`consecutive positions in a flow, so an empty one is a gap in the story rather ` +
					`than a gap in the drawing.`,
			);
		}
	}
	if (rankCount < 2) {
		throw new Error("graph needs at least two ranks. One rank is a list, and cards() draws that.");
	}

	const ranks = Array.from({ length: rankCount }, () => []);
	specs.forEach((s, i) => {
		const order = s.order !== undefined ? s.order : s[orderKey];
		ranks[rankOf[i]].push({ cell: cells[i], order, seq: i });
	});
	for (const members of ranks) {
		members.sort((a, b) => {
			const ao = a.order,
				bo = b.order;
			if (ao !== undefined && bo !== undefined && ao !== bo) return ao - bo;
			if (ao !== undefined && bo === undefined) return -1;
			if (ao === undefined && bo !== undefined) return 1;
			return a.seq - b.seq;
		});
	}

	/* ---- the frame -------------------------------------------------------
     One grid. Ranks run along `dir`, members of a rank across it, and a rank
     shorter than the longest one is centred against it by holes. The offset
     is derived from the two counts; nobody picks it.

     With one node per rank this reduces exactly to the row or column the
     component drew before, at the same coordinates. */

	const across = Math.max(...ranks.map((m) => m.length));
	const cols = dir === "x" ? rankCount : across;
	const rows = dir === "x" ? across : rankCount;

	const slots = Array.from({ length: rows * cols }, hole);
	ranks.forEach((members, r) => {
		const offset = Math.floor((across - members.length) / 2);
		members.forEach((m, k) => {
			const along = offset + k;
			slots[dir === "x" ? along * cols + r : r * cols + along] = m.cell;
		});
	});

	// `gap` separates the ranks, because that is the channel every connector has
	// to turn in. `rankGap` separates the members of one rank, where nothing has
	// to fit, so a fan-in can be tight down the page and open across it.
	const node =
		dir === "x"
			? grid({ cols, gap, rowGap: rankGap, children: slots })
			: grid({ cols, gap: rankGap, rowGap: gap, children: slots });

	/* ---- edges -----------------------------------------------------------
     Default anchors follow the layout direction, so an edge in a row leaves
     the right face and arrives at the left face without anyone saying so. */

	const defaults =
		dir === "x"
			? { fromAnchor: "right", toAnchor: "left" }
			: { fromAnchor: "bottom", toAnchor: "top" };

	const resolved = edges.map((e, i) => {
		const from = byKey[e.from];
		const to = byKey[e.to];
		if (!from) throw new Error(`graph edge references unknown node "${e.from}".`);
		if (!to) throw new Error(`graph edge references unknown node "${e.to}".`);
		if (from === to) throw new Error(`graph edge "${e.from}" connects a node to itself.`);
		return {
			i,
			spec: e,
			from,
			to,
			fromAnchor: e.fromAnchor || defaults.fromAnchor,
			toAnchor: e.toAnchor || defaults.toAnchor,
		};
	});

	/**
	 * Share out every face that more than one edge wants.
	 *
	 * Two things have to be true. The offsets must come from the count and the
	 * face, which `Rect.port` does. And the order along the face must follow the
	 * order of the boxes at the other end, or three edges that do not need to
	 * cross will cross anyway. Both are read off the solved rects, so this runs
	 * inside connect() and not a moment earlier.
	 */
	function assignPorts() {
		const faces = new Map();
		const seat = (key, face, entry) => {
			const id = `${key}|${face}`;
			if (!faces.has(id)) faces.set(id, { face, members: [] });
			faces.get(id).members.push(entry);
		};

		const fromPort = [],
			toPort = [];
		for (const e of resolved) {
			seat(e.spec.from, e.fromAnchor, { edge: e, end: "from", other: e.to });
			seat(e.spec.to, e.toAnchor, { edge: e, end: "to", other: e.from });
		}

		for (const { face, members } of faces.values()) {
			const alongY = VERTICAL_FACE[face];
			members.sort(
				(a, b) =>
					(alongY ? a.other.rect.cy - b.other.rect.cy : a.other.rect.cx - b.other.rect.cx) ||
					a.edge.i - b.edge.i,
			);
			members.forEach((m, index) => {
				const port = { index, count: members.length };
				(m.end === "from" ? fromPort : toPort)[m.edge.i] = port;
			});
		}
		return { fromPort, toPort };
	}

	node.press = {
		connect: () => {
			const { fromPort, toPort } = assignPorts();
			return {
				links: resolved.map((e) =>
					routedLink(e.from, e.to, {
						fromAnchor: e.fromAnchor,
						toAnchor: e.toAnchor,
						fromPort: fromPort[e.i],
						toPort: toPort[e.i],
						// Every other box in the graph. An edge may cross none of them.
						avoid: cells.filter((c) => c !== e.from && c !== e.to),
						color: e.spec.color || COLOR.red,
						weight: STROKE.connector,
						arrow: e.spec.arrow ?? arrow,
						label: e.spec.label,
						names: { from: e.spec.from, to: e.spec.to },
					}),
				),
			};
		},
	};

	node.byKey = byKey;
	node.ranks = ranks.map((members) => members.map((m) => m.cell.key));
	return node;
}
