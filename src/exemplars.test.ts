import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildArtifact } from "./build.js";
import { lockPlate } from "./kernel/lock.js";
import { PLATE_PLAN_KINDS } from "./kernel/platePlan.js";
import { parseArtifact } from "./parse.js";
import { buildPlate } from "./plate.js";
import { compileSpec } from "./spec.js";

/**
 * Canonical exemplars — one article-grade plan per kind, the gallery's source.
 * A missing, refused, or overflowing exemplar is a CI failure: fix the
 * exemplar (shorter content or a bigger frame), never this test.
 */

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const EXEMPLARS = join(ROOT, "example/exemplars");

/** note and quote are pedagogy-refused as standalone plates by design. */
const REFUSED_STANDALONE = new Set(["note", "quote"]);

const readExemplar = (name: string): unknown =>
	JSON.parse(readFileSync(join(EXEMPLARS, `${name}.json`), "utf8"));

/** Geometry prover: full solve + validate on the locked spec, no escalation. */
const proveGeometry = (spec: Record<string, unknown>): void => {
	const plate = buildPlate(compileSpec(spec), { validateNow: true }) as {
		readonly report: { readonly ok: boolean; readonly errors?: readonly unknown[] };
	};
	expect(plate.report.errors ?? []).toEqual([]);
	expect(plate.report.ok).toBe(true);
};

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

describe("canonical exemplars", () => {
	for (const kind of PLATE_PLAN_KINDS) {
		if (REFUSED_STANDALONE.has(kind)) {
			it(`${kind} exemplar parses but refuses to build with KIND_WEAK (locked-in design)`, () => {
				expect(existsSync(join(EXEMPLARS, `${kind}.json`))).toBe(true);
				const parsed = parseArtifact(readExemplar(kind));
				expect(parsed.ok).toBe(true);
				if (!parsed.ok) throw new Error("expected parse");
				const built = buildArtifact(parsed.plan);
				expect(built.ok).toBe(false);
				if (built.ok) throw new Error("expected refusal");
				expect(built.errors.some((e) => e.code === "KIND_WEAK")).toBe(true);
			});
			continue;
		}
		it(`${kind} exemplar exists, parses, builds, and fits its frame`, () => {
			expect(existsSync(join(EXEMPLARS, `${kind}.json`))).toBe(true);
			const parsed = parseArtifact(readExemplar(kind));
			expect(parsed.ok).toBe(true);
			if (!parsed.ok) throw new Error("expected parse");
			const built = buildArtifact(parsed.plan);
			if (!built.ok) throw new Error(`${kind}: ${built.errors.map((e) => e.code).join(", ")}`);
			proveGeometry(built.spec);
		});
	}

	it("the composed callouts wrapper (a spec, not a plan) locks and fits", () => {
		const raw = readExemplar("_composed-callouts");
		const locked = lockPlate(raw);
		if (!locked.ok) throw new Error(locked.errors.map((e) => e.code).join(", "));
		proveGeometry(locked.spec);
	});
});
