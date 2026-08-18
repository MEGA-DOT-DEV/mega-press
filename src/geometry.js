/**
 * PRESS / geometry
 *
 * A Rect knows where its own anchors are. Nothing else in the system is
 * allowed to guess.
 *
 * This is the module that kills the class of bug the styleguide records: a
 * stepped list whose rail was set to `left: 13px` beside a 20px dot, missing
 * every dot centre by 3px. Here a rail cannot be given a position at all. It
 * is asked for the centre of the markers it runs through, and it gets the same
 * number the markers were placed with, because there is only one number.
 */

import { PressError, snap, UNIT } from "./tokens.js";

/* --------------------------------------------------------------------------
 * Rect
 * ------------------------------------------------------------------------ */

export class Rect {
	constructor(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}

	static of(x, y, w, h) {
		return new Rect(x, y, w, h);
	}

	/** Snapped to the unit grid, so nothing lands on a half pixel. */
	static snapped(x, y, w, h) {
		return new Rect(snap(x), snap(y), snap(w), snap(h));
	}

	get left() {
		return this.x;
	}
	get right() {
		return this.x + this.w;
	}
	get top() {
		return this.y;
	}
	get bottom() {
		return this.y + this.h;
	}
	get cx() {
		return this.x + this.w / 2;
	}
	get cy() {
		return this.y + this.h / 2;
	}

	get area() {
		return this.w * this.h;
	}

	/**
	 * The twelve named anchors. Each returns a point and the outward normal at
	 * that point, so a connector knows which way to leave the box without
	 * anybody choosing a direction by hand.
	 */
	anchor(name) {
		const a = ANCHORS[name];
		if (!a) {
			throw new PressError(
				"UNKNOWN_ANCHOR",
				`anchor('${name}') does not exist. Anchors are: ${Object.keys(ANCHORS).join(", ")}.`,
			);
		}
		return {
			x: this.x + this.w * a.u,
			y: this.y + this.h * a.v,
			nx: a.nx,
			ny: a.ny,
			owner: this,
			name,
		};
	}

	/**
	 * A port on a face.
	 *
	 * One connector uses the centre of a face. Several cannot: three arrows into
	 * `left` all land on the same pixel and read as one arrow with a thick head.
	 * So a face is shared out, and the share is derived from how many connectors
	 * asked for it: port k of n sits at (k + 1) / (n + 1) along the face.
	 *
	 * There is no way to ask for a port at an offset. The caller says how many
	 * there are and which one this is; the arithmetic is the face's own.
	 *
	 * With n = 1 this is exactly `anchor(face)`, so a single connector is
	 * unchanged by the existence of ports.
	 */
	port(face, index = 0, count = 1) {
		const f = FACES[face];
		if (!f) {
			throw new PressError(
				"UNKNOWN_FACE",
				`port('${face}') does not exist. A port sits on a face, and the faces are: ` +
					`${Object.keys(FACES).join(", ")}. Corners have no length to share out.`,
			);
		}
		if (!Number.isInteger(count) || count < 1) {
			throw new PressError(
				"BAD_PORT_COUNT",
				`port('${face}') was given count ${count}. A face is shared between a whole number ` +
					`of connectors, at least one.`,
			);
		}
		if (!Number.isInteger(index) || index < 0 || index >= count) {
			throw new PressError(
				"BAD_PORT_INDEX",
				`port('${face}', ${index}, ${count}) is out of range. Port indices run 0 to ${count - 1}.`,
			);
		}

		if (count === 1) return this.anchor(face);

		const length = f.axis === "y" ? this.h : this.w;
		const pitch = length / (count + 1);
		if (pitch < MIN_PORT_PITCH) {
			throw new PressError(
				"PORTS_TOO_CROWDED",
				`${count} connectors were asked to share the ${face} face of a ${this.toString()}, ` +
					`which gives each one ${pitch.toFixed(1)}px of it. Below ${MIN_PORT_PITCH}px the ` +
					`arrowheads overlap and the connectors read as one. Carry fewer edges into this face, ` +
					`or give the box more ${f.axis === "y" ? "height" : "width"}.`,
				{ face, count, pitch },
			);
		}

		// Measured out from the centre of the face rather than from its start, so
		// the middle port of an odd fan is exactly the centre anchor. Measuring
		// from the start instead lands it a snap away from the centre, and a
		// connector between two boxes that share a centre then acquires a 1px kink
		// it did not need.
		// Snapped by magnitude, so a fan is symmetric about the centre. Snapping
		// the signed value instead breaks ties in one direction and a three port
		// face comes out 48px one side of centre and 52px the other.
		const raw = pitch * (index + 1) - length / 2;
		const offset = Math.sign(raw) * snap(Math.abs(raw));
		return {
			x: f.axis === "y" ? (f.nx < 0 ? this.left : this.right) : this.cx + offset,
			y: f.axis === "y" ? this.cy + offset : f.ny < 0 ? this.top : this.bottom,
			nx: f.nx,
			ny: f.ny,
			owner: this,
			name: `${face}:${index + 1}of${count}`,
		};
	}

	inset(d) {
		return new Rect(this.x + d, this.y + d, this.w - 2 * d, this.h - 2 * d);
	}

	insetBy({ top = 0, right = 0, bottom = 0, left = 0 }) {
		return new Rect(this.x + left, this.y + top, this.w - left - right, this.h - top - bottom);
	}

	translate(dx, dy) {
		return new Rect(this.x + dx, this.y + dy, this.w, this.h);
	}

	contains(other, tolerance = 0.5) {
		return (
			other.left >= this.left - tolerance &&
			other.top >= this.top - tolerance &&
			other.right <= this.right + tolerance &&
			other.bottom <= this.bottom + tolerance
		);
	}

	intersects(other) {
		return !(
			other.left >= this.right ||
			other.right <= this.left ||
			other.top >= this.bottom ||
			other.bottom <= this.top
		);
	}

	/** Overlap area, used by the validator to report collisions numerically. */
	overlap(other) {
		const w = Math.min(this.right, other.right) - Math.max(this.left, other.left);
		const h = Math.min(this.bottom, other.bottom) - Math.max(this.top, other.top);
		return w > 0 && h > 0 ? w * h : 0;
	}

	toJSON() {
		return { x: this.x, y: this.y, w: this.w, h: this.h };
	}
	toString() {
		return `Rect(${this.x}, ${this.y}, ${this.w}x${this.h})`;
	}
}

/**
 * The four faces a connector can leave from. A corner is an anchor but not a
 * face: it has no length, so there is nothing to share out between ports.
 */
const FACES = {
	left: { axis: "y", nx: -1, ny: 0 },
	right: { axis: "y", nx: 1, ny: 0 },
	top: { axis: "x", nx: 0, ny: -1 },
	bottom: { axis: "x", nx: 0, ny: 1 },
};

export const FACE_NAMES = Object.keys(FACES);

/**
 * The closest two ports may sit. Four units, which is one arrowhead: any
 * tighter and two heads share pixels and the pair reads as one connector.
 */
export const MIN_PORT_PITCH = UNIT * 4;

/** u,v are fractions of the box. nx,ny is the outward normal. */
const ANCHORS = {
	topLeft: { u: 0, v: 0, nx: 0, ny: -1 },
	top: { u: 0.5, v: 0, nx: 0, ny: -1 },
	topRight: { u: 1, v: 0, nx: 0, ny: -1 },
	right: { u: 1, v: 0.5, nx: 1, ny: 0 },
	bottomRight: { u: 1, v: 1, nx: 0, ny: 1 },
	bottom: { u: 0.5, v: 1, nx: 0, ny: 1 },
	bottomLeft: { u: 0, v: 1, nx: 0, ny: 1 },
	left: { u: 0, v: 0.5, nx: -1, ny: 0 },
	center: { u: 0.5, v: 0.5, nx: 0, ny: 0 },
};

export const ANCHOR_NAMES = Object.keys(ANCHORS);

/* --------------------------------------------------------------------------
 * Axis helpers
 *
 * A rail is derived from the markers it threads, never positioned beside them.
 * Given a set of marker rects, the rail is the line through their centres. If
 * the markers are not collinear the rail cannot be drawn, which is reported as
 * an error rather than silently drawn through the average.
 * ------------------------------------------------------------------------ */

export function railThrough(rects, axis = "y", tolerance = 0.5) {
	if (rects.length < 2) {
		throw new PressError("RAIL_TOO_SHORT", "A rail needs at least two markers to be derived from.");
	}
	const key = axis === "y" ? "cx" : "cy";
	const centres = rects.map((r) => r[key]);
	const first = centres[0];
	const drift = Math.max(...centres.map((c) => Math.abs(c - first)));

	if (drift > tolerance) {
		throw new PressError(
			"RAIL_NOT_COLLINEAR",
			`Markers are not collinear on the ${axis} axis: centres span ${drift.toFixed(2)}px ` +
				`(${centres.map((c) => c.toFixed(1)).join(", ")}). A rail must be derived from ` +
				`markers that share a centre, not averaged across markers that do not.`,
			{ centres, drift },
		);
	}

	const spanKey = axis === "y" ? "cy" : "cx";
	const spans = rects.map((r) => r[spanKey]);
	return {
		axis,
		at: first, // the shared centre, exactly
		from: Math.min(...spans),
		to: Math.max(...spans),
		markers: rects,
	};
}

/* --------------------------------------------------------------------------
 * Routing
 *
 * An orthogonal route between two anchors. The elbow is placed on the unit
 * grid and the route always leaves along each anchor's normal, so a connector
 * never emerges from the side of a box at a random angle.
 * ------------------------------------------------------------------------ */

export function route(from, to, { stub = 20 } = {}) {
	const a = { x: from.x, y: from.y };
	const b = { x: to.x, y: to.y };

	// Step off each box along its own normal first. The stub is a displacement
	// along the normal, so only the displacement is on the grid. Snapping the
	// resulting coordinate instead tilts the very first segment by up to half a
	// unit whenever an anchor is not already on the grid, which is the crooked
	// line this module exists to make unwritable.
	const a1 = { x: a.x + from.nx * snap(stub), y: a.y + from.ny * snap(stub) };
	const b1 = { x: b.x + to.nx * snap(stub), y: b.y + to.ny * snap(stub) };

	const points = [a, a1];

	const horizontalFirst = Math.abs(from.nx) === 1;
	if (horizontalFirst) {
		const midX = snap((a1.x + b1.x) / 2);
		points.push({ x: midX, y: a1.y }, { x: midX, y: b1.y });
	} else {
		const midY = snap((a1.y + b1.y) / 2);
		points.push({ x: a1.x, y: midY }, { x: b1.x, y: midY });
	}

	points.push(b1, b);
	return dedupe(points);
}

/** A straight run, only legal when the anchors already share an axis. */
export function straight(from, to, tolerance = 0.5) {
	const dx = Math.abs(from.x - to.x);
	const dy = Math.abs(from.y - to.y);
	if (dx > tolerance && dy > tolerance) {
		throw new PressError(
			"CONNECTOR_NOT_AXIAL",
			`A straight connector was asked for between points that share neither axis ` +
				`(dx ${dx.toFixed(2)}, dy ${dy.toFixed(2)}). Use route() for an elbow, or ` +
				`align the anchors so the run is real.`,
		);
	}
	// Collapse the smaller difference so the run is exactly axial.
	return dx <= dy
		? [
				{ x: from.x, y: from.y },
				{ x: from.x, y: to.y },
			]
		: [
				{ x: from.x, y: from.y },
				{ x: to.x, y: from.y },
			];
}

function dedupe(points) {
	const out = [];
	for (const p of points) {
		const last = out[out.length - 1];
		if (!last || Math.abs(last.x - p.x) > 0.01 || Math.abs(last.y - p.y) > 0.01) out.push(p);
	}
	return out;
}

/** Drop the points that only continue a run, so a route reports its real corners. */
function simplify(points) {
	const out = dedupe(points);
	if (out.length < 3) return out;
	const merged = [out[0]];
	for (let i = 1; i < out.length - 1; i++) {
		const p = merged[merged.length - 1],
			c = out[i],
			n = out[i + 1];
		const straightRun =
			(Math.abs(p.x - c.x) < 0.01 && Math.abs(c.x - n.x) < 0.01) ||
			(Math.abs(p.y - c.y) < 0.01 && Math.abs(c.y - n.y) < 0.01);
		if (!straightRun) merged.push(c);
	}
	merged.push(out[out.length - 1]);
	return merged;
}

/* --------------------------------------------------------------------------
 * Obstacle-aware orthogonal routing
 *
 * `route()` above is the three segment elbow: correct for two boxes with
 * nothing between them, and wrong the moment there is a third box, because it
 * puts the turn at the midpoint whether or not anything is standing there.
 * Its failure is the one the styleguide keeps recording: a line that looks
 * deliberate and passes straight through a labelled box.
 *
 * This is the replacement. It still takes anchors, never coordinates, and it
 * still leaves each box along that anchor's own outward normal. What it adds
 * is that it knows where the other boxes are.
 *
 * The search space is a Hanan grid rather than a uniform raster. Every useful
 * corridor in a set of axis-aligned rectangles runs at a fixed clearance from
 * some rectangle's edge, so the only x values worth considering are
 * `left - clearance` and `right + clearance` for each obstacle plus the two
 * terminals, and likewise for y. Those lines are snapped to UNIT, which is
 * what keeps a route on the same grid as the boxes it runs between. For five
 * boxes that is a graph of a few hundred nodes instead of a hundred thousand
 * cells, and it is exact: any optimal orthogonal route can be slid onto those
 * lines without getting longer.
 *
 * Cost is length plus a penalty per corner, so the router prefers two long
 * runs to a staircase of short ones. A* over (cell, incoming axis), with
 * Manhattan distance as the heuristic, which is admissible because no route
 * is ever shorter than the Manhattan distance it has to cover.
 *
 * If no corridor exists it throws. It never falls back to a straight line.
 * ------------------------------------------------------------------------ */

/** Interior tolerance. A run along a box's own edge grazes it; it does not cross it. */
const GRAZE = 0.5;

const asObstacle = (o) => (o instanceof Rect ? { rect: o, name: o.toString() } : o);

/**
 * The first obstacle an axis-aligned segment passes through, or null.
 * Touching an edge is not passing through it, which is what lets a connector
 * start on the boundary of its own box.
 */
export function segmentBlocked(p, q, obstacles, eps = GRAZE) {
	const x0 = Math.min(p.x, q.x),
		x1 = Math.max(p.x, q.x);
	const y0 = Math.min(p.y, q.y),
		y1 = Math.max(p.y, q.y);
	for (const raw of obstacles) {
		const o = asObstacle(raw);
		const r = o.rect;
		if (x1 <= r.left + eps || x0 >= r.right - eps) continue;
		if (y1 <= r.top + eps || y0 >= r.bottom - eps) continue;
		return o;
	}
	return null;
}

/**
 * The first obstacle a whole polyline crosses, or null. The validator of the
 * router: a route is only allowed to exist if this returns null for it.
 */
export function polylineBlocked(points, obstacles, eps = GRAZE) {
	for (let i = 1; i < points.length; i++) {
		const hit = segmentBlocked(points[i - 1], points[i], obstacles, eps);
		if (hit) return { obstacle: hit, segment: i, from: points[i - 1], to: points[i] };
	}
	return null;
}

/** A binary heap, because A* pops the cheapest state and nothing else. */
class Heap {
	constructor() {
		this.a = [];
	}
	get size() {
		return this.a.length;
	}
	push(item) {
		const a = this.a;
		a.push(item);
		let i = a.length - 1;
		while (i > 0) {
			const p = (i - 1) >> 1;
			if (a[p].f <= a[i].f) break;
			[a[p], a[i]] = [a[i], a[p]];
			i = p;
		}
	}
	pop() {
		const a = this.a;
		const top = a[0];
		const last = a.pop();
		if (a.length) {
			a[0] = last;
			let i = 0;
			for (;;) {
				const l = 2 * i + 1,
					r = l + 1;
				let m = i;
				if (l < a.length && a[l].f < a[m].f) m = l;
				if (r < a.length && a[r].f < a[m].f) m = r;
				if (m === i) break;
				[a[m], a[i]] = [a[i], a[m]];
				i = m;
			}
		}
		return top;
	}
}

const key3 = (v) => Math.round(v * 1000) / 1000;

function axisLines(values) {
	return [...new Set(values.map(key3))].sort((a, b) => a - b);
}

/**
 * @param {object}   from        an anchor or port: point plus outward normal
 * @param {object}   to          likewise
 * @param {object[]} obstacles   `{ rect, name }`, or bare Rects. Derived from
 *                               placed nodes by the caller; never authored.
 */
export function routeAround(
	from,
	to,
	{ obstacles = [], stub = 20, clearance = stub, bend = clearance * 2, describe = {} } = {},
) {
	const nameFrom = describe.from || "the source";
	const nameTo = describe.to || "the target";

	for (const [end, n] of [
		["from", from],
		["to", to],
	]) {
		if (Math.abs(n.nx) + Math.abs(n.ny) !== 1) {
			throw new PressError(
				"ANCHOR_HAS_NO_NORMAL",
				`The ${end} anchor '${n.name}' between ${nameFrom} and ${nameTo} has no outward ` +
					`normal, so there is no perpendicular way off the box. Use a face anchor ` +
					`(${FACE_NAMES.join(", ")}), not a corner or the centre.`,
			);
		}
	}

	const boxes = obstacles.map(asObstacle);

	const a = { x: from.x, y: from.y };
	const b = { x: to.x, y: to.y };
	// The stub is a displacement along the normal, so it never moves the run off
	// its own axis. Snapping the resulting coordinate instead would tilt the very
	// first segment of every connector whose anchor is not on the unit grid.
	const a1 = { x: a.x + from.nx * stub, y: a.y + from.ny * stub };
	const b1 = { x: b.x + to.nx * stub, y: b.y + to.ny * stub };

	const outHit = segmentBlocked(a, a1, boxes);
	if (outHit) {
		throw new PressError(
			"ROUTE_BLOCKED",
			`A connector from ${nameFrom} to ${nameTo} cannot leave the '${from.name}' face: ` +
				`${outHit.name} sits inside the ${stub}px it needs to step clear of the box. ` +
				`Two boxes are closer together than a connector can turn in. Widen the gap or ` +
				`connect a different pair of faces.`,
		);
	}
	const inHit = segmentBlocked(b1, b, boxes);
	if (inHit) {
		throw new PressError(
			"ROUTE_BLOCKED",
			`A connector from ${nameFrom} to ${nameTo} cannot reach the '${to.name}' face: ` +
				`${inHit.name} sits inside the ${stub}px it needs to arrive square on. ` +
				`Widen the gap or connect a different pair of faces.`,
		);
	}

	/* ---- the corridor lines ---------------------------------------------- */

	const xs = axisLines([
		a1.x,
		b1.x,
		...boxes.flatMap((o) => [snap(o.rect.left - clearance), snap(o.rect.right + clearance)]),
	]);
	const ys = axisLines([
		a1.y,
		b1.y,
		...boxes.flatMap((o) => [snap(o.rect.top - clearance), snap(o.rect.bottom + clearance)]),
	]);

	const ix = new Map(xs.map((v, i) => [v, i]));
	const iy = new Map(ys.map((v, i) => [v, i]));
	const W = xs.length,
		H = ys.length;

	const si = ix.get(key3(a1.x)),
		sj = iy.get(key3(a1.y));
	const gi = ix.get(key3(b1.x)),
		gj = iy.get(key3(b1.y));

	/* ---- A* over (cell, incoming axis) ------------------------------------
     The axis is part of the state because the cost of arriving somewhere
     depends on which way you were going when you got there: a corner costs
     `bend`, and without the axis in the state the search cannot tell a
     straight arrival from a turn. */

	const H_AXIS = 0,
		V_AXIS = 1;
	const N = W * H * 2;
	const GOAL = N; // arrival at `b` itself
	const g = new Float64Array(N + 1).fill(Infinity);
	const prev = new Int32Array(N + 1).fill(-1);
	const done = new Uint8Array(N + 1);

	const startAxis = from.nx !== 0 ? H_AXIS : V_AXIS;
	const finalAxis = to.nx !== 0 ? H_AXIS : V_AXIS;
	const heuristic = (i, j) => Math.abs(xs[i] - xs[gi]) + Math.abs(ys[j] - ys[gj]);

	const open = new Heap();
	const start = (sj * W + si) * 2 + startAxis;
	g[start] = 0;
	open.push({ s: start, f: heuristic(si, sj) });

	let reached = false;
	while (open.size) {
		const { s } = open.pop();
		if (done[s]) continue;
		done[s] = 1;
		if (s === GOAL) {
			reached = true;
			break;
		}

		const cell = s >> 1,
			axis = s & 1;
		const i = cell % W,
			j = (cell / W) | 0;
		const p = { x: xs[i], y: ys[j] };

		if (i === gi && j === gj) {
			// Step off the grid onto the target anchor. A turn here costs a corner
			// like any other, so the router will not fan into a face sideways when
			// it could arrive square on for the same length.
			const cost = g[s] + (axis !== finalAxis ? bend : 0) + stub;
			if (cost < g[GOAL]) {
				g[GOAL] = cost;
				prev[GOAL] = s;
				open.push({ s: GOAL, f: cost });
			}
		}

		const steps = [
			[i - 1, j, H_AXIS],
			[i + 1, j, H_AXIS],
			[i, j - 1, V_AXIS],
			[i, j + 1, V_AXIS],
		];
		for (const [ni, nj, nAxis] of steps) {
			if (ni < 0 || ni >= W || nj < 0 || nj >= H) continue;
			const q = { x: xs[ni], y: ys[nj] };
			if (segmentBlocked(p, q, boxes)) continue;
			const ns = (nj * W + ni) * 2 + nAxis;
			if (done[ns]) continue;
			const cost = g[s] + Math.abs(q.x - p.x) + Math.abs(q.y - p.y) + (nAxis !== axis ? bend : 0);
			if (cost < g[ns]) {
				g[ns] = cost;
				prev[ns] = s;
				open.push({ s: ns, f: cost + heuristic(ni, nj) });
			}
		}
	}

	if (!reached) {
		throw new PressError(
			"ROUTE_BLOCKED",
			`No orthogonal route exists from ${nameFrom} (${from.name}) to ${nameTo} (${to.name}) ` +
				`that does not cross another box. Every corridor at ${clearance}px clearance is closed ` +
				`by one of ${boxes.length} placed boxes (${boxes.map((o) => o.name).join(", ")}). ` +
				`Move a node to another rank, widen the gap, or connect a different pair of faces. ` +
				`A line that crosses a box is not drawn instead.`,
			{ obstacles: boxes.map((o) => o.name), clearance },
		);
	}

	/* ---- read the corners back ------------------------------------------- */

	const chain = [];
	for (let s = prev[GOAL]; s !== -1; s = prev[s]) chain.push(s);
	chain.reverse();

	const points = [a];
	for (const s of chain) {
		const cell = s >> 1;
		points.push({ x: xs[cell % W], y: ys[(cell / W) | 0] });
	}
	points.push(b);

	const out = simplify(points);

	// Two backstops, because "never draw a wrong line" has to be mechanical.
	for (let i = 1; i < out.length; i++) {
		const dx = Math.abs(out[i].x - out[i - 1].x),
			dy = Math.abs(out[i].y - out[i - 1].y);
		if (dx > GRAZE && dy > GRAZE) {
			throw new PressError(
				"CONNECTOR_NOT_AXIAL",
				`The route from ${nameFrom} to ${nameTo} produced a diagonal segment ` +
					`(dx ${dx.toFixed(2)}, dy ${dy.toFixed(2)}). An orthogonal route has no diagonals.`,
			);
		}
	}
	const crossing = polylineBlocked(out, boxes);
	if (crossing) {
		throw new PressError(
			"ROUTE_CROSSES_BOX",
			`The route from ${nameFrom} to ${nameTo} crosses ${crossing.obstacle.name}. ` +
				`The router returned a path it should have refused; this is a bug in routeAround, ` +
				`not in the plate.`,
		);
	}

	return out;
}

/** Total run length, used to reject connectors too short to read. */
export function polylineLength(points) {
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
	}
	return total;
}

/* --------------------------------------------------------------------------
 * Distance fields
 *
 * Shared with the canvas layer, so the generative field and the layout agree
 * about where things are. Same primitives as the live mega.dev shaders.
 * ------------------------------------------------------------------------ */

export function sdRoundBox(px, py, rect, radius = 0) {
	const qx = Math.abs(px - rect.cx) - rect.w / 2 + radius;
	const qy = Math.abs(py - rect.cy) - rect.h / 2 + radius;
	const ax = qx > 0 ? qx : 0;
	const ay = qy > 0 ? qy : 0;
	return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - radius;
}

export function sdCapsule(px, py, ax, ay, bx, by, r) {
	const pax = px - ax,
		pay = py - ay;
	const bax = bx - ax,
		bay = by - ay;
	const denom = bax * bax + bay * bay || 1e-6;
	const h = Math.min(1, Math.max(0, (pax * bax + pay * bay) / denom));
	return Math.hypot(pax - bax * h, pay - bay * h) - r;
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export const smoothstep = (e0, e1, x) => {
	const t = clamp((x - e0) / (e1 - e0 || 1e-6), 0, 1);
	return t * t * (3 - 2 * t);
};

export { snap, UNIT };
