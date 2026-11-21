import { SearchXIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { fade } from '@/design/motion'

/** An answer with nothing in it, and where to look to widen the question. */
export function NoMatches() {
  return (
    <motion.div
      {...fade}
      className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-10 text-center"
    >
      <span className="flex size-11 items-center justify-center border border-line text-fg-muted">
        <SearchXIcon className="size-5" aria-hidden />
      </span>
      <div className="flex max-w-72 flex-col gap-1">
        <p className="text-base font-semibold text-fg">Nic nie pasuje do tego pytania</p>
        <p className="text-sm text-fg-muted">
          Kliknij połączenie albo szukaną encję i poluzuj warunki.
        </p>
      </div>
    </motion.div>
  )
}
