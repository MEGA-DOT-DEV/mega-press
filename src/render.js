/**
 * PRESS / render
 *
 * One solved geometry, two renderers.
 *
 *   vector canvas   rules, rails, links, arrowheads, borders, markers
 *   DOM layer       every run of text, absolutely positioned at solved
 *                   coordinates so it stays crisp, selectable and searchable
 *   field canvas    the optional dithered ground, at cell resolution
 *
 * The point of the split is that both renderers read the same rects. A
 * connector cannot land 3px off a box, because the number it uses to find the
 * box is the number the box was drawn with. There is no second source of
 * truth to drift away from.
 */

import { arrowhead } from "./connect.js";
import { contentMass, MIN_HALO, plateGround } from "./field.js";
import { cellCanvas, resolve } from "./screen.js";
import { COLOR, FAMILY, lineHeight, STROKE, type } from "./tokens.js";

const NS_STYLE = `
.press-plate { position: relative; overflow: hidden; }
.press-plate canvas { position: absolute; inset: 0; display: block; pointer-events: none; }
.press-ground { position: absolute; pointer-events: none; }
.press-dom { position: absolute; inset: 0; }
.press-text { position: absolute; margin: 0; white-space: pre; }
`;

let styled = false;
function ensureStyle(doc) {
	if (styled) return;
	const el = doc.createElement("style");
	el.textContent = NS_STYLE;
	doc.head.appendChild(el);
	styled = true;
}

/* --------------------------------------------------------------------------
 * Mount
 * ------------------------------------------------------------------------ */

export function mount(plate, host, { dpr = 2, field = null, pixelSize = 4 } = {}) {
	const doc = host.ownerDocument;
	ensureStyle(doc);

	const { frame } = plate;
	const root = doc.createElement("div");
	root.className = "press-plate";
	root.style.width = `${frame.w}px`;
	root.style.height = `${frame.h}px`;
	root.style.background = COLOR.page;

	// 0. the ground the plate declares, behind everything, always full bleed.
	//
	//    A band is a flat stripe and a picture is a halftone; both are painted
	//    from rects the solver already produced, so neither can disagree with the
	//    layout it sits behind.
	paintGround(doc, root, plate, { pixelSize });

	// 1. the dithered ground, at cell resolution.
	//
	//    `field` is a factory rather than a plain object: it is handed the cell
	//    grid so a mass map can be baked once instead of being solved per cell.
	//
	//    The lab's own field, when its rail has it switched on, stands in for the
	//    plate's declared one: two screens over each other is twice the ink and
	//    neither reads. Off, which is the default and therefore what every
	//    exported PNG uses, the plate's own ground is what prints.
	const screen = field || declaredField(plate);
	let fieldCanvas = null;
	if (screen) {
		fieldCanvas = doc.createElement("canvas");
		root.appendChild(fieldCanvas);
		const { cols, rows, ctx } = cellCanvas(fieldCanvas, frame.w, frame.h, pixelSize);
		const f = typeof screen === "function" ? screen(cols, rows, frame) : screen;
		resolve(ctx, {
			cols,
			rows,
			spacing: f.spacing ?? 2,
			ink: f.ink ?? COLOR.ink,
			accent: f.accent,
			density: f.density,
		});
	}

	// 2. the vector layer, at device resolution so hairlines stay hairlines
	const vector = doc.createElement("canvas");
	vector.width = frame.w * dpr;
	vector.height = frame.h * dpr;
	vector.style.width = `${frame.w}px`;
	vector.style.height = `${frame.h}px`;
	/* Named, so anything repainting part of a mounted plate finds this layer
     rather than the ground or a picture. `src/interact.js` drives a morph
     through it; nothing else looks. */
	vector.dataset.pressLayer = "vector";
	root.appendChild(vector);
	const vctx = vector.getContext("2d");
	vctx.scale(dpr, dpr);
	paintVector(vctx, plate);

	// 3. the text layer
	const dom = doc.createElement("div");
	dom.className = "press-dom";
	paintText(doc, dom, plate);
	root.appendChild(dom);

	host.appendChild(root);
	return { root, vector, field: fieldCanvas, dom };
}

/* --------------------------------------------------------------------------
 * Ground
 *
 * Everything here is full bleed by construction: the rect comes from
 * `plate.background`, which the chase resolved against the frame, never
 * against the safe area.
 *
 * The one rule the ground has to obey is that the type on top of it stays
 * readable, and the system does not enforce that with an opacity somebody
 * chose by eye. A field clears itself around every solved rect. A band is
 * drawn from a wash on a three value scale that cannot fail the contrast
 * arithmetic. A picture is resolved through the same 4x4 ordered screen as
 * every other continuous quantity in the system and then cleared the same way
 * the field is, so it is never a photograph behind a paragraph: it is ink at a
 * known maximum density with a hole in it exactly where the words are.
 * ------------------------------------------------------------------------ */

function declaredField(plate) {
	const bg = plate.background;
	return bg && bg.type === "field" ? plateGround(plate, bg) : null;
}

function paintGround(doc, root, plate, { pixelSize = 4 } = {}) {
	const bg = plate.background;
	if (!bg) return null;
	if (bg.type === "band") return paintBand(doc, root, plate);
	if (bg.type === "image") return paintPicture(doc, root, plate, pixelSize);
	return null; // 'field' is resolved by the screen layer in mount()
}

/** A stripe behind the body, at the rect the chase derived from the body. */
function paintBand(doc, root, plate) {
	const { rect, fill } = plate.background;
	const el = doc.createElement("div");
	el.className = "press-ground";
	el.style.left = `${rect.x}px`;
	el.style.top = `${rect.y}px`;
	el.style.width = `${rect.w}px`;
	el.style.height = `${rect.h}px`;
	el.style.background = fill;
	root.appendChild(el);
	return el;
}

/**
 * A picture as ground.
 *
 * The image is sampled once per cell, not per pixel: a 1600px frame at pixel
 * size 4 is a 400 wide grid, so the whole thing is 100k samples and costs
 * nothing. The tone is read gamma encoded rather than linear on purpose. An
 * ordered screen distributes dot sizes evenly across the encoded range, which
 * is what a halftone screen has always done; resolving linear light instead
 * crushes every midtone in the picture to black.
 */
const PICTURE = {
	spacing: 1, // every cell, so the screen has the tonal range to be a picture
	contrast: 1.15,
	lift: 0.1, // so the shadows in a picture print as ink rather than as nothing
	ceiling: 0.62, // and so the highlights never print brighter than body copy
	ink: COLOR.ink,
	halo: 110,
	massStrength: 1,
};

/**
 * Background srcs stay as written. Bundlers treat `new URL("../", import.meta.url)`
 * as a static asset and refuse the directory, which broke Next/Vite consumers.
 * Absolute and protocol-relative URLs already work; relative ones are
 * document-relative. The image kind is withheld from the catalog.
 */
const resolveSrc = (src) => src;

function paintPicture(doc, root, plate, pixelSize) {
	const { frame, background } = plate;
	const p = { ...PICTURE, ...background };

	const canvas = doc.createElement("canvas");
	canvas.setAttribute("role", "img");
	canvas.setAttribute("aria-label", background.alt);
	root.appendChild(canvas);

	const { cols, rows, ctx } = cellCanvas(canvas, frame.w, frame.h, pixelSize);
	const mass = contentMass(plate, cols, rows, frame, {
		halo: Math.max(p.halo, MIN_HALO),
		strength: p.massStrength,
	});

	let done = false;
	const img = new Image();

	const draw = () => {
		if (done || !img.naturalWidth) return;
		done = true;

		// Cover: the picture fills the cell grid and is cropped, never letterboxed,
		// because a ground with a bar down one side is not a ground.
		const off = doc.createElement("canvas");
		off.width = cols;
		off.height = rows;
		const octx = off.getContext("2d", { willReadFrequently: true });
		const s = Math.max(cols / img.naturalWidth, rows / img.naturalHeight);
		const w = img.naturalWidth * s,
			h = img.naturalHeight * s;
		octx.drawImage(img, (cols - w) / 2, (rows - h) / 2, w, h);
		const px = octx.getImageData(0, 0, cols, rows).data;

		resolve(ctx, {
			cols,
			rows,
			spacing: p.spacing,
			ink: p.ink,
			density: (_uvx, _uvy, x, y) => {
				const i = y * cols + x;
				const o = i * 4;
				const tone = (0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2]) / 255;
				// The ceiling is the legibility floor read from the other side. A fully
				// lit region of the screen averages `ceiling` x the ink colour, and at
				// 0.62 of #d9d9d9 that is #878787, darker than the #a1a1a1 body copy
				// that may sit near it. A picture cannot out-print the type by being
				// bright, whatever the picture is.
				let d = (tone - 0.5) * p.contrast + 0.5 + p.lift;
				if (d > p.ceiling) d = p.ceiling;
				d -= mass[i] * p.massStrength;
				return d < 0 ? 0 : d > 1 ? 1 : d;
			},
		});
	};

	img.onload = draw;
	img.src = resolveSrc(background.src);
	// A cached picture can be complete before the handler is attached.
	if (img.complete) draw();
	return canvas;
}

/* --------------------------------------------------------------------------
 * Vector layer
 * ------------------------------------------------------------------------ */

export function paintVector(ctx, plate) {
	const { nodes, links = [], rails = [], rules = [], marks } = plate;

	// Rails first, so the markers they thread sit on top of them. Painted the
	// other way round, a 2px rail bisects every dot it runs through.
	for (const rl of rails) {
		ctx.strokeStyle = rl.color;
		ctx.lineWidth = rl.weight;
		line(ctx, rl.points, rl.dash);
	}

	// fills, borders and markers
	for (const n of nodes) {
		if (!n.rect) continue;
		if (n.kind === "box") {
			if (n.fill) {
				ctx.fillStyle = n.fill;
				ctx.fillRect(n.rect.x, n.rect.y, n.rect.w, n.rect.h);
			}
			if (n.border) {
				ctx.strokeStyle = n.borderColor || COLOR.black2;
				ctx.lineWidth = STROKE.divider;
				// Half-pixel offset so a 1px border lands on a pixel, not across two.
				ctx.strokeRect(n.rect.x + 0.5, n.rect.y + 0.5, n.rect.w - 1, n.rect.h - 1);
			}
		}
		if (n.kind === "marker") {
			const r = n.rect;
			/* A marker is a square, not a disc: the icon set and the faces are all
         on the pixel grid, and a circle is the one mark that grid cannot make.
         Its rect is already exactly its own size, so the square is the rect.

         Knock the rail out from behind the mark first.
         A rail is derived to pass through the marker centres, which is correct,
         but it means it runs straight across every marker it threads. A filled
         mark hides it; an unfilled ring does not, and reads as a square with a
         line bisecting it. Clearing a page-black square the size of the marker
         plus its own stroke makes a ring read as a ring, and changes nothing
         for a filled one. */
			const pad = STROKE.connector / 2;
			ctx.fillStyle = COLOR.page;
			ctx.fillRect(r.x - pad, r.y - pad, r.w + 2 * pad, r.h + 2 * pad);

			if (n.ring) {
				ctx.strokeStyle = n.fill || COLOR.red;
				ctx.lineWidth = STROKE.connector;
				ctx.strokeRect(r.x + pad, r.y + pad, r.w - 2 * pad, r.h - 2 * pad);
			} else {
				ctx.fillStyle = n.fill || COLOR.red;
				ctx.fillRect(r.x, r.y, r.w, r.h);
			}
		}
		if (n.kind === "custom" && typeof n.paint === "function") {
			ctx.save();
			n.paint(ctx, n.rect, COLOR);
			ctx.restore();
		}
		if (n.kind === "rule") {
			ctx.strokeStyle = n.color || COLOR.line;
			ctx.lineWidth = n.weight;
			line(ctx, [
				{ x: n.rect.left, y: n.rect.cy },
				{ x: n.rect.right, y: n.rect.cy },
			]);
		}
	}

	for (const rr of rules) {
		ctx.strokeStyle = rr.color;
		ctx.lineWidth = rr.weight;
		line(ctx, rr.points, rr.dash);
	}

	for (const l of links) {
		ctx.strokeStyle = l.color;
		ctx.lineWidth = l.weight;
		ctx.lineJoin = "miter";
		line(ctx, l.points);
		if (l.arrow) {
			const head = arrowhead(l.points);
			if (head) {
				ctx.fillStyle = l.color;
				for (const r of head) ctx.fillRect(r.x, r.y, r.w, r.h);
			}
		}
	}

	ctx.setLineDash([]);
	if (marks) paintCornerMarks(ctx, plate);
}

function line(ctx, points, dash) {
	if (!points || points.length < 2) return;
	// A solid rule says "these are different sections"; a dashed one says "this
	// is a measurement". Same weights, different grammar.
	ctx.setLineDash(dash?.length ? dash : []);
	ctx.beginPath();
	// Snap to the half-pixel so an even-width stroke covers whole pixels.
	const off = ctx.lineWidth % 2 === 1 ? 0.5 : 0;
	ctx.moveTo(points[0].x + off, points[0].y + off);
	for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x + off, points[i].y + off);
	ctx.stroke();
}

/**
 * Corner marks rather than a continuous border, matching mega.dev, whose
 * panels are bounded without hard borders. Three neutral, the top-left one red
 * like a registration mark.
 */
function paintCornerMarks(ctx, plate) {
	const { frame, marks } = plate;
	const { inset = 40, arm = 70, weight = STROKE.mark } = marks;
	const corners = [
		{ x: inset, y: inset, dx: 1, dy: 1, color: COLOR.red },
		{ x: frame.w - inset, y: inset, dx: -1, dy: 1, color: COLOR.black2 },
		{ x: inset, y: frame.h - inset, dx: 1, dy: -1, color: COLOR.black2 },
		{ x: frame.w - inset, y: frame.h - inset, dx: -1, dy: -1, color: COLOR.black2 },
	];
	ctx.lineWidth = weight;
	for (const c of corners) {
		ctx.strokeStyle = c.color;
		line(ctx, [
			{ x: c.x, y: c.y },
			{ x: c.x + arm * c.dx, y: c.y },
		]);
		line(ctx, [
			{ x: c.x, y: c.y },
			{ x: c.x, y: c.y + arm * c.dy },
		]);
	}
}

/* --------------------------------------------------------------------------
 * Text layer
 *
 * Positioned from the same rects. The first baseline is derived from the
 * role's line height so a text box's top edge is the top of its line box, not
 * the top of its cap height, which is what makes stacked text sit on the unit
 * grid.
 * ------------------------------------------------------------------------ */

export function paintText(doc, host, plate) {
	for (const n of plate.nodes) {
		if (n.kind === "image" && n.rect) {
			const img = doc.createElement("img");
			img.src = n.src;
			img.alt = n.alt || "";
			img.style.position = "absolute";
			img.style.left = `${n.rect.x}px`;
			img.style.top = `${n.rect.y}px`;
			img.style.width = `${n.rect.w}px`;
			img.style.height = `${n.rect.h}px`;
			img.style.objectFit = n.fit;
			img.style.display = "block";
			host.appendChild(img);
			continue;
		}
		if (n.kind !== "text" || !n.rect || !n._block) continue;
		const t = type(n.role);
		const lh = lineHeight(n.role);

		n._block.lines.forEach((lineText, i) => {
			const el = doc.createElement("p");
			el.className = "press-text";
			el.textContent = lineText;
			/* Identity, for anything that has to recognise this run of text in a
         different solve of the same plate. `src/interact.js` tweens between
         two states by matching these; nothing else reads them. */
			if (n._key) {
				el.dataset.pressKey = n._key;
				el.dataset.pressLine = String(i);
			}
			el.style.left = `${n.rect.x}px`;
			el.style.top = `${n.rect.y + i * lh}px`;
			el.style.width = `${n.rect.w}px`;
			el.style.height = `${lh}px`;
			el.style.lineHeight = `${lh}px`;
			el.style.fontFamily = FAMILY[n.family || t.family];
			el.style.fontSize = `${t.size}px`;
			el.style.fontWeight = String(n.weight || 400);
			el.style.letterSpacing = `${(t.tracking || 0) * t.size}px`;
			el.style.color = n.color || (t.family === "mono" ? COLOR.text : COLOR.muted);
			el.style.textAlign = n.align || "left";
			host.appendChild(el);
		});
	}
}
