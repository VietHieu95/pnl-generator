import { type User, type InsertUser, type PnlData, pnlDataSchema } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // PNL Data methods
  getPnlData(): Promise<PnlData>;
  updatePnlData(data: Partial<PnlData>): Promise<PnlData>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private pnlData: PnlData;

  constructor() {
    this.users = new Map();
    // Initialize with default values from schema
    this.pnlData = pnlDataSchema.parse({});
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getPnlData(): Promise<PnlData> {
    return this.pnlData;
  }

  async updatePnlData(data: Partial<PnlData>): Promise<PnlData> {
    // Merge existing data with new data and validate
    this.pnlData = pnlDataSchema.parse({
      ...this.pnlData,
      ...data,
    });
    return this.pnlData;
  }
}

export const storage = new MemStorage();
