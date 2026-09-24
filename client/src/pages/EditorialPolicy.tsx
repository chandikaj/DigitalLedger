import { Layout } from "@/components/Layout";
import {
  getSeoOrigin,
  useSeoMetadata,
} from "@/components/SeoMetadata";

const sectionClassName = "mb-10";
const headingClassName =
  "mb-3 text-2xl font-bold text-[#1F2A44] dark:text-white";
const bodyClassName =
  "text-lg leading-relaxed text-[#3D3D3D] dark:text-gray-300";

export default function EditorialPolicy() {
  const origin = getSeoOrigin();

  useSeoMetadata({
    title: "Editorial Policy | The Digital Ledger",
    description:
      "Read The Digital Ledger's standards for sourcing, AI-assisted editorial work, publication dates, corrections, author information, and professional guidance.",
    canonical: "/editorial-policy",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Editorial Policy",
        url: `${origin}/editorial-policy`,
        description:
          "The editorial standards and corrections policy of The Digital Ledger.",
        publisher: {
          "@type": "Organization",
          name: "The Digital Ledger",
          url: origin,
        },
      },
    ],
  });

  return (
    <Layout>
      <header className="bg-[#F1EDE4]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="mb-3 font-semibold uppercase tracking-wide text-[#526078]">
            The Digital Ledger
          </p>
          <h1 className="mb-6 text-4xl font-bold text-[#1F2A44] md:text-5xl">
            Editorial Policy
          </h1>
          <p className="text-xl leading-relaxed text-[#2A2A2A]">
            These standards guide how The Digital Ledger develops, reviews, and
            maintains editorial content about corporate finance and accounting.
          </p>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <section className={sectionClassName} aria-labelledby="scope">
          <h2 id="scope" className={headingClassName}>
            Scope and editorial responsibility
          </h2>
          <p className={bodyClassName}>
            The Digital Ledger is the publication responsible for content on
            this site. Editors are accountable for editorial decisions,
            including work created with assistance from research, transcription,
            or generative AI tools. Community posts and linked third-party
            materials represent their respective authors or publishers unless
            we clearly state otherwise.
          </p>
        </section>

        <section className={sectionClassName} aria-labelledby="sourcing">
          <h2 id="sourcing" className={headingClassName}>
            Sourcing and attribution
          </h2>
          <div className={`${bodyClassName} space-y-4`}>
            <p>
              Our standard is to rely on primary sources when they are
              available, including regulatory filings, legislation, standards,
              official data, company disclosures, original research, and direct
              interviews. Secondary reporting may be used for context and
              should be attributed.
            </p>
            <p>
              Material claims should be supported by sources readers can
              identify or by a clear description of the basis for the claim.
              Quotations and ideas from others should be credited. Anonymous
              sourcing should be exceptional and explained when source
              protection permits.
            </p>
          </div>
        </section>

        <section className={sectionClassName} aria-labelledby="analysis">
          <h2 id="analysis" className={headingClassName}>
            Reporting, analysis, and guidance
          </h2>
          <p className={bodyClassName}>
            News and factual reporting should be distinguished from our
            interpretation or analysis. Practical examples, forecasts, and
            recommendations are guidance, not statements of fact, and should
            make important assumptions and limitations clear.
          </p>
        </section>

        <section className={sectionClassName} aria-labelledby="dates">
          <h2 id="dates" className={headingClassName}>
            Publication and update dates
          </h2>
          <p className={bodyClassName}>
            Articles should display the date they were first published. When a
            substantive change is made, the displayed update date should reflect
            that change. Minor copy edits, formatting changes, or link repairs
            do not necessarily require a new update date. We do not change dates
            merely to make older work appear current.
          </p>
        </section>

        <section className={sectionClassName} aria-labelledby="ai">
          <h2 id="ai" className={headingClassName}>
            AI-assisted editorial work
          </h2>
          <div className={`${bodyClassName} space-y-4`}>
            <p>
              Our team may use AI-assisted tools for tasks such as research
              organization, transcription, outlining, or drafting. Under this
              policy, an editor must review AI-assisted editorial material
              before publication and remains responsible for its accuracy,
              attribution, clarity, and originality. AI output is not treated
              as a source.
            </p>
            <p>
              Editors should verify consequential claims against reliable
              sources, check quotations and citations, and avoid entering
              confidential, private, or user-account information into public AI
              systems. Material use of synthetic media or AI that affects how a
              reasonable reader understands a piece should be disclosed in the
              content.
            </p>
          </div>
        </section>

        <section className={sectionClassName} aria-labelledby="authors">
          <h2 id="authors" className={headingClassName}>
            Authors and expertise
          </h2>
          <p className={bodyClassName}>
            Author names and biographies should use verified, publicly
            available professional information. We do not infer or invent
            credentials, affiliations, licenses, or subject-matter expertise,
            and we do not use private user-account records to create public
            author profiles. A team byline means The Digital Ledger accepts
            editorial responsibility; it is not a claim that every team member
            has a particular credential.
          </p>
        </section>

        <section className={sectionClassName} aria-labelledby="corrections">
          <h2 id="corrections" className={headingClassName}>
            Corrections and feedback
          </h2>
          <p className={bodyClassName}>
            If you believe something is inaccurate, incomplete, or improperly
            attributed, reply to a Digital Ledger email with the article title
            or URL and a description of the issue. We will assess the supporting
            information. Substantive confirmed errors should be corrected
            promptly and, when useful to readers, accompanied by a correction
            or update note.
          </p>
        </section>

        <section className="mb-2" aria-labelledby="advice">
          <h2 id="advice" className={headingClassName}>
            No financial, legal, tax, or accounting advice
          </h2>
          <p className={bodyClassName}>
            The Digital Ledger provides general information and editorial
            analysis. It is not financial, investment, legal, tax, or accounting
            advice and is not a substitute for advice from a qualified
            professional familiar with your circumstances. Readers remain
            responsible for evaluating information and decisions.
          </p>
        </section>
      </article>
    </Layout>
  );
}