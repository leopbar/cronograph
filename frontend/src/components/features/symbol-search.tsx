"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
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
}

export function SymbolSearch({ value, onChange }: SymbolSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [symbols, setSymbols] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (query.length < 2) {
      setSymbols([]); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    const timer = setTimeout(async () => {
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
          buttonVariants({ variant: "outline" }),
          "w-full justify-between"
        )}
      >
        {value ? value : "Select symbol..."}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search symbol (e.g. BTCUSDT)..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && <CommandEmpty>Loading...</CommandEmpty>}
            {!loading && query.length >= 2 && symbols.length === 0 && (
              <CommandEmpty>No symbol found.</CommandEmpty>
            )}
            {!loading && query.length < 2 && (
              <CommandEmpty>Type at least 2 characters.</CommandEmpty>
            )}
            <CommandGroup>
              {symbols.map((symbol) => (
                <CommandItem
                  key={symbol}
                  value={symbol}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
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
