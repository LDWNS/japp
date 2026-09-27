import Link from "next/link";

/** Top-of-page link back to the home menu, so it's reachable without scrolling long pages. */
export function HomeLink({ center = false }: { center?: boolean }) {
  return (
    <Link
      href="/"
      className={`rounded-full px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted ${
        center ? "self-center" : "-ml-2 self-start"
      }`}
    >
      ‹ Home
    </Link>
  );
}
