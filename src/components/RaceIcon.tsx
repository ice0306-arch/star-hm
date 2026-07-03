import type { Race } from "@/data/members";

interface RaceIconProps {
  race: Race;
  className?: string;
}

export function RaceIcon({ race, className = "" }: RaceIconProps) {
  if (race === "Protoss") {
    return (
      <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 5 38 20 24 43 10 20 24 5Z" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path d="M24 12v25M16 21h16M19 29h10" fill="none" stroke="currentColor" strokeWidth="1.8" opacity="0.75" />
      </svg>
    );
  }

  if (race === "Terran") {
    return (
      <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
        <path d="M10 16h28v18H10V16Z" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path d="M16 10h16l6 6H10l6-6ZM16 34l-4 6M32 34l4 6M17 25h14" fill="none" stroke="currentColor" strokeWidth="1.8" opacity="0.8" />
        <circle cx="24" cy="25" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 7c9 5 14 12 14 20 0 7-5 12-14 15-9-3-14-8-14-15 0-8 5-15 14-20Z" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M16 27c5-2 11-2 16 0M20 16c-1 6 0 12 4 19M28 16c1 6 0 12-4 19" fill="none" stroke="currentColor" strokeWidth="1.8" opacity="0.78" />
    </svg>
  );
}
