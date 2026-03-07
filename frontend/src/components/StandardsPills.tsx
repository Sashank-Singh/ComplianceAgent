"use client";

import { motion } from "framer-motion";
import { STANDARD_COLORS } from "@/lib/constants";

interface StandardsPillsProps {
  standards: string[];
}

export default function StandardsPills({ standards }: StandardsPillsProps) {
  if (!standards.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {standards.map((std, i) => {
        const key = Object.keys(STANDARD_COLORS).find(
          (k) => k.toUpperCase() === std.toUpperCase()
        ) || "DEFAULT";
        const colors = STANDARD_COLORS[key];
        return (
          <motion.span
            key={std}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${colors.bg} ${colors.text}`}
          >
            {std}
          </motion.span>
        );
      })}
    </div>
  );
}
