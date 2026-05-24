import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteGraph } from "../services/api";

export function useDeleteGraph() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteGraph,
        onSuccess: () => queryClient.removeQueries({queryKey: ['graph']})
    })
}