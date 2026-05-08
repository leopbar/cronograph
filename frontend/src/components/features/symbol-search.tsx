"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchSymbols } from "@/lib/api";

interface SymbolSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SymbolSearch({ value, onChange, className }: SymbolSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [symbols, setSymbols] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setSymbols([]);
        return;
      }
      setLoading(true);
      try {
        const results = await fetchSymbols(query);
        setSymbols(results);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-[52px] w-full items-center justify-between rounded-[12px] border border-white/10 bg-[#0F1B2D] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[#7C8BA1]" />
          {value ? <span className="text-white">{value}</span> : <span className="text-[#7C8BA1]">Select symbol...</span>}
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 border-white/10 bg-[#0F1B2D] text-white" align="start">
        <Command shouldFilter={false} className="bg-[#0F1B2D] text-white">
          <CommandInput
            placeholder="Search symbol (e.g. BTCUSDT)..."
            value={query}
            onValueChange={setQuery}
            className="border-none focus:ring-0 text-white placeholder:text-[#7C8BA1]"
          />
          <CommandList className="border-t border-white/5">
            {loading && <CommandEmpty className="py-4 text-sm text-[#7C8BA1]">Loading assets...</CommandEmpty>}
            {!loading && query.length >= 2 && symbols.length === 0 && (
              <CommandEmpty className="py-4 text-sm text-[#7C8BA1]">No symbol found.</CommandEmpty>
            )}
            {!loading && query.length < 2 && (
              <CommandEmpty className="py-4 text-sm text-[#7C8BA1]">Type at least 2 characters.</CommandEmpty>
            )}
            <CommandGroup>
              {symbols.map((symbol) => (
                <CommandItem
                  key={symbol}
                  value={symbol}
                  onSelect={(currentValue) => {
                    onChange(currentValue.toUpperCase());
                    setOpen(false);
                  }}
                  className="aria-selected:bg-white/5 aria-selected:text-white text-[#B6C2D1] cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-blue-500",
                      value === symbol ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {symbol}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

