// campus cove server setup
// does all the express stuff

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

const app = express();

// need these for post requests
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// static files
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// also need the logo and stuff
app.use('/attached_assets', express.static(path.join(process.cwd(),  'attached_assets')));

// sessions for auth
const sessionSecret = process.env.SESSION_SECRET || 'campus-cove-dev-secret';
const oneDay = 24 * 60 * 60 * 1000;

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: oneDay
  },
}));

// logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const reqPath = req.path;
  let jsonData: Record<string, any> | undefined = undefined;

  // hack to capture response
  const oldJson = res.json;
  res.json = function (body, ...args) {
    jsonData = body;
    return oldJson.apply(res, [body, ...args]);
  };

  res.on("finish", () => {
    const timeTaken = Date.now() - startTime;
    
    if (reqPath.startsWith("/api")) {
      let msg = `${req.method} ${reqPath} ${res.statusCode} in ${timeTaken}ms`;
      
      if (jsonData) {
        msg += ` :: ${JSON.stringify(jsonData)}`;
      }

      // trim long logs
      if (msg.length > 80) {
        msg = msg.substring(0, 79) + "…";
      }

      log(msg);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // dev vs prod setup
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // start server
  const portNum = process.env.PORT || '5000';
  const actualPort = parseInt(portNum, 10);
  
  server.listen({
    port: actualPort,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${actualPort}`);
  });
})();
