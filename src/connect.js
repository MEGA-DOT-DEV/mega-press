/**
 * PRESS / connect
 *
 * Every connector in the system is derived from the things it connects. There
 * is no API for drawing a line from one coordinate to another, because that
 * API is how a rail ends up 3px off a dot centre.
 *
 * A connector is created by naming two placed nodes and an anchor on each. The
 * geometry comes out of the same rects the renderer will draw, so a connector
 * cannot disagree with the boxes it joins. If a node has not been placed yet,
 * asking for a connector throws rather than silently reading `undefined`.
 */

import { Rect, polylineBlocked, polylineLength, railThrough, route, routeAround, straight } from "./geometry.js";
import { box, measureNode, placeNode, text } from "./solve.js";
import { measure } from "./text.js";
import { COLOR, MIN_SEMANTIC_STROKE, PressError, STROKE, UNIT } from "./tokens.js";

/** A connector shorter than this is a smudge, not a relationship. */
const MIN_RUN = 24;

/**
 * `label` used to be accepted here, stored on the connector, carried into the
 * plate and never drawn: no renderer reads it. A parameter that a caller can
 * write and never see is the exact failure this system exists to prevent, so
 * it is refused rather than kept warm for a renderer that does not exist.
 */
function refuseLabel(label, who) {
	if (label === undefined || label === null || label === "") return;
	throw new PressError(
		"CONNECTOR_LABEL_NOT_DRAWN",
		`${who} was given the label "${label}", and no renderer draws a label on a connector, ` +
			`so it would print as nothing. Put the words in the node it leaves or the node it ` +
			`arrives at, or in the plate's lead line.`,
	);
}

function placed(n, who) {
	if (!n?.rect) {
		throw new PressError(
			"UNPLACED_NODE",
			`connect: ${who} has no rect yet. Connectors are derived after solve(), ` +
				`never authored alongside the layout.`,
		);
	}
	return n;
}

function checkStroke(weight, semantic) {
	if (semantic && weight < MIN_SEMANTIC_STROKE) {
		throw new PressError(
			"STROKE_TOO_THIN",
			`A connector carrying meaning was set to ${weight}px. At phone scale that ` +
				`is ${(weight * 0.231).toFixed(2)}px and disappears. Use at least ` +
				`${MIN_SEMANTIC_STROKE}px.`,
		);
	}
}

/* --------------------------------------------------------------------------
 * Links
 * ------------------------------------------------------------------------ */

/**
 * An orthogonal link between two nodes. Leaves each box along the anchor's
 * own outward normal, so it never emerges from a corner at an angle.
 */
export function link(
	from,
	to,
	{
		fromAnchor = "right",
		toAnchor = "left",
		weight = STROKE.connector,
		color = COLOR.red,
		arrow = true,
		stub = 20,
		label,
	} = {},
) {
	placed(from, "from");
	placed(to, "to");
	checkStroke(weight, true);
	refuseLabel(label, `link(${from.id}, ${to.id})`);

	const a = from.rect.anchor(fromAnchor);
	const b = to.rect.anchor(toAnchor);
	const points = route(a, b, { stub });
	const length = polylineLength(points);

	if (length < MIN_RUN) {
		throw new PressError(
			"CONNECTOR_TOO_SHORT",
			`A connector between ${from.id} and ${to.id} runs only ${length.toFixed(1)}px. ` +
				`Either the boxes are adjacent and the link is redundant, or the anchors are wrong.`,
		);
	}

	return {
		kind: "link",
		from: from.id,
		to: to.id,
		points,
		weight,
		color,
		arrow,
		label,
		length,
	};
}

/** A straight link, legal only when the anchors already share an axis. */
export function axialLink(
	from,
	to,
	{
		fromAnchor = "right",
		toAnchor = "left",
		weight = STROKE.connector,
		color = COLOR.red,
		arrow = true,
		label,
	} = {},
) {
	placed(from, "from");
	placed(to, "to");
	checkStroke(weight, true);
	refuseLabel(label, `axialLink(${from.id}, ${to.id})`);

	const a = from.rect.anchor(fromAnchor);
	const b = to.rect.anchor(toAnchor);
	// straight() throws if the two anchors share neither axis, which is exactly
	// the case where a hand-drawn "straight" arrow would have been 3px crooked.
	const points = straight(a, b);
	return {
		kind: "link",
		from: from.id,
		to: to.id,
		points,
		weight,
		color,
		arrow,
		length: polylineLength(points),
	};
}

/* --------------------------------------------------------------------------
 * Routed links
 *
 * The same contract as `link()`: two placed nodes and an anchor on each. What
 * it adds is the rest of the drawing. A connector that knows only its two
 * endpoints will happily run straight through a third box, because it has
 * never been told the box is there.
 *
 * So `avoid` takes nodes, not rectangles and certainly not points, and the
 * rects come out of those nodes the same way the endpoints' do. The boundary
 * holds: nothing here can be given a coordinate.
 * ------------------------------------------------------------------------ */

/**
 * @param {object}   from      a placed node
 * @param {object}   to        a placed node
 * @param {string}   fromAnchor / toAnchor   a face: left, right, top, bottom
 * @param {object}   fromPort / toPort       `{ index, count }`, so the face is
 *                                           shared out by arithmetic rather
 *                                           than by a chosen offset
 * @param {object[]} avoid     placed nodes the run may not cross
 */
export function routedLink(
	from,
	to,
	{
		fromAnchor = "right",
		toAnchor = "left",
		fromPort = null,
		toPort = null,
		avoid = [],
		weight = STROKE.connector,
		color = COLOR.red,
		arrow = true,
		stub = 20,
		clearance,
		label,
		names = {},
	} = {},
) {
	placed(from, "from");
	placed(to, "to");
	checkStroke(weight, true);

	const fromName = names.from || from.key || from.id;
	const toName = names.to || to.key || to.id;
	if (label !== undefined && (typeof label !== "string" || !label.trim())) {
		throw new PressError("CONNECTOR_LABEL", "A declared connector label must be nonblank text.");
	}
	const portAnchor = (owner, face, port) => {
		if (!port) return owner.rect.anchor(face);
		if (!port.node) return owner.rect.port(face, port.index, port.count);
		const row = placed(port.node, "named port").rect;
		if (!owner.rect.contains(row)) throw new PressError("PORT_OUTSIDE_NODE", "A named port must belong to its node.");
		const anchor = owner.rect.anchor(face);
		if (face === "left" || face === "right") anchor.y = row.cy;
		else anchor.x = row.cx;
		return anchor;
	};
	const a = portAnchor(from, fromAnchor, fromPort);
	const b = portAnchor(to, toAnchor, toPort);

	const obstacles = avoid.map((n, i) => ({
		rect: placed(n, `avoid[${i}]`).rect,
		name: `"${n.key || n.id}"`,
	}));

	// The two boxes at the ends are obstacles too. A connector may leave one and
	// arrive at the other, but it may not cut back through either on the way,
	// which is what an unaware router does when the shortest path happens to run
	// under its own source.
	obstacles.push(
		{ rect: from.rect, name: `"${fromName}"` },
		{ rect: to.rect, name: `"${toName}"` },
	);

	const points = routeAround(a, b, {
		obstacles,
		stub,
		clearance: clearance ?? stub,
		describe: { from: `"${fromName}"`, to: `"${toName}"` },
	});

	const length = polylineLength(points);
	if (length < MIN_RUN) {
		throw new PressError(
			"CONNECTOR_TOO_SHORT",
			`A connector between "${fromName}" and "${toName}" runs only ${length.toFixed(1)}px. ` +
				`Either the boxes are adjacent and the link is redundant, or the anchors are wrong.`,
		);
	}

	return {
		kind: "link",
		from: from.id,
		to: to.id,
		fromKey: fromName,
		toKey: toName,
		fromPort: fromPort?.node?.portId ?? a.name,
		toPort: toPort?.node?.portId ?? b.name,
		...(label !== undefined ? { label } : {}),
		points,
		weight,
		color,
		arrow,
		length,
	};
}

/** Place exact relation labels in measured, clear portions of their routes.
 * These are ordinary solve nodes: the canonical renderer and validator see
 * the same label boxes, not an unmeasured DOM overlay or canvas-only caption.
 */
export function prepareLinkLabels(links, { bounds, obstacles = [], frameWidth = 1600 } = {}) {
	const labels = [];
	const overlaps = (a, b, gap = 6) =>
		a.left < b.right + gap && a.right > b.left - gap &&
		a.top < b.bottom + gap && a.bottom > b.top - gap;
	for (const link of links) {
		if (link.label === undefined) continue;
		const boundary = link.labelBounds || bounds;
		const blocked = [...obstacles, ...(link.labelObstacles || []), ...labels.map(n => n.rect)];
		const labelText = text(link.label, "body", { color: link.color, semanticId: link.semanticId });
		const label = box({ pad: 1, gap: 1, fill: COLOR.page, border: true, borderColor: COLOR.line, children: [labelText] });
		const natural = Math.ceil(measure(link.label, "body") + 26);
		let placedLabel = false;
		for (const width of [...new Set([Math.min(natural, 360), Math.min(natural, 260), Math.min(natural, 180), Math.min(natural, 160), Math.min(natural, 140), Math.min(natural, 120), Math.min(natural, 100)])]) {
			if (width > boundary.w) continue;
			const size = measureNode(label, width);
			const candidates = [];
			for (let i = 1; i < link.points.length; i++) {
				const a = link.points[i - 1], b = link.points[i];
				const horizontal = Math.abs(a.y - b.y) < .01;
				const lo = Math.min(horizontal ? a.x : a.y, horizontal ? b.x : b.y);
				const hi = Math.max(horizontal ? a.x : a.y, horizontal ? b.x : b.y);
				const half = horizontal ? size.w / 2 : size.h / 2;
				const stops = [(lo + hi) / 2, ...Array.from({ length: 19 }, (_, j) => lo + (hi - lo) * (j + 1) / 20), ...blocked.flatMap(r => horizontal
					? [r.left - half - 7, r.right + half + 7]
					: [r.top - half - 7, r.bottom + half + 7])];
				for (const at of stops) if (at >= lo && at <= hi) candidates.push({
					rect: new Rect((horizontal ? at : a.x) - size.w / 2, (horizontal ? a.y : at) - size.h / 2, size.w, size.h),
					length: hi - lo,
				});
			}
			const found = candidates.sort((a, b) => b.length - a.length).find(({ rect }) =>
				boundary.contains(rect) && !blocked.some(other => overlaps(rect, other)) &&
				!links.some(other => other !== link && polylineBlocked(other.points, [rect], 3)));
			if (!found) continue;
			placeNode(label, found.rect, { frameWidth });
			label.connectorLabel = true;
			label.semanticId = link.semanticId;
			link.labelRect = found.rect;
			labels.push(label);
			placedLabel = true;
			break;
		}
		if (!placedLabel) throw new PressError("CONNECTOR_LABEL_NO_ROOM",
			`No clear, measured position for relation "${link.label}". Change the composition; the label was not dropped.`,
			{ from: link.fromKey, to: link.toKey, label: link.label });
	}
	return labels;
}

/* --------------------------------------------------------------------------
 * Rails
 *
 * The rail through a stepped list. Derived from the marker rects, never
 * positioned beside them.
 *
 * The bug this replaces, from the styleguide: a rail set to `left: 13px`
 * next to a 20px dot, missing every dot centre by 3px. Here the rail is not
 * given an x at all.
 * ------------------------------------------------------------------------ */

export function rail(
	markers,
	{ axis = "y", weight = STROKE.divider, color = COLOR.line, extend = 0 } = {},
) {
	const rects = markers.map((m, i) => placed(m, `marker ${i}`).rect);
	const derived = railThrough(rects, axis);

	const points =
		axis === "y"
			? [
					{ x: derived.at, y: derived.from - extend },
					{ x: derived.at, y: derived.to + extend },
				]
			: [
					{ x: derived.from - extend, y: derived.at },
					{ x: derived.to + extend, y: derived.at },
				];

	return {
		kind: "rail",
		axis,
		points,
		weight,
		color,
		at: derived.at,
		markers: markers.map((m) => m.id),
	};
}

/* --------------------------------------------------------------------------
 * Rules
 *
 * Within one frame, horizontal rules either span the same measure or there is
 * only one of them. The set is collected here so the validator can check that
 * property across the whole plate rather than per component.
 * ------------------------------------------------------------------------ */

/**
 * `offset` pushes the rule off the edge it was taken from. A rule drawn exactly
 * on a row's bottom edge sits on that row's descenders, so callers pass half
 * the gap to the next row and the rule lands in the space between them. The
 * value is derived from the stack's own gap, never chosen.
 */
export function ruleAcross(
	node,
	{
		at = "bottom",
		weight = STROKE.divider,
		color = COLOR.line,
		inset = 0,
		offset = 0,
		dash = null,
	} = {},
) {
	placed(node, "node");
	const r = node.rect;
	const edge = at === "top" ? r.top : at === "center" ? r.cy : r.bottom;
	const y = at === "top" ? edge - offset : edge + offset;
	return {
		kind: "rule",
		points: [
			{ x: r.left + inset, y },
			{ x: r.right - inset, y },
		],
		measure: r.w - 2 * inset,
		y,
		weight,
		color,
		dash,
		owner: node.id,
	};
}

/* --------------------------------------------------------------------------
 * Arrowheads
 *
 * Drawn from the final segment's direction, so an arrowhead can never point a
 * different way from the line it terminates.
 *
 * The head is a stepped pixel triangle, not a smooth one: columns of unit
 * squares shrinking toward the tip, the same construction as the icon set and
 * the pixel faces. Connectors are axial by construction, so the steps sit on
 * the grid exactly. Returns rects for the renderer to fill.
 * ------------------------------------------------------------------------ */

export function arrowhead(points, size = 12) {
	if (points.length < 2) return null;
	const tip = points[points.length - 1];
	const prev = points[points.length - 2];
	const along = Math.abs(tip.x - prev.x) >= Math.abs(tip.y - prev.y) ? "x" : "y";
	const dir = Math.sign(along === "x" ? tip.x - prev.x : tip.y - prev.y) || 1;

	const q = UNIT;
	const cols = Math.max(2, Math.round(size / q));
	const rects = [];
	for (let i = 0; i < cols; i++) {
		// Column i runs from the base toward the tip; its half-height steps down
		// one unit's worth each column, so the tip column is the smallest square.
		const far = tip[along] - dir * (cols - i) * q;
		const near = tip[along] - dir * (cols - i - 1) * q;
		const half = ((cols - i) * q) / 2;
		rects.push(
			along === "x"
				? { x: Math.min(far, near), y: tip.y - half, w: q, h: 2 * half }
				: { x: tip.x - half, y: Math.min(far, near), w: 2 * half, h: q },
		);
	}
	return rects;
}
