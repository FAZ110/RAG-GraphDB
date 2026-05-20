import { useQuery } from "@tanstack/react-query"
import { fetchGraph } from "../services/api"


export function useGraphQuery(){
    return useQuery({
        queryKey: ["graph"],
        queryFn: fetchGraph
    })
}