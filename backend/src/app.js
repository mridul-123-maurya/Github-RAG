const express = require("express");
const cors = require("cors");

const indexRoutes = require("./routes/indexRoutes");
const searchRoutes = require("./routes/searchRoutes");
const askRoutes = require("./routes/askRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

// Root welcome route (prototype compatibility)
app.get("/", (req, res) => {
    res.json({ message: "GitHub RAG backend is running" });
});

// API Routes
app.use("/api", indexRoutes);
app.use("/api", searchRoutes);
app.use("/api", askRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(`[Error] ${err.message}`);

    let statusCode = 500;
    if (err.status && typeof err.status === "number") {
        statusCode = err.status;
    } else if (err.message && err.message.toLowerCase().includes("not found")) {
        statusCode = 404;
    } else if (err.message && (err.message.toLowerCase().includes("invalid") || err.message.toLowerCase().includes("must be"))) {
        statusCode = 400;
    } else if (err.message && (err.message.toLowerCase().includes("cannot connect") || err.message.toLowerCase().includes("econnrefused"))) {
        statusCode = 503;
    }

    res.status(statusCode).json({
        error: err.message || "Internal server error"
    });
});

module.exports = app;
