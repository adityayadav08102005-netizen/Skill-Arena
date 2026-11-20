"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";

const STEPS = [
  { title: "Learn", body: "Pick a topic and work through problems from easy to hard, with hints when you are stuck." },
  { title: "Code", body: "Write solutions in Python, Java, C++ or JavaScript and test them against sample cases." },
  { title: "Compete", body: "Join weekly contests, climb leaderboards and keep your daily streak alive." },
  { title: "Get hired", body: "Your solved problems, scores and badges sit on your profile when you apply." },
];

/** Four steps with a progress line that fills as the section scrolls past. */
export default function HowItWorks() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });

  return (
    <section ref={ref} className="mx-auto max-w-3xl px-4 pb-24">
      <h2 className="text-center text-3xl font-medium tracking-tight sm:text-4xl">How it works</h2>
      <div className="relative mt-10 pl-10">
        <div className="absolute bottom-2 left-[13px] top-2 w-0.5 rounded-full bg-arena-50" aria-hidden="true" />
        <motion.div
          className="absolute bottom-2 left-[13px] top-2 w-0.5 origin-top rounded-full bg-arena-600"
          style={{ scaleY }}
          aria-hidden="true"
        />
        <ol className="space-y-8">
          {STEPS.map((step, i) => (
            <motion.li
              key={step.title}
              className="relative"
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "0px 0px -80px 0px" }}
              transition={{ duration: 0.55, delay: i * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <span className="absolute -left-10 top-0 flex size-7 items-center justify-center rounded-full border border-arena-200 bg-panel text-xs font-medium text-arena-800">
                {i + 1}
              </span>
              <h3 className="text-lg font-medium">{step.title}</h3>
              <p className="mt-1 text-muted">{step.body}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
