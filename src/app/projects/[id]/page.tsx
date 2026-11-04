import { Suspense } from "react";
import { ProjectView } from "@/components/project-view";
import { SiteHeader } from "@/components/site-header";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ProjectPlaceholder />}>
      <ProjectPageContent params={params} />
    </Suspense>
  );
}

async function ProjectPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectView projectId={id} />;
}

function ProjectPlaceholder() {
  return (
    <>
      <SiteHeader />
      <main className="shell page-shell">
        <h1>Saved assets</h1>
        <p>Loading saved assets.</p>
      </main>
    </>
  );
}
