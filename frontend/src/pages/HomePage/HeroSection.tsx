import { Link } from "react-router-dom";
import { InteractiveGraph } from "./InteractiveGraph";
import { SECTION } from "./sections";

export function HeroSection() {
  return (
    <section
      className={`${SECTION} max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-[1fr_1.55fr] lg:gap-14 items-center justify-items-center lg:justify-items-stretch`}
    >
      <div className="flex flex-col gap-7 w-full max-w-[44ch]">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400"
        >
          Inteligentna eksploracja dokumentów
        </p>

        <h1
          className="text-[2.25rem] sm:text-[2.75rem] lg:text-[3rem] font-semibold tracking-tight text-slate-900 leading-[1.06]"
        >
          Z dokumentów do struktury.
          <br />
          <span className="text-slate-400">W kilku krokach.</span>
        </h1>

        <p
          className="text-[16px] leading-[1.65] text-slate-600 text-justify hyphens-auto"
          lang="pl"
        >
          Atlas łączy ekstrakcję jednostek przez modele językowe z bazą grafową Neo4j
          i wyszukiwaniem semantycznym. Zamiast czytać raporty od deski do deski,
          poruszasz się po sieci powiązanych pojęć i sięgasz po fragmenty istotne dla
          zadanego pytania.
        </p>

        <div className="flex flex-col gap-3 pt-2">
          <Link
            to="/extract"
            className="group relative flex w-full items-center justify-between gap-6 rounded-2xl bg-slate-900 px-6 py-5 text-white overflow-hidden"
          >
            <span className="absolute inset-y-0 left-0 w-0 bg-white/[0.08] transition-[width] spring-panel group-hover:w-full" />
            <span className="relative flex flex-col">
              <span className="text-[15px] font-semibold">Załaduj artykuł</span>
              <span className="mt-0.5 text-[12px] text-slate-400">
                Wgraj plik <span className="font-mono text-slate-300">.json</span> i pozwól modelowi wydobyć strukturę
              </span>
            </span>
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 transition-transform spring-base group-hover:rotate-[-45deg]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </span>
          </Link>

          <Link
            to="/graph"
            className="group inline-flex items-center gap-2 self-start pl-2 text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <span className="text-slate-300 group-hover:text-slate-900 transition-colors">↗</span>
            <span className="relative">
              Lub otwórz istniejący graf
              <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-current transition-[width] spring-base group-hover:w-full" />
            </span>
          </Link>
        </div>
      </div>

      <div
        className="hidden lg:block lg:h-[calc(100vh-14rem)] w-full"
      >
        <InteractiveGraph />
      </div>
    </section>
  );
}
