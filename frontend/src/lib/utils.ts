import { createCn } from 'cn/config'

// Without this, `text-display` & co. are taken for colours and dropped next to `text-fg`.
export const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['display', 'display-lg', 'display-xl', 'title', 'heading', 'figure'] },
      ],
    },
  },
})
