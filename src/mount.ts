/// <reference lib="dom" />
import { proveArtifact } from "./evaluate.js";
import { mount } from "./render.js";
import type { PressPlate } from "./plate.js";
import { resetMetrics } from "./text.js";
import type { PressChrome, PressChromePreset, PressColorTheme, PressFontTheme, PressSyntaxTheme, PressTheme } from "./theme.js";
import { resolvePressTheme, withPressTheme } from "./theme.js";

const FONT_STYLE_ID = "mega-press-fonts";

/** Faces the renderer paints. Measurement no longer waits on these. */
const MEASURE_FACES = [
	'400 72px "Argent Pixel"',
	'400 40px "Argent Pixel"',
	'400 32px "Geist Pixel"',
	'400 26px "Geist Pixel"',
	'400 26px "Geist Sans"',
	'400 26px "Geist Mono"',
] as const;

/**
 * Hosts that bundle the face CSS (the CLI's render and gallery pages) hand its
 * TEXT over before mounting, and injection becomes an inline <style>. This is
 * not an optimisation: a sandboxed host (an artifact page, a strict-CSP embed)
 * refuses a data: stylesheet LINK, the faces never register, fonts.load()
 * resolves against an empty set, and the plate paints in a fallback mono whose
 * advances disagree with the baked table, glyphs colliding run against run.
 * Inline style text survives every such sandbox.
 */
let providedFontCss: string | null = null;

export function providePressFontCss(css: string): void {
	if (typeof css === "string" && css.trim()) providedFontCss = css;
}

const fontInjection = new WeakMap<Document, Promise<void>>();

/**
 * Inject the faces exactly once per document and resolve only when the
 * stylesheet has PARSED. fonts.load() consults the FontFaceSet as it is at
 * call time: loading before the @font-face rules register resolves empty and
 * successful, which is the silent-fallback failure this whole system exists
 * to refuse.
 */
const injectFontsOnce = (doc: Document): Promise<void> => {
	const pending = fontInjection.get(doc);
	if (pending) return pending;
	const done = new Promise<void>((resolve) => {
		if (doc.getElementById(FONT_STYLE_ID)) {
			resolve();
			return;
		}
		if (providedFontCss) {
			const style = doc.createElement("style");
			style.id = FONT_STYLE_ID;
			style.textContent = providedFontCss;
			doc.head.appendChild(style);
			resolve();
			return;
		}
		const href = new URL("./fonts.css", import.meta.url).href;
		const link = doc.createElement("link");
		link.id = FONT_STYLE_ID;
		link.rel = "stylesheet";
		link.href = href;
		link.onload = () => resolve();
		link.onerror = () => resolve();
		doc.head.appendChild(link);
	});
	fontInjection.set(doc, done);
	return done;
};

/** Inject faces and wait until paint will see them. Measure is table-backed. */
export async function ensurePressFonts(doc: Document = document): Promise<void> {
	await injectFontsOnce(doc);
	const fonts = doc.fonts;
	if (!fonts) return;
	await Promise.all(MEASURE_FACES.map((face) => fonts.load(face).catch(() => undefined)));
	await fonts.ready;
	resetMetrics();
}

export type MountArtifactOpts = {
	readonly dpr?: number;
	readonly pixelSize?: number;
	/** Hide chase chrome. "embed" is the article preset (title kept, not painted). */
	readonly chrome?: PressChrome | PressChromePreset;
	readonly color?: PressColorTheme;
	readonly fonts?: PressFontTheme;
	readonly syntax?: PressSyntaxTheme;
	/** Host-owned skin; the same resolved tokens govern measuring and painting. */
	readonly theme?: PressTheme;
};

export type MountRefusalError = {
	readonly code: string;
	readonly message: string;
};

export class MountRefusal extends Error {
	readonly errors: readonly MountRefusalError[];
	readonly codes: readonly string[];
	constructor(errors: readonly MountRefusalError[]) {
		super(errors.map((e) => `${e.code}: ${e.message}`).join("\n"));
		this.name = "MountRefusal";
		this.errors = errors;
		this.codes = errors.map((e) => e.code);
	}
}

export type MountedArtifact = {
	unmount(): void;
	readonly ready: Promise<void>;
};

/** ~340px: utility 26px × 5.5px phone floor on a 1600 artboard. */
export const LEGIBILITY_MIN_WIDTH = 340;

const toRefusal = (err: unknown): MountRefusal => {
	if (err instanceof MountRefusal) return err;
	const withReport = err as { report?: { errors?: MountRefusalError[] }; code?: string; message?: string };
	if (withReport.report?.errors?.length) return new MountRefusal(withReport.report.errors);
	if (withReport.code) {
		return new MountRefusal([{ code: withReport.code, message: withReport.message || String(err) }]);
	}
	return new MountRefusal([{ code: "MOUNT_FAILED", message: err instanceof Error ? err.message : String(err) }]);
};

const paintPlate = (
	el: HTMLElement,
	spec: Record<string, unknown>,
	opts: MountArtifactOpts | undefined,
): { unmount(): void; ready: Promise<void> } =>
	withPressTheme(
		opts?.theme,
		() => {
			const proved = proveArtifact(spec, opts?.theme ? { theme: opts.theme } : {});
			if (!proved.ok) throw new MountRefusal(proved.errors);
			const plate = proved.plate as PressPlate;
			const doc = el.ownerDocument;
			const artW = Math.max(1, plate.frame.w);
			const artH = Math.max(1, plate.frame.h);

			const minWidth = spec.schemaVersion === "press-composition/1" ? 1000 : LEGIBILITY_MIN_WIDTH;
			const stage = doc.createElement("div");
			// Scaling must not leave the unscaled artboard height in document flow.
			stage.style.position = "absolute";
			stage.style.left = "0";
			stage.style.top = "0";
			stage.style.width = `${artW}px`;
			stage.style.height = `${artH}px`;
			stage.style.transformOrigin = "0 0";

			const applyScale = () => {
				const hostW = Math.max(1, el.clientWidth || el.getBoundingClientRect().width || minWidth);
				stage.style.transform = `scale(${hostW / artW})`;
			};

			mount(plate, stage, {
				dpr: opts?.dpr ?? Math.min(2, doc.defaultView?.devicePixelRatio ?? 1),
				pixelSize: opts?.pixelSize ?? 4,
			});

			const ro =
				typeof ResizeObserver === "function"
					? new ResizeObserver(() => {
							applyScale();
						})
					: null;
			let disposed = false;
			const ready = Promise.all([...stage.querySelectorAll("img")].map(image => image.decode())).then(() => {
				if (disposed) return;
				el.style.position = el.style.position || "relative";
				el.style.width = "100%";
				el.style.aspectRatio = `${artW} / ${artH}`;
				el.style.minWidth = `${minWidth}px`;
				el.style.height = "";
				el.style.overflow = "hidden";
				el.replaceChildren(stage);
				applyScale();
				ro?.observe(el);
			}).catch(error => { if (!disposed) throw error; });

			return {
				ready,
				unmount() {
					disposed = true;
					ro?.disconnect();
					stage.remove();
				},
			};
		},
	);

/**
 * Build + mount a locked press spec into `el`.
 * Fonts are waited on for paint; measurement is the baked table.
 */
export function mountArtifact(
	el: HTMLElement,
	spec: Record<string, unknown>,
	opts?: MountArtifactOpts,
): MountedArtifact {
	const doc = el.ownerDocument;
	let cancelled = false;
	let inner: { unmount(): void; ready: Promise<void> } | null = null;
	let effectiveTheme: PressTheme;
	try {
		// Capture the project skin before asynchronous font loading, so a second
		// mount or configurePress call cannot change this instance's outcome.
		effectiveTheme = resolvePressTheme({
			...opts?.theme,
			...(opts?.chrome !== undefined ? { chrome: opts.chrome } : {}),
			...(opts?.color ? { color: { ...opts.theme?.color, ...opts.color } } : {}),
			...(opts?.fonts ? { fonts: { ...opts.theme?.fonts, ...opts.fonts } } : {}),
			...(opts?.syntax ? { syntax: { ...opts.theme?.syntax, ...opts.syntax } } : {}),
		}, { composition: spec.schemaVersion === "press-composition/1" });
	} catch (error) {
		return { ready: Promise.reject(toRefusal(error)), unmount() {} };
	}

	const ready = ensurePressFonts(doc).then(() => {
		if (cancelled) return;
		try {
			const loaded = new Set(Array.from(doc.fonts || []).filter(face => face.status === "loaded").map(face => face.family.replace(/["']/g, "")));
			const required = new Set(Object.values(effectiveTheme.fonts || {}).map(value => (value.split(",")[0] || "").trim().replace(/^["']|["']$/g, "")));
			for (const family of required) if (!loaded.has(family)) throw new MountRefusal([{ code: "FONT_NOT_READY", message: `Required font did not load: ${family}` }]);
			inner = paintPlate(el, spec, { ...opts, theme: effectiveTheme });
			return inner.ready.catch(error => { throw toRefusal(error); });
		} catch (err) {
			throw toRefusal(err);
		}
	});

	return {
		ready,
		unmount() {
			cancelled = true;
			inner?.unmount();
		},
	};
}
