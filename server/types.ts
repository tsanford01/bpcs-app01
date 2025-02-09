import type { Store } from "express-session";
import type {
  User, Customer, Appointment, Review, Message,
  InsertUser, InsertCustomer, InsertAppointment, InsertReview, InsertMessage,
  CustomerAddress, CustomerContact, ServiceHistory, PaymentMethod, CustomerDocument,
  InsertCustomerAddress, InsertCustomerContact, InsertServiceHistory, InsertPaymentMethod, InsertCustomerDocument
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
  updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer>;

  // Customer Address methods
  getCustomerAddresses(customerId: number): Promise<CustomerAddress[]>;
  createCustomerAddress(address: InsertCustomerAddress): Promise<CustomerAddress>;
  updateCustomerAddress(id: number, address: Partial<CustomerAddress>): Promise<CustomerAddress>;
  deleteCustomerAddress(id: number): Promise<void>;

  // Customer Contact methods
  getCustomerContacts(customerId: number): Promise<CustomerContact[]>;
  createCustomerContact(contact: InsertCustomerContact): Promise<CustomerContact>;
  updateCustomerContact(id: number, contact: Partial<CustomerContact>): Promise<CustomerContact>;
  deleteCustomerContact(id: number): Promise<void>;

  // Service History methods
  getServiceHistory(customerId: number): Promise<ServiceHistory[]>;
  createServiceHistory(history: InsertServiceHistory): Promise<ServiceHistory>;
  updateServiceHistory(id: number, history: Partial<ServiceHistory>): Promise<ServiceHistory>;

  // Payment Method methods
  getPaymentMethods(customerId: number): Promise<PaymentMethod[]>;
  createPaymentMethod(payment: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: number, payment: Partial<PaymentMethod>): Promise<PaymentMethod>;
  deletePaymentMethod(id: number): Promise<void>;

  // Customer Document methods
  getCustomerDocuments(customerId: number): Promise<CustomerDocument[]>;
  createCustomerDocument(document: InsertCustomerDocument): Promise<CustomerDocument>;
  deleteCustomerDocument(id: number): Promise<void>;

  // Appointment methods
  getAppointment(id: number): Promise<Appointment | undefined>;
  listAppointments(): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<Appointment>): Promise<Appointment>;

  // Review methods
  listReviews(): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, review: Partial<Review>): Promise<Review>;

  // Message methods
  listMessages(customerId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}