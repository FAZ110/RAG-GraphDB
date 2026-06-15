import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { item, SECTION } from "./motion";

interface Step {
  n: string;
  title: string;
  body: ReactNode;
}

const HL = "font-semibold text-slate-900";

const steps: Step[] = [
  {
    n: "01",
    title: "Załaduj artykuł",
    body: (
      <>
        W zakładce <span className={HL}>Ekstrakcja</span> wgraj plik{" "}
        <span className="font-mono text-[13px] text-slate-800 bg-slate-100 rounded px-1.5 py-0.5">
          .json
        </span>{" "}
        zawierający <span className={HL}>artykuł lub tablicę artykułów</span>.
        Wybierz dostawcę modelu — lokalnego (LM Studio), Groq lub OpenAI.
      </>
    ),
  },
  {
    n: "02",
    title: "Ekstrakcja jednostek",
    body: (
      <>
        Model językowy wydobywa z tekstu{" "}
        <span className={HL}>jednostki nazwane</span> — osoby, organizacje, miejsca —
        oraz <span className={HL}>relacje</span> między nimi. Wynik pojawia się po prawej
        w formie kart.
      </>
    ),
  },
  {
    n: "03",
    title: "Eksploracja grafu",
    body: (
      <>
        Zakładka <span className={HL}>Graf</span> daje pełną sieć powiązań i{" "}
        <span className={HL}>wyszukiwarkę semantyczną</span> — operuje ona na
        embeddingach wektorowych, a nie na dopasowaniu słów kluczowych.
      </>
    ),
  },
];

export function StepsSection() {
  return (
    <section
      className={`${SECTION} max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center border-t border-slate-200`}
    >
      <motion.div
        variants={item}
        className="mb-8 lg:mb-14 flex items-end justify-between gap-6"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Pierwsze uruchomienie
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            Trzy kroki do pierwszego grafu.
          </h2>
        </div>
        <span className="hidden sm:block text-sm text-slate-400 tabular-nums">
          01 — 03
        </span>
      </motion.div>

      <ol className="grid gap-px bg-slate-200 border-y border-slate-200 sm:grid-cols-3">
        {steps.map((step, idx) => (
          <motion.li
            key={step.n}
            variants={item}
            className="relative bg-white p-8 lg:p-10 flex flex-col"
          >
            <div className="flex items-baseline gap-4">
              <span className="text-[2.75rem] font-semibold tabular-nums text-slate-900 leading-none tracking-tight">
                {step.n}
              </span>
              <span className="flex-1 h-px bg-slate-200" />
            </div>
            <h3 className="mt-7 text-xl font-semibold text-slate-900 tracking-tight">
              {step.title}
            </h3>
            <p
              className="mt-3 text-[15.5px] leading-[1.7] text-slate-600 text-justify hyphens-auto"
              lang="pl"
            >
              {step.body}
            </p>

            {idx < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="hidden sm:flex absolute right-0 top-[3.25rem] translate-x-1/2 h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 z-10"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </span>
            )}
          </motion.li>
        ))}
      </ol>

      <motion.div
        variants={item}
        className="mt-8 lg:mt-14 flex flex-wrap items-center justify-between gap-6"
      >
        <p className="text-sm text-slate-500 max-w-[48ch]">
          Wszystko gotowe? Wgraj pierwszy dokument — pełna ścieżka od pliku do grafu
          zajmuje niecałą minutę.
        </p>
        <Link
          to="/extract"
          className="group inline-flex items-center gap-2.5 rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          Przejdź do ekstrakcji
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </Link>
      </motion.div>
    </section>
  );
}
