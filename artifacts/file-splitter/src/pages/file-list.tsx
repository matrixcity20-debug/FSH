import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { HardDrive, Trash2, ChevronRight, File } from "lucide-react";
import { format } from "date-fns";
import { useListFiles, getListFilesQueryKey, useDeleteFile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export default function FileListPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: files, isLoading } = useListFiles();
  const deleteFile = useDeleteFile({
    mutation: {
      onSuccess: () => {
        toast({ title: "File deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Failed to delete file" });
      }
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-mono">File Library</h1>
          <p className="text-muted-foreground">Manage your split files and embed codes.</p>
        </div>
        <div className="border border-border rounded-md p-8 text-center text-muted-foreground font-mono">
          Loading library...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-mono">File Library</h1>
          <p className="text-muted-foreground text-sm">Manage your split files and embed codes.</p>
        </div>
        <Link href="/">
          <Button variant="outline" className="font-mono text-xs" data-testid="button-new-upload">
            + New Upload
          </Button>
        </Link>
      </div>

      {files && files.length > 0 ? (
        <div className="border border-border rounded-md overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-mono text-xs">Name</TableHead>
                <TableHead className="font-mono text-xs w-[120px]">Size</TableHead>
                <TableHead className="font-mono text-xs w-[100px]">Chunks</TableHead>
                <TableHead className="font-mono text-xs w-[150px]">Uploaded</TableHead>
                <TableHead className="w-[100px] text-right font-mono text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow 
                  key={file.id} 
                  className="cursor-pointer group hover:bg-muted/50"
                  onClick={() => setLocation(`/files/${file.id}`)}
                  data-testid={`row-file-${file.id}`}
                >
                  <TableCell className="font-medium font-mono text-sm truncate max-w-[200px]" title={file.name}>
                    <div className="flex items-center gap-2">
                      <File className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{file.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatBytes(file.size)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">{file.chunkCount}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{format(new Date(file.uploadedAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => deleteFile.mutate({ fileId: file.id })}
                        data-testid={`button-delete-${file.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors"
                        onClick={() => setLocation(`/files/${file.id}`)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed rounded-md bg-card/50">
          <HardDrive className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-mono text-lg font-medium mb-1">Library Empty</h3>
          <p className="text-muted-foreground text-sm mb-6">You haven't uploaded any files yet.</p>
          <Link href="/">
            <Button data-testid="button-upload-first">Upload your first file</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
