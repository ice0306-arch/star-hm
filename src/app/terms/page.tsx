import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | THE HM",
  description: "THE HM roster site terms of service.",
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <article className="legal-panel">
        <a href="/">THE HM</a>
        <h1 className="mt-6">Terms of Service</h1>
        <p className="mt-5">By using this site, you agree to use it only for normal viewing of THE HM roster, activity, and public member links.</p>

        <h2>Independent Site</h2>
        <p>This is an independent community team site. It is not affiliated with Blizzard Entertainment, SOOP, or any external platform.</p>

        <h2>Content</h2>
        <p>Roster, tier, race, live status, and public notice information may change. We try to keep the site accurate, but we do not guarantee real-time completeness.</p>

        <h2>Acceptable Use</h2>
        <ul>
          <li>Do not attempt to disrupt, scrape aggressively, or abuse the site.</li>
          <li>Do not use the site to impersonate THE HM members or external services.</li>
          <li>Do not reuse member profile assets in a misleading way.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          For disputes, corrections, or takedown requests, use the <a href="/contact">contact page</a>.
        </p>
      </article>
    </main>
  );
}
