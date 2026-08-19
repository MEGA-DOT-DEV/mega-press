import { createRequire } from "node:module";
import { buildPlate as buildRealPressPlate } from "../plate.js";
import { compileSpec as compileRealPressSpec } from "../spec.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateAuthorPlate } from "./authorPlate.js";
import { normalizePlateSpec } from "./normalize.js";

const validPlate = () => ({
	type: "plate" as const,
	spec: {
		id: "shared-spine",
		frame: "landscape",
		title: "One projection",
		footnote: "SPECIMEN",
		body: {
			type: "metrics",
			items: [{ label: "Projection", value: "1", unit: "function" }],
		},
	},
	lock: { status: "locked" as const },
});

const previousOffscreenCanvas = (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;

beforeAll(() => {
	const requireFromHere = createRequire(import.meta.url);
	const { createCanvas } = requireFromHere("@napi-rs/canvas") as {
		createCanvas: (width: number, height: number) => { getContext: (type: string) => unknown };
	};
	class TestOffscreenCanvas {
		readonly canvas: { getContext: (type: string) => unknown };
		constructor(width = 1, height = 1) {
			this.canvas = createCanvas(width, height);
		}
		getContext(type: string) {
			return this.canvas.getContext(type);
		}
	}
	(globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = TestOffscreenCanvas;
});

afterAll(() => {
	if (previousOffscreenCanvas === undefined) {
		delete (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
	} else {
		(globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = previousOffscreenCanvas;
	}
});

describe("author plate admissibility", () => {
	it("accepts byte-canonical input and conforms to the real reader compile/build pipeline", () => {
		const plate = validPlate();
		const before = structuredClone(plate);
		const nativeCanvas = (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
		const decision = validateAuthorPlate(plate);
		expect(decision).toEqual({ ok: true, value: plate });
		expect(plate).toEqual(before);
		expect((globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas).toBe(nativeCanvas);

		const normalized = normalizePlateSpec(structuredClone(plate.spec));
		expect(normalized).toEqual(plate.spec);
		const rendered = buildRealPressPlate(compileRealPressSpec(normalized), {
			validateNow: true,
		}) as { readonly report: { readonly ok: boolean } };
		expect(rendered.report.ok).toBe(true);
	});

	it("returns actionable Press refusal reasons", () => {
		const plate = validPlate();
		const invalid = {
			...plate,
			spec: { ...plate.spec, body: { type: "invented", value: "no" } },
		};
		expect(validateAuthorPlate(invalid)).toMatchObject({
			ok: false,
			error: {
				_tag: "InvalidDocument",
				code: "UNKNOWN_COMPONENT",
				message: expect.stringContaining('"invented" is not a component'),
			},
		});
	});

	it("accepts a real Press composition outside the narrower generation catalog", () => {
		const plate = {
			...validPlate(),
			spec: {
				...validPlate().spec,
				body: {
					type: "grid",
					cols: 2,
					children: [
						{ type: "note", content: "First" },
						{ type: "note", content: "Second" },
					],
				},
			},
		};
		expect(validateAuthorPlate(plate)).toEqual({ ok: true, value: plate });
	});

	it("rejects unknown top fields and layouts through the real compiler/build boundary", () => {
		expect(
			validateAuthorPlate({
				...validPlate(),
				spec: { ...validPlate().spec, mystery: "ignored" },
			}),
		).toMatchObject({
			ok: false,
			error: { code: "BAD_SPEC", message: expect.stringContaining("unknown top level field") },
		});
		expect(
			validateAuthorPlate({
				...validPlate(),
				spec: { ...validPlate().spec, layout: "masonry" },
			}),
		).toMatchObject({ ok: false, error: { code: "UNKNOWN_LAYOUT" } });
	});

	it("fails closed on an actual Press component build refusal", () => {
		expect(
			validateAuthorPlate({
				...validPlate(),
				spec: {
					...validPlate().spec,
					body: {
						type: "bars",
						unit: "items",
						items: [
							{ label: "Invalid", value: -1 },
							{ label: "Valid", value: 2 },
						],
					},
				},
			}),
		).toMatchObject({
			ok: false,
			error: { code: "COMPONENT_REFUSED", message: expect.stringContaining("negative value") },
		});
	});

	it("rejects every silent reader normalization without mutating the submitted bytes", () => {
		for (const dash of ["—", "–"]) {
			const withDash = {
				...validPlate(),
				spec: {
					...validPlate().spec,
					body: { type: "note", content: `Sense${dash}then act` },
				},
			};
			const before = structuredClone(withDash);
			expect(validateAuthorPlate(withDash)).toMatchObject({
				ok: false,
				error: {
					code: "PRESS_NORMALIZATION",
					message: expect.stringContaining("silently normalized"),
				},
			});
			expect(withDash).toEqual(before);
			expect(normalizePlateSpec(withDash.spec)).not.toEqual(withDash.spec);
		}

		const withoutFootnote = validPlate();
		const { footnote: _footnote, ...spec } = withoutFootnote.spec;
		expect(validateAuthorPlate({ ...withoutFootnote, spec })).toMatchObject({
			ok: true,
		});
	});

	it("rejects dropped, malformed, and semantically unrenderable artifacts", () => {
		expect(
			validateAuthorPlate({ ...validPlate(), lock: { status: "dropped", errors: [] } }),
		).toMatchObject({ ok: false, error: { code: "PLATE_LOCK" } });
		expect(
			validateAuthorPlate({ type: "plate", spec: {}, lock: { status: "locked" } }),
		).toMatchObject({ ok: false, error: { code: "BAD_SPEC" } });
		expect(
			validateAuthorPlate({ ...validPlate(), lock: { status: "locked", errors: "invalid" } }),
		).toMatchObject({ ok: false, error: { code: "PLATE_LOCK" } });
		expect(
			validateAuthorPlate({
				...validPlate(),
				spec: { id: "missing-body", title: "Missing body", footnote: "SPECIMEN" },
			}),
		).toMatchObject({
			ok: false,
			error: { code: "BAD_SPEC", message: "plate body type is required" },
		});
		expect(
			validateAuthorPlate({
				...validPlate(),
				spec: { ...validPlate().spec, frame: "wide" },
			}),
		).toMatchObject({ ok: false, error: { code: "PRESS_NORMALIZATION" } });
		expect(
			validateAuthorPlate({
				...validPlate(),
				spec: {
					...validPlate().spec,
					body: { type: "railSteps", items: [{ name: "Only", detail: "Not a sequence" }] },
				},
			}),
		).toMatchObject({
			ok: false,
			error: { code: "COMPONENT_REFUSED", message: expect.stringContaining("at least two") },
		});
	});
});
