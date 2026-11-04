import type { Metadata } from "next";
import { ContrastDemo } from "@/components/contrast-demo";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "About WCAG · Accessible Color Palette Generator & WCAG Contrast Checker",
  description: "A short guide to WCAG contrast, the grades this site uses, and the policies that point at WCAG.",
};

const POLICIES: Array<{ name: string; note: string }> = [
  {
    name: "W3C Web Accessibility Initiative",
    note: "Publishes WCAG. Other laws usually point here rather than rewriting the contrast math.",
  },
  {
    name: "United States Access Board Section 508",
    note: "The 2017 refresh requires WCAG 2.0 Level AA for federal web content.",
  },
  {
    name: "United States Department of Justice ADA Title II",
    note: "The 2024 web rule points state and local governments to WCAG 2.1 Level AA.",
  },
  {
    name: "United States Department of Transportation Air Carrier Access Act",
    note: "Airline website rules point at WCAG for web content.",
  },
  {
    name: "European Union Web Accessibility Directive",
    note: "Public-sector sites and apps in the EU, through the EN 301 549 standard.",
  },
  {
    name: "European Accessibility Act",
    note: "Covers many private-sector products and services in the EU, again through EN 301 549.",
  },
  {
    name: "EN 301 549",
    note: "The European ICT accessibility standard. Current editions map their web requirements to WCAG.",
  },
  {
    name: "United Kingdom Public Sector Bodies Accessibility Regulations",
    note: "The 2018 regulations require public-sector sites to meet the European accessibility standard.",
  },
  {
    name: "Government of Canada Standard on Web Accessibility",
    note: "The federal standard requires WCAG Level AA for Government of Canada web pages.",
  },
  {
    name: "Ontario Accessibility for Ontarians with Disabilities Act",
    note: "The information and communications standard has required WCAG 2.0 Level AA for public websites.",
  },
  {
    name: "Australia Disability Discrimination Act",
    note: "The Act does not name a version. Government guidance points agencies at WCAG.",
  },
  {
    name: "New Zealand Government Web Accessibility Standard",
    note: "The government web standard is written against WCAG.",
  },
  {
    name: "India Guidelines for Indian Government Websites",
    note: "GIGW is the government web guideline, built on WCAG.",
  },
  {
    name: "Japan JIS X 8341-3",
    note: "The Japanese industrial standard for web content accessibility, aligned with WCAG.",
  },
  {
    name: "Israel Standard 5568",
    note: "The Israeli web accessibility standard, based on WCAG.",
  },
  {
    name: "France RGAA",
    note: "The French government accessibility framework, based on WCAG.",
  },
  {
    name: "Germany BITV",
    note: "The German federal ordinance for accessible information technology, tied to EN 301 549.",
  },
  {
    name: "Italy Stanca Law",
    note: "Law 4/2004 and the AgID technical rules point public sites at WCAG.",
  },
  {
    name: "Spain Royal Decree 1112/2018",
    note: "Public-sector web accessibility in Spain, through EN 301 549.",
  },
  {
    name: "Brazil eMAG",
    note: "The Brazilian e-government accessibility model, based on WCAG.",
  },
  {
    name: "South Korea Korean Web Content Accessibility Guidelines",
    note: "The national web content guidelines, based on WCAG.",
  },
];

const OTHER_RULES: Array<{ id: string; name: string; note: string }> = [
  { id: "1.1.1", name: "Non-text content", note: "Images and icons need a text alternative, unless they are pure decoration." },
  { id: "1.3.1", name: "Info and relationships", note: "Headings, labels, and lists have to be in the structure, not only in the look." },
  { id: "1.4.1", name: "Use of color", note: "A pass/fail state cannot be color alone. This site also writes Pass and Fail." },
  { id: "1.4.4", name: "Resize text", note: "Text must still work when a person enlarges it to 200%." },
  { id: "1.4.10", name: "Reflow", note: "At a small screen width, content reflows without forcing sideways scrolling for lines of text." },
  { id: "1.4.11", name: "Non-text contrast", note: "Controls and meaningful graphics need 3:1 against the colors next to them. The UI grade on this site is that test." },
  { id: "1.4.12", name: "Text spacing", note: "A person can increase line, letter, and word spacing without losing content." },
  { id: "2.1.1", name: "Keyboard", note: "Every action a pointer can do must also be possible from the keyboard." },
  { id: "2.4.7", name: "Focus visible", note: "The control that has keyboard focus has to be visibly marked." },
  { id: "2.4.11", name: "Focus not obscured", note: "Added in 2.2. A sticky header or banner must not cover the focused control." },
  { id: "2.5.7", name: "Dragging movements", note: "Added in 2.2. A drag, such as moving a color on a wheel, needs a single-pointer alternative." },
  { id: "2.5.8", name: "Target size", note: "Added in 2.2. Pointer targets are at least 24 by 24 CSS pixels, with a few exceptions." },
  { id: "3.1.1", name: "Language of page", note: "The page declares its language so a screen reader can pronounce it." },
  { id: "3.3.1", name: "Error identification", note: "When input fails, the page says what is wrong in text." },
  { id: "3.3.8", name: "Accessible authentication", note: "Added in 2.2. Signing in must not depend on a memory test or a puzzle, such as a CAPTCHA, without an alternative." },
  { id: "4.1.2", name: "Name, role, value", note: "Controls expose their name and state to assistive technology. Custom widgets need this most." },
];

function policyHref(name: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${name} WCAG version`)}`;
}

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="shell page-shell about-page">
        <p className="back-row">
          <a className="back-link" href="/#build-heading">
            <span aria-hidden="true">←</span> Return to Build a palette
          </a>
        </p>
        <h1>About WCAG</h1>
        <p>
          WCAG is a shared way to decide whether a web page works for more people. The letters stand for Web Content
          Accessibility Guidelines. A person who is new to it can treat this page as the map: what the words mean, how a
          contrast ratio is calculated, which version is which, and where governments have pointed at it.
        </p>

        <h2>WCAG</h2>
        <p>
          WCAG is a W3C recommendation, which means it is a stable, published standard, not a house style. It is a list
          of testable statements called success criteria. Each one is written so two people can look at the same page and
          agree whether it passes. This site tests the contrast criteria. It does not, by itself, make a page conform to
          all of WCAG.
        </p>

        <h2>W3C and WAI</h2>
        <p>
          The World Wide Web Consortium (W3C) is the standards body. Its Web Accessibility Initiative (WAI) is the group
          that writes WCAG and the supporting explanations. When a law says “WCAG 2.1 Level AA,” it is pointing at a W3C
          document, plus a level inside that document.
        </p>

        <h2>Success criterion</h2>
        <p>
          A success criterion is one numbered rule, such as 1.4.3 Contrast (Minimum). The number is the address: the
          first digit is the principle, the second is the guideline, the third is the rule. Techniques and failures in
          the W3C docs are examples of how to meet a rule, or how to miss it. The rule itself is what a conformance claim
          is judged against.
        </p>

        <h2 id="level-a-aa-and-aaa">Level A, AA, and AAA</h2>
        <p>
          Every success criterion has a level. A is the floor. AA is the level most policies name. AAA is stricter, and
          the W3C does not recommend requiring AAA for an entire site, because some AAA rules cannot be met for every
          kind of content. This site shows both. A pair can pass AA and still fail AAA. On the palette, AA means the
          ordinary text bar of 4.5:1, and AAA means 7:1.
        </p>

        <h2>Perceivable, Operable, Understandable, Robust</h2>
        <p>
          The criteria are grouped under four principles, often shortened to POUR. Perceivable: a person can sense the
          content. Contrast lives here, because text that is too close to its background is not reliably visible.
          Operable: a person can use the controls, including from a keyboard. Understandable: the page behaves in a way
          a person can predict, and errors are explained. Robust: assistive technology can read the structure. A
          beautiful palette only helps the first of those.
        </p>

        <h2>Foreground and background</h2>
        <p>
          Foreground is the thing a person needs to see: the letters, the icon, the border of a text field. Background
          is what sits behind it. The ratio is between those two colors. It does not matter which one you call “the
          brand color.” White text on a teal button and teal text on a white page are two different pairs, and this
          site checks both.
        </p>

        <h2>Relative luminance</h2>
        <p>
          Luminance here is not the brightness slider in a design tool. WCAG uses relative luminance: how light a color
          is after the red, green, and blue channels are converted out of the compressed sRGB encoding screens actually
          store. Green counts for most of it (0.7152), then red (0.2126), then blue (0.0722), because human vision is
          more sensitive to green. A bright blue can look vivid and still have a low luminance, which is why it often
          fails as text on white.
        </p>
        <p>
          Each channel is first divided by 255. If that value is at or below 0.04045, it is divided by 12.92. Otherwise
          WCAG uses ((channel + 0.055) / 1.055) raised to 2.4. That curve undoes the gamma encoding in sRGB. The three
          linearized channels are then added with the weights above. Black is 0. White is 1.
        </p>

        <h2 id="contrast-ratio">Contrast ratio</h2>
        <p>
          The contrast ratio compares the lighter luminance with the darker one:
        </p>
        <p className="formula-line mono">(lighter + 0.05) / (darker + 0.05)</p>
        <p>
          The result runs from 1:1, which is no contrast, to 21:1, which is black on white. The 0.05 is a small offset
          so the ratio stays finite when the darker color is black. The bars on this site use the full value. A displayed
          number is rounded for reading, and it keeps an extra decimal when rounding would hide a pass or a fail at 3,
          4.5, or 7.
        </p>

        <h2>Large text</h2>
        <p>
          Large text has a lower bar because the strokes are thicker. WCAG defines it as 18 point text, or 14 point bold
          text. In CSS pixels that is about 24px regular, or about 18.7px bold. Anything smaller is normal text and
          needs 4.5:1 for AA, or 7:1 for AAA. Large text needs 3:1 for AA, or 4.5:1 for AAA. A bold label at 16px is
          still normal text.
        </p>

        <h2>Non-text contrast</h2>
        <p>
          Icons, the boundary of a text field, and the visible edge of a button need 3:1 against the color adjacent to
          them. That is success criterion 1.4.11, added in WCAG 2.1. This site calls that grade UI. A disabled control
          is exempt from the contrast criteria, which is why a disabled pair can be marked exempt instead of failed.
        </p>

        <h2>How a grade is calculated</h2>
        <p>
          Change either color. The sample, the channel weights, the luminance, the ratio, and each grade update from the
          same math the palette uses.
        </p>
        <ContrastDemo />

        <h2>How WCAG versions differ</h2>
        <p>
          The contrast formula has been stable since WCAG 2.0. Newer versions add rules. They do not replace the older
          ones. A page that meets 2.2 Level AA also meets 2.1 Level AA and 2.0 Level AA.
        </p>
        <h3>WCAG 2.0</h3>
        <p>
          Published 11 December 2008. It introduced levels A, AA, and AAA, and the contrast rules this site still
          calculates: 1.4.3 Contrast (Minimum) and 1.4.6 Contrast (Enhanced).
        </p>
        <h3>WCAG 2.1</h3>
        <p>
          Published 5 June 2018. It added criteria for mobile, low vision, and cognitive access, including 1.4.11
          Non-text Contrast. The text contrast numbers did not change. Section 508 still names 2.0. The 2024 ADA Title
          II rule names 2.1.
        </p>
        <h3>WCAG 2.2</h3>
        <p>
          Published 5 October 2023. This is the version named on this site. It added nine criteria, including focus not
          obscured, dragging movements, target size, and accessible authentication, and it removed 4.1.1 Parsing. Text
          and UI contrast thresholds are the same as in 2.1.
        </p>
        <h3>WCAG 3</h3>
        <p>
          WCAG 3 is a draft, not a standard a policy can require yet. It explores a different scoring model, with
          outcomes and ratings rather than A, AA, and AAA. This site does not grade against it. Until a version of WCAG
          3 is a W3C recommendation, 2.2 remains the current recommendation, and 2.x policies still use 2.0, 2.1, or 2.2.
        </p>

        <h2>Policies and regulations that use WCAG</h2>
        <p>
          These are the major public rules and standards that point at WCAG. Each line opens a Google search for that
          body plus the words WCAG and version, so the link still works when an agency moves the page.
        </p>
        <ul className="policy-list">
          {POLICIES.map((policy) => (
            <li key={policy.name}>
              <a href={policyHref(policy.name)}>
                {policy.name}. {policy.note}
              </a>
            </li>
          ))}
        </ul>

        <h2>Other rules that still matter</h2>
        <p>
          Contrast is one slice of Perceivable. A palette can pass every card on this site and the page can still fail
          WCAG. These are the criteria that most often sit beside a contrast requirement. WCAG 2.2 Level AA includes
          more than this list.
        </p>
        <ul className="rule-list">
          {OTHER_RULES.map((rule) => (
            <li key={rule.id}>
              <h3>
                <span className="mono">{rule.id}</span> {rule.name}
              </h3>
              <p>{rule.note}</p>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
