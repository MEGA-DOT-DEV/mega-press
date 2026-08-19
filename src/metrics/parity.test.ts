import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { METRICS_TABLE, tableWidth } from "./table.js";
import { measure, resetMetrics, useLiveMetrics } from "../text.js";

const requireFromHere = createRequire(import.meta.url);
const { createCanvas, GlobalFonts } = requireFromHere("@napi-rs/canvas") as {
	createCanvas: (w: number, h: number) => {
		getContext: (type: "2d") => { font: string; measureText: (t: string) => { width: number } };
	};
	GlobalFonts: { registerFromPath: (path: string, alias?: string) => unknown };
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const extractFaces = (css: string) => {
	const faces: { family: string; bytes: Buffer }[] = [];
	const re =
		/@font-face\s*\{[^}]*font-family:\s*"([^"]+)"[\s\S]*?url\("data:font\/woff2;base64,([^"]+)"\)/g;
	let m;
	while ((m = re.exec(css))) {
		faces.push({ family: m[1] ?? "", bytes: Buffer.from(m[2] ?? "", "base64") });
	}
	return faces;
};

const CORPUS = [
	"The loop is sense, act, observe, stop.",
	"AGENT / LOOP",
	"mega.dev",
	"0123456789",
	"Sense the state: read only the state needed.",
	"BEFORE / AFTER",
	"value_set({ name: 'tz' })",
	"A claim the figure must actually prove.",
];

const previousOffscreen = (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
let tmp: string | null = null;

beforeAll(() => {
	tmp = mkdtempSync(join(tmpdir(), "mega-press-parity-"));
	const css = readFileSync(join(ROOT, "src/fonts.css"), "utf8");
	for (const face of extractFaces(css)) {
		const file = join(tmp, `${face.family.replace(/\s+/g, "-")}.woff2`);
		writeFileSync(file, face.bytes);
		GlobalFonts.registerFromPath(file, face.family);
	}
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
	useLiveMetrics(false);
	if (previousOffscreen === undefined) {
		delete (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
	} else {
		(globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = previousOffscreen;
	}
	if (tmp) rmSync(tmp, { recursive: true, force: true });
});

describe("deterministic text metrics", () => {
	it("table hashes match the vendored faces", () => {
		const css = readFileSync(join(ROOT, "src/fonts.css"), "utf8");
		const faces = extractFaces(css);
		expect(faces.length).toBeGreaterThanOrEqual(3);
		for (const face of faces) {
			const baked = METRICS_TABLE.faces[face.family];
			expect(baked, face.family).toBeTruthy();
			const hash = createHash("sha256").update(face.bytes).digest("hex");
			expect(hash).toBe(baked?.sha256);
		}
	});

	it("table vs live canvas stay within epsilon on the corpus", () => {
		const canvas = createCanvas(8, 8);
		const ctx = canvas.getContext("2d");
		const roles = [
			{ font: '400 72px "Argent Pixel"', role: "display" },
			{ font: '400 40px "Argent Pixel"', role: "head" },
			{ font: '400 32px "Geist Pixel"', role: "list" },
			{ font: '400 26px "Geist Pixel"', role: "body" },
			{ font: '400 26px "Geist Pixel"', role: "utility" },
		];
		for (const { font, role } of roles) {
			ctx.font = font;
			for (const text of CORPUS) {
				const live = ctx.measureText(text).width;
				const table = tableWidth(font, text);
				const eps = 1 + Math.abs(live) * 0.03;
				expect(Math.abs(table - live), `${role} ${text}`).toBeLessThanOrEqual(eps);
			}
		}
	});

	it("regeneration on unchanged fonts is byte-identical in spirit (sorted, hashed)", () => {
		const argent = METRICS_TABLE.faces["Argent Pixel"];
		const keys = Object.keys(argent?.advances ?? {});
		const sorted = [...keys].sort((a, b) => Number(a) - Number(b));
		expect(keys).toEqual(sorted);
		expect(argent?.advances["65"]).toBeGreaterThan(0);
	});

	it("live mode can be toggled without throwing", () => {
		useLiveMetrics(true);
		resetMetrics();
		const live = measure("H", "display");
		useLiveMetrics(false);
		const table = measure("H", "display");
		expect(live).toBeGreaterThan(0);
		expect(table).toBeGreaterThan(0);
	});
});
