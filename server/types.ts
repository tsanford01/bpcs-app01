import type { Store } from "express-session";
import type {
  User, Customer, Appointment, Review, Message,
  InsertUser, InsertCustomer, InsertAppointment, InsertReview, InsertMessage
} from "@shared/schema";

export interface IStorage {
  sessionStore: Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Customer methods
  getCustomer(id: number): Promise<Customer | undefined>;
  listCustomers(): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  
  // Appointment methods
  getAppointment(id: number): Promise<Appointment | undefined>;
  listAppointments(): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<Appointment>): Promise<Appointment>;
  
  // Review methods
  getReview(id: number): Promise<Review | undefined>;
  listReviews(): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, review: Partial<Review>): Promise<Review>;
  
  // Message methods
  listMessages(customerId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}
