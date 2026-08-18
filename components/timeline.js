/**
 * PRESS / components / timeline
 *
 * A horizontal timeline: an axis, markers on it, and a description under each.
 *
 * The axis is derived from the markers, exactly as a vertical rail is. That
 * matters more here than in a stepped list, because a horizontal axis that
 * misses its own markers is visible from across a room.
 *
 * Four variants, because they answer different questions:
 *
 *   timeline          evenly spaced stops, for a sequence where order matters
 *   timelineVertical  the same read top to bottom, date in its own column
 *   schedule          positions proportional to real time, for a plan where
 *                     the gaps between events carry meaning
 *   swimlanes         several tracks on one shared proportional clock
 *
 * `schedule` refuses unordered dates, because a proportional axis whose events
 * are out of order draws a line that runs backwards.
 *
 * The two proportional ones paint rather than emit nodes, because a mark at a
 * fraction of a span has no box for the solver to place. That means they can
 * invent furniture, and for a while they did: swimlanes drew a 1px lane, a
 * 16px dot and a halo that appear nowhere else. Everything they draw now comes
 * from one place in this file, and it is the same rail, dot and stroke weight
 * the rest of the set uses.
 */

import { rail as deriveRail } from "../src/connect.js";
import { custom, marker, row, stack, text } from "../src/solve.js";
import { measure } from "../src/text.js";
import { COLOR, FAMILY, lineHeight, STROKE, snap, space, type, typeSize } from "../src/tokens.js";

/* --------------------------------------------------------------------------
 * The marker
 *
 * `timeline`, `timelineVertical`, `railSteps` and `railFlow` emit a marker()
 * node and src/render.js draws it. `schedule` and `swimlanes` cannot: their
 * marks sit at a fraction of a span rather than in a box of their own, so they
 * paint. Two painters for one shape is how the webflow set ended up with
 * `wave-dot`, `roadmap-dot` and `collaboration-marker`, so there is one
 * function here and it draws exactly what the vector renderer draws.
 *
 * The mark is filled, in red when the event is the accented one and in ink
 * when it is not, which is the rule components/chart.js already uses for a
 * data mark that is emphasised or merely present.
 *
 * It is deliberately *not* the ring that railSteps and timeline draw for a
 * quiet marker. There the ring means the step has not been reached yet: it is
 * driven by `activeTo`, and it says pending. A schedule and a swimlane carry
 * no `activeTo`; every date on them is a fact, and `accent` marks the ones
 * that matter. Borrowing the ring would make every ordinary event read as
 * something that has not happened. A ring also cannot survive a filled span:
 * its stroke is black2 and so is the bar, so the eye reads the knockout
 * instead of the mark and a 20px dot becomes three concentric bands that
 * collapse into a blob at phone scale. That was drawn and looked at.
 *
 * `clear` is the page-black square knocked out behind the mark. src/render.js
 * clears half a stroke, which is all a 2px rail needs: the rail then meets the
 * marker's edge instead of running through it. A mark that can land on a
 * *filled* span needs a whole connector width, because the separation is the
 * only thing telling a red dot from the red bar under it, and at 1px that
 * separation is 0.23px on a phone.
 * ------------------------------------------------------------------------ */

function paintMarker(
	ctx,
	C,
	x,
	y,
	{ size, accent, color = COLOR.red, clear = STROKE.connector / 2 },
) {
	// A square, not a disc: the marks sit in a pixel-grid language, and the
	// square is the one shape that grid makes natively.
	const half = size / 2;
	ctx.fillStyle = C.page;
	ctx.fillRect(x - half - clear, y - half - clear, size + 2 * clear, size + 2 * clear);

	ctx.fillStyle = accent ? color : C.ink;
	ctx.fillRect(x - half, y - half, size, size);
}

/**
 * A vertical run drawn everywhere except the y ranges it is told to skip.
 * `gaps` are absolute, may overlap and may fall outside the run: they are
 * clipped and merged here so the caller can hand over every box it knows
 * about without working out which ones are in the way.
 */
function strokeGapped(ctx, x, from, to, gaps) {
	const lo = Math.min(from, to),
		hi = Math.max(from, to);
	const cuts = gaps
		.map(([a, b]) => [Math.max(a, lo), Math.min(b, hi)])
		.filter(([a, b]) => b > a)
		.sort((m, n) => m[0] - n[0]);

	let y = lo;
	ctx.beginPath();
	for (const [a, b] of cuts) {
		if (a > y) {
			ctx.moveTo(x, y);
			ctx.lineTo(x, a);
		}
		if (b > y) y = b;
	}
	if (y < hi) {
		ctx.moveTo(x, y);
		ctx.lineTo(x, hi);
	}
	ctx.stroke();
}

/* --------------------------------------------------------------------------
 * Refusing what is not drawn
 *
 * A component that accepts a key and never draws it is the defect this whole
 * system exists to prevent: the author writes a value, sees nothing, and has
 * no way to tell whether the value was wrong or the component was. That is why
 * src/connect.js refuses a connector label, and it is why the swimlane span
 * label was a bug rather than a missing feature.
 *
 * So the two proportional components state what they read and refuse the rest.
 * ------------------------------------------------------------------------ */

function refuseUnread(item, read, who) {
	const extra = Object.keys(item).filter((k) => item[k] !== undefined && !read.includes(k));
	if (!extra.length) return;
	const these = extra.map((k) => `"${k}"`).join(", ");
	const it = extra.length > 1 ? "them" : "it";
	throw new Error(
		`${who} was given ${these}, and nothing draws ${it}, so ${it} would print as nothing. ` +
			`The keys drawn here are ${read.map((k) => `"${k}"`).join(", ")}.`,
	);
}

/* --------------------------------------------------------------------------
 * timeline: evenly spaced stops
 * ------------------------------------------------------------------------ */

export function timeline({
	items,
	markerSize = space(2),
	gap = 4,
	activeTo = -1,
	accent = COLOR.red,
	quiet = COLOR.black2,
} = {}) {
	if (!items || items.length < 2) {
		throw new Error("timeline needs at least two stops. One date is not a timeline.");
	}

	const markers = [];

	const columns = items.map((item, i) => {
		const dot = marker({
			size: markerSize,
			fill: i <= activeTo ? accent : quiet,
			ring: i > activeTo,
		});
		markers.push(dot);

		return stack({
			gap: 2,
			grow: true,
			unit: true,
			children: [
				text(item.date, "utility", { color: i <= activeTo ? accent : COLOR.quiet }),
				dot,
				text(item.title, "list", { color: COLOR.text }),
				item.detail ? text(item.detail, "body", { color: COLOR.muted, commentary: true }) : null,
			],
		});
	});

	const node = row({ gap, align: "start", children: columns });

	node.press = {
		connect: () => ({
			rails: [deriveRail(markers, { axis: "x", weight: STROKE.connector, color: quiet })],
		}),
	};

	node.markers = markers;
	return node;
}

/* --------------------------------------------------------------------------
 * schedule: positions proportional to elapsed time
 *
 * The axis is one custom node wide enough to hold every stop, and each stop is
 * drawn at its true fraction of the span. Labels are packed into lanes above
 * and below it, against their measured extents, and the component refuses
 * rather than overlaps two of them.
 *
 * This is the only shape in the set whose spacing carries a quantity, so it is
 * the only one where a cluster is information rather than a crowding problem.
 * ------------------------------------------------------------------------ */

export function schedule({ items, markerSize = space(2), accent = COLOR.red } = {}) {
	if (!items || items.length < 2) {
		throw new Error("schedule needs at least two events.");
	}

	/* `detail` is drawn by timeline() and timelineVertical() and was accepted
     and dropped here. A schedule has no box to put it in: every label is
     placed at its own fraction of the span and packed into a lane against its
     measured extent, and a sentence measured at that role is wider than the
     whole cluster it belongs to. So it is refused by name rather than
     swallowed. */
	for (const item of items) {
		if (item.detail !== undefined && item.detail !== null && item.detail !== "") {
			throw new Error(
				`schedule was given a detail on "${item.label}": "${item.detail}". A schedule places ` +
					`every label at its true fraction of the span and packs the labels into lanes, so a ` +
					`sentence has no box to sit in and would be accepted and never drawn. Put it in the ` +
					`plate's lead line, or use timeline() or timelineVertical(), which both draw detail.`,
			);
		}
		refuseUnread(item, ["at", "label", "accent"], "schedule");
	}

	const stamps = items.map((i) => {
		const t = Date.parse(i.at);
		if (Number.isNaN(t)) {
			throw new Error(`schedule could not parse "${i.at}". Use an ISO date such as 2026-05-08.`);
		}
		return t;
	});

	for (let i = 1; i < stamps.length; i++) {
		if (stamps[i] < stamps[i - 1]) {
			throw new Error(
				`schedule events are out of order: "${items[i].at}" comes before "${items[i - 1].at}". ` +
					`A proportional axis cannot run backwards. Sort the events, or use timeline() ` +
					`if the spacing is not meant to be proportional.`,
			);
		}
	}

	const first = stamps[0];
	const span = stamps[stamps.length - 1] - first;
	if (span <= 0) {
		throw new Error(
			"schedule needs events spanning more than one instant. Use timeline() instead.",
		);
	}

	const fractions = stamps.map((t) => (t - first) / span);

	/* ---- lanes ------------------------------------------------------------
     Alternating labels above and below only separates *adjacent* events. Two
     events on the same side that are close in time still collide, which is
     precisely the defect this system exists to make impossible.

     So the labels are packed: each is measured, its extent computed at its
     true x, and it takes the first lane where it does not overlap anything
     already there. Lanes alternate above and below and then step outwards. If
     the labels cannot be packed at all the component says so rather than
     drawing them on top of each other. */

	const LANE_GAP = space(2);
	const MAX_LANES = 6;
	const labelH = lineHeight("utility") + lineHeight("list");

	function lanes(width) {
		const pad = Math.max(markerSize, space(4));
		const usable = width - pad * 2;

		/* A label is centred on its own stem, and anchors an edge to the stem
       instead when centring would take it off the plate. The first and last
       event used to be special-cased for this, which only covers the two
       events that happen to be at the ends: a cluster sitting near either edge
       ran the same label off the frame, and nothing downstream would have
       caught it, because this text is painted rather than solved and the
       overflow check never sees a rect for it. Anchoring keeps the block
       inside and keeps it attached to the stem it belongs to. */
		const boxes = items.map((item, i) => {
			const w = Math.max(measure(item.at, "utility"), measure(item.label, "list"));
			if (w > width) {
				throw new Error(
					`schedule cannot place the label for "${item.label}": with its date it measures ` +
						`${Math.ceil(w)}px and the frame is only ${Math.floor(width)}px wide. Shorten the label.`,
				);
			}
			const x = pad + usable * fractions[i];
			let align = "center",
				x0 = x - w / 2;
			if (x0 < 0) {
				align = "left";
				x0 = x;
			} else if (x0 + w > width) {
				align = "right";
				x0 = x - w;
			}
			return { i, x, w, align, x0, x1: x0 + w };
		});

		const occupied = [];
		const laneOf = [];
		for (const b of boxes) {
			let k = 0;
			while (k < MAX_LANES) {
				const clash = (occupied[k] || []).some(
					(o) => !(b.x1 + LANE_GAP <= o.x0 || b.x0 >= o.x1 + LANE_GAP),
				);
				if (!clash) break;
				k++;
			}
			if (k >= MAX_LANES) {
				throw new Error(
					`schedule cannot place the label for "${items[b.i].label}" without it ` +
						`overlapping another. The events are too close together for labels this ` +
						`long at this width. Shorten the labels, drop an event, or use timeline() ` +
						`for evenly spaced stops.`,
				);
			}
			const lane = occupied[k] || [];
			occupied[k] = lane;
			lane.push(b);
			laneOf[b.i] = k;
		}

		const depth = (k) => Math.floor(k / 2);
		const maxAbove = Math.max(0, ...laneOf.filter((_, i) => laneOf[i] % 2 === 0).map(depth));
		const maxBelow = Math.max(0, ...laneOf.filter((_, i) => laneOf[i] % 2 === 1).map(depth));

		return { boxes, laneOf, maxAbove, maxBelow, pad, usable };
	}

	const STEM = space(3);
	const ROW = labelH + space(2);
	const dateTracking = type("utility").tracking * typeSize("utility");

	return custom({
		unit: true,
		measure: (w) => {
			const l = lanes(w);
			const above = STEM + (l.maxAbove + 1) * ROW;
			const below = STEM + (l.maxBelow + 1) * ROW;
			const out = { w, h: Math.max(above, below) * 2 + markerSize };
			out.lanes = l;
			return out;
		},
		paint: (ctx, rect, C) => {
			const l = lanes(rect.w);
			const axisY = rect.y + rect.h / 2;
			const x0 = rect.x + l.pad;

			ctx.strokeStyle = C.black2;
			ctx.lineWidth = STROKE.connector;
			ctx.beginPath();
			ctx.moveTo(x0, axisY);
			ctx.lineTo(x0 + l.usable, axisY);
			ctx.stroke();

			/* Where every stem and every label lands, worked out once, so the three
         passes below cannot disagree about it. Labels are painted here rather
         than as DOM text because their x is proportional to the date and they
         have no box of their own to sit in. */
			const placed = items.map((item, i) => {
				const b = l.boxes[i];
				const k = l.laneOf[i];
				const above = k % 2 === 0;
				const stem = STEM + Math.floor(k / 2) * ROW;
				const titleY = above ? axisY - stem - space(1) : axisY + stem + space(1);
				return {
					item,
					b,
					above,
					stem,
					x: rect.x + b.x,
					left: rect.x + b.x0,
					right: rect.x + b.x1,
					titleY,
					dateY: above ? titleY - lineHeight("list") : titleY + lineHeight("list"),
					top: above ? titleY - labelH : titleY,
					bottom: above ? titleY : titleY + labelH,
				};
			});

			/* Stems, and then the labels.

         A label two rows out has to be reached across the row in between, and
         no packing avoids that: the stem's x is the event's date, so the only
         thing that could open a corridor is the *shallower* label, which was
         placed before this event was even looked at. Left alone the leader
         runs through the middle of somebody else's words, which is what a
         cluster of four made it do the first time this plate was printed.

         So the stem is not drawn where it would cross another label. Not
         painted over: a page-black knockout would read correctly on a black
         page and punch a rectangular hole in any plate with a ground behind
         it. A leader that stops at a label is that label's own; one that
         breaks and carries on is passing it. */
			const clear = STROKE.connector;
			for (const p of placed) {
				ctx.strokeStyle = p.item.accent ? accent : C.black2;
				ctx.lineWidth = STROKE.connector;
				const blocked = placed
					.filter(
						(q) =>
							q !== p && q.above === p.above && p.x >= q.left - clear && p.x <= q.right + clear,
					)
					.map((q) => [q.top - clear, q.bottom + clear]);
				strokeGapped(ctx, p.x, axisY, p.above ? axisY - p.stem : axisY + p.stem, blocked);
			}

			for (const p of placed) {
				ctx.textAlign = p.b.align === "left" ? "left" : p.b.align === "right" ? "right" : "center";
				ctx.textBaseline = p.above ? "bottom" : "top";

				ctx.fillStyle = p.item.accent ? accent : C.text;
				ctx.font = `400 ${typeSize("list")}px ${FAMILY.sans}`;
				ctx.fillText(p.item.label, p.x, p.titleY);

				ctx.fillStyle = p.item.accent ? accent : C.quiet;
				// Tracked exactly as measure() measured it. Without this the date is
				// painted narrower than the box the lane packing was decided on, which
				// is the same one-character error PRINCIPLES.md records.
				if ("letterSpacing" in ctx) ctx.letterSpacing = `${dateTracking}px`;
				ctx.font = `400 ${typeSize("utility")}px ${FAMILY.mono}`;
				ctx.fillText(p.item.at, p.x, p.dateY);
				if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
			}

			// The same dot the vector renderer draws for a marker on a rail, so a
			// stop on a proportional axis and a stop on an even one are one shape.
			for (const p of placed) {
				paintMarker(ctx, C, p.x, axisY, { size: markerSize, accent: p.item.accent, color: accent });
			}
		},
	});
}

/* --------------------------------------------------------------------------
 * timelineVertical
 *
 * The same sequence read top to bottom, with the date in its own column. The
 * column is as wide as the widest date, so every title starts on one vertical
 * and the rail runs between the two columns rather than beside one of them.
 * ------------------------------------------------------------------------ */

export function timelineVertical({
	items,
	markerSize = space(2),
	gap = 4,
	activeTo = -1,
	accent = COLOR.red,
	quiet = COLOR.black2,
} = {}) {
	if (!items || items.length < 2) {
		throw new Error("timelineVertical needs at least two stops.");
	}

	const dateWidth = snap(Math.max(...items.map((i) => measure(i.date, "utility"))) + space(3));
	const markers = [];

	const rows = items.map((item, i) => {
		const dot = marker({
			size: markerSize,
			fill: i <= activeTo ? accent : quiet,
			ring: i > activeTo,
			alignTo: "list",
		});
		markers.push(dot);

		return row({
			gap: 3,
			align: "baseline",
			unit: true,
			children: [
				text(item.date, "utility", {
					color: i <= activeTo ? accent : COLOR.quiet,
					width: dateWidth,
				}),
				dot,
				stack({
					gap: 1,
					grow: true,
					children: [
						text(item.title, "list", { color: COLOR.text }),
						item.detail
							? text(item.detail, "body", { color: COLOR.muted, commentary: true })
							: null,
					],
				}),
			],
		});
	});

	const node = stack({ gap, children: rows });

	node.press = {
		connect: () => ({
			rails: [deriveRail(markers, { axis: "y", weight: STROKE.connector, color: quiet })],
		}),
	};

	node.markers = markers;
	return node;
}

/* --------------------------------------------------------------------------
 * swimlanes
 *
 * Several tracks on one shared time axis. This is the shape a plan needs when
 * more than one thing is happening at once: each lane keeps its own row, and
 * every lane is measured against the same span, so two events at the same date
 * always sit on the same vertical.
 *
 * The span is computed once across every track. A lane cannot rescale itself,
 * which is the failure that makes multi-track charts lie.
 *
 * A span may carry a label, and the label is drawn. It used to be accepted and
 * discarded: a caller could write `label: 'parity'`, see nothing, and have no
 * way to tell whether the value was wrong or the component was. That is the
 * failure mode this whole system exists to prevent, and it was sitting inside
 * the system.
 *
 * Where the label goes is measured, not guessed. It sits inside its own bar
 * when the bar is wide enough to hold it and on a line above the bar when it
 * is not, and the lane grows by exactly one line when any label has to go
 * above. A label too long for the whole chart is refused by name.
 *
 * The furniture is the set's furniture. A lane is a rail, so it is the same 2px
 * black2 connector every other rail is; it was a 1px black1 divider, which is
 * the weight this system reserves for a neutral row separator and which is
 * 0.23px on a phone. A span is that rail thickened over the period it covers,
 * in the same two colours the rail and the marks use. An event is the same
 * 20px dot every other component puts on a rail, painted by the same function
 * schedule() uses and knocked out of whatever it lands on. Three pieces of
 * furniture, two colours, one stroke weight, and none of it invented here.
 * ------------------------------------------------------------------------ */

/** Span labels are technical metadata, so they are set in the mono utility role. */
const SPAN_LABEL_ROLE = "utility";

export function swimlanes({
	tracks,
	laneHeight = 88,
	markerSize = space(2),
	accent = COLOR.red,
} = {}) {
	if (!tracks || tracks.length < 2) {
		throw new Error("swimlanes needs at least two tracks. One track is a schedule().");
	}

	const parse = (value, where) => {
		const t = Date.parse(value);
		if (Number.isNaN(t)) {
			throw new Error(`swimlanes could not parse "${value}" in ${where}. Use an ISO date.`);
		}
		return t;
	};

	const all = [];
	for (const track of tracks) {
		if (!track.name) throw new Error("every swimlane track needs a name.");
		refuseUnread(track, ["name", "events", "spans"], "a swimlane track");
		for (const e of track.events || []) {
			refuseUnread(e, ["at", "accent"], `an event in ${track.name}`);
			all.push(parse(e.at, track.name));
		}
		for (const s of track.spans || []) {
			refuseUnread(s, ["from", "to", "label", "accent"], `a span in ${track.name}`);
			const a = parse(s.from, track.name),
				b = parse(s.to, track.name);
			if (b < a) {
				throw new Error(`swimlane span "${s.label}" in ${track.name} ends before it starts.`);
			}
			all.push(a, b);
		}
	}
	if (all.length < 2) throw new Error("swimlanes needs at least two dated points overall.");

	const min = Math.min(...all),
		max = Math.max(...all);
	const span = max - min;
	if (span <= 0) throw new Error("swimlanes needs events spanning more than one instant.");

	const frac = (t) => (t - min) / span;
	const labelWidth = snap(Math.max(...tracks.map((t) => measure(t.name, "list"))) + space(4));
	const axisHeight = lineHeight("utility") + space(2);

	/* ---- span labels ------------------------------------------------------
     The bar has to be tall enough to hold a line of type before a label can
     sit in it, so a chart that carries labels draws taller bars than one that
     does not. The height is the line height of the role, not a number chosen
     to look right. */

	const labelText = (s) => (s.label === undefined || s.label === null ? "" : String(s.label));
	const labelPad = space(1);
	const aboveRoom = lineHeight(SPAN_LABEL_ROLE) + space(1);
	const tracking = type(SPAN_LABEL_ROLE).tracking * typeSize(SPAN_LABEL_ROLE);
	/* An event dot here can land on a filled span, so the page-black disc knocked
     out behind it is a whole connector wide rather than half of one: that gap
     is the only thing separating an accent dot from the accent bar under it,
     and half a stroke is 0.23px on a phone. Both numbers come from here, so the
     hole the marker punches and the hole a span label has to miss cannot
     drift apart. */
	const markClear = STROKE.connector;
	/** The event dot plus the disc knocked out behind it. */
	const ring = markerSize / 2 + markClear;

	/**
	 * Where every span and every label lands at a given width. Called once by
	 * measure and once by paint, from the same width, so the height reported and
	 * the height drawn cannot disagree.
	 */
	function lanes(w) {
		const usable = w - labelWidth;
		let anyAbove = false,
			anyInside = false;

		const spans = tracks.map((track) => {
			// A bar is not empty just because it is wide. Event markers land on it,
			// and a label drawn under one is the same defect as a label not drawn at
			// all: it reports something the reader cannot read. So the markers are
			// part of what "fits" means.
			const marks = (track.events || []).map((e) => usable * frac(Date.parse(e.at)));

			return (track.spans || []).map((s) => {
				const a = usable * frac(Date.parse(s.from));
				const b = usable * frac(Date.parse(s.to));
				const width = Math.max(b - a, markerSize);
				const label = labelText(s);
				if (!label) return { s, a, width, label, inside: false, need: 0 };

				const need = measure(label, SPAN_LABEL_ROLE);
				if (need > usable) {
					throw new Error(
						`swimlanes cannot draw the span label "${label}" in ${track.name}: it measures ` +
							`${Math.ceil(need)}px and the whole time axis is only ${Math.floor(usable)}px wide. ` +
							`Shorten the label. A label that is accepted and not drawn is worse than one refused.`,
					);
				}

				const left = a + labelPad,
					right = left + need;
				const clearOfMarks = marks.every((x) => x + ring <= left || x - ring >= right);
				const inside = need + 2 * labelPad <= width && clearOfMarks;

				if (inside) anyInside = true;
				else anyAbove = true;
				return { s, a, width, label, inside, need };
			});
		});

		// Labels pushed above their bars are no longer bounded by them, so two of
		// them in one lane can collide. Alternating them would only separate
		// neighbours, which is the defect schedule() already refuses, so this
		// refuses it too rather than drawing one label on top of another.
		spans.forEach((lane, i) => {
			const placed = [];
			for (const item of lane) {
				if (item.inside || !item.label) continue;
				const x0 = Math.min(Math.max(item.a, 0), usable - item.need);
				item.aboveX = x0;
				const clash = placed.find(
					(p) => !(x0 + item.need + labelPad <= p.x0 || x0 >= p.x0 + p.need + labelPad),
				);
				if (clash) {
					throw new Error(
						`swimlanes cannot place the span labels "${clash.label}" and "${item.label}" in ` +
							`${tracks[i].name} without overlapping: neither bar is wide enough to hold its own ` +
							`label, so both were pushed above the lane and they now collide. Shorten a label, ` +
							`or split the track.`,
					);
				}
				placed.push({ x0, need: item.need, label: item.label });
			}
		});

		return {
			usable,
			spans,
			anyAbove,
			// A bar only has to be tall enough to hold type if type is going to sit
			// in it. A chart whose labels all went above keeps its thin bars, but no
			// bar is ever thinner than the disc a marker knocks out of it, or the
			// markers bite notches out of its edges.
			barHeight: Math.max(2 * ring, anyInside ? lineHeight(SPAN_LABEL_ROLE) : 0),
			lane: laneHeight + (anyAbove ? aboveRoom : 0),
		};
	}

	return custom({
		unit: true,
		measure: (w) => {
			const l = lanes(w);
			return { w, h: tracks.length * l.lane + axisHeight };
		},
		paint: (ctx, rect, C) => {
			const l = lanes(rect.w);
			const x0 = rect.x + labelWidth;
			const usable = l.usable;
			const laneH = l.lane;
			const barHeight = l.barHeight;
			const lift = l.anyAbove ? aboveRoom : 0;

			tracks.forEach((track, i) => {
				const y = rect.y + i * laneH + lift + laneHeight / 2;

				// lane name, in the same face content labels use everywhere else
				ctx.fillStyle = C.muted;
				ctx.font = `400 ${typeSize("list")}px ${FAMILY.sans}`;
				ctx.textAlign = "left";
				ctx.textBaseline = "middle";
				ctx.fillText(track.name, rect.x, y);

				/* The lane is a rail, so it is drawn as one: the 2px black2 connector
           every other rail in the system uses. It was a 1px black1 divider,
           which is the weight reserved for a neutral row separator and which
           reduces to 0.23px on a phone. A line that carries the lane's whole
           extent is not decoration. */
				ctx.strokeStyle = C.black2;
				ctx.lineWidth = STROKE.connector;
				ctx.beginPath();
				ctx.moveTo(x0, y);
				ctx.lineTo(x0 + usable, y);
				ctx.stroke();

				for (const item of l.spans[i]) {
					const s = item.s;
					const a = x0 + item.a;
					ctx.fillStyle = s.accent ? accent : C.black2;
					ctx.fillRect(a, y - barHeight / 2, item.width, barHeight);

					if (!item.label) continue;

					// Tracked here exactly as the DOM tracks it, so the width the layout
					// measured is the width the canvas paints. Without this the label is
					// 2.08px narrower than the number the fit test was decided on.
					if ("letterSpacing" in ctx) ctx.letterSpacing = `${tracking}px`;
					ctx.font = `400 ${typeSize(SPAN_LABEL_ROLE)}px ${FAMILY.mono}`;
					ctx.textAlign = "left";

					if (item.inside) {
						ctx.textBaseline = "middle";
						// On an accent bar the page black reads; on the neutral bar the ink does.
						ctx.fillStyle = s.accent ? C.page : C.text;
						ctx.fillText(item.label, a + labelPad, y);
					} else {
						ctx.textBaseline = "bottom";
						ctx.fillStyle = s.accent ? accent : C.quiet;
						ctx.fillText(item.label, x0 + item.aboveX, y - barHeight / 2 - labelPad);
					}

					if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
				}

				// The same dot as everywhere else: filled in the accent, a 2px ring
				// otherwise. The knockout is what lets it land on a bar as well as on
				// the lane, and it is the same knockout src/render.js makes so a rail
				// does not bisect a ring.
				for (const e of track.events || []) {
					paintMarker(ctx, C, x0 + usable * frac(Date.parse(e.at)), y, {
						size: markerSize,
						accent: e.accent,
						color: accent,
						clear: markClear,
					});
				}
			});

			/* One shared clock, labelled at both ends only: intermediate ticks on a
         proportional axis invite the reader to measure what is not measurable.

         The two end ticks are not that. Every lane is now the same 2px black2
         rail as this line, so without them the clock reads as a fourth empty
         lane. Bracketing the measure is what tells the two apart, and both
         ends of it are dated, so it is a dimension and not an invitation. */
			const axisY = rect.bottom - axisHeight / 2;
			const scaleY = axisY - space(1);
			ctx.strokeStyle = C.black2;
			ctx.lineWidth = STROKE.connector;
			ctx.beginPath();
			ctx.moveTo(x0, scaleY);
			ctx.lineTo(x0 + usable, scaleY);
			for (const x of [x0, x0 + usable]) {
				ctx.moveTo(x, scaleY);
				ctx.lineTo(x, scaleY - space(1));
			}
			ctx.stroke();

			ctx.fillStyle = C.quiet;
			ctx.font = `400 ${typeSize("utility")}px ${FAMILY.mono}`;
			ctx.textBaseline = "top";
			ctx.textAlign = "left";
			ctx.fillText(new Date(min).toISOString().slice(0, 10), x0, axisY);
			ctx.textAlign = "right";
			ctx.fillText(new Date(max).toISOString().slice(0, 10), x0 + usable, axisY);
		},
	});
}
