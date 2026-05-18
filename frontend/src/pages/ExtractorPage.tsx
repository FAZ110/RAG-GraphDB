import { ArticleForm } from "../components/ArticleForm";
import { ErrorMessage } from "../components/ErrorMessage";
import { ResultDisplay } from "../components/ResultDisplay";
import { useExtractGraph } from "../hooks/useExtractGraph";


export function ExtractorPage(){

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

            <div className="bg-white p-6 sm:p-8 shadow-xl sm:rounded-2xl border border-gray-100">
                
                <ArticleForm 
                onSubmit={(data) => mutation.mutate(data)} 
                isLoading={mutation.isPending} 
                />
                
                {mutation.isError && (
                <ErrorMessage message={mutation.error.message} />
                )}
                
                {mutation.isSuccess && (
                <ResultDisplay
                    results={mutation.data.results}
                />
                )}

            </div>
        </div>
    )
}