import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";

export const apiKeys = sqliteTable("api_keys", {
  key: text("key").primaryKey(),
  prefix: text("prefix").notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
  lastUsedAt: integer("last_used_at").notNull(),
});

export const buckets = sqliteTable("buckets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  owner: text("owner").notNull(),
  description: text("description"),
  forField: text("for_field"),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at"),
});

export const files = sqliteTable("files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bucketId: text("bucket_id")
    .notNull()
    .references(() => buckets.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  size: integer("size").notNull(),
  mimeType: text("mime_type").notNull(),
  shortId: text("short_id"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  unique().on(table.bucketId, table.path),
]);
