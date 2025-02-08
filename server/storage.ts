import { IStorage } from "./types";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  users, customers, appointments, reviews, messages,
  type User, type Customer, type Appointment, type Review, type Message,
  type InsertUser, type InsertCustomer, type InsertAppointment, type InsertReview, type InsertMessage
} from "@shared/schema";
import { Pool } from "@neondatabase/serverless";

const PostgresSessionStore = connectPg(session);

const sessionPool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 2, // Reduced max connections
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 5000,
  maxUses: 5000,
  allowExitOnIdle: true
});

// Enhanced session pool monitoring with reconnection
let sessionReconnectAttempts = 0;
const MAX_SESSION_RECONNECT_ATTEMPTS = 10;
const INITIAL_SESSION_RECONNECT_DELAY = 500;

sessionPool.on('error', async (err) => {
  console.error('[Session] Pool error:', err.message);

  if (err.message.includes('connection') || err.message.includes('terminated')) {
    if (sessionReconnectAttempts < MAX_SESSION_RECONNECT_ATTEMPTS) {
      const delay = Math.min(INITIAL_SESSION_RECONNECT_DELAY * Math.pow(1.5, sessionReconnectAttempts), 10000);
      console.log(`[Session] Attempting to reconnect (attempt ${sessionReconnectAttempts + 1}) in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        await sessionPool.connect();
        console.log("[Session] Reconnected successfully");
        sessionReconnectAttempts = 0;
      } catch (reconnectError) {
        console.error("[Session] Reconnection failed:", reconnectError.message);
        sessionReconnectAttempts++;
      }
    } else {
      console.error("[Session] Maximum reconnection attempts reached");
      process.exit(1);
    }
  }
});

sessionPool.on('connect', (client) => {
  console.log(`[Session] New connection established (total: ${sessionPool.totalCount})`);

  client.on('error', (err) => {
    console.error('[Session] Client error:', err.message);
  });

  client.on('end', () => {
    console.log('[Session] Client connection ended');
  });
});

sessionPool.on('acquire', () => {
  console.log(`[Session] Connection acquired (total/idle/waiting): ${sessionPool.totalCount}/${sessionPool.idleCount}/${sessionPool.waitingCount}`);
});

sessionPool.on('remove', () => {
  console.log('[Session] Connection removed from pool');
});

sessionPool.connect()
  .then(() => console.log('[Session] Session store connected successfully'))
  .catch(err => {
    console.error('[Session] Session store connection error:', err);
    process.exit(1);
  });

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool: sessionPool,
      createTableIfMissing: true,
      tableName: 'session',
      pruneSessionInterval: 60 * 15, // 15 minutes
      errorLog: (err) => {
        console.error('[Session Store] Error:', err);
        // Attempt reconnection on severe errors
        if (err.message.includes('connection') || err.message.includes('terminated')) {
          sessionPool.connect().catch(connectErr => {
            console.error('[Session Store] Reconnection failed:', connectErr);
          });
        }
      },
    });

    this.sessionStore.on('error', (err) => {
      console.error('[Session Store] Error:', err);
    });

    this.sessionStore.on('connect', () => {
      console.log('[Session Store] Connected successfully');
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      console.time(`[DB] getUser(${id})`);
      const [user] = await db.select().from(users).where(eq(users.id, id));
      console.timeEnd(`[DB] getUser(${id})`);
      return user;
    } catch (error) {
      console.error('[DB] Error in getUser:', error);
      throw new Error('Failed to fetch user');
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      console.time(`[DB] getUserByUsername(${username})`);
      const [user] = await db.select().from(users).where(eq(users.username, username));
      console.timeEnd(`[DB] getUserByUsername(${username})`);
      return user;
    } catch (error) {
      console.error('[DB] Error in getUserByUsername:', error);
      throw new Error('Failed to fetch user by username');
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      console.time('[DB] createUser');
      const [newUser] = await db.insert(users).values(user).returning();
      console.timeEnd('[DB] createUser');
      return newUser;
    } catch (error) {
      console.error('[DB] Error in createUser:', error);
      throw new Error('Failed to create user');
    }
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    try {
      console.time(`[DB] getCustomer(${id})`);
      const [customer] = await db.select().from(customers).where(eq(customers.id, id));
      console.timeEnd(`[DB] getCustomer(${id})`);
      return customer;
    } catch (error) {
      console.error('[DB] Error in getCustomer:', error);
      throw new Error('Failed to fetch customer');
    }
  }

  async listCustomers(): Promise<Customer[]> {
    try {
      console.time('[DB] listCustomers');
      const customerList = await db.select().from(customers);
      console.timeEnd('[DB] listCustomers');
      return customerList;
    } catch (error) {
      console.error('[DB] Error in listCustomers:', error);
      throw new Error('Failed to list customers');
    }
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    try {
      console.time('[DB] createCustomer');
      const [newCustomer] = await db.insert(customers).values(customer).returning();
      console.timeEnd('[DB] createCustomer');
      return newCustomer;
    } catch (error) {
      console.error('[DB] Error in createCustomer:', error);
      throw new Error('Failed to create customer');
    }
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    try {
      console.time(`[DB] getAppointment(${id})`);
      const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
      console.timeEnd(`[DB] getAppointment(${id})`);
      return appointment;
    } catch (error) {
      console.error('[DB] Error in getAppointment:', error);
      throw new Error('Failed to fetch appointment');
    }
  }

  async listAppointments(): Promise<Appointment[]> {
    try {
      console.time('[DB] listAppointments');
      const appointmentList = await db.select().from(appointments);
      console.timeEnd('[DB] listAppointments');
      return appointmentList;
    } catch (error) {
      console.error('[DB] Error in listAppointments:', error);
      throw new Error('Failed to list appointments');
    }
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    try {
      console.time('[DB] createAppointment');
      const [newAppointment] = await db.insert(appointments).values(appointment).returning();
      console.timeEnd('[DB] createAppointment');
      return newAppointment;
    } catch (error) {
      console.error('[DB] Error in createAppointment:', error);
      throw new Error('Failed to create appointment');
    }
  }

  async updateAppointment(id: number, appointment: Partial<Appointment>): Promise<Appointment> {
    try {
      console.time(`[DB] updateAppointment(${id})`);
      const [updated] = await db
        .update(appointments)
        .set(appointment)
        .where(eq(appointments.id, id))
        .returning();
      if (!updated) throw new Error("Appointment not found");
      console.timeEnd(`[DB] updateAppointment(${id})`);
      return updated;
    } catch (error) {
      console.error('[DB] Error in updateAppointment:', error);
      throw new Error('Failed to update appointment');
    }
  }

  async listReviews(): Promise<Review[]> {
    try {
      console.time('[DB] listReviews');
      const reviewList = await db.select().from(reviews);
      console.timeEnd('[DB] listReviews');
      return reviewList;
    } catch (error) {
      console.error('[DB] Error in listReviews:', error);
      throw new Error('Failed to list reviews');
    }
  }

  async createReview(review: InsertReview): Promise<Review> {
    try {
      console.time('[DB] createReview');
      const [newReview] = await db.insert(reviews).values(review).returning();
      console.timeEnd('[DB] createReview');
      return newReview;
    } catch (error) {
      console.error('[DB] Error in createReview:', error);
      throw new Error('Failed to create review');
    }
  }

  async updateReview(id: number, review: Partial<Review>): Promise<Review> {
    try {
      console.time(`[DB] updateReview(${id})`);
      const [updated] = await db
        .update(reviews)
        .set(review)
        .where(eq(reviews.id, id))
        .returning();
      if (!updated) throw new Error("Review not found");
      console.timeEnd(`[DB] updateReview(${id})`);
      return updated;
    } catch (error) {
      console.error('[DB] Error in updateReview:', error);
      throw new Error('Failed to update review');
    }
  }

  async listMessages(customerId: number): Promise<Message[]> {
    try {
      console.time(`[DB] listMessages(${customerId})`);
      const messageList = await db
        .select()
        .from(messages)
        .where(eq(messages.customerId, customerId))
        .orderBy(messages.timestamp);
      console.timeEnd(`[DB] listMessages(${customerId})`);
      return messageList;
    } catch (error) {
      console.error('[DB] Error in listMessages:', error);
      throw new Error('Failed to list messages');
    }
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    try {
      console.time('[DB] createMessage');
      const [newMessage] = await db.insert(messages).values(message).returning();
      console.timeEnd('[DB] createMessage');
      return newMessage;
    } catch (error) {
      console.error('[DB] Error in createMessage:', error);
      throw new Error('Failed to create message');
    }
  }
}

// Simplified monitoring interval
const sessionMonitoringInterval = setInterval(() => {
  if (sessionPool.totalCount > 0) {
    console.log(`[Session] Pool status - total: ${sessionPool.totalCount}, idle: ${sessionPool.idleCount}, waiting: ${sessionPool.waitingCount}`);
  }
}, 30000);

// Cleanup session pool on process exit
process.on('exit', async () => {
  clearInterval(sessionMonitoringInterval);
  try {
    await sessionPool.end();
    console.log('[Session] Pool closed successfully');
  } catch (err) {
    console.error('[Session] Error closing pool:', err);
  }
});

export const storage = new DatabaseStorage();