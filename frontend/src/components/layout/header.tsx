import { TimezoneSelector } from "@/components/features/timezone-selector";

export function Header() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary-foreground">CR</span>
          </div>
          <span className="font-bold tracking-tight">Cronograph</span>
        </div>
        <div className="flex items-center gap-2">
          <TimezoneSelector />
        </div>
      </div>
    </header>
  );
}
