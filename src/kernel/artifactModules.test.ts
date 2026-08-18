import { describe, expect, it } from "vitest";
import {
	getArtifactModuleSchema,
	isArtifactModuleId,
	listArtifactModules,
} from "./artifactModules.js";
import { compileAndLockPlatePlan } from "./platePlan.js";

describe("artifactModules catalog", () => {
	it("lists discoverable modules with use + pickWhen", () => {
		const list = listArtifactModules();
		expect(list.length).toBeGreaterThanOrEqual(7);
		expect(list.every((m) => m.id && m.use && m.pickWhen)).toBe(true);
		expect(isArtifactModuleId("railSteps")).toBe(true);
		expect(isArtifactModuleId("note")).toBe(false);
	});

	it("loads full schema for bars", () => {
		const schema = getArtifactModuleSchema("bars");
		expect(schema).not.toBeNull();
		expect(schema?.slots).toBeTruthy();
		expect(schema?.exampleOutline.length).toBeGreaterThanOrEqual(3);
	});

	it("compiles bars plans through pedagogy", () => {
		const result = compileAndLockPlatePlan({
			kind: "bars",
			id: "loop-share",
			title: "Most of an agent loop is sensing and acting, not polishing text.",
			barUnit: "share of loop time",
			bars: [
				{ label: "Sense", value: 35 },
				{ label: "Act", value: 40 },
				{ label: "Observe", value: 25 },
			],
		});
		expect(result.ok).toBe(true);
		expect((result.spec.body as { type: string }).type).toBe("bars");
	});
});
