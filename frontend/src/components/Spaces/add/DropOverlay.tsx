import { AnimatePresence, motion } from 'motion/react'
import { UploadIcon } from 'lucide-react'

export function DropOverlay({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-fg/30 p-8"
        >
          <div className="deck-lg flex flex-col items-center gap-3 border-2 border-dashed border-fg bg-surface px-12 py-10">
            <UploadIcon className="size-6 text-fg" aria-hidden="true" />
            <p className="text-lg font-semibold text-fg">Upuść, aby dodać artykuły</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
