import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | THE HM",
  description: "THE HM roster site privacy policy.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <article className="legal-panel">
        <a href="/">THE HM</a>
        <h1 className="mt-6">Privacy Policy</h1>
        <p className="mt-5">THE HM roster site is an independent community site for viewing team roster, live status, and public notice links.</p>

        <h2>Information We Process</h2>
        <p>We do not provide user accounts, comments, payments, or private messaging on this site. The site may display public profile, broadcast, and notice information already available from linked SOOP channels.</p>

        <h2>Technical Data</h2>
        <p>Hosting providers and browsers may process ordinary technical data such as IP address, user agent, request time, and security logs to deliver and protect the service.</p>

        <h2>External Links</h2>
        <p>Links to SOOP and other third-party services are governed by their own privacy policies. THE HM does not control those external services.</p>

        <h2>Contact</h2>
        <p>
          For privacy or site operation questions, contact us through the <a href="/contact">contact page</a>.
        </p>
      </article>
    </main>
  );
}
