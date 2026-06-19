import { Card, CardContent } from "@/components/ui/card";
import { TerminalSquare, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="w-full h-[60vh] flex flex-col items-center justify-center">
      <Card className="w-full max-w-md bg-card border-border shadow-lg">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="mx-auto bg-muted/50 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-2">
            <TerminalSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-bold font-mono tracking-tight text-primary">404</h1>
            <p className="text-sm font-mono text-muted-foreground">
              ERR_FILE_NOT_FOUND
            </p>
          </div>

          <p className="text-muted-foreground">
            The path you are looking for does not exist or has been moved.
          </p>

          <Link href="/">
            <Button variant="outline" className="font-mono mt-2" data-testid="button-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
