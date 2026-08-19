import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_SYNTAX, detectLang, SYNTAX, syntaxColor, tokenizeLine } from "./syntax.js";
import { configurePress, resetPressTheme } from "./theme.js";
import { COLOR } from "./tokens.js";

afterEach(() => {
	resetPressTheme();
});

describe("tokenizeLine", () => {
	it("colours a JS call line: keywords accent, strings string, punctuation punct", () => {
		const runs = tokenizeLine("const stored = await value_get({ name: 'reportTimezone' })", "js");
		const byText = Object.fromEntries(runs.map((r) => [r.text.trim(), r.cls]));
		expect(byText.const).toBe("keyword");
		expect(byText.await).toBe("keyword");
		expect(runs.find((r) => r.text.trim() === "'reportTimezone'")?.cls).toBe("string");
		expect(runs.find((r) => r.text.includes("({"))?.cls).toBe("punct");
		expect(runs.find((r) => r.text.includes("stored"))?.cls).toBe("plain");
	});

	it("reassembles to the exact source line, spaces included", () => {
		const line = '  "value": "Europe/Warsaw",  // tz';
		expect(
			tokenizeLine(line, "js")
				.map((r) => r.text)
				.join(""),
		).toBe(line);
	});

	it("treats JSON words as payload, not keywords, except true/false/null", () => {
		const runs = tokenizeLine('{ "ok": true, "const": 3 }', "json");
		expect(runs.find((r) => r.text.trim() === "true")?.cls).toBe("keyword");
		expect(runs.find((r) => r.text.trim() === '"const"')?.cls).toBe("string");
		expect(runs.find((r) => r.text.trim() === "3")?.cls).toBe("number");
	});

	it("marks comments to end of line and lang none as one plain run", () => {
		const runs = tokenizeLine("value_set() // stored earlier", "js");
		expect(runs[runs.length - 1]?.cls).toBe("comment");
		expect(tokenizeLine("const x = 1", "none")).toEqual([
			{ text: "const x = 1", cls: "plain" },
		]);
	});
});

describe("detectLang", () => {
	it("sniffs JSON from the first drawn line", () => {
		expect(detectLang('{\n  "a": 1\n}')).toBe("json");
		expect(detectLang("const x = 1")).toBe("js");
	});
});

describe("theme syntax slot", () => {
	it("defaults follow the cabinet: keyword rides the accent", () => {
		expect(SYNTAX).toEqual({ ...DEFAULT_SYNTAX });
		expect(syntaxColor("keyword", COLOR)).toBe(COLOR.red);
		expect(syntaxColor("comment", COLOR)).toBe(COLOR.quiet);
	});

	it("configurePress remaps a class to another ink and reset restores", () => {
		configurePress({ syntax: { keyword: "text" } });
		expect(syntaxColor("keyword", COLOR)).toBe(COLOR.text);
		resetPressTheme();
		expect(syntaxColor("keyword", COLOR)).toBe(COLOR.red);
	});

	it("accepts contrast-safe hex and refuses a ground, a non-text token, and mud", () => {
		configurePress({ syntax: { string: "#e5e5e5" } });
		expect(syntaxColor("string", COLOR)).toBe("#e5e5e5");
		expect(() => configurePress({ syntax: { string: "panel" } })).toThrowError(/THEME_SYNTAX|not a text ink/);
		expect(() => configurePress({ syntax: { string: "zinc" } })).toThrowError(/not a text ink/);
		expect(() => configurePress({ syntax: { string: "#111111" } })).toThrowError(/below the/);
		expect(() => configurePress({ syntax: { shouty: "red" } })).toThrowError(/unknown syntax class/);
	});
});
