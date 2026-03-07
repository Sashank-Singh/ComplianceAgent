"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

interface DomainInputProps {
  onSubmit: (domain: string) => void;
  isLoading: boolean;
  initialValue?: string;
}

function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^(https?:\/\/)/, "");
  d = d.replace(/\/.*$/, "");
  return d;
}

function isValidDomain(domain: string): boolean {
  return /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain);
}

export default function DomainInput({ onSubmit, isLoading, initialValue = "" }: DomainInputProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const domain = normalizeDomain(value);
    if (!domain) {
      setError("Enter a domain");
      return;
    }
    if (!isValidDomain(domain)) {
      setError("Invalid domain format");
      return;
    }
    setError("");
    setValue(domain);
    onSubmit(domain);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={`
          flex items-center gap-2 px-4 py-2.5
          bg-zinc-900 rounded-lg border transition-colors
          ${error ? "border-red-500/40" : "border-white/[0.06] focus-within:border-white/[0.15]"}
        `}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(""); }}
          placeholder="stripe.com"
          disabled={isLoading}
          className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="
            shrink-0 px-3 py-1.5 rounded-md text-xs font-medium
            bg-zinc-100 text-zinc-900 hover:bg-white
            disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed
            transition-colors flex items-center gap-1.5
          "
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              Check
              <ArrowRight className="w-3 h-3" />
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}
    </form>
  );
}
