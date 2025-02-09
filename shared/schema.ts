import { pgTable, text, serial, integer, boolean, timestamp, json, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  notes: text("notes"),
  birthday: date("birthday"),
  customerSince: date("customer_since").notNull().default(sql`CURRENT_DATE`),
  tags: text("tags").array(),
  status: text("status").notNull().default("active"),
  totalSpent: integer("total_spent").notNull().default(0),
  serviceCount: integer("service_count").notNull().default(0),
  contractStartDate: date("contract_start_date"),
  contractEndDate: date("contract_end_date"),
  servicePlan: text("service_plan"),
  serviceAddons: text("service_addons").array(),
  preferredContactTime: text("preferred_contact_time"),
  communicationFrequency: text("communication_frequency"),
  lastContactDate: timestamp("last_contact_date"),
  nextServiceDate: date("next_service_date"),
  requiresAttention: boolean("requires_attention").default(false),
  vipCustomer: boolean("vip_customer").default(false),
});

export const customerAddresses = pgTable("customer_addresses", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  type: text("type").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  country: text("country").notNull().default("US"),
  isPrimary: boolean("is_primary").default(false),
  specialInstructions: text("special_instructions"),
});

export const customerContacts = pgTable("customer_contacts", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  type: text("type").notNull(),
  value: text("value").notNull(),
  isPrimary: boolean("is_primary").default(false),
  contactNotes: text("contact_notes"),
});

export const serviceHistory = pgTable("service_history", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  date: timestamp("date").notNull(),
  serviceType: text("service_type").notNull(),
  findings: text("findings"),
  recommendations: text("recommendations"),
  technician: text("technician"),
  cost: integer("cost").notNull(),
  paid: boolean("paid").default(false),
  addressId: integer("address_id").notNull(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  type: text("type").notNull(),
  last4: text("last4").notNull(),
  expiryDate: text("expiry_date"),
  isPrimary: boolean("is_primary").default(false),
  processorToken: text("processor_token"),
  autopayEnabled: boolean("autopay_enabled").default(false),
});

export const customerDocuments = pgTable("customer_documents", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  type: text("type").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  uploadDate: timestamp("upload_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  metadata: json("metadata"),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  date: timestamp("date").notNull(),
  status: text("status").notNull().default("pending"),
  serviceType: text("service_type").notNull(),
  notes: text("notes"),
  location: json("location").notNull(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  rating: integer("rating").notNull(),
  text: text("text"),
  status: text("status").notNull().default("pending"),
  date: timestamp("date").notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  content: text("content").notNull(),
  fromCustomer: boolean("from_customer").notNull(),
  timestamp: timestamp("timestamp").notNull(),
});

export const insertAppointmentSchema = createInsertSchema(appointments, {
  date: z.string().transform((str) => new Date(str)),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  }).nullable(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
});

export const insertCustomerSchema = createInsertSchema(customers, {
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  notes: z.string().nullable(),
  birthday: z.string().nullable().transform(str => str ? new Date(str) : null),
  tags: z.array(z.string()).default([]),
  serviceAddons: z.array(z.string()).default([]),
  servicePlan: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  status: z.enum(["active", "inactive", "pending", "suspended"]).default("active"),
  preferredContactTime: z.enum(["morning", "afternoon", "evening"]).optional(),
  communicationFrequency: z.enum(["weekly", "monthly", "quarterly"]).optional(),
});

export const insertCustomerAddressSchema = createInsertSchema(customerAddresses, {
  type: z.enum(["service", "billing", "mailing"]),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().length(2, "State must be a 2-letter code"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format (e.g. 12345 or 12345-6789)"),
  country: z.string().length(2, "Country must be a 2-letter code").default("US"),
  isPrimary: z.boolean().default(false),
  specialInstructions: z.string().optional(),
});

export const insertCustomerContactSchema = createInsertSchema(customerContacts);
export const insertServiceHistorySchema = createInsertSchema(serviceHistory);
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods);
export const insertCustomerDocumentSchema = createInsertSchema(customerDocuments);
export const insertReviewSchema = createInsertSchema(reviews);
export const insertMessageSchema = createInsertSchema(messages);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertCustomerAddress = z.infer<typeof insertCustomerAddressSchema>;
export type InsertCustomerContact = z.infer<typeof insertCustomerContactSchema>;
export type InsertServiceHistory = z.infer<typeof insertServiceHistorySchema>;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type InsertCustomerDocument = z.infer<typeof insertCustomerDocumentSchema>;

export type User = typeof users.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type CustomerContact = typeof customerContacts.$inferSelect;
export type ServiceHistory = typeof serviceHistory.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type CustomerDocument = typeof customerDocuments.$inferSelect;