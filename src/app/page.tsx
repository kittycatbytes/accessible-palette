import { SiteHeader } from "@/components/site-header";
import { Workspace } from "@/components/workspace";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#workspace">
        Skip to palette workspace
      </a>
      <SiteHeader brandHref="#workspace" />
      <p className="tool-summary">
        This tool builds a color palette and checks it against WCAG 2.2. It shows whether ordinary text, large text, and
        interface colors pass AA or AAA, then previews those colors on a sample page. You can share the view you are
        looking at, or save the palette and the preview to a project.
      </p>
      <Workspace />
    </>
  );
}
