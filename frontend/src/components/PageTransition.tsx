import { motion } from "motion/react";
import type { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
      transition={{
        opacity: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
        y: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
        filter: { duration: 0.2, ease: 'easeOut' },
      }}
    >
      {children}
    </motion.div>
  );
}
