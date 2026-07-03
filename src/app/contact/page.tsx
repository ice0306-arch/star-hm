import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | THE HM",
  description: "Contact information for THE HM roster site.",
};

export default function ContactPage() {
  return (
    <main className="legal-page">
      <article className="legal-panel">
        <a href="/">THE HM</a>
        <h1 className="mt-6">Contact</h1>
        <p className="mt-5">For site corrections, privacy questions, member information updates, or security reports, contact the site operator.</p>

        <h2>Email</h2>
        <p>
          <a href="mailto:ice0306@gmail.com">ice0306@gmail.com</a>
        </p>

        <h2>Security Reports</h2>
        <p>If you find an exposed secret, broken access control, or other security issue, include the affected URL, reproduction steps, and screenshots if available.</p>
      </article>
    </main>
  );
}
