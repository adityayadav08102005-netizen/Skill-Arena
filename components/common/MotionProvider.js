"use client";

import { MotionConfig } from "motion/react";

/** Applies the user's reduced-motion preference to every motion component. */
export default function MotionProvider({ children }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
