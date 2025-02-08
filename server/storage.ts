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

// Create a new pool specifically for sessions with optimized settings
const sessionPool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 3, // Limit concurrent connections for session store
  idleTimeoutMillis: 1000 * 60 * 5, // 5 minutes
  connectionTimeoutMillis: 3000, // 3 seconds
  maxUses: 2500, // Limit reuse of connections
  maxLifetimeSeconds: 3600, // Maximum lifetime of 1 hour
  allowExitOnIdle: true
});

// Test session pool connection
sessionPool.connect()
  .then(() => console.log('Session store connected successfully'))
  .catch(err => {
    console.error('Session store connection error:', err);
    process.exit(1);
  });

// Add error handling for session pool with exponential backoff
let sessionReconnectAttempts = 0;
const MAX_SESSION_RECONNECT_ATTEMPTS = 5;
const INITIAL_SESSION_RECONNECT_DELAY = 1000;

sessionPool.on('error', (err) => {
  console.error('Session pool error:', err);
  if (err.message.includes('connection') || err.message.includes('terminated')) {
    if (sessionReconnectAttempts < MAX_SESSION_RECONNECT_ATTEMPTS) {
      const delay = INITIAL_SESSION_RECONNECT_DELAY * Math.pow(2, sessionReconnectAttempts);
      console.log(`Attempting to reconnect session pool (attempt ${sessionReconnectAttempts + 1})...`);
      setTimeout(() => {
        sessionPool.connect()
          .then(() => {
            console.log('Session pool reconnected successfully');
            sessionReconnectAttempts = 0;
          })
          .catch(err => {
            console.error('Session pool reconnection failed:', err);
            sessionReconnectAttempts++;
            if (sessionReconnectAttempts >= MAX_SESSION_RECONNECT_ATTEMPTS) {
              console.error('Maximum session reconnection attempts reached');
              process.exit(1);
            }
          });
      }, delay);
    }
  }
});

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool: sessionPool,
      createTableIfMissing: true,
      tableName: 'session',
      pruneSessionInterval: 60 * 15, // Cleanup every 15 minutes
      // Add session store error handling
      errorLog: console.error,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error in getUser:', error);
      throw new Error('Failed to fetch user');
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error('Error in getUserByUsername:', error);
      throw new Error('Failed to fetch user by username');
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const [newUser] = await db.insert(users).values(user).returning();
      return newUser;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw new Error('Failed to create user');
    }
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    try {
      const [customer] = await db.select().from(customers).where(eq(customers.id, id));
      return customer;
    } catch (error) {
      console.error('Error in getCustomer:', error);
      throw new Error('Failed to fetch customer');
    }
  }

  async listCustomers(): Promise<Customer[]> {
    try {
      return await db.select().from(customers);
    } catch (error) {
      console.error('Error in listCustomers:', error);
      throw new Error('Failed to list customers');
    }
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    try {
      const [newCustomer] = await db.insert(customers).values(customer).returning();
      return newCustomer;
    } catch (error) {
      console.error('Error in createCustomer:', error);
      throw new Error('Failed to create customer');
    }
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    try {
      const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
      return appointment;
    } catch (error) {
      console.error('Error in getAppointment:', error);
      throw new Error('Failed to fetch appointment');
    }
  }

  async listAppointments(): Promise<Appointment[]> {
    try {
      return await db.select().from(appointments);
    } catch (error) {
      console.error('Error in listAppointments:', error);
      throw new Error('Failed to list appointments');
    }
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    try {
      const [newAppointment] = await db.insert(appointments).values(appointment).returning();
      return newAppointment;
    } catch (error) {
      console.error('Error in createAppointment:', error);
      throw new Error('Failed to create appointment');
    }
  }

  async updateAppointment(id: number, appointment: Partial<Appointment>): Promise<Appointment> {
    try {
      const [updated] = await db
        .update(appointments)
        .set(appointment)
        .where(eq(appointments.id, id))
        .returning();
      if (!updated) throw new Error("Appointment not found");
      return updated;
    } catch (error) {
      console.error('Error in updateAppointment:', error);
      throw new Error('Failed to update appointment');
    }
  }

  async getReview(id: number): Promise<Review | undefined> {
    try {
      const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
      return review;
    } catch (error) {
      console.error('Error in getReview:', error);
      throw new Error('Failed to fetch review');
    }
  }

  async listReviews(): Promise<Review[]> {
    try {
      return await db.select().from(reviews);
    } catch (error) {
      console.error('Error in listReviews:', error);
      throw new Error('Failed to list reviews');
    }
  }

  async createReview(review: InsertReview): Promise<Review> {
    try {
      const [newReview] = await db.insert(reviews).values(review).returning();
      return newReview;
    } catch (error) {
      console.error('Error in createReview:', error);
      throw new Error('Failed to create review');
    }
  }

  async updateReview(id: number, review: Partial<Review>): Promise<Review> {
    try {
      const [updated] = await db
        .update(reviews)
        .set(review)
        .where(eq(reviews.id, id))
        .returning();
      if (!updated) throw new Error("Review not found");
      return updated;
    } catch (error) {
      console.error('Error in updateReview:', error);
      throw new Error('Failed to update review');
    }
  }

  async listMessages(customerId: number): Promise<Message[]> {
    try {
      return await db
        .select()
        .from(messages)
        .where(eq(messages.customerId, customerId))
        .orderBy(messages.timestamp);
    } catch (error) {
      console.error('Error in listMessages:', error);
      throw new Error('Failed to list messages');
    }
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    try {
      const [newMessage] = await db.insert(messages).values(message).returning();
      return newMessage;
    } catch (error) {
      console.error('Error in createMessage:', error);
      throw new Error('Failed to create message');
    }
  }
}

// Monitor session pool health
setInterval(() => {
  const poolStatus = sessionPool.totalCount + "/" + sessionPool.idleCount + "/" + sessionPool.waitingCount;
  console.log(`Session pool status (total/idle/waiting): ${poolStatus}`);
}, 30000);

// Cleanup session pool on process exit
process.on('exit', () => {
  sessionPool.end()
    .catch(err => console.error('Error closing session pool:', err));
});

export const storage = new DatabaseStorage();