import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
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
function runPythonScript(scriptName, args) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    const proc = spawn("python3", [scriptPath, ...args], {
      env: {
        ...process.env
      },
      timeout: 60000
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", data => {
      stdout += data.toString();
    });
    proc.stderr.on("data", data => {
      stderr += data.toString();
    });
    proc.on("close", exitCode => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: exitCode ?? -1
      });
    });
    proc.on("error", reject);
    setTimeout(() => {
      if (!proc.killed) {
        proc.kill("SIGKILL");
        resolve({
          stdout,
          stderr: stderr + "\nScript timed out",
          exitCode: -1
        });
      }
    }, 60000);
  });
}
async function saveGeneratedFile(userId, format, text, title, scriptName, outputExt, mimeType) {
  const inputId = crypto.randomUUID();
  const inputPath = path.join(TEMP_DIR, `${inputId}.txt`);
  fs.writeFileSync(inputPath, text, "utf-8");
  const outputFileName = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.${outputExt}`;
  const outputId = crypto.randomUUID();
  const outputPath = path.join(TEMP_DIR, `${outputId}.${outputExt}`);
  try {
    const result = await runPythonScript(scriptName, [inputPath, outputPath, title]);
    if (result.exitCode !== 0) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Document generation failed: ${result.stderr}`
      });
    }
    const fileBuffer = fs.readFileSync(outputPath);
    const storageKey = `conversions/${userId}/${outputId}_${outputFileName}`;
    const {
      url
    } = await storagePut(storageKey, fileBuffer, mimeType);
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
    try {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch { }
    return {
      url,
      key: storageKey
    };
  } catch (err) {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch { }
    throw err;
  }
}
const formatSchema = z.enum(["docx", "pdf", "pptx", "xlsx"]);
export const conversionRouter = router({
  convertText: protectedProcedure.input(z.object({
    text: z.string().min(1, "Text is required"),
    format: formatSchema,
    title: z.string().min(1).max(200)
  })).mutation(async ({
    input,
    ctx
  }) => {
    const {
      text,
      format,
      title
    } = input;
    const userId = ctx.user.id;
    const config = {
      docx: {
        script: "generate_docx.py",
        ext: "docx",
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      },
      pdf: {
        script: "generate_pdf.py",
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
    const result = await saveGeneratedFile(userId, format, text, title, cfg.script, cfg.ext, cfg.mime);
    return {
      url: result.url,
      fileName: title.replace(/[^a-zA-Z0-9]/g, "_") + "." + cfg.ext
    };
  }),
  ocrExtract: protectedProcedure.input(z.object({
    imageData: z.string().min(1, "Image data is required"),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"])
  })).mutation(async ({
    input,
    ctx
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
      } catch { }
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
      } catch { }
      throw err;
    }
  }),
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