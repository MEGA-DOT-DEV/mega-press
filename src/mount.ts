/// <reference lib="dom" />
import { proveArtifact } from "./evaluate.js";
import { mount } from "./render.js";
import type { PressPlate } from "./plate.js";
import { resetMetrics } from "./text.js";
import type { PressChrome, PressChromePreset, PressColorTheme, PressFontTheme } from "./theme.js";
import { withPressTheme } from "./theme.js";

const FONT_STYLE_ID = "mega-press-fonts";

/** Faces the renderer paints. Measurement no longer waits on these. */
const MEASURE_FACES = [
	'400 72px "Argent Pixel"',
	'400 40px "Argent Pixel"',
	'400 32px "Geist Pixel"',
	'400 26px "Geist Pixel"',
	'400 26px "Geist Sans"',
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
): { unmount(): void } =>
	withPressTheme(
		opts?.chrome !== undefined || opts?.color !== undefined || opts?.fonts !== undefined
			? {
					...(opts.chrome !== undefined ? { chrome: opts.chrome } : {}),
					...(opts.color !== undefined ? { color: opts.color } : {}),
					...(opts.fonts !== undefined ? { fonts: opts.fonts } : {}),
				}
			: null,
		() => {
			const proved = proveArtifact(spec);
			if (!proved.ok) throw new MountRefusal(proved.errors);
			const plate = proved.plate as PressPlate;
			const doc = el.ownerDocument;
			const artW = Math.max(1, plate.frame.w);
			const artH = Math.max(1, plate.frame.h);

			el.replaceChildren();
			el.style.position = el.style.position || "relative";
			el.style.width = "100%";
			el.style.aspectRatio = `${artW} / ${artH}`;
			el.style.minWidth = `${LEGIBILITY_MIN_WIDTH}px`;
			el.style.height = "";
			el.style.overflow = "hidden";

			const stage = doc.createElement("div");
			stage.style.width = `${artW}px`;
			stage.style.height = `${artH}px`;
			stage.style.transformOrigin = "0 0";
			el.appendChild(stage);

			const applyScale = () => {
				const hostW = Math.max(1, el.clientWidth || el.getBoundingClientRect().width || LEGIBILITY_MIN_WIDTH);
				stage.style.transform = `scale(${hostW / artW})`;
			};
			applyScale();

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
			ro?.observe(el);

			return {
				unmount() {
					ro?.disconnect();
					el.replaceChildren();
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
	let inner: { unmount(): void } | null = null;

	const ready = ensurePressFonts(doc).then(() => {
		if (cancelled) return;
		try {
			inner = paintPlate(el, spec, opts);
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
