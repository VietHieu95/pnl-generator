import express from 'express';
import { registerRoutes } from '../server/routes';
import { createServer } from 'http';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Dummy httpServer for registerRoutes requirement
const httpServer = createServer(app);

// Register API routes
registerRoutes(httpServer, app);

export default app;
