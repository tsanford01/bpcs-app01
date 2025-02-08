import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { WebSocketServer, WebSocket } from "ws";
import { insertCustomerSchema, insertAppointmentSchema, insertReviewSchema, insertMessageSchema } from "@shared/schema";

// Extend WebSocket type to include isAlive property
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: number;
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // WebSocket connection handling with improved error handling
  wss.on('connection', (ws: ExtendedWebSocket, req) => {
    console.log('[WS] New connection established');

    ws.isAlive = true;

    // More frequent heartbeat checks
    const pingInterval = setInterval(() => {
      if (ws.isAlive === false) {
        console.log('[WS] Connection dead, terminating');
        clearInterval(pingInterval);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping(() => {});
    }, 15000); // 15 seconds

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('error', (error) => {
      console.error('[WS] Error:', error);
      clearInterval(pingInterval);
      ws.close(1011, 'Internal server error');
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
      clearInterval(pingInterval);
    });

    // Handle messages with improved error handling
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
              try {
                extendedClient.send(JSON.stringify(savedMessage));
              } catch (sendError) {
                console.error('[WS] Send error:', sendError);
              }
            }
          });
        }
      } catch (error) {
        console.error('[WS] Message handling error:', error);
        try {
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        } catch (sendError) {
          console.error('[WS] Error sending error message:', sendError);
        }
      }
    });
  });

  // Heartbeat interval to detect stale connections
  const interval = setInterval(() => {
    wss.clients.forEach((client) => {
      const ws = client as ExtendedWebSocket;
      if (ws.isAlive === false) {
        console.log('[WS] Terminating inactive connection');
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Clean up interval on server close
  wss.on('close', () => {
    console.log('[WS] WebSocket server closing');
    clearInterval(interval);
  });

  // REST API routes with enhanced error handling
  app.get("/api/customers", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('[API] Unauthorized access attempt to /api/customers');
      return res.sendStatus(401);
    }
    try {
      const customers = await storage.listCustomers();
      res.json(customers);
    } catch (error) {
      console.error('[API] Error fetching customers:', error);
      res.status(500).json({ message: 'Failed to fetch customers' });
    }
  });

  app.post("/api/customers", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('[API] Unauthorized access attempt to POST /api/customers');
      return res.sendStatus(401);
    }
    try {
      const parsed = insertCustomerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }
      const customer = await storage.createCustomer(parsed.data);
      res.status(201).json(customer);
    } catch (error) {
      console.error('[API] Error creating customer:', error);
      res.status(500).json({ message: 'Failed to create customer' });
    }
  });

  app.get("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('[API] Unauthorized access attempt to /api/appointments');
      return res.sendStatus(401);
    }
    try {
      const appointments = await storage.listAppointments();
      res.json(appointments);
    } catch (error) {
      console.error('[API] Error fetching appointments:', error);
      res.status(500).json({ message: 'Failed to fetch appointments' });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('[API] Unauthorized access attempt to POST /api/appointments');
      return res.sendStatus(401);
    }
    try {
      const parsed = insertAppointmentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error);
      const appointment = await storage.createAppointment(parsed.data);
      res.status(201).json(appointment);
    } catch (error) {
      console.error('[API] Error creating appointment:', error);
      res.status(500).json({ message: 'Failed to create appointment' });
    }
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('[API] Unauthorized access attempt to PATCH /api/appointments');
      return res.sendStatus(401);
    }
    try {
      const appointment = await storage.updateAppointment(Number(req.params.id), req.body);
      res.json(appointment);
    } catch (error) {
      console.error('[API] Error updating appointment:', error);
      res.status(500).json({ message: 'Failed to update appointment' });
    }
  });

  app.get("/api/reviews", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('[API] Unauthorized access attempt to /api/reviews');
      return res.sendStatus(401);
    }
    try {
      const reviews = await storage.listReviews();
      res.json(reviews);
    } catch (error) {
      console.error('[API] Error fetching reviews:', error);
      res.status(500).json({ message: 'Failed to fetch reviews' });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('[API] Unauthorized access attempt to POST /api/reviews');
      return res.sendStatus(401);
    }
    try {
      const parsed = insertReviewSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error);
      const review = await storage.createReview(parsed.data);
      res.status(201).json(review);
    } catch (error) {
      console.error('[API] Error creating review:', error);
      res.status(500).json({ message: 'Failed to create review' });
    }
  });

  app.patch("/api/reviews/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('[API] Unauthorized access attempt to PATCH /api/reviews');
      return res.sendStatus(401);
    }
    try {
      const review = await storage.updateReview(Number(req.params.id), req.body);
      res.json(review);
    } catch (error) {
      console.error('[API] Error updating review:', error);
      res.status(500).json({ message: 'Failed to update review' });
    }
  });

  app.get("/api/messages/:customerId", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('[API] Unauthorized access attempt to /api/messages');
      return res.sendStatus(401);
    }
    try {
      const messages = await storage.listMessages(Number(req.params.customerId));
      res.json(messages);
    } catch (error) {
      console.error('[API] Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  return httpServer;
}