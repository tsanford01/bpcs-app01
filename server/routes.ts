import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { WebSocketServer, WebSocket } from "ws";
import { insertCustomerSchema, insertAppointmentSchema, insertReviewSchema, insertMessageSchema } from "@shared/schema";

// Extend WebSocket type to include isAlive property
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Check if user is authenticated before accepting WebSocket connection
  wss.on('connection', (ws: ExtendedWebSocket, req) => {
    // Initialize connection with alive status
    ws.isAlive = true;

    // Handle heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Handle messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const parsed = insertMessageSchema.safeParse(message);
        if (parsed.success) {
          const savedMessage = await storage.createMessage(parsed.data);
          // Broadcast to all connected clients except sender
          wss.clients.forEach((client) => {
            const extendedClient = client as ExtendedWebSocket;
            if (extendedClient !== ws && extendedClient.readyState === WebSocket.OPEN) {
              extendedClient.send(JSON.stringify(savedMessage));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });
  });

  // Heartbeat interval to detect stale connections
  const interval = setInterval(() => {
    wss.clients.forEach((client) => {
      const ws = client as ExtendedWebSocket;
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Clean up interval on server close
  wss.on('close', () => {
    clearInterval(interval);
  });

  // REST API routes
  app.get("/api/customers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const customers = await storage.listCustomers();
    res.json(customers);
  });

  app.post("/api/customers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertCustomerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const customer = await storage.createCustomer(parsed.data);
    res.status(201).json(customer);
  });

  app.get("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const appointments = await storage.listAppointments();
    res.json(appointments);
  });

  app.post("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertAppointmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const appointment = await storage.createAppointment(parsed.data);
    res.status(201).json(appointment);
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const appointment = await storage.updateAppointment(Number(req.params.id), req.body);
    res.json(appointment);
  });

  app.get("/api/reviews", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const reviews = await storage.listReviews();
    res.json(reviews);
  });

  app.post("/api/reviews", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertReviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const review = await storage.createReview(parsed.data);
    res.status(201).json(review);
  });

  app.patch("/api/reviews/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const review = await storage.updateReview(Number(req.params.id), req.body);
    res.json(review);
  });

  app.get("/api/messages/:customerId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const messages = await storage.listMessages(Number(req.params.customerId));
    res.json(messages);
  });

  return httpServer;
}