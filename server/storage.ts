import { IStorage } from "./types";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  users, customers, appointments, reviews, messages,
  customerAddresses, customerContacts, serviceHistory, paymentMethods, customerDocuments,
  type User, type Customer, type Appointment, type Review, type Message,
  type CustomerAddress, type CustomerContact, type ServiceHistory, type PaymentMethod, type CustomerDocument,
  type InsertUser, type InsertCustomer, type InsertAppointment, type InsertReview, type InsertMessage,
  type InsertCustomerAddress, type InsertCustomerContact, type InsertServiceHistory, type InsertPaymentMethod, type InsertCustomerDocument
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

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer> {
    try {
      console.time(`[DB] updateCustomer(${id})`);
      const [updated] = await db
        .update(customers)
        .set(customer)
        .where(eq(customers.id, id))
        .returning();
      if (!updated) throw new Error("Customer not found");
      console.timeEnd(`[DB] updateCustomer(${id})`);
      return updated;
    } catch (error) {
      console.error('[DB] Error in updateCustomer:', error);
      throw new Error('Failed to update customer');
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
      console.log('[DB] Updating appointment with data:', appointment);

      // Clean and validate the data before update
      const updateData = {
        ...appointment,
        // Ensure date is properly handled if provided
        ...(appointment.date && {
          date: new Date(appointment.date)
        }),
        // Preserve location structure if provided
        ...(appointment.location && {
          location: appointment.location
        })
      };

      const [updated] = await db
        .update(appointments)
        .set(updateData)
        .where(eq(appointments.id, id))
        .returning();

      if (!updated) {
        console.error(`[DB] Appointment ${id} not found`);
        throw new Error("Appointment not found");
      }

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


  // Customer Address methods
  async getCustomerAddresses(customerId: number): Promise<CustomerAddress[]> {
    try {
      console.time(`[DB] getCustomerAddresses(${customerId})`);
      const addresses = await db
        .select()
        .from(customerAddresses)
        .where(eq(customerAddresses.customerId, customerId));
      console.timeEnd(`[DB] getCustomerAddresses(${customerId})`);
      return addresses;
    } catch (error) {
      console.error('[DB] Error in getCustomerAddresses:', error);
      throw new Error('Failed to fetch customer addresses');
    }
  }

  async createCustomerAddress(address: InsertCustomerAddress): Promise<CustomerAddress> {
    try {
      console.time('[DB] createCustomerAddress');
      const [newAddress] = await db.insert(customerAddresses).values(address).returning();
      console.timeEnd('[DB] createCustomerAddress');
      return newAddress;
    } catch (error) {
      console.error('[DB] Error in createCustomerAddress:', error);
      throw new Error('Failed to create customer address');
    }
  }

  async updateCustomerAddress(id: number, address: Partial<CustomerAddress>): Promise<CustomerAddress> {
    try {
      console.time(`[DB] updateCustomerAddress(${id})`);
      const [updated] = await db
        .update(customerAddresses)
        .set(address)
        .where(eq(customerAddresses.id, id))
        .returning();
      if (!updated) throw new Error("Address not found");
      console.timeEnd(`[DB] updateCustomerAddress(${id})`);
      return updated;
    } catch (error) {
      console.error('[DB] Error in updateCustomerAddress:', error);
      throw new Error('Failed to update customer address');
    }
  }

  async deleteCustomerAddress(id: number): Promise<void> {
    try {
      console.time(`[DB] deleteCustomerAddress(${id})`);
      await db.delete(customerAddresses).where(eq(customerAddresses.id, id));
      console.timeEnd(`[DB] deleteCustomerAddress(${id})`);
    } catch (error) {
      console.error('[DB] Error in deleteCustomerAddress:', error);
      throw new Error('Failed to delete customer address');
    }
  }

  // Customer Contact methods
  async getCustomerContacts(customerId: number): Promise<CustomerContact[]> {
    try {
      console.time(`[DB] getCustomerContacts(${customerId})`);
      const contacts = await db
        .select()
        .from(customerContacts)
        .where(eq(customerContacts.customerId, customerId));
      console.timeEnd(`[DB] getCustomerContacts(${customerId})`);
      return contacts;
    } catch (error) {
      console.error('[DB] Error in getCustomerContacts:', error);
      throw new Error('Failed to fetch customer contacts');
    }
  }

  async createCustomerContact(contact: InsertCustomerContact): Promise<CustomerContact> {
    try {
      console.time('[DB] createCustomerContact');
      const [newContact] = await db.insert(customerContacts).values(contact).returning();
      console.timeEnd('[DB] createCustomerContact');
      return newContact;
    } catch (error) {
      console.error('[DB] Error in createCustomerContact:', error);
      throw new Error('Failed to create customer contact');
    }
  }

  async updateCustomerContact(id: number, contact: Partial<CustomerContact>): Promise<CustomerContact> {
    try {
      console.time(`[DB] updateCustomerContact(${id})`);
      const [updated] = await db
        .update(customerContacts)
        .set(contact)
        .where(eq(customerContacts.id, id))
        .returning();
      if (!updated) throw new Error("Contact not found");
      console.timeEnd(`[DB] updateCustomerContact(${id})`);
      return updated;
    } catch (error) {
      console.error('[DB] Error in updateCustomerContact:', error);
      throw new Error('Failed to update customer contact');
    }
  }

  async deleteCustomerContact(id: number): Promise<void> {
    try {
      console.time(`[DB] deleteCustomerContact(${id})`);
      await db.delete(customerContacts).where(eq(customerContacts.id, id));
      console.timeEnd(`[DB] deleteCustomerContact(${id})`);
    } catch (error) {
      console.error('[DB] Error in deleteCustomerContact:', error);
      throw new Error('Failed to delete customer contact');
    }
  }

  // Service History methods
  async getServiceHistory(customerId: number): Promise<ServiceHistory[]> {
    try {
      console.time(`[DB] getServiceHistory(${customerId})`);
      const history = await db
        .select()
        .from(serviceHistory)
        .where(eq(serviceHistory.customerId, customerId));
      console.timeEnd(`[DB] getServiceHistory(${customerId})`);
      return history;
    } catch (error) {
      console.error('[DB] Error in getServiceHistory:', error);
      throw new Error('Failed to fetch service history');
    }
  }

  async createServiceHistory(history: InsertServiceHistory): Promise<ServiceHistory> {
    try {
      console.time('[DB] createServiceHistory');
      const [newHistory] = await db.insert(serviceHistory).values(history).returning();
      console.timeEnd('[DB] createServiceHistory');
      return newHistory;
    } catch (error) {
      console.error('[DB] Error in createServiceHistory:', error);
      throw new Error('Failed to create service history');
    }
  }

  async updateServiceHistory(id: number, history: Partial<ServiceHistory>): Promise<ServiceHistory> {
    try {
      console.time(`[DB] updateServiceHistory(${id})`);
      const [updated] = await db
        .update(serviceHistory)
        .set(history)
        .where(eq(serviceHistory.id, id))
        .returning();
      if (!updated) throw new Error("Service history not found");
      console.timeEnd(`[DB] updateServiceHistory(${id})`);
      return updated;
    } catch (error) {
      console.error('[DB] Error in updateServiceHistory:', error);
      throw new Error('Failed to update service history');
    }
  }

  // Payment Method methods
  async getPaymentMethods(customerId: number): Promise<PaymentMethod[]> {
    try {
      console.time(`[DB] getPaymentMethods(${customerId})`);
      const methods = await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.customerId, customerId));
      console.timeEnd(`[DB] getPaymentMethods(${customerId})`);
      return methods;
    } catch (error) {
      console.error('[DB] Error in getPaymentMethods:', error);
      throw new Error('Failed to fetch payment methods');
    }
  }

  async createPaymentMethod(payment: InsertPaymentMethod): Promise<PaymentMethod> {
    try {
      console.time('[DB] createPaymentMethod');
      const [newMethod] = await db.insert(paymentMethods).values(payment).returning();
      console.timeEnd('[DB] createPaymentMethod');
      return newMethod;
    } catch (error) {
      console.error('[DB] Error in createPaymentMethod:', error);
      throw new Error('Failed to create payment method');
    }
  }

  async updatePaymentMethod(id: number, payment: Partial<PaymentMethod>): Promise<PaymentMethod> {
    try {
      console.time(`[DB] updatePaymentMethod(${id})`);
      const [updated] = await db
        .update(paymentMethods)
        .set(payment)
        .where(eq(paymentMethods.id, id))
        .returning();
      if (!updated) throw new Error("Payment method not found");
      console.timeEnd(`[DB] updatePaymentMethod(${id})`);
      return updated;
    } catch (error) {
      console.error('[DB] Error in updatePaymentMethod:', error);
      throw new Error('Failed to update payment method');
    }
  }

  async deletePaymentMethod(id: number): Promise<void> {
    try {
      console.time(`[DB] deletePaymentMethod(${id})`);
      await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
      console.timeEnd(`[DB] deletePaymentMethod(${id})`);
    } catch (error) {
      console.error('[DB] Error in deletePaymentMethod:', error);
      throw new Error('Failed to delete payment method');
    }
  }

  // Customer Document methods
  async getCustomerDocuments(customerId: number): Promise<CustomerDocument[]> {
    try {
      console.time(`[DB] getCustomerDocuments(${customerId})`);
      const documents = await db
        .select()
        .from(customerDocuments)
        .where(eq(customerDocuments.customerId, customerId));
      console.timeEnd(`[DB] getCustomerDocuments(${customerId})`);
      return documents;
    } catch (error) {
      console.error('[DB] Error in getCustomerDocuments:', error);
      throw new Error('Failed to fetch customer documents');
    }
  }

  async createCustomerDocument(document: InsertCustomerDocument): Promise<CustomerDocument> {
    try {
      console.time('[DB] createCustomerDocument');
      const [newDocument] = await db.insert(customerDocuments).values(document).returning();
      console.timeEnd('[DB] createCustomerDocument');
      return newDocument;
    } catch (error) {
      console.error('[DB] Error in createCustomerDocument:', error);
      throw new Error('Failed to create customer document');
    }
  }

  async deleteCustomerDocument(id: number): Promise<void> {
    try {
      console.time(`[DB] deleteCustomerDocument(${id})`);
      await db.delete(customerDocuments).where(eq(customerDocuments.id, id));
      console.timeEnd(`[DB] deleteCustomerDocument(${id})`);
    } catch (error) {
      console.error('[DB] Error in deleteCustomerDocument:', error);
      throw new Error('Failed to delete customer document');
    }
  }
}

export const storage = new DatabaseStorage();

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