import { formatRatio, type Verdict } from "@/lib/color";
import type { ContrastPair } from "@/lib/types";
import { CheckIcon, CrossIcon } from "./icons";

const CHECKS: {
  key: keyof Pick<Verdict, "aaNormal" | "aaLarge" | "aaaNormal" | "aaaLarge" | "nonText">;
  name: string;
  need: string;
  rule: string;
}[] = [
  { key: "aaNormal", name: "AA normal text", need: "4.5:1", rule: "WCAG 1.4.3" },
  { key: "aaLarge", name: "AA large text", need: "3:1", rule: "WCAG 1.4.3" },
  { key: "aaaNormal", name: "AAA normal text", need: "7:1", rule: "WCAG 1.4.6" },
  { key: "aaaLarge", name: "AAA large text", need: "4.5:1", rule: "WCAG 1.4.6" },
  {
    key: "nonText",
    name: "Graphical objects and UI components, AA",
    need: "3:1",
    rule: "WCAG 1.4.11",
  },
];

export function Badges({ pair }: { pair: ContrastPair }) {
  return (
    <div className="pair-summary">
      <div
        className="sample"
        style={{ background: pair.bgHex, color: pair.fgHex, borderColor: pair.fgHex }}
      >
        <p className="sample-kicker">{pair.purpose}</p>
        <p className="sample-normal">Normal text at 16px. Ratio {formatRatio(pair.ratio)}:1.</p>
        <p className="sample-large">Large text at 24px.</p>
        <p className="sample-bold">Large bold text at 18.67px.</p>
        <div className="sample-ui" style={{ borderColor: pair.fgHex }}>
          <span className="sample-chip" style={{ background: pair.fgHex }} />
          UI component and graphical mark
        </div>
      </div>
      <ul className="badge-row">
        {CHECKS.map((check) => {
          const pass = pair.exempt ? null : pair[check.key];
          return (
            <li
              key={check.key}
              className={pair.exempt ? "badge badge-exempt" : pass ? "badge badge-pass" : "badge badge-fail"}
            >
              {pair.exempt ? (
                <span className="badge-result">Exempt</span>
              ) : pass ? (
                <span className="badge-result">
                  <CheckIcon /> Pass
                </span>
              ) : (
                <span className="badge-result">
                  <CrossIcon /> Fail
                </span>
              )}
              <span className="badge-name">{check.name}</span>
              <span className="badge-need">
                {check.need} · {check.rule}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="fine-print">
        Large text is 24px, or 18.67px and bold. A result is a pass only when the full ratio meets
        the threshold. The displayed number is not rounded up into a pass.
        {pair.exempt ? " Disabled controls are exempt from the contrast requirement." : ""}
      </p>
    </div>
  );
}
