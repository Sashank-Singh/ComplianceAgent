"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink } from "lucide-react";

interface SourceUrlListProps {
  urls: string[];
}

export default function SourceUrlList({ urls }: SourceUrlListProps) {
  const [open, setOpen] = useState(false);
  if (!urls.length) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        {urls.length} source{urls.length !== 1 ? "s" : ""}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-0.5">
              {urls.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 py-1 text-xs text-zinc-600 hover:text-zinc-300 transition-colors truncate"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
