import type { Variants } from "motion/react";

const spring = { type: "spring" as const, stiffness: 220, damping: 28, mass: 0.8 };

export const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: spring },
};

export const SECTION =
  "min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] py-16 lg:py-0 lg:snap-start";
