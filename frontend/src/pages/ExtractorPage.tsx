import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Variants } from "motion/react";
import { ArticleForm } from "../components/ArticleForm";
import { FileUploadForm } from "../components/FileUploadForm";
import { ErrorMessage } from "../components/ErrorMessage";
import { ResultCarousel } from "../components/ResultCarousel";
import { ExtractionControls } from "../components/ExtractionControls";
import { useExtraction } from "../contexts/ExtractionContext";
import { useFiles } from "../contexts/FileContext";

const PROVIDERS = [
  { value: 'local', label: 'Local', model: 'LM Studio', paid: false },
  { value: 'groq', label: 'Groq', model: 'llama-3.3-70b', paid: false },
  { value: 'openai', label: 'OpenAI', model: 'gpt-4o-mini', paid: true },
];

const PANEL_HEIGHT = "h-[calc(100vh-7rem)]";

const cardSpring = { type: 'spring' as const, stiffness: 240, damping: 28, mass: 0.8 };

const emptyVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 16, filter: 'blur(6px)' },
  show: { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', transition: cardSpring },
  exit: { opacity: 0, scale: 0.96, y: -12, filter: 'blur(4px)', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};

const paneContainerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
  exit: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
};

const asideVariants: Variants = {
  hidden: { opacity: 0, x: -56, scale: 0.96 },
  show: { opacity: 1, x: 0, scale: 1, transition: cardSpring },
  exit: { opacity: 0, x: -40, scale: 0.97, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};

const mainVariants: Variants = {
  hidden: { opacity: 0, x: 72, scale: 0.95 },
  show: { opacity: 1, x: 0, scale: 1, transition: { ...cardSpring, stiffness: 220 } },
  exit: { opacity: 0, x: 56, scale: 0.96, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};

interface ConfigSelectorsProps {
  mode: 'file' | 'json';
  provider: string;
  disabled: boolean;
  onModeChange: (mode: 'file' | 'json') => void;
  onProviderChange: (provider: string) => void;
  large?: boolean;
}

function ConfigSelectors({
  mode,
  provider,
  disabled,
  onModeChange,
  onProviderChange,
  large = false,
}: ConfigSelectorsProps) {
  const selected = PROVIDERS.find((p) => p.value === provider)!;

  const sz = large
    ? {
        gap: 'gap-4',
        label: 'text-xs mb-2',
        pillBox: 'p-1',
        pillBtn: 'px-5 py-2 text-sm',
        tileGap: 'gap-2',
        tilePad: 'px-3 py-2.5',
        tileLabel: 'text-sm',
        tileModel: 'text-[11px]',
        paidBadge: 'text-[9px]',
        warn: 'text-xs px-2.5 py-1.5',
      }
    : {
        gap: 'gap-3',
        label: 'text-[10px] mb-1.5',
        pillBox: 'p-0.5',
        pillBtn: 'px-3 py-1 text-xs',
        tileGap: 'gap-1.5',
        tilePad: 'px-2 py-1.5',
        tileLabel: 'text-xs',
        tileModel: 'text-[9px]',
        paidBadge: 'text-[8px]',
        warn: 'text-[11px] px-2 py-1',
      };

  return (
    <div className={`flex flex-col ${sz.gap}`}>
      <div>
        <label className={`font-semibold text-gray-500 uppercase tracking-wide block ${sz.label}`}>
          Tryb wejścia
        </label>
        <div className={`inline-flex bg-gray-100 rounded-xl ${sz.pillBox}`}>
          {(['file', 'json'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              disabled={disabled}
              className={`relative font-semibold rounded-lg transition-colors cursor-pointer ${sz.pillBtn} ${
                mode === m ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {mode === m && (
                <motion.span
                  layoutId="mode-pill"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{m === 'file' ? 'Drag & drop' : 'Paste'}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={`font-semibold text-gray-500 uppercase tracking-wide block ${sz.label}`}>
          Dostawca LLM
        </label>
        <div className={`grid grid-cols-3 ${sz.tileGap}`}>
          {PROVIDERS.map((p) => {
            const active = p.value === provider;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => onProviderChange(p.value)}
                disabled={disabled}
                className={`relative flex flex-col items-start gap-0.5 rounded-xl border-2 cursor-pointer text-left transition-colors ${sz.tilePad} ${
                  active
                    ? 'border-transparent'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="provider-active-frame"
                    className="absolute -inset-[2px] rounded-xl border-2 border-blue-500 bg-blue-50 shadow-sm"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <div className="relative flex items-center gap-1 w-full min-w-0">
                  <motion.span
                    animate={{ color: active ? '#1e3a8a' : '#1f2937' }}
                    transition={{ duration: 0.25 }}
                    className={`font-semibold truncate ${sz.tileLabel}`}
                  >
                    {p.label}
                  </motion.span>
                  {p.paid && (
                    <span className={`ml-auto font-bold uppercase px-1 py-0.5 bg-amber-100 text-amber-700 rounded flex-shrink-0 ${sz.paidBadge}`}>
                      płatny
                    </span>
                  )}
                </div>
                <motion.span
                  animate={{ color: active ? '#1d4ed8' : '#6b7280' }}
                  transition={{ duration: 0.25 }}
                  className={`relative font-mono truncate w-full ${sz.tileModel}`}
                >
                  {p.model}
                </motion.span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {selected.paid && (
          <motion.p
            key="paid-warning"
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className={`text-amber-700 bg-amber-50 border border-amber-200 rounded-md font-medium flex items-center gap-1.5 overflow-hidden ${sz.warn}`}
          >
            <span>⚠</span> Wybrano {selected.label} — przetwarzanie generuje opłaty.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ExtractorPage() {
  const [mode, setMode] = useState<'file' | 'json'>('file');
  const [provider, setProvider] = useState('groq');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const prevResultsLenRef = useRef(0);

  const { files } = useFiles();
  const extraction = useExtraction();
  const { results, total, processedCount, status, error, isActive, start, pause, resume, stop, reset } = extraction;

  const hasContent = files.length > 0 || status !== 'idle' || results.length > 0;

  useEffect(() => {
    const prevLen = prevResultsLenRef.current;
    if (results.length > prevLen) {
      if (prevLen === 0 || carouselIndex === prevLen - 1) {
        setCarouselIndex(results.length - 1);
      }
    }
    prevResultsLenRef.current = results.length;
  }, [results.length, carouselIndex]);

  const handleSubmit = (data: { articles: { url?: string; title?: string; content: string }[] }) => {
    if (data.articles.length === 0) return;
    setCarouselIndex(0);
    prevResultsLenRef.current = 0;
    start({ articles: data.articles, provider });
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!hasContent ? (
        <motion.div
          key="empty"
          variants={emptyVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="flex justify-center"
          style={{ transformOrigin: 'center top' }}
        >
          <div className={`relative w-full max-w-3xl bg-white shadow-xl rounded-3xl border border-gray-100 flex flex-col overflow-hidden ${PANEL_HEIGHT}`}>
            <div className="px-8 pt-8 pb-5 flex-shrink-0">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Ekstrakcja artykułów
              </h1>
              <p className="mt-1.5 text-base text-gray-600">
                Wgraj artykuły, a system zbuduje z nich graf wiedzy z pomocą LLM.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            <div className="px-8 py-5 flex-shrink-0">
              <ConfigSelectors
                mode={mode}
                provider={provider}
                disabled={false}
                onModeChange={setMode}
                onProviderChange={setProvider}
                large
              />
            </div>

            <div className="px-8 pb-8 flex-1 min-h-0 flex flex-col relative">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: mode === 'json' ? 24 : -24, scale: 0.985 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: mode === 'json' ? -24 : 24, scale: 0.985 }}
                  transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
                  className="flex-1 min-h-0 flex flex-col"
                >
                  {mode === 'json' ? (
                    <ArticleForm onSubmit={handleSubmit} submitLabel="Rozpocznij budowę grafu wiedzy" large />
                  ) : (
                    <FileUploadForm onSubmit={handleSubmit} submitLabel="Rozpocznij budowę grafu wiedzy" large />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="pane"
          variants={paneContainerVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="flex flex-col lg:flex-row gap-4 items-stretch"
        >
          <motion.aside
            variants={asideVariants}
            className="w-full lg:w-96 lg:flex-shrink-0"
            style={{ transformOrigin: 'left center' }}
          >
            <div className={`bg-white p-5 shadow-xl rounded-2xl border border-gray-100 flex flex-col ${PANEL_HEIGHT}`}>
              <div className="space-y-3 flex-shrink-0">
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Ekstrakcja artykułów</h1>
                  <p className="mt-1 text-sm text-gray-600">Zbuduj graf wiedzy z pomocą LLM</p>
                </div>

                <ConfigSelectors
                  mode={mode}
                  provider={provider}
                  disabled={isActive}
                  onModeChange={setMode}
                  onProviderChange={setProvider}
                />
              </div>

              <div className="mt-4 flex-1 min-h-0 flex flex-col">
                {mode === 'json' && (
                  <ArticleForm onSubmit={handleSubmit} disabled={isActive} submitLabel="Rozpocznij budowę grafu wiedzy" />
                )}
                {mode === 'file' && (
                  <FileUploadForm onSubmit={handleSubmit} disabled={isActive} submitLabel="Rozpocznij budowę grafu wiedzy" />
                )}
              </div>

              {status !== 'idle' && (
                <div className="mt-3 flex-shrink-0">
                  <ExtractionControls
                    status={status}
                    processedCount={processedCount}
                    total={total}
                    onPause={pause}
                    onResume={resume}
                    onStop={stop}
                    onReset={reset}
                  />
                </div>
              )}

              {error && (
                <div className="mt-3 flex-shrink-0">
                  <ErrorMessage message={error} />
                </div>
              )}
            </div>
          </motion.aside>

          <motion.main
            variants={mainVariants}
            className="flex-1 min-w-0 w-full"
            style={{ transformOrigin: 'right center' }}
          >
            <div className={`bg-white p-5 shadow-xl rounded-2xl border border-gray-100 ${PANEL_HEIGHT} flex flex-col`}>
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h2 className="text-lg font-bold text-gray-900">Wyniki ekstrakcji</h2>
                {total > 0 && (
                  <span className="text-sm text-gray-500">
                    Przetworzono <span className="font-semibold text-gray-700">{processedCount}</span> z {total}
                  </span>
                )}
              </div>

              <ResultCarousel
                results={results}
                total={total > 0 ? total : results.length}
                currentIndex={carouselIndex}
                onIndexChange={setCarouselIndex}
                emptyMessage={
                  isActive
                    ? 'Czekam na pierwszy wynik...'
                    : 'Kliknij „Analizuj”, aby uruchomić ekstrakcję — wyniki pojawią się tutaj.'
                }
              />
            </div>
          </motion.main>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
