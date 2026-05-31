import { ArticleForm } from "../components/ArticleForm";
import { FileUploadForm } from "../components/FileUploadForm";
import { ErrorMessage } from "../components/ErrorMessage";
import { ResultDisplay } from "../components/ResultDisplay";
import { useExtractGraph } from "../hooks/useExtractGraph";
import { useState } from "react";
import type { ChangeEvent } from "react";

const PROVIDERS = [
    { value: 'local',  label: 'Local',  model: 'LM Studio',             paid: false },
    { value: 'groq',   label: 'Groq',   model: 'llama-3.3-70b',         paid: false  },
    { value: 'openai', label: 'OpenAI', model: 'gpt-4o-mini',           paid: true  },
];


export function ExtractorPage(){

    const [mode, setMode] = useState('file');
    const [provider, setProvider] = useState('groq');

    const selected = PROVIDERS.find(p => p.value === provider)!;

    const handleModeChange = (e: ChangeEvent<HTMLSelectElement>) => {
        setMode(e.target.value)
    }

    const mutation = useExtractGraph();
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                RAG Extraction
                </h1>
                <p className="mt-3 text-xl text-gray-600">
                Build knowledge graph with LLM
                </p>
            </div>

            <div className="flex items-start justify-evenly">
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Input mode:</label>
                    <select
                        value={mode}
                        onChange={handleModeChange}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="json">JSON (paste)</option>
                        <option value="file">File (drag & drop)</option>
                    </select>
                </div>

                <div className="flex items-center gap-3 flex-col">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700">Provider:</label>
                        <select className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={provider} onChange={e => setProvider(e.target.value)}>
                                {PROVIDERS.map(p => (
                                    <option key={p.value} value={p.value}>
                                        {p.label} ({p.model})
                                    </option>
                                ))}
                        </select>
                    </div>
                    
                    {selected.paid && (
                        <p className="text-sm text-amber-600 font-medium">
                            ⚠ {selected.label} is a paid provider.
                        </p>
                        )
                    }

                </div>

            </div>
            

            <div className="bg-white p-6 sm:p-8 shadow-xl sm:rounded-2xl border border-gray-100">
                
                {mode === 'json' && 
                    <ArticleForm 
                    onSubmit={(data) => mutation.mutate({...data, provider})} 
                    isLoading={mutation.isPending} 
                    />
                }

                {mode === 'file' &&
                    <FileUploadForm
                        onSubmit={(data) => mutation.mutate({ ...data, provider })}
                        isLoading={mutation.isPending}
                    />
                }
                
                
                {mutation.isError && (
                    <ErrorMessage message={mutation.error?.message ?? 'Unknown error'} />
                )}

                {(mutation.isSuccess || mutation.status === 'streaming') && (
                    <>
                        {mutation.status === 'streaming' && (
                            <p className="mt-4 text-sm text-blue-600 font-medium">
                                Processing: {mutation.results.length} / {mutation.total}...
                            </p>
                        )}
                        <ResultDisplay results={mutation.results} />
                    </>
                )}

            </div>
        </div>
    )
}