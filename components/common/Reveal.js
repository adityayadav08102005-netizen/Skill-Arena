"use client";

import { motion } from "motion/react";

/**
 * Fades and slides its children up the first time they scroll into view.
 * `delay` staggers siblings; `y` sets the travel distance in px.
 */
export default function Reveal({ children, delay = 0, y = 18, className, as = "div" }) {
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.65, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </Tag>
  );
}
