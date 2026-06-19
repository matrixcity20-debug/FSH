import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { UploadCloud, File, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function UploadPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/files/upload", true);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          toast({
            title: "Upload complete",
            description: "File successfully split and stored.",
          });
          setLocation(`/files/${response.id}`);
        } else {
          toast({
            variant: "destructive",
            title: "Upload failed",
            description: "An error occurred during upload.",
          });
          setUploading(false);
          setProgress(0);
        }
      };

      xhr.onerror = () => {
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: "Network error occurred.",
        });
        setUploading(false);
        setProgress(0);
      };

      xhr.send(formData);
    } catch (error) {
      console.error(error);
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 mt-12">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold font-mono tracking-tight text-foreground">Split. Embed. Distribute.</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">Upload any file to automatically split it into optimized chunks and generate a zero-dependency JS download embed.</p>
      </div>

      <Card className="border-2 border-dashed bg-card/50">
        <CardContent className="p-0">
          <div
            className={`p-16 text-center transition-colors ${dragActive ? 'bg-primary/5 border-primary/50' : 'hover:bg-muted/50'} cursor-pointer`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !uploading && inputRef.current?.click()}
            data-testid="dropzone"
          >
            <input
              type="file"
              ref={inputRef}
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                }
              }}
              disabled={uploading}
              data-testid="input-file"
            />
            
            {uploading ? (
              <div className="space-y-6 max-w-sm mx-auto">
                <UploadCloud className="w-16 h-16 mx-auto text-primary animate-pulse" />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-mono text-muted-foreground">
                    <span>Uploading...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </div>
            ) : file ? (
              <div className="space-y-6">
                <File className="w-16 h-16 mx-auto text-primary" />
                <div className="space-y-1">
                  <p className="font-mono text-base font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="flex gap-4 justify-center" onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" onClick={() => setFile(null)} data-testid="button-clear">Clear</Button>
                  <Button onClick={handleUpload} data-testid="button-upload">Process File</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <UploadCloud className="w-16 h-16 mx-auto text-muted-foreground" />
                <div className="space-y-2">
                  <p className="font-medium text-lg">Drag & drop a file here</p>
                  <p className="text-sm text-muted-foreground">or click to browse from your computer</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center font-mono">
        <AlertCircle className="w-4 h-4" />
        <span>Max file size: 100MB</span>
      </div>
    </div>
  );
}
