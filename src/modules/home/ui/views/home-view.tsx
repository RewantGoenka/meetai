"use client";

import { motion } from "framer-motion";

export const HomeView = () => {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-700 via-orange-600 to-amber-500 text-white">
      {/* subtle animated glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0 blur-3xl bg-orange-400/40"
      />

      <div className="relative max-w-3xl text-center space-y-8 px-6">
        {/* headline */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-5xl md:text-6xl font-semibold tracking-tight"
        >
          Welcome to <span className="text-orange-200">MeetAI</span>
        </motion.h1>

        {/* subtext */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-lg leading-relaxed text-orange-100 max-w-xl mx-auto"
        >
          Build Voice-AI Agents and run Meetings powered by them —
          faster than ever.
        </motion.p>
      </div>
    </main>
  );
};
