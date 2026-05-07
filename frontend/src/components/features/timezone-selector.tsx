"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const timezones = [
  "UTC",
  "America/Sao_Paulo",
  "America/New_York",
  "Europe/London",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function TimezoneSelector() {
  const { timezone, setTimezone } = useAppStore();
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 gap-2 text-xs")}
      >
        <Globe className="h-3.5 w-3.5" />
        {timezone}
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="end">
        <div className="flex flex-col">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
            Select Display Timezone
          </div>
          {timezones.map((tz) => (
            <button
              key={tz}
              onClick={() => {
                setTimezone(tz);
                setOpen(false);
              }}
              className={cn(
                "flex items-center px-3 py-2 text-sm hover:bg-muted text-left transition-colors",
                timezone === tz && "bg-muted font-medium"
              )}
            >
              {tz.replace("_", " ")}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
