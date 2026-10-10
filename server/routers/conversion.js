import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { conversions } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Use process.cwd() (the project root) instead of __dirname here — after
// the production build bundles this file into dist/index.js, __dirname no
// longer points at server/routers, so a relative "../python_scripts" would
// resolve to the wrong folder on Render. process.cwd() always points at
// the project root both locally (npm run dev) and in production.
const SCRIPTS_DIR = path.join(process.cwd(), "server", "python_scripts");
const TEMP_DIR = path.join(process.cwd(), "server", "temp");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, {
    recursive: true
  });
}
function resolvePythonCmd() {
  // Windows usually exposes `python` / `py`, Linux/macOS expose `python3`.
  // Env override wins so Docker/Render can pin it (e.g. PYTHON_CMD=python3).
  if (process.env.PYTHON_CMD) return process.env.PYTHON_CMD;
  if (process.platform === "win32") return "python";
  return "python3";
}
const PYTHON_CMD = resolvePythonCmd();
function runPythonScript(scriptName, args) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    const proc = spawn(PYTHON_CMD, [scriptPath, ...args], {
      env: {
        ...process.env
      },
      timeout: 60000
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const killTimer = setTimeout(() => {
      if (!proc.killed && !settled) {
        proc.kill("SIGKILL");
        settled = true;
        resolve({
          stdout,
          stderr: stderr + "\nScript timed out",
          exitCode: -1
        });
      }
    }, 60000);
    proc.stdout.on("data", data => {
      stdout += data.toString();
    });
    proc.stderr.on("data", data => {
      stderr += data.toString();
    });
    proc.on("close", exitCode => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: exitCode ?? -1
      });
    });
    proc.on("error", err => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      reject(err);
    });
  });
}

// userId is now optional (null for anonymous/guest visitors). The file is
// still generated and returned either way — only the "save to history in
// the database" step is skipped when there's no logged-in user.
function safeFileName(title, ext) {
  const base = (title || "Document").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "Document";
  return `${base}.${ext}`;
}
async function saveGeneratedFile(userId, format, text, title, scriptName, outputExt, mimeType, smartOptions) {
  const inputId = crypto.randomUUID();
  const inputPath = path.join(TEMP_DIR, `${inputId}.txt`);
  fs.writeFileSync(inputPath, text, "utf-8");
  const outputFileName = safeFileName(title, outputExt);
  const outputId = crypto.randomUUID();
  const outputPath = path.join(TEMP_DIR, `${outputId}.${outputExt}`);
  try {
    const args = [inputPath, outputPath, title];
    if (smartOptions) args.push(JSON.stringify(smartOptions));
    const result = await runPythonScript(scriptName, args);
    if (result.exitCode !== 0) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Document generation failed: ${result.stderr}`
      });
    }
    const fileBuffer = fs.readFileSync(outputPath);
    // Anonymous conversions get filed under a shared "guest" folder in
    // storage since there's no userId to namespace them by.
    const storageKey = `conversions/${userId ?? "guest"}/${outputId}_${outputFileName}`;
    const {
      url
    } = await storagePut(storageKey, fileBuffer, mimeType);
    if (userId) {
      const db = await getDb();
      if (db) {
        await db.insert(conversions).values({
          userId,
          format,
          text: text.substring(0, 10000),
          fileName: outputFileName,
          fileUrl: url,
          fileKey: storageKey
        });
      }
    }
    try {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch {}
    return {
      url,
      key: storageKey,
      fileName: outputFileName
    };
  } catch (err) {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch {}
    throw err;
  }
}
const formatSchema = z.enum(["docx", "pdf", "pptx", "xlsx", "html", "md"]);
const smartOptionsSchema = z.object({
    template: z.string().optional().default("blank"),
    academic: z.enum(["none", "apa", "mla", "harvard"]).optional().default("none"),
    theme: z.enum(["modern", "classic", "minimal", "corporate"]).optional().default("modern"),
    font: z.string().optional().default(""),
    fontSize: z.number().optional().default(11),
    lineSpacing: z.number().optional().default(1.15),
    align: z.enum(["left", "justify", "center", "right"]).optional().default("left"),
    autoHeadings: z.boolean().optional().default(true),
    toc: z.boolean().optional().default(false),
    cover: z.boolean().optional().default(false),
    coverName: z.string().optional().default(""),
    coverDate: z.string().optional().default(""),
    coverStyle: z.string().optional().default("modern"),
    header: z.string().optional().default(""),
    footer: z.string().optional().default(""),
    pageNumbers: z.boolean().optional().default(true),
    differentFirstPage: z.boolean().optional().default(true),
    watermark: z.string().max(128).optional().default(""),
    signatureName: z.string().max(128).optional().default(""),
    signatureTitle: z.string().max(128).optional().default(""),
    brandAccent: z.string().max(16).optional().default(""),
    images: z.array(z.object({
      dataUrl: z.string().max(5000000),
      caption: z.string().max(300).optional().default(""),
      align: z.enum(["center", "left", "right"]).optional().default("center"),
      widthCm: z.number().min(2).max(16).optional().default(12),
    })).max(10).optional().default([]),
  }).optional().default({});
export const conversionRouter = router({
  // publicProcedure: anyone can convert, signed in or not. History is only
  // saved to the database when ctx.user is present (see saveGeneratedFile).
  convertText: publicProcedure.input(z.object({
    text: z.string().min(1, "Text is required"),
    format: formatSchema,
    title: z.string().min(1).max(200),
    options: smartOptionsSchema,
  })).mutation(async ({
    input,
    ctx
  }) => {
    const {
      text,
      format,
      title,
      options
    } = input;
    const userId = ctx.user?.id ?? null;
    if (format === "html" || format === "md") {
      const { buildHtmlDocument, buildMarkdownDocument } = await import("../../shared/exporters.js");
      const isHtml = format === "html";
      const content = isHtml
        ? buildHtmlDocument(text, { ...(options || {}), title })
        : buildMarkdownDocument(text, { ...(options || {}), title });
      const ext = isHtml ? "html" : "md";
      const mime = isHtml ? "text/html" : "text/markdown";
      const outputFileName = safeFileName(title, ext);
      const outputId = crypto.randomUUID();
      const storageKey = `conversions/${userId ?? "guest"}/${outputId}_${outputFileName}`;
      const { url } = await storagePut(storageKey, Buffer.from(content, "utf-8"), mime);
      if (userId) {
        const db = await getDb();
        if (db) {
          await db.insert(conversions).values({ userId, format, text: text.substring(0, 10000), fileName: outputFileName, fileUrl: url, fileKey: storageKey });
        }
      }
      return { url, fileName: outputFileName };
    }
    const config = {
      docx: {
        script: "generate_smart_docx2.py",
        ext: "docx",
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      },
      pdf: {
        script: "generate_smart_pdf.py",
        ext: "pdf",
        mime: "application/pdf"
      },
      pptx: {
        script: "generate_pptx.py",
        ext: "pptx",
        mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      },
      xlsx: {
        script: "generate_xlsx.py",
        ext: "xlsx",
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }
    };
    const cfg = config[format];
    const result = await saveGeneratedFile(userId, format, text, title, cfg.script, cfg.ext, cfg.mime, options || {});
    return {
      url: result.url,
      fileName: result.fileName
    };
  }),
  // publicProcedure: OCR extraction also works for anonymous visitors.
  ocrExtract: publicProcedure.input(z.object({
    imageData: z.string().min(1, "Image data is required"),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"])
  })).mutation(async ({
    input
  }) => {
    const {
      imageData,
      mimeType
    } = input;
    const imageId = crypto.randomUUID();
    const ext = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
    const imagePath = path.join(TEMP_DIR, `${imageId}.${ext}`);
    const base64Data = imageData.replace(/^data:image\/(jpeg|png|webp);base64,/, "");
    fs.writeFileSync(imagePath, Buffer.from(base64Data, "base64"));
    try {
      const result = await runPythonScript("ocr_extract.py", [imagePath]);
      try {
        fs.unlinkSync(imagePath);
      } catch {}
      if (result.exitCode !== 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `OCR extraction failed: ${result.stderr}`
        });
      }
      return {
        text: result.stdout
      };
    } catch (err) {
      try {
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      } catch {}
      throw err;
    }
  }),
  parseUpload: publicProcedure.input(z.object({
    fileData: z.string().min(1, "File data is required"),
    fileName: z.string().min(1).max(256),
  })).mutation(async ({ input }) => {
    const { fileData, fileName } = input;
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    const allowed = ["txt", "md", "markdown", "html", "htm", "csv", "docx", "pdf"];
    if (!allowed.includes(ext)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Supported: .txt .md .html .csv .docx .pdf (max 10MB)" });
    }
    const base64 = fileData.includes(",") ? fileData.split(",").slice(1).join(",") : fileData;
    const buf = Buffer.from(base64, "base64");
    if (buf.length > 10 * 1024 * 1024) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "File must be under 10MB." });
    }
    const tmpPath = path.join(TEMP_DIR, `${crypto.randomUUID()}.${ext}`);
    fs.writeFileSync(tmpPath, buf);
    try {
      // Small text files can be read directly; office/pdf go through parser.
      if (["txt", "md", "markdown", "csv", "html", "htm"].includes(ext) && buf.length < 500 * 1024) {
        const raw = buf.toString("utf-8");
        if (ext === "html" || ext === "htm") {
          const r = await runPythonScript("parse_upload.py", [tmpPath, ext]);
          if (r.exitCode !== 0) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Parse failed: ${r.stderr}` });
          try { fs.unlinkSync(tmpPath); } catch {}
          return { text: r.stdout, fileName };
        }
        try { fs.unlinkSync(tmpPath); } catch {}
        return { text: raw, fileName };
      }
      const result = await runPythonScript("parse_upload.py", [tmpPath, ext]);
      try { fs.unlinkSync(tmpPath); } catch {}
      if (result.exitCode !== 0) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Parse failed: ${result.stderr}` });
      }
      return { text: result.stdout, fileName };
    } catch (err) {
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch {}
      throw err;
    }
  }),
  batchConvert: publicProcedure.input(z.object({
    docs: z.array(z.object({
      text: z.string().min(1),
      title: z.string().min(1).max(200),
    })).min(1).max(10),
    format: formatSchema,
    options: smartOptionsSchema,
  })).mutation(async ({ input, ctx }) => {
    const { docs, format, options } = input;
    const userId = ctx.user?.id ?? null;
    const results = [];
    const { buildHtmlDocument, buildMarkdownDocument } = format === "html" || format === "md"
      ? await import("../../shared/exporters.js")
      : {};
    const cfgMap = {
      docx: { script: "generate_smart_docx2.py", ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      pdf: { script: "generate_smart_pdf.py", ext: "pdf", mime: "application/pdf" },
      pptx: { script: "generate_pptx.py", ext: "pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
      xlsx: { script: "generate_xlsx.py", ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    };
    for (const d of docs) {
      try {
        if (format === "html" || format === "md") {
          const isHtml = format === "html";
          const content = isHtml ? buildHtmlDocument(d.text, { ...(options || {}), title: d.title }) : buildMarkdownDocument(d.text, { ...(options || {}), title: d.title });
          const ext = isHtml ? "html" : "md";
          const mime = isHtml ? "text/html" : "text/markdown";
          const fn = safeFileName(d.title, ext);
          const key = `conversions/${userId ?? "guest"}/${crypto.randomUUID()}_${fn}`;
          const { url } = await storagePut(key, Buffer.from(content, "utf-8"), mime);
          if (userId) {
            const db = await getDb();
            if (db) await db.insert(conversions).values({ userId, format, text: d.text.substring(0, 10000), fileName: fn, fileUrl: url, fileKey: key });
          }
          results.push({ title: d.title, ok: true, url, fileName: fn });
        } else {
          const cfg = cfgMap[format];
          const r = await saveGeneratedFile(userId, format, d.text, d.title, cfg.script, cfg.ext, cfg.mime, options || {});
          results.push({ title: d.title, ok: true, url: r.url, fileName: r.fileName });
        }
      } catch (e) {
        results.push({ title: d.title, ok: false, error: e.message || "failed" });
      }
    }
    return { results };
  }),
  // Still requires login — there's nothing to show an anonymous visitor
  // since their past conversions were never saved.
  getHistory: protectedProcedure.query(async ({
    ctx
  }) => {
    const userId = ctx.user.id;
    const db = await getDb();
    if (!db) return [];
    const items = await db.select().from(conversions).where(eq(conversions.userId, userId)).orderBy(desc(conversions.createdAt)).limit(50);
    return items.map(item => ({
      id: item.id,
      format: item.format,
      fileName: item.fileName,
      text: item.text.substring(0, 200) + (item.text.length > 200 ? "..." : ""),
      fileUrl: item.fileUrl,
      createdAt: item.createdAt.getTime()
    }));
  }),
  deleteHistory: protectedProcedure.input(z.object({
    id: z.number()
  })).mutation(async ({
    input,
    ctx
  }) => {
    const userId = ctx.user.id;
    const db = await getDb();
    if (!db) throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available"
    });
    const item = await db.select().from(conversions).where(eq(conversions.id, input.id)).limit(1);
    if (!item.length || item[0].userId !== userId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Conversion not found"
      });
    }
    await db.delete(conversions).where(eq(conversions.id, input.id));
    return {
      success: true
    };
  })
});
