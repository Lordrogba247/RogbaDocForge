import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", {
    length: 64
  }).notNull().unique(),
  name: text("name"),
  email: varchar("email", {
    length: 320
  }),
  loginMethod: varchar("loginMethod", {
    length: 64
  }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
export const conversions = mysqlTable("conversions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  format: varchar("format", {
    length: 16
  }).notNull(),
  text: text("text").notNull(),
  fileName: varchar("fileName", {
    length: 256
  }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
// Brand kit per user (19): logo url, colors, fonts.
export const brandKits = mysqlTable("brandKits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  logoUrl: text("logoUrl"),
  primaryColor: varchar("primaryColor", { length: 16 }).default("#6d28d9"),
  headingColor: varchar("headingColor", { length: 16 }).default("#1e1b4b"),
  font: varchar("font", { length: 64 }).default("Calibri"),
  watermark: varchar("watermark", { length: 128 }).default(""),
  signatureName: varchar("signatureName", { length: 128 }).default(""),
  signatureTitle: varchar("signatureTitle", { length: 128 }).default(""),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
// Saved custom templates (24): user-owned format presets.
export const customTemplates = mysqlTable("customTemplates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  optionsJson: text("optionsJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
// Document versions (25): snapshots of editor text per user doc slot.
export const docVersions = mysqlTable("docVersions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  docKey: varchar("docKey", { length: 128 }).notNull().default("main"),
  text: text("text").notNull(),
  label: varchar("label", { length: 128 }).default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
