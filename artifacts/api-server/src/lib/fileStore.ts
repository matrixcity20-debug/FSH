import fs from "fs";
import path from "path";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

export const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");

export const CHUNK_SIZE = 1024 * 1024;

export interface FileMeta {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  chunkCount: number;
  chunkSize: number;
  uploadedAt: string;
  chunkUrls: string[];
}

export function ensureUploadsDir(): void {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

export function getFileDir(fileId: string): string {
  return path.join(uploadsDir, fileId);
}

export function getMetaPath(fileId: string): string {
  return path.join(getFileDir(fileId), "meta.json");
}

export function getChunkPath(fileId: string, chunkIndex: number): string {
  return path.join(getFileDir(fileId), `chunk_${chunkIndex}.bin`);
}

export function saveMeta(meta: FileMeta): void {
  const dir = getFileDir(meta.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getMetaPath(meta.id), JSON.stringify(meta, null, 2));
}

export function readMeta(fileId: string): FileMeta | null {
  const metaPath = getMetaPath(fileId);
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf-8")) as FileMeta;
  } catch {
    return null;
  }
}

export function listAllFiles(): FileMeta[] {
  ensureUploadsDir();
  const entries = fs.readdirSync(uploadsDir, { withFileTypes: true });
  const files: FileMeta[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const meta = readMeta(entry.name);
    if (meta) files.push(meta);
  }
  return files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export function deleteFile(fileId: string): boolean {
  const dir = getFileDir(fileId);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

export function splitAndSave(fileId: string, buffer: Buffer): number {
  const dir = getFileDir(fileId);
  fs.mkdirSync(dir, { recursive: true });
  let chunkIndex = 0;
  let offset = 0;
  while (offset < buffer.length) {
    const chunk = buffer.subarray(offset, offset + CHUNK_SIZE);
    fs.writeFileSync(getChunkPath(fileId, chunkIndex), chunk);
    chunkIndex++;
    offset += CHUNK_SIZE;
  }
  return chunkIndex;
}

export function buildChunkUrls(fileId: string, chunkCount: number, baseUrl: string): string[] {
  return Array.from({ length: chunkCount }, (_, i) =>
    `${baseUrl}/api/files/${fileId}/chunks/${i}`
  );
}

export function generateSnippet(meta: FileMeta, baseUrl: string): string {
  return `(function() {
  var fileId = "${meta.id}";
  var fileName = ${JSON.stringify(meta.name)};
  var mimeType = ${JSON.stringify(meta.mimeType)};
  var chunkCount = ${meta.chunkCount};
  var baseUrl = ${JSON.stringify(baseUrl)};

  function downloadFile() {
    var promises = [];
    for (var i = 0; i < chunkCount; i++) {
      promises.push(
        fetch(baseUrl + "/api/files/" + fileId + "/chunks/" + i)
          .then(function(r) { return r.arrayBuffer(); })
      );
    }
    Promise.all(promises).then(function(chunks) {
      var blob = new Blob(chunks, { type: mimeType });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }).catch(function(err) {
      console.error("FileSplit download failed:", err);
    });
  }

  // Auto-attach to any element with data-filesplit attribute matching this file ID
  document.querySelectorAll("[data-filesplit=\\"" + fileId + "\\"]").forEach(function(el) {
    el.addEventListener("click", downloadFile);
  });

  // Also expose globally
  window.FileSplit = window.FileSplit || {};
  window.FileSplit[fileId] = { download: downloadFile, fileName: fileName };
})();`;
}
