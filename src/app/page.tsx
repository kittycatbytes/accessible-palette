import { Workspace } from "@/components/workspace";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#workspace">
        Skip to palette workspace
      </a>
      <Workspace />
    </>
  );
}
