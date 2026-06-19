import { Router, type IRouter } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import {
  ensureUploadsDir,
  saveMeta,
  readMeta,
  listAllFiles,
  deleteFile,
  splitAndSave,
  buildChunkUrls,
  generateSnippet,
  getChunkPath,
  CHUNK_SIZE,
  FileMeta,
} from "../../lib/fileStore";
import {
  ListFilesResponse,
  GetFileResponse,
  GetFileSnippetResponse,
  GetFileParams,
  DeleteFileParams,
  GetFileSnippetParams,
  DownloadChunkParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

function getBaseUrl(req: { protocol: string; get: (h: string) => string | undefined }): string {
  const host = req.get("host") ?? "localhost";
  const forwardedProto = req.get("x-forwarded-proto");
  const protocol = forwardedProto ?? req.protocol ?? "http";
  return `${protocol}://${host}`;
}

router.post("/files/upload", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  ensureUploadsDir();
  const fileId = uuidv4();
  const buffer = req.file.buffer;
  const chunkCount = splitAndSave(fileId, buffer);
  const baseUrl = getBaseUrl(req);
  const chunkUrls = buildChunkUrls(fileId, chunkCount, baseUrl);

  const meta: FileMeta = {
    id: fileId,
    name: req.file.originalname,
    size: buffer.length,
    mimeType: req.file.mimetype || "application/octet-stream",
    chunkCount,
    chunkSize: CHUNK_SIZE,
    uploadedAt: new Date().toISOString(),
    chunkUrls,
  };

  saveMeta(meta);
  req.log.info({ fileId, name: meta.name, chunkCount }, "File uploaded and split");
  res.status(201).json(meta);
});

router.get("/files", async (req, res): Promise<void> => {
  ensureUploadsDir();
  const files = listAllFiles();
  res.json(ListFilesResponse.parse(files));
});

router.get("/files/:fileId", async (req, res): Promise<void> => {
  const params = GetFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const meta = readMeta(params.data.fileId);
  if (!meta) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.json(GetFileResponse.parse(meta));
});

router.delete("/files/:fileId", async (req, res): Promise<void> => {
  const params = DeleteFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const deleted = deleteFile(params.data.fileId);
  if (!deleted) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  req.log.info({ fileId: params.data.fileId }, "File deleted");
  res.sendStatus(204);
});

router.get("/files/:fileId/snippet", async (req, res): Promise<void> => {
  const params = GetFileSnippetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const meta = readMeta(params.data.fileId);
  if (!meta) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const baseUrl = getBaseUrl(req);
  const snippet = generateSnippet(meta, baseUrl);

  res.json(GetFileSnippetResponse.parse({ fileId: meta.id, snippet }));
});

router.get("/files/:fileId/chunks/:chunkIndex", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;
  const rawIdx = Array.isArray(req.params.chunkIndex) ? req.params.chunkIndex[0] : req.params.chunkIndex;
  const chunkIndex = parseInt(rawIdx, 10);

  if (isNaN(chunkIndex) || chunkIndex < 0) {
    res.status(400).json({ error: "Invalid chunk index" });
    return;
  }

  const meta = readMeta(raw);
  if (!meta) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  if (chunkIndex >= meta.chunkCount) {
    res.status(404).json({ error: "Chunk not found" });
    return;
  }

  const chunkPath = getChunkPath(raw, chunkIndex);
  if (!fs.existsSync(chunkPath)) {
    res.status(404).json({ error: "Chunk file missing" });
    return;
  }

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="chunk_${chunkIndex}.bin"`);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.sendFile(chunkPath);
});

export default router;
