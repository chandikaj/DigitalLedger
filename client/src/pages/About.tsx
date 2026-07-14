import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { SubscribeDialog } from "@/components/SubscribeDialog";

export default function About() {
  const [showSubscribe, setShowSubscribe] = useState(false);

  return (
    <Layout>
      <SubscribeDialog open={showSubscribe} onOpenChange={setShowSubscribe} />
      <div className="bg-[#F1EDE4]">
        <div className="max-w-3xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <h1
            className="text-4xl md:text-5xl font-bold text-[#1F2A44] mb-8"
            data-testid="text-about-title"
          >
            About
          </h1>
          <p className="text-xl text-[#2A2A2A] mb-4 leading-relaxed" data-testid="text-about-intro-1">
            The Digital Ledger is a weekly editorial brief for CFOs,
            controllers, FP&A leads, and accounting firm partners.
          </p>
          <p className="text-xl text-[#2A2A2A] leading-relaxed" data-testid="text-about-intro-2">
            Two articles and one podcast, every Wednesday morning. On what's
            actually shifting underneath the headlines, in corporate finance,
            accounting, and the work of the profession.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <section className="mb-12">
          <h2
            className="text-2xl md:text-3xl font-bold text-[#1F2A44] dark:text-white mb-4"
            data-testid="text-who-we-are-title"
          >
            Who we are
          </h2>
          <p className="text-lg text-[#3D3D3D] dark:text-gray-300 leading-relaxed" data-testid="text-who-we-are-content">
            A small editorial team. Finance and accounting people, mostly. We
            read a lot. We think about what's changing before it's named. We
            write for readers who do the same.
          </p>
        </section>

        <section className="mb-12">
          <h2
            className="text-2xl md:text-3xl font-bold text-[#1F2A44] dark:text-white mb-4"
            data-testid="text-what-we-do-title"
          >
            What we're doing
          </h2>
          <p className="text-lg text-[#3D3D3D] dark:text-gray-300 mb-4 leading-relaxed" data-testid="text-what-we-do-content">
            Reading the industry closely. Filtering the noise. Publishing the
            signal. Twice a week in article form, once a week in conversation.
            Delivered as one weekly brief on Wednesday mornings.
          </p>
          <p className="text-lg text-[#3D3D3D] dark:text-gray-300 leading-relaxed" data-testid="text-what-we-do-content-2">
            Not a roundup. Not hot takes. Not more headlines. The work
            underneath them.
          </p>
        </section>

        <section className="mb-12">
          <h2
            className="text-2xl md:text-3xl font-bold text-[#1F2A44] dark:text-white mb-4"
            data-testid="text-why-title"
          >
            Why
          </h2>
          <p className="text-lg text-[#3D3D3D] dark:text-gray-300 mb-4 leading-relaxed" data-testid="text-why-content">
            Finance is louder than it's ever been. Most of what gets published
            about it is repackaged noise. The same three ideas rewritten every
            week by newsletters that don't have a point of view.
          </p>
          <p className="text-lg text-[#3D3D3D] dark:text-gray-300 leading-relaxed" data-testid="text-why-content-2">
            We think there's room for a different kind of publication. Quieter.
            More considered. Written for the people who see the shifts first
            and don't need them explained back at them.
          </p>
        </section>

        <section className="mb-12">
          <h2
            className="text-2xl md:text-3xl font-bold text-[#1F2A44] dark:text-white mb-4"
            data-testid="text-who-its-for-title"
          >
            Who it's for
          </h2>
          <p className="text-lg text-[#3D3D3D] dark:text-gray-300 leading-relaxed" data-testid="text-who-its-for-content">
            CFOs, controllers, FP&A leads, and accounting firm partners. Senior
            finance and accounting readers who want to understand what's
            changing without the performance.
          </p>
        </section>

        <section className="mb-12">
          <h2
            className="text-2xl md:text-3xl font-bold text-[#1F2A44] dark:text-white mb-4"
            data-testid="text-editorial-standards-title"
          >
            Editorial standards
          </h2>
          <p className="text-lg text-[#3D3D3D] dark:text-gray-300 mb-4 leading-relaxed" data-testid="text-editorial-standards-content">
            We care about the work. Every piece is read, questioned, and edited
            before it goes out. Sources are credited. Quotes are honored. Ideas
            that aren't ours are treated as belonging to the people who had
            them first.
          </p>
          <p className="text-lg text-[#3D3D3D] dark:text-gray-300 leading-relaxed" data-testid="text-editorial-standards-content-2">
            We think publishing is a small act of trust between us and the
            reader. We try to be worth that trust every Wednesday.
          </p>
        </section>
      </div>

      <section className="py-16 bg-[#F1EDE4]" data-testid="about-cta-section">
        <div className="max-w-3xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <p className="text-xl md:text-2xl text-[#2A2A2A] mb-8" data-testid="text-about-cta">
            If any of this sounds like the read you're looking for, the weekly
            brief lands every Wednesday morning.
          </p>
          <Button
            size="lg"
            className="bg-[#1F2A44] hover:bg-[#162035] text-[#F7F4EC]"
            onClick={() => setShowSubscribe(true)}
            data-testid="button-about-get-it-wednesday"
          >
            Get it Wednesday
          </Button>
        </div>
      </section>
    </Layout>
  );
}
