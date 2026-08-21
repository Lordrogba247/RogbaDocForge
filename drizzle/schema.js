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
    length: 10
  }).notNull(),
  text: text("text").notNull(),
  fileName: varchar("fileName", {
    length: 256
  }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});