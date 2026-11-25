import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers.js";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import * as db from "../db";

async function ensureDatabaseTables() {
  const database = await db.getDb();
  if (!database) {
    console.warn("[Database] Skipping table creation — database not available");
    return;
  }
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`openId\` varchar(64) NOT NULL,
        \`name\` text,
        \`email\` varchar(320),
        \`loginMethod\` varchar(64),
        \`role\` enum('user','admin') DEFAULT 'user' NOT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`lastSignedIn\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`users_openId_unique\` (\`openId\`)
      )
    `);
    console.log("[Database] users table ensured");
  } catch (error) {
    console.error("[Database] Failed to create users table:", error.message);
  }
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS \`conversions\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`userId\` int NOT NULL,
        \`format\` varchar(16) NOT NULL,
        \`text\` text NOT NULL,
        \`fileName\` varchar(256) NOT NULL,
        \`fileUrl\` text NOT NULL,
        \`fileKey\` text NOT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )
    `);
    console.log("[Database] conversions table ensured");
  } catch (error) {
    console.error("[Database] Failed to create conversions table:", error.message);
  }
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS \`brandKits\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`userId\` int NOT NULL,
        \`logoUrl\` text,
        \`primaryColor\` varchar(16) DEFAULT '#6d28d9',
        \`headingColor\` varchar(16) DEFAULT '#1e1b4b',
        \`font\` varchar(64) DEFAULT 'Calibri',
        \`watermark\` varchar(128) DEFAULT '',
        \`signatureName\` varchar(128) DEFAULT '',
        \`signatureTitle\` varchar(128) DEFAULT '',
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`brandKits_userId_unique\` (\`userId\`)
      )
    `);
    console.log("[Database] brandKits table ensured");
  } catch (error) {
    console.error("[Database] Failed to create brandKits table:", error.message);
  }
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS \`customTemplates\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`userId\` int NOT NULL,
        \`name\` varchar(128) NOT NULL,
        \`optionsJson\` text NOT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )
    `);
    console.log("[Database] customTemplates table ensured");
  } catch (error) {
    console.error("[Database] Failed to create customTemplates table:", error.message);
  }
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS \`docVersions\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`userId\` int NOT NULL,
        \`docKey\` varchar(128) NOT NULL DEFAULT 'main',
        \`text\` text NOT NULL,
        \`label\` varchar(128) DEFAULT '',
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )
    `);
    console.log("[Database] docVersions table ensured");
  } catch (error) {
    console.error("[Database] Failed to create docVersions table:", error.message);
  }
}
function isPortAvailable(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3000) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  await ensureDatabaseTables();

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({
    limit: "50mb"
  }));
  app.use(express.urlencoded({
    limit: "50mb",
    extended: true
  }));
  // tRPC API
  app.use("/api/trpc", createExpressMiddleware({
    router: appRouter,
    createContext
  }));
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);