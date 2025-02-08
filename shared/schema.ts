import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  notes: text("notes"),
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
});

export const insertCustomerSchema = createInsertSchema(customers);
export const insertAppointmentSchema = createInsertSchema(appointments);
export const insertReviewSchema = createInsertSchema(reviews);
export const insertMessageSchema = createInsertSchema(messages);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type User = typeof users.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Message = typeof messages.$inferSelect;
