import { Link, useLocation } from "wouter";
import { useHealthCheck } from "@workspace/api-client-react";
import { Server, HardDrive, Upload, SplitSquareHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: health, isLoading } = useHealthCheck();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans dark">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity" data-testid="link-home">
            <SplitSquareHorizontal className="w-5 h-5" />
            <span className="font-mono font-bold tracking-tight">FileSplit</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link 
              href="/" 
              className={cn("flex items-center gap-2 transition-colors hover:text-primary", location === "/" ? "text-primary" : "text-muted-foreground")}
              data-testid="link-upload"
            >
              <Upload className="w-4 h-4" />
              Upload
            </Link>
            <Link 
              href="/files" 
              className={cn("flex items-center gap-2 transition-colors hover:text-primary", location.startsWith("/files") ? "text-primary" : "text-muted-foreground")}
              data-testid="link-library"
            >
              <HardDrive className="w-4 h-4" />
              Library
            </Link>
          </nav>
          <div className="flex items-center gap-2 text-xs font-mono">
            <Server className="w-3 h-3 text-muted-foreground" />
            {isLoading ? (
              <span className="text-muted-foreground">checking...</span>
            ) : health?.status === "ok" ? (
              <span className="text-emerald-500" data-testid="status-api-online">API: online</span>
            ) : (
              <span className="text-destructive" data-testid="status-api-offline">API: offline</span>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
