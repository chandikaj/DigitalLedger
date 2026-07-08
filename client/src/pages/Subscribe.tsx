import { useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { getUtmSearch } from "@/lib/utm";

const BEEHIIV_FORM_ID = import.meta.env.VITE_BEEHIIV_FORM_ID;

export default function Subscribe() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const utmSearch = getUtmSearch();
    if (utmSearch && !window.location.search) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${utmSearch}`,
      );
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://subscribe-forms.beehiiv.com/v3/loader.js";
    script.setAttribute("data-beehiiv-form", BEEHIIV_FORM_ID);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1
            className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
            data-testid="subscribe-title"
          >
            Get it Wednesday
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Two articles and one podcast episode, every Wednesday morning.
          </p>
          <div
            ref={containerRef}
            className="flex justify-center"
            data-testid="beehiiv-form-container"
          />
        </div>
      </div>
    </Layout>
  );
}
