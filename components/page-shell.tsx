import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10", className)}>
      {children}
    </div>
  );
}
