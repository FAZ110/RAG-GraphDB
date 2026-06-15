import { useEffect } from "react";
import { motion } from "motion/react";
import { container } from "./motion";
import { HeroSection } from "./HeroSection";
import { StepsSection } from "./StepsSection";

export function HomePlaceholder() {
  useEffect(() => {
    const html = document.documentElement;
    const prev = {
      snap: html.style.scrollSnapType,
      pad: html.style.scrollPaddingTop,
      behavior: html.style.scrollBehavior,
    };
    const mql = window.matchMedia("(min-width: 1024px) and (min-height: 640px)");
    const apply = () => {
      html.style.scrollSnapType = mql.matches ? "y mandatory" : "";
    };
    apply();
    mql.addEventListener("change", apply);
    html.style.scrollPaddingTop = "4rem";
    html.style.scrollBehavior = "smooth";
    return () => {
      mql.removeEventListener("change", apply);
      html.style.scrollSnapType = prev.snap;
      html.style.scrollPaddingTop = prev.pad;
      html.style.scrollBehavior = prev.behavior;
    };
  }, []);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="-my-6"
    >
      <HeroSection />
      <StepsSection />
    </motion.div>
  );
}
