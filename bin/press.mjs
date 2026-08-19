#!/usr/bin/env node
/**
 * press — local agent face of @mega/press.
 *
 *   press kinds
 *   press schema [kind]
 *   press check <spec|->
 *   press render <spec|-> --format html|png|json [--out <path>]
 *
 * --json          machine-readable output
 * Exit: 0 lock, 1 refuse, 2 tool-broke
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const argv = process.argv.slice(2);
const command = argv[0];
const positional = argv.slice(1).filter((a) => a === "-" || !a.startsWith("-"));
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const JSON_OUT = flag("json");

const HELP = `
press  @mega/press, from the command line

  press kinds                      what you can build
  press schema [kind]              slot shape for one kind, or all
  press check <spec|->             validate a spec, write nothing
  press render <spec|-> --format html|png|json [--out <path>]
                                   lock, then write the asked format

  --json          machine readable output
  --format <fmt>  json (default) · html · png
  --out <path>    write target (html/png file; json file or stdout)
  --scale <n>     png device scale              (default 2)
  --timeout <ms>  chrome screenshot budget      (default 20000)

Exit codes: 0 success, 1 the plate did not lock, 2 the tool failed.

A spec is JSON: { "id", "kind", "title", …slots }. Start with \`press kinds\`.
`;

const out = (human, data) => {
	if (JSON_OUT) console.log(JSON.stringify(data, null, 2));
	else if (human != null) console.log(human);
};

const die = (message, code = 2) => {
	if (JSON_OUT) console.log(JSON.stringify({ ok: false, error: message }, null, 2));
	else console.error(`\n  ${message}\n`);
	process.exit(code);
};

const CHROME = [
	process.env.CHROME,
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/Applications/Chromium.app/Contents/MacOS/Chromium",
	"/usr/bin/google-chrome",
	"/usr/bin/chromium",
].find((p) => p && existsSync(p));

function ensureDist() {
	if (existsSync(join(ROOT, "dist/parse.js"))) return;
	const r = spawnSync("pnpm", ["build"], { cwd: ROOT, stdio: JSON_OUT ? "ignore" : "inherit" });
	if (r.status !== 0 || !existsSync(join(ROOT, "dist/parse.js"))) {
		die("could not build dist/. Run pnpm build in mega-press.");
	}
}

async function kernel() {
	ensureDist();
	const [{ parseArtifact }, { buildArtifact }, catalog, lock] = await Promise.all([
		import(join(ROOT, "dist/parse.js")),
		import(join(ROOT, "dist/build.js")),
		import(join(ROOT, "dist/kernel/artifactModules.js")),
		import(join(ROOT, "dist/kernel/lock.js")),
	]);
	return {
		parseArtifact,
		buildArtifact,
		listArtifactModules: catalog.listArtifactModules,
		getArtifactModuleSchema: catalog.getArtifactModuleSchema,
		frameSize: lock.frameSize,
	};
}

function readSpec(source) {
	if (!source) die("this command needs a spec: a path to a JSON file, or `-` for stdin.");
	const raw = source === "-" ? readFileSync(0, "utf8") : readFileSync(resolve(process.cwd(), source), "utf8");
	try {
		return JSON.parse(raw);
	} catch (err) {
		die(`the spec is not valid JSON: ${err.message}`);
	}
}

function lockPlan(api, json) {
	const parsed = api.parseArtifact(json);
	if (!parsed.ok) return { ok: false, errors: parsed.errors };
	const built = api.buildArtifact(parsed.plan);
	if (!built.ok) return { ok: false, errors: built.errors, spec: built.spec };
	return { ok: true, spec: built.spec };
}

function printErrors(errors) {
	return errors.map((e) => `${e.code}: ${e.message}`).join("\n");
}

function cmdKinds(api) {
	const kinds = api.listArtifactModules();
	if (JSON_OUT) return out(null, { ok: true, kinds });
	const lines = kinds.map((k) => `${k.id.padEnd(12)} ${k.use}`);
	out(`\n${lines.join("\n")}\n`);
}

function cmdSchema(api) {
	const id = positional[0];
	if (!id) {
		const all = api.listArtifactModules().map((k) => api.getArtifactModuleSchema(k.id));
		if (JSON_OUT) return out(null, { ok: true, schemas: all });
		out(all.map((s) => `${s.id}\n  ${s.use}\n  slots: ${JSON.stringify(s.slots)}`).join("\n\n"));
		return;
	}
	const schema = api.getArtifactModuleSchema(id);
	if (!schema) {
		if (JSON_OUT) {
			out(null, { ok: false, errors: [{ code: "UNKNOWN_KIND", message: `unknown kind "${id}"` }] });
		} else {
			console.error(`\n  unknown kind "${id}"\n`);
		}
		process.exit(1);
	}
	if (JSON_OUT) return out(null, { ok: true, schema });
	out(`${schema.id}  ${schema.use}\n\n${JSON.stringify(schema.slots, null, 2)}\n`);
}

function cmdCheck(api) {
	const result = lockPlan(api, readSpec(positional[0]));
	if (!result.ok) {
		if (JSON_OUT) out(null, { ok: false, errors: result.errors });
		else console.error(`\n  ${printErrors(result.errors)}\n`);
		process.exit(1);
	}
	out("ok", { ok: true, id: result.spec.id, frame: result.spec.frame });
}

function defaultOut(spec, format) {
	const id = String(spec.id ?? "plate").replace(/[^a-zA-Z0-9_-]/g, "-");
	return resolve(process.cwd(), `${id}.${format === "png" ? "png" : format === "html" ? "html" : "json"}`);
}

function inlineBuiltHtml(dir, spec) {
	const htmlName = readdirSync(dir).find((f) => f.endsWith(".html"));
	if (!htmlName) die("vite wrote no html");
	let html = readFileSync(join(dir, htmlName), "utf8");
	const assetsDir = join(dir, "assets");
	if (existsSync(assetsDir)) {
		for (const f of readdirSync(assetsDir)) {
			const abs = join(assetsDir, f);
			const body = readFileSync(abs, "utf8");
			const escaped = f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			if (f.endsWith(".js")) {
				const re = new RegExp(`<script[^>]*src="[^"]*${escaped}"[^>]*><\\/script>`);
				html = html.replace(re, `<script type="module">${body}</script>`);
			} else if (f.endsWith(".css")) {
				const re = new RegExp(`<link[^>]*href="[^"]*${escaped}"[^>]*>`);
				html = html.replace(re, `<style>${body}</style>`);
			}
		}
	}
	const inject = `<script>globalThis.__PRESS_SPEC__=${JSON.stringify(spec)}</script>`;
	if (html.includes("<head>")) html = html.replace("<head>", `<head>${inject}`);
	else html = inject + html;
	return html;
}

async function writeHtml(spec, dest) {
	const { build } = await import("vite");
	const dir = mkdtempSync(join(tmpdir(), "mega-press-html-"));
	try {
		await build({
			configFile: false,
			root: join(ROOT, "cli"),
			logLevel: "error",
			build: {
				outDir: dir,
				emptyOutDir: true,
				assetsInlineLimit: 10_000_000,
				cssCodeSplit: false,
				rollupOptions: {
					input: join(ROOT, "cli/host.html"),
					output: { inlineDynamicImports: true },
				},
			},
		});
		const html = inlineBuiltHtml(dir, spec);
		mkdirSync(dirname(dest), { recursive: true });
		writeFileSync(dest, html);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

function serveHtml(html) {
	const preferred = Number(process.env.PRESS_PORT || 4273);
	const handler = (_req, res) => {
		res.writeHead(200, {
			"content-type": "text/html; charset=utf-8",
			"cache-control": "no-store",
		});
		res.end(html);
	};
	return new Promise((resolveServe, reject) => {
		const tryListen = (port) => {
			const server = createServer(handler);
			server.once("error", (err) => {
				if (err && err.code === "EADDRINUSE" && port < preferred + 12) tryListen(port + 1);
				else reject(err);
			});
			server.listen(port, "127.0.0.1", () => resolveServe({ server, port }));
		};
		tryListen(preferred);
	});
}

function chromeShot(url, file, frame, scale) {
	if (!CHROME) die("no Chrome binary found. Install Google Chrome or set CHROME.");
	const budget = Number(opt("timeout", "20000"));
	const profile = mkdtempSync(join(tmpdir(), "mega-press-chrome-"));
	const child = spawn(
		CHROME,
		[
			"--headless=new",
			"--hide-scrollbars",
			"--disable-gpu",
			"--no-first-run",
			"--no-default-browser-check",
			"--disable-sync",
			"--disable-extensions",
			"--disable-background-networking",
			"--disable-component-update",
			"--mute-audio",
			"--run-all-compositor-stages-before-draw",
			`--user-data-dir=${profile}`,
			`--virtual-time-budget=${budget}`,
			`--force-device-scale-factor=${scale}`,
			`--window-size=${frame.w},${frame.h}`,
			`--screenshot=${file}`,
			url,
		],
		{ stdio: "ignore" },
	);
	return new Promise((resolveShot, reject) => {
		const started = Date.now();
		const tick = setInterval(() => {
			const ready = existsSync(file) && statSync(file).size > 32;
			const late = Date.now() - started > budget + 4000;
			if (!ready && !late) return;
			clearInterval(tick);
			child.kill("SIGKILL");
			rmSync(profile, { recursive: true, force: true });
			if (ready) resolveShot();
			else reject(new Error(`chrome screenshot timed out after ${budget}ms`));
		}, 150);
	});
}

async function writePng(api, spec, dest) {
	const frame = api.frameSize(String(spec.frame ?? "landscape"));
	const scale = Number(opt("scale", "2"));
	const tmp = join(mkdtempSync(join(tmpdir(), "mega-press-png-")), "plate.html");
	await writeHtml(spec, tmp);
	const html = readFileSync(tmp, "utf8");
	const { server, port } = await serveHtml(html);
	try {
		mkdirSync(dirname(dest), { recursive: true });
		await chromeShot(`http://127.0.0.1:${port}/`, dest, frame, scale);
	} finally {
		await new Promise((r) => server.close(r));
	}
	if (!existsSync(dest)) die("chrome wrote no png");
}

async function cmdRender(api) {
	const format = opt("format", "json");
	if (!["json", "html", "png"].includes(format)) {
		die(`unknown --format "${format}". Use json, html, or png.`);
	}
	const result = lockPlan(api, readSpec(positional[0]));
	if (!result.ok) {
		if (JSON_OUT) out(null, { ok: false, errors: result.errors });
		else console.error(`\n  ${printErrors(result.errors)}\n`);
		process.exit(1);
	}
	const dest = opt("out") ? resolve(process.cwd(), opt("out")) : format === "json" ? null : defaultOut(result.spec, format);

	if (format === "json") {
		const text = `${JSON.stringify(result.spec, null, 2)}\n`;
		if (dest) {
			mkdirSync(dirname(dest), { recursive: true });
			writeFileSync(dest, text);
			out(dest, { ok: true, file: dest, spec: result.spec });
		} else if (JSON_OUT) {
			out(null, { ok: true, spec: result.spec });
		} else {
			process.stdout.write(text);
		}
		return;
	}

	if (format === "html") {
		await writeHtml(result.spec, dest);
		out(dest, { ok: true, file: dest, id: result.spec.id });
		return;
	}

	await writePng(api, result.spec, dest);
	out(dest, { ok: true, file: dest, id: result.spec.id });
}

async function main() {
	if (!command || command === "help" || command === "--help" || command === "-h") {
		process.stdout.write(HELP);
		return;
	}
	const api = await kernel();
	if (command === "kinds") return cmdKinds(api);
	if (command === "schema") return cmdSchema(api);
	if (command === "check") return cmdCheck(api);
	if (command === "render") return cmdRender(api);
	die(`unknown command "${command}". Try press help.`);
}

main().catch((err) => die(err?.stack || String(err), 2));
