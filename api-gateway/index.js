const express = require("express");
const httpProxy = require("http-proxy");

const proxy = httpProxy.createProxyServer();
const app = express();

const ENV = process.env.NODE_ENV || "local";

const targets = {
    local: {
        auth: "http://localhost:3000",
        product: "http://localhost:3001",
        order: "http://localhost:3002",
    },
    docker: {
        auth: "http://auth:3000",
        product: "http://product:3001",
        order: "http://order:3002",
    },
};

const target = targets[ENV];

// Route for auth service (không cần /api)
app.use("/auth", (req, res) => proxy.web(req, res, { target: target.auth }));

// Route for product service (có /api)
app.use("/products", (req, res) => {
    // Đảm bảo route khớp với Product Service
    req.url = "/api/products" + (req.url === "/" ? "" : req.url);
    proxy.web(req, res, { target: target.product });
});


// Route for order service (có /api)
app.use("/orders", (req, res) => {
    req.url = "/api/orders" + (req.url === "/" ? "" : req.url);
    proxy.web(req, res, { target: target.order });
});

// Start the server
const port = process.env.PORT || 3003;
app.listen(port, () => {
    console.log(`API Gateway (${ENV}) listening on port ${port}`);
    console.log(`Forwarding to:`);
    console.log(`- Auth: ${target.auth}`);
    console.log(`- Product: ${target.product}`);
    console.log(`- Order: ${target.order}`);
});