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
	const [{ parseArtifact }, { buildArtifact }, catalog, lock, evaluate] = await Promise.all([
		import(join(ROOT, "dist/parse.js")),
		import(join(ROOT, "dist/build.js")),
		import(join(ROOT, "dist/kernel/artifactModules.js")),
		import(join(ROOT, "dist/kernel/lock.js")),
		import(join(ROOT, "src/evaluate.js")),
	]);
	return {
		parseArtifact,
		buildArtifact,
		proveArtifact: evaluate.proveArtifact,
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
	if (!parsed.ok) return { ok: false, errors: parsed.errors, warnings: [] };
	const built = api.buildArtifact(parsed.plan);
	if (!built.ok) return { ok: false, errors: built.errors, spec: built.spec, warnings: [] };
	const proved = api.proveArtifact(built.spec);
	if (!proved.ok) {
		return { ok: false, errors: proved.errors, spec: proved.spec, warnings: proved.warnings ?? [] };
	}
	return { ok: true, spec: proved.spec, warnings: proved.warnings ?? [] };
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

function printWarnings(warnings) {
	if (!warnings?.length) return "";
	return warnings.map((w) => `warn  ${w.code}: ${w.message}`).join("\n");
}

function cmdCheck(api) {
	const result = lockPlan(api, readSpec(positional[0]));
	if (!result.ok) {
		if (JSON_OUT) out(null, { ok: false, errors: result.errors, warnings: result.warnings ?? [] });
		else console.error(`\n  ${printErrors(result.errors)}\n`);
		process.exit(1);
	}
	const payload = {
		ok: true,
		id: result.spec.id,
		frame: result.spec.frame,
		...(result.spec.steppedFrom ? { steppedFrom: result.spec.steppedFrom } : {}),
		warnings: result.warnings ?? [],
	};
	if (JSON_OUT) return out(null, payload);
	const warn = printWarnings(result.warnings);
	out(warn ? `ok\n  ${warn.replaceAll("\n", "\n  ")}` : "ok", payload);
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
	let settle;
	const status = new Promise((resolve) => {
		settle = resolve;
	});
	const handler = (req, res) => {
		if (req.method === "POST" && req.url === "/__press__/status") {
			const chunks = [];
			req.on("data", (c) => chunks.push(c));
			req.on("end", () => {
				const raw = Buffer.concat(chunks).toString("utf8");
				try {
					settle(JSON.parse(raw || "{}"));
				} catch {
					settle({ ok: false, errors: [{ code: "BAD_STATUS", message: raw }] });
				}
				res.writeHead(204);
				res.end();
			});
			return;
		}
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
			server.listen(port, "127.0.0.1", () => resolveServe({ server, port, status }));
		};
		tryListen(preferred);
	});
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForFile(path, timeoutMs) {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		if (existsSync(path) && statSync(path).size > 0) return readFileSync(path, "utf8");
		await sleep(40);
	}
	throw new Error(`chrome did not write ${path}`);
}

async function openCdp(profile) {
	const portFile = join(profile, "DevToolsActivePort");
	const text = await waitForFile(portFile, 8000);
	const port = Number(text.split("\n")[0]);
	if (!Number.isFinite(port)) throw new Error("chrome DevTools port missing");
	const started = Date.now();
	let page;
	while (!page) {
		const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
		page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
		if (!page) {
			if (Date.now() - started > 8000) throw new Error("chrome had no page target");
			await sleep(50);
		}
	}
	const ws = new WebSocket(page.webSocketDebuggerUrl);
	await new Promise((resolve, reject) => {
		ws.addEventListener("open", resolve);
		ws.addEventListener("error", () => reject(new Error("cdp websocket failed")));
	});
	let nextId = 1;
	const pending = new Map();
	ws.addEventListener("message", (ev) => {
		const msg = JSON.parse(String(ev.data));
		if (msg.id == null || !pending.has(msg.id)) return;
		const { resolve, reject } = pending.get(msg.id);
		pending.delete(msg.id);
		if (msg.error) reject(new Error(msg.error.message || "cdp error"));
		else resolve(msg.result);
	});
	const send = (method, params) => {
		const id = nextId++;
		return new Promise((resolve, reject) => {
			pending.set(id, { resolve, reject });
			ws.send(JSON.stringify({ id, method, params }));
		});
	};
	return { send, close: () => ws.close() };
}

function launchChrome(url, frame, scale, profile) {
	if (!CHROME) die("no Chrome binary found. Install Google Chrome or set CHROME.");
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
			"--remote-debugging-port=0",
			"--run-all-compositor-stages-before-draw",
			`--user-data-dir=${profile}`,
			`--force-device-scale-factor=${scale}`,
			`--window-size=${frame.w},${frame.h}`,
			url,
		],
		{ stdio: "ignore" },
	);
	const exit = new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));
	return {
		exit,
		kill() {
			child.kill("SIGKILL");
		},
	};
}

function refuseRender(errors) {
	if (JSON_OUT) out(null, { ok: false, errors });
	else console.error(`\n  ${printErrors(errors)}\n`);
	process.exit(1);
}

async function writePng(api, spec, dest) {
	const frame = api.frameSize(String(spec.frame ?? "landscape"));
	const scale = Number(opt("scale", "2"));
	const budget = Number(opt("timeout", "20000"));
	const tmp = join(mkdtempSync(join(tmpdir(), "mega-press-png-")), "plate.html");
	await writeHtml(spec, tmp);
	const html = readFileSync(tmp, "utf8");
	const { server, port, status } = await serveHtml(html);
	const profile = mkdtempSync(join(tmpdir(), "mega-press-chrome-"));
	const chrome = launchChrome(`http://127.0.0.1:${port}/`, frame, scale, profile);
	let cdp;
	let refuse;
	let toolBroke;
	try {
		const timed = sleep(budget).then(() => {
			const err = new Error(`chrome screenshot timed out after ${budget}ms`);
			err.toolBroke = true;
			throw err;
		});
		const died = chrome.exit.then(({ signal }) => {
			const err = new Error(signal ? `chrome killed (${signal})` : "chrome exited before the plate was ready");
			err.toolBroke = true;
			throw err;
		});
		const report = await Promise.race([status, timed, died]);
		if (!report?.ok) {
			const err = new Error("mount refused");
			err.refuse = true;
			err.errors = report?.errors ?? [{ code: "MOUNT_FAILED", message: "mount refused with no report" }];
			throw err;
		}
		cdp = await openCdp(profile);
		await cdp.send("Emulation.setDeviceMetricsOverride", {
			width: frame.w,
			height: frame.h,
			deviceScaleFactor: scale,
			mobile: false,
		});
		const shot = await cdp.send("Page.captureScreenshot", {
			format: "png",
			fromSurface: true,
			captureBeyondViewport: false,
		});
		if (!shot?.data) {
			const err = new Error("chrome wrote no png");
			err.toolBroke = true;
			throw err;
		}
		mkdirSync(dirname(dest), { recursive: true });
		writeFileSync(dest, Buffer.from(shot.data, "base64"));
	} catch (err) {
		if (existsSync(dest)) rmSync(dest, { force: true });
		if (err?.refuse) refuse = err.errors;
		else if (err?.toolBroke) toolBroke = err.message;
		else throw err;
	} finally {
		cdp?.close();
		chrome.kill();
		rmSync(profile, { recursive: true, force: true });
		await new Promise((r) => server.close(r));
	}
	if (refuse) refuseRender(refuse);
	if (toolBroke) die(toolBroke, 2);
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
	const meta = {
		...(result.spec.steppedFrom ? { steppedFrom: result.spec.steppedFrom } : {}),
		warnings: result.warnings ?? [],
	};

	if (format === "json") {
		const text = `${JSON.stringify(result.spec, null, 2)}\n`;
		if (dest) {
			mkdirSync(dirname(dest), { recursive: true });
			writeFileSync(dest, text);
			out(dest, { ok: true, file: dest, spec: result.spec, ...meta });
		} else if (JSON_OUT) {
			out(null, { ok: true, spec: result.spec, ...meta });
		} else {
			process.stdout.write(text);
		}
		return;
	}

	if (format === "html") {
		await writeHtml(result.spec, dest);
		out(dest, { ok: true, file: dest, id: result.spec.id, ...meta });
		return;
	}

	await writePng(api, result.spec, dest);
	out(dest, { ok: true, file: dest, id: result.spec.id, ...meta });
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
