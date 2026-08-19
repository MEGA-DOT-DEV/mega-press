export type SyntaxClass = "plain" | "keyword" | "string" | "number" | "comment" | "punct";

export type SyntaxLang = "js" | "json" | "none";

export const SYNTAX_CLASSES: readonly SyntaxClass[];

/** Default class -> cabinet ink name mapping. */
export const DEFAULT_SYNTAX: Readonly<Record<SyntaxClass, string>>;

/** Live palette; theme.js owns writes. */
export const SYNTAX: Record<SyntaxClass, string>;

export function syntaxColor(cls: string, C: Record<string, string>): string;

export function detectLang(source: string): "js" | "json";

export function tokenizeLine(
	line: string,
	lang?: SyntaxLang,
): { text: string; cls: SyntaxClass }[];
