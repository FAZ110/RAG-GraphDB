import { useMutation } from "@tanstack/react-query";
import { extractGraphData } from "../services/api";

export function useExtractGraph() {
  return useMutation({
    mutationFn: extractGraphData,
  });
}
