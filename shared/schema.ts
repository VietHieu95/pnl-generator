import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const pnlDataSchema = z.object({
  id: z.string().optional(),
  symbol: z.string().default("BTCUSDT"),
  type: z.enum(["Perp", "Quarterly"]).default("Perp"),
  marginMode: z.enum(["Cross", "Isolated"]).default("Cross"),
  leverage: z.coerce.number().min(1).max(125).default(20),
  positionType: z.enum(["Long", "Short"]).default("Long"),
  signalBars: z.coerce.number().min(0).max(4).default(4),
  unrealizedPnl: z.coerce.number().default(-1381.63),
  roi: z.coerce.number().default(-41.03),
  size: z.coerce.number().default(0.768),
  sizeUnit: z.string().default("BTC"),
  margin: z.coerce.number().default(3367.29),
  marginRatio: z.coerce.number().default(5.17),
  entryPrice: z.coerce.number().default(89493.20),
  markPrice: z.coerce.number().default(87689.94),
  liqPrice: z.coerce.number().default(80812.02),
  walletBalance: z.coerce.number().default(10000),
  tpPrice: z.string().default("--"),
  slPrice: z.string().default("--"),
});

export type PnlData = z.infer<typeof pnlDataSchema>;
