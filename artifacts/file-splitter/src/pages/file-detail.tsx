import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Download, Trash2, Terminal, ArrowLeft, Layers, FileCode2, Check } from "lucide-react";
import { format } from "date-fns";
import { 
  useGetFile, 
  getGetFileQueryKey, 
  useDeleteFile, 
  useGetFileSnippet, 
  getListFilesQueryKey,
  useDownloadChunk,
  getDownloadChunkUrl
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export default function FileDetailPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedChunks, setCopiedChunks] = useState<Record<number, boolean>>({});

  const { data: file, isLoading: fileLoading } = useGetFile(fileId, {
    query: { enabled: !!fileId, queryKey: getGetFileQueryKey(fileId) }
  });

  const { data: snippetData, isLoading: snippetLoading } = useGetFileSnippet(fileId, {
    query: { enabled: !!fileId, queryKey: [ 'snippet', fileId ] } // using custom key to avoid collision if needed, but it should be fine
  });

  const deleteFile = useDeleteFile({
    mutation: {
      onSuccess: () => {
        toast({ title: "File deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
        setLocation("/files");
      },
      onError: () => {
        toast({ variant: "destructive", title: "Failed to delete file" });
      }
    }
  });

  const copyToClipboard = async (text: string, type: 'snippet' | 'chunk', index?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'snippet') {
        setCopiedSnippet(true);
        setTimeout(() => setCopiedSnippet(false), 2000);
      } else if (type === 'chunk' && index !== undefined) {
        setCopiedChunks(prev => ({ ...prev, [index]: true }));
        setTimeout(() => setCopiedChunks(prev => ({ ...prev, [index]: false })), 2000);
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to copy" });
    }
  };

  if (fileLoading || snippetLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-64 bg-card rounded-md"></div>
          <div className="h-64 bg-card rounded-md"></div>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-mono font-bold mb-2">File not found</h2>
        <p className="text-muted-foreground mb-6">The requested file does not exist or has been deleted.</p>
        <Link href="/files">
          <Button>Return to Library</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/files">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-mono truncate max-w-lg" title={file.name}>{file.name}</h1>
            <p className="text-sm text-muted-foreground font-mono flex items-center gap-2">
              <span>{formatBytes(file.size)}</span>
              <span>•</span>
              <span>{format(new Date(file.uploadedAt), 'MMM d, yyyy HH:mm')}</span>
            </p>
          </div>
        </div>
        <Button 
          variant="destructive" 
          onClick={() => deleteFile.mutate({ fileId })}
          data-testid="button-delete-file"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete File
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 font-mono text-lg">
                <Terminal className="w-5 h-5 text-primary" />
                JS Embed Snippet
              </CardTitle>
              <CardDescription>
                Paste this zero-dependency snippet into your HTML to add a download button for this file.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative group">
                <div className="absolute right-2 top-2 z-10">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="h-8 font-mono text-xs bg-muted/80 backdrop-blur-sm hover:bg-muted"
                    onClick={() => copyToClipboard(snippetData?.snippet || '', 'snippet')}
                    data-testid="button-copy-snippet"
                  >
                    {copiedSnippet ? <Check className="w-3 h-3 mr-2 text-emerald-500" /> : <Copy className="w-3 h-3 mr-2" />}
                    {copiedSnippet ? 'Copied' : 'Copy Code'}
                  </Button>
                </div>
                <pre className="p-4 rounded-md bg-[#0a0a0a] border border-border/50 text-emerald-400 font-mono text-sm overflow-x-auto">
                  <code>{snippetData?.snippet}</code>
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 font-mono text-lg">
                <Layers className="w-5 h-5 text-primary" />
                Raw Chunks
              </CardTitle>
              <CardDescription>
                Direct access to the split file chunks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: file.chunkCount }).map((_, i) => {
                  const chunkUrl = file.chunkUrls?.[i] || getDownloadChunkUrl(fileId, i);
                  const fullUrl = window.location.origin + chunkUrl;
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-md border border-border bg-card/50 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-primary/10 text-primary p-2 rounded shrink-0">
                          <FileCode2 className="w-4 h-4" />
                        </div>
                        <div className="font-mono text-sm truncate">
                          chunk_{String(i).padStart(3, '0')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => copyToClipboard(fullUrl, 'chunk', i)}
                          title="Copy Chunk URL"
                          data-testid={`button-copy-chunk-${i}`}
                        >
                          {copiedChunks[i] ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <a href={chunkUrl} download={`${file.name}.part${i}`} target="_blank" rel="noreferrer">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            title="Download Chunk"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="font-mono text-lg">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">MIME Type</p>
                <p className="font-mono text-sm">{file.mimeType || 'application/octet-stream'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Total Size</p>
                <p className="font-mono text-sm">{formatBytes(file.size)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Chunk Size</p>
                <p className="font-mono text-sm">{formatBytes(file.chunkSize)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Chunk Count</p>
                <p className="font-mono text-sm">{file.chunkCount} pieces</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
