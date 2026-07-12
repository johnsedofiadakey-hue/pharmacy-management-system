import Link from "next/link";

/** Plus-in-square mark + wordmark — the shared brand lockup across every surface. */
export function Logo({
  href = "/",
  size = "md",
  light = false,
}: {
  href?: string;
  size?: "sm" | "md";
  light?: boolean;
}) {
  const markSize = size === "sm" ? 30 : 36;
  const textClass = size === "sm" ? "text-lg" : "text-xl";

  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span
        className="grid shrink-0 place-items-center rounded-xl bg-[color:var(--primary)]"
        style={{ width: markSize, height: markSize }}
        aria-hidden
      >
        <svg width={markSize * 0.55} height={markSize * 0.55} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 4v16M4 12h16"
            stroke="white"
            strokeWidth={3.2}
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className={`font-display ${textClass} font-bold ${light ? "text-white" : "text-[color:var(--secondary)]"}`}>
        Nexus<span className="text-[color:var(--primary)]">Pharma</span>
      </span>
    </Link>
  );
}
