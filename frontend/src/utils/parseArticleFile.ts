import type { ArticleRequest } from '../types';

export function parseArticleFile(file: File): Promise<ArticleRequest[]> {
  if (!file.name.endsWith('.json')) {
    return Promise.reject(new Error('Only .json files are supported.'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const parsed: unknown = JSON.parse(e.target?.result as string);
        const list: ArticleRequest[] = Array.isArray(parsed) ? parsed : [parsed as ArticleRequest];

        const invalid = list.find((a) => !a.content?.trim());
        if (invalid !== undefined) {
          reject(new Error("Every article must have a 'content' field."));
          return;
        }

        resolve(list);
      } catch (err) {
        reject(new Error(`JSON parse error: ${(err as Error).message}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
