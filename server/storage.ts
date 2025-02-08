import { IStorage } from "./storage";
import {
  users, customers, appointments, reviews, messages,
  type User, type Customer, type Appointment, type Review, type Message,
  type InsertUser, type InsertCustomer, type InsertAppointment, type InsertReview, type InsertMessage
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private customers: Map<number, Customer>;
  private appointments: Map<number, Appointment>;
  private reviews: Map<number, Review>;
  private messages: Map<number, Message>;
  sessionStore: session.SessionStore;
  private currentIds: { [key: string]: number };

  constructor() {
    this.users = new Map();
    this.customers = new Map();
    this.appointments = new Map();
    this.reviews = new Map();
    this.messages = new Map();
    this.currentIds = {
      users: 1,
      customers: 1,
      appointments: 1,
      reviews: 1,
      messages: 1
    };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const newUser = { ...user, id, role: "admin" };
    this.users.set(id, newUser);
    return newUser;
  }

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async listCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.currentIds.customers++;
    const newCustomer = { ...customer, id };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  // Appointment methods
  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async listAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values());
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const id = this.currentIds.appointments++;
    const newAppointment = { ...appointment, id };
    this.appointments.set(id, newAppointment);
    return newAppointment;
  }

  async updateAppointment(id: number, appointment: Partial<Appointment>): Promise<Appointment> {
    const existing = await this.getAppointment(id);
    if (!existing) throw new Error("Appointment not found");
    const updated = { ...existing, ...appointment };
    this.appointments.set(id, updated);
    return updated;
  }

  // Review methods
  async listReviews(): Promise<Review[]> {
    return Array.from(this.reviews.values());
  }

  async createReview(review: InsertReview): Promise<Review> {
    const id = this.currentIds.reviews++;
    const newReview = { ...review, id };
    this.reviews.set(id, newReview);
    return newReview;
  }

  async updateReview(id: number, review: Partial<Review>): Promise<Review> {
    const existing = await this.getReview(id);
    if (!existing) throw new Error("Review not found");
    const updated = { ...existing, ...review };
    this.reviews.set(id, updated);
    return updated;
  }

  // Message methods
  async listMessages(customerId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.customerId === customerId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.currentIds.messages++;
    const newMessage = { ...message, id };
    this.messages.set(id, newMessage);
    return newMessage;
  }
}

export const storage = new MemStorage();
