/** Diagnostic, not a test that freezes today's bugs as intended behaviour.
 * Run after `pnpm build`. Prints observed guarantees; does not change sources.
 */
import { readFileSync } from "node:fs";
import { compileArtifactPlan } from "../../dist/kinds.js";
import { parseArtifact } from "../../dist/parse.js";
import { buildArtifact } from "../../dist/build.js";
import { getArtifactModuleSchema } from "../../dist/kernel/artifactModules.js";
import { proveArtifact } from "../../src/evaluate.js";

const code = 'const label = "2019–2024";\nconsole.log(label);';
const compiledCode = compileArtifactPlan({ kind: "code", id: "source-fidelity", title: "Keep the literal intact.", code });
const bars = compileArtifactPlan({ kind: "bars", id: "unit-fidelity", title: "Compare delivery time in days.", unit: "days", bars: [{ label: "First", value: 2 }, { label: "Second", value: 5 }, { label: "Third", value: 7 }] });
const overflow = JSON.parse(readFileSync(new URL("../../example/fixtures/overflow-title.json", import.meta.url), "utf8"));
const parsed = parseArtifact(overflow);
const built = parsed.ok ? buildArtifact(parsed.plan) : parsed;
const proved = built.ok ? proveArtifact(built.spec) : null;
console.log(JSON.stringify({
  note: "Observations of the current checkout. False means a guarantee does not hold; this diagnostic is not a publication gate.",
  observations: [
    { guarantee: "verbatim-code", holds: compiledCode.ok && compiledCode.spec.body.code === code, input: code, observed: compiledCode.ok ? compiledCode.spec.body.code : compiledCode.errors },
    { guarantee: "catalogue-unit-preserved", advertisedRequired: getArtifactModuleSchema("bars").slots.required, holds: bars.ok && bars.spec.body.unit === "days", input: "days", observed: bars.ok ? bars.spec.body.unit : bars.errors },
    { guarantee: "build-success-implies-geometric-success", holds: !built.ok || proved?.ok === true, fixture: "example/fixtures/overflow-title.json", buildOk: built.ok, proveOk: proved?.ok, errors: proved?.errors?.map((error) => error.code) },
  ],
}, null, 2));
