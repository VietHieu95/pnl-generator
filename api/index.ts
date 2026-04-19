import express from 'express';
import { registerRoutes } from '../server/routes';
import { createServer } from 'http';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Dummy httpServer for registerRoutes requirement
const httpServer = createServer(app);

// For Vercel, we need to ensure routes are registered
// Since registerRoutes is async, we should await it if needed, 
// but most routes are added synchronously in it.
// To be safe, we can use a middleware that ensures registration.
let routesRegistered = false;
const registerPromise = registerRoutes(httpServer, app).then(() => {
    routesRegistered = true;
});

app.use(async (req, res, next) => {
    if (!routesRegistered) await registerPromise;
    next();
});

export default app;
