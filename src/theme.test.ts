import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { buildArtifact } from "./build.js";
import { parseArtifact } from "./parse.js";
import { buildPlate } from "./plate.js";
import { compileSpec } from "./spec.js";
import { COLOR } from "./tokens.js";
import {
	configurePress,
	resetPressTheme,
	resolveChrome,
	withPressTheme,
} from "./theme.js";

const railSpec = {
	id: "loop",
	frame: "landscape" as const,
	title: "The loop is sense, act, observe, stop.",
	body: {
		type: "railSteps",
		items: [
			{ name: "Sense", detail: "Read the world state that decides the next move." },
			{ name: "Think", detail: "Pick one bounded action that advances the goal." },
			{ name: "Act", detail: "Call exactly one allowed tool with checked inputs." },
			{ name: "Observe", detail: "Compare the tool result against the stop condition." },
		],
	},
};

const textsOf = (plate: { nodes: readonly { kind?: string; text?: string; isTitle?: boolean }[] }) =>
	plate.nodes.filter((n) => n.kind === "text");

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

afterEach(() => {
	resetPressTheme();
});

describe("press theme", () => {
	it("embed chrome hides title, kicker, number, footnote, and brand", () => {
		const chrome = resolveChrome("embed");
		expect(chrome.title).toBe(false);
		expect(chrome.kicker).toBe(false);
		expect(chrome.number).toBe(false);
		expect(chrome.footnote).toBe(false);
		expect(chrome.brand).toBe(false);
	});

	it("refuses a colour swap that fails the contrast lock", () => {
		try {
			configurePress({ color: { page: "#ffffff" } });
			throw new Error("expected contrast refusal");
		} catch (error) {
			expect((error as { code?: string }).code).toBe("THEME_CONTRAST");
		}
		expect(COLOR.page).toBe("#000000");
	});

	it("accepts a cabinet swap that still clears the floors", () => {
		configurePress({ color: { red: "#ff3333" } });
		expect(COLOR.red).toBe("#ff3333");
		resetPressTheme();
		expect(COLOR.red).toBe("#ff0000");
	});

	it("keeps the mega.dev brand on one line", () => {
		const plate = buildPlate(compileSpec(railSpec));
		const brand = textsOf(plate).find((n) => n.text === "mega.dev") as
			| { _block?: { lines: string[] } }
			| undefined;
		expect(brand).toBeTruthy();
		expect(brand?._block?.lines).toEqual(["mega.dev"]);
	});

	it("does not invent SPECIMEN when footnote is omitted", () => {
		const parsed = parseArtifact({
			kind: "railSteps",
			id: "loop",
			title: "The loop is sense, act, observe, stop.",
			steps: railSpec.body.items,
		});
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) throw new Error("expected parse");
		const built = buildArtifact(parsed.plan);
		expect(built.ok).toBe(true);
		if (!built.ok) throw new Error("expected lock");
		expect(built.spec.footnote).toBeUndefined();
	});

	it("parses and locks a plan with no title", () => {
		const parsed = parseArtifact({
			kind: "railSteps",
			id: "loop",
			steps: railSpec.body.items,
		});
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) throw new Error("expected parse");
		expect(parsed.plan.title).toBeUndefined();
		const built = buildArtifact(parsed.plan);
		expect(built.ok).toBe(true);
		if (!built.ok) throw new Error("expected lock");
		expect(built.spec.title).toBeUndefined();
	});

	it("keeps the title on the spec but does not paint it under embed chrome", () => {
		const plate = withPressTheme({ chrome: "embed" }, () =>
			buildPlate(compileSpec(railSpec), { validateNow: true }),
		);
		const texts = textsOf(plate);
		expect(texts.some((n) => n.isTitle)).toBe(false);
		expect(texts.some((n) => /mega\.dev/i.test(String(n.text)))).toBe(false);
		expect(texts.some((n) => String(n.text).includes("The loop"))).toBe(false);
		expect(texts.some((n) => n.text === "Sense")).toBe(true);
	});

	it("paints title and brand under the specimen default", () => {
		const plate = buildPlate(compileSpec(railSpec), { validateNow: true });
		const texts = textsOf(plate);
		expect(texts.some((n) => n.isTitle && String(n.text).includes("The loop"))).toBe(true);
		expect(texts.some((n) => /mega\.dev/i.test(String(n.text)))).toBe(true);
	});
});
