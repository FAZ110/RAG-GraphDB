import { useMutation } from "@tanstack/react-query";
import { deleteGraph } from "../services/api";

export function useDeleteGraph() {
    return useMutation({ mutationFn: deleteGraph })
}
