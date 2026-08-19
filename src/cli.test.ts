import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const BIN = join(ROOT, "bin/press.mjs");
const RAIL = join(ROOT, "example/fixtures/rail.json");
const INVALID = join(ROOT, "example/fixtures/invalid.json");
const OVERFLOW = join(ROOT, "example/fixtures/overflow-title.json");
const TOO_LONG = join(ROOT, "example/fixtures/too-long-title.json");

const run = (args: string[]) =>
	spawnSync(process.execPath, [BIN, ...args], {
		encoding: "utf8",
		cwd: ROOT,
	});

beforeAll(() => {
	if (existsSync(join(ROOT, "dist/parse.js"))) return;
	const built = spawnSync("pnpm", ["build"], { cwd: ROOT, encoding: "utf8" });
	expect(built.status).toBe(0);
});

describe("press cli", () => {
	it("kinds --json lists the catalog", () => {
		const r = run(["kinds", "--json"]);
		expect(r.status).toBe(0);
		const body = JSON.parse(r.stdout);
		expect(body.ok).toBe(true);
		const ids = body.kinds.map((k: { id: string }) => k.id);
		expect(ids).toEqual([
			"railSteps",
			"compare",
			"compareFlows",
			"metrics",
			"cards",
			"checklist",
			"table",
			"layers",
			"bars",
			"segments",
			"quadrant",
			"timeline",
			"timelineVertical",
			"railFlow",
			"graph",
			"derivation",
			"code",
			"tree",
			"codeSteps",
		]);
	});

	it("schema railSteps --json returns slots", () => {
		const r = run(["schema", "railSteps", "--json"]);
		expect(r.status).toBe(0);
		const body = JSON.parse(r.stdout);
		expect(body.ok).toBe(true);
		expect(body.schema.id).toBe("railSteps");
		expect(body.schema.slots.required).toContain("steps");
	});

	it("schema of an unknown kind exits 1", () => {
		const r = run(["schema", "not-a-kind", "--json"]);
		expect(r.status).toBe(1);
		const body = JSON.parse(r.stdout);
		expect(body.ok).toBe(false);
		expect(body.errors[0].code).toBe("UNKNOWN_KIND");
	});

	it("check locks a valid rail", () => {
		const r = run(["check", RAIL, "--json"]);
		expect(r.status).toBe(0);
		const body = JSON.parse(r.stdout);
		expect(body.ok).toBe(true);
		expect(Array.isArray(body.warnings)).toBe(true);
	});

	it("check refuses a garbage-length title with TITLE_TOO_LONG", () => {
		const r = run(["check", TOO_LONG, "--json"]);
		expect(r.status).toBe(1);
		const body = JSON.parse(r.stdout);
		expect(body.errors.some((e: { code: string }) => e.code === "TITLE_TOO_LONG")).toBe(true);
	});

	it("check refuses a geometric overflow with a named code", () => {
		const r = run(["check", OVERFLOW, "--json"]);
		expect(r.status).toBe(1);
		const body = JSON.parse(r.stdout);
		expect(body.ok).toBe(false);
		expect(
			body.errors.some((e: { code: string }) => e.code === "TEXT_OVERFLOW" || e.code === "CONTENT_OVERFLOW"),
		).toBe(true);
	});

	it("render overflow writes no png and exits 1", () => {
		const dir = mkdtempSync(join(tmpdir(), "mega-press-cli-"));
		const dest = join(dir, "nope.png");
		const r = run(["render", OVERFLOW, "--format", "png", "--out", dest, "--json"]);
		expect(r.status).toBe(1);
		expect(existsSync(dest)).toBe(false);
		const body = JSON.parse(r.stdout);
		expect(
			body.errors.some((e: { code: string }) => e.code === "TEXT_OVERFLOW" || e.code === "CONTENT_OVERFLOW"),
		).toBe(true);
	});

	it("check refuses a thin rail and writes nothing", () => {
		const r = run(["check", INVALID, "--json"]);
		expect(r.status).toBe(1);
		const body = JSON.parse(r.stdout);
		expect(body.ok).toBe(false);
		expect(body.errors.some((e: { code: string }) => e.code === "STEPS_MISSING")).toBe(true);
	});

	it("render --format json prints a locked spec", () => {
		const r = run(["render", RAIL, "--format", "json", "--json"]);
		expect(r.status).toBe(0);
		const body = JSON.parse(r.stdout);
		expect(body.ok).toBe(true);
		expect(body.spec.body).toBeTruthy();
		expect(body.spec.title).toBeTruthy();
	});

	it("render refuse writes no html file", () => {
		const dir = mkdtempSync(join(tmpdir(), "mega-press-cli-"));
		const dest = join(dir, "nope.html");
		const r = run(["render", INVALID, "--format", "html", "--out", dest, "--json"]);
		expect(r.status).toBe(1);
		expect(existsSync(dest)).toBe(false);
		expect(JSON.parse(r.stdout).errors.some((e: { code: string }) => e.code === "STEPS_MISSING")).toBe(
			true,
		);
	});

	it("render --format html writes a self-contained preview", () => {
		const dir = mkdtempSync(join(tmpdir(), "mega-press-cli-"));
		const dest = join(dir, "rail.html");
		const r = run(["render", RAIL, "--format", "html", "--out", dest, "--json"]);
		expect(r.status).toBe(0);
		expect(existsSync(dest)).toBe(true);
		const html = readFileSync(dest, "utf8");
		expect(html).toContain("__PRESS_SPEC__");
		expect(html).toContain("pressReady");
		expect(html).toContain("railSteps");
	}, 60_000);

	it("gallery writes one self-contained page mounting every kind's exemplar", () => {
		const dir = mkdtempSync(join(tmpdir(), "mega-press-cli-"));
		const dest = join(dir, "gallery.html");
		const r = run(["gallery", "--out", dest, "--json"]);
		expect(r.status).toBe(0);
		expect(existsSync(dest)).toBe(true);
		const body = JSON.parse(r.stdout);
		expect(body.ok).toBe(true);
		expect(body.kinds).toBe(21);
		const html = readFileSync(dest, "utf8");
		expect(html).toContain("__PRESS_GALLERY__");
		expect(html).toContain("compareFlows");
		expect(html).toContain("codeSteps");
		expect(html).toContain("pressReady");
	}, 90_000);

	it("render --format png writes a png when chrome exists", () => {
		const chrome = [
			process.env.CHROME,
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			"/Applications/Chromium.app/Contents/MacOS/Chromium",
			"/usr/bin/google-chrome",
			"/usr/bin/chromium",
		].find((p) => p && existsSync(p));
		const dir = mkdtempSync(join(tmpdir(), "mega-press-cli-"));
		const dest = join(dir, "rail.png");
		const r = run(["render", RAIL, "--format", "png", "--out", dest, "--json"]);
		if (!chrome) {
			expect(r.status).toBe(2);
			expect(existsSync(dest)).toBe(false);
			return;
		}
		expect(r.status).toBe(0);
		expect(existsSync(dest)).toBe(true);
		const bytes = readFileSync(dest);
		expect(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
	}, 90_000);
});
