export type PressChromePreset = "specimen" | "embed";

export type PressChrome = {
	readonly title?: boolean;
	readonly kicker?: boolean;
	readonly number?: boolean;
	readonly lead?: boolean;
	readonly footnote?: boolean;
	readonly brand?: boolean;
	readonly marks?: boolean;
	readonly numbered?: boolean;
};

export type PressColorTheme = {
	readonly page?: string;
	readonly panel?: string;
	readonly raised?: string;
	readonly black1?: string;
	readonly black2?: string;
	readonly line?: string;
	readonly zinc?: string;
	readonly text?: string;
	readonly ink?: string;
	readonly muted?: string;
	readonly quiet?: string;
	readonly knockout?: string;
	readonly red?: string;
	readonly blue?: string;
	readonly blueText?: string;
	readonly cyan?: string;
	readonly yellow?: string;
	readonly magenta?: string;
	readonly green?: string;
	readonly orange?: string;
	readonly violet?: string;
};

export type PressFontTheme = {
	readonly heading?: string;
	readonly sans?: string;
	readonly mono?: string;
	readonly pixel?: string;
};

/**
 * Token-class inks for verbatim code. Values are cabinet ink names
 * ("text" | "ink" | "muted" | "quiet" | "red" | "knockout") or hex colours
 * held to the text contrast floor against the panel ground.
 */
export type PressSyntaxTheme = {
	readonly plain?: string;
	readonly keyword?: string;
	readonly string?: string;
	readonly number?: string;
	readonly comment?: string;
	readonly punct?: string;
};

export type PressTheme = {
	readonly chrome?: PressChrome | PressChromePreset;
	readonly color?: PressColorTheme;
	readonly fonts?: PressFontTheme;
	readonly syntax?: PressSyntaxTheme;
};

export type ResolvedChrome = {
	readonly title: boolean;
	readonly kicker: boolean;
	readonly number: boolean;
	readonly lead: boolean;
	readonly footnote: boolean;
	readonly brand: boolean;
	readonly marks: boolean;
	readonly numbered: boolean;
};

export const COMPOSITION_THEME: Readonly<PressTheme>;
export const PRESS_THEMES: Readonly<Record<"mega" | "paper", Readonly<PressTheme>>>;
/** Font families with checked production metrics. Other families refuse. */
export const SUPPORTED_PRESS_FONTS: readonly string[];
export type CategoryTone = "red" | "cyan" | "yellow" | "magenta" | "green" | "blue" | "orange" | "violet" | "neutral";
export const CATEGORY_TONES: Readonly<Record<CategoryTone, string>>;
export function categoryColor(tone: CategoryTone): string;
export function categoryGround(tone: CategoryTone): string;
export function categoryFill(tone: CategoryTone): string;

export type ResolvedPressTheme = {
	chrome: ResolvedChrome;
	color: Record<string, string>;
	fonts: Record<string, string>;
	syntax: Record<string, string>;
};
export function resolvePressTheme(override?: PressTheme, opts?: { readonly composition?: boolean }): ResolvedPressTheme;

export const CHROME_PRESETS: {
	readonly specimen: ResolvedChrome;
	readonly embed: ResolvedChrome;
};

export function resolveChrome(override?: PressChrome | PressChromePreset): ResolvedChrome;
export function configurePress(next?: PressTheme): ResolvedPressTheme;
export function getPressTheme(): ResolvedPressTheme;
export function resetPressTheme(): ResolvedPressTheme;
export function withPressTheme<T>(partial: PressTheme | null | undefined, fn: () => T): T;
