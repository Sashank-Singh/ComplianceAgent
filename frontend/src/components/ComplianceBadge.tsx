"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

interface ComplianceBadgeProps {
  compliant: boolean;
  domain: string;
}

export default function ComplianceBadge({ compliant, domain }: ComplianceBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-4 py-4"
    >
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center shrink-0
          ${compliant ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}
        `}
      >
        {compliant ? (
          <Check className="w-5 h-5" strokeWidth={2} />
        ) : (
          <X className="w-5 h-5" strokeWidth={2} />
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-zinc-100">{domain}</p>
        <p className={`text-xs ${compliant ? "text-emerald-500" : "text-red-400"}`}>
          {compliant ? "Compliance standards detected" : "No compliance claims found"}
        </p>
      </div>
    </motion.div>
  );
}
