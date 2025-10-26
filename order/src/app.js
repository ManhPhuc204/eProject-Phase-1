const express = require("express");
const mongoose = require("mongoose");
const Order = require("./models/order");
const amqp = require("amqplib");
const config = require("./config");

class App {
    constructor() {
        this.app = express();
        this.connectDB();
        this.setupOrderConsumer();
    }

    async connectDB() {
        await mongoose.connect(config.mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("MongoDB connected");
    }

    async disconnectDB() {
        await mongoose.disconnect();
        console.log("MongoDB disconnected");
    }

    async setupOrderConsumer() {
        const amqpServer = "amqp://rabbitmq:5672";

        const connect = async(retries = 10, delay = 3000) => {
            for (let i = 0; i < retries; i++) {
                try {
                    console.log(`Attempt ${i + 1} to connect RabbitMQ...`);
                    const connection = await amqp.connect(amqpServer);
                    console.log("Connected to RabbitMQ");

                    const channel = await connection.createChannel();
                    await channel.assertQueue("orders");

                    channel.consume("orders", async(data) => {
                        console.log("Consuming ORDER service");
                        const { products, username, orderId } = JSON.parse(data.content);

                        const newOrder = new Order({
                            products,
                            user: username,
                            totalPrice: products.reduce((acc, product) => acc + product.price, 0),
                        });

                        await newOrder.save();
                        channel.ack(data);
                        console.log("Order saved to DB and ACK sent to ORDER queue");

                        const { user, products: savedProducts, totalPrice } = newOrder.toJSON();
                        channel.sendToQueue(
                            "products",
                            Buffer.from(JSON.stringify({ orderId, user, products: savedProducts, totalPrice }))
                        );
                    });

                    return; // thành công → thoát loop
                } catch (err) {
                    console.error(`Failed to connect to RabbitMQ: ${err.message}`);
                    console.log(`Retrying in ${delay / 1000}s...`);
                    await new Promise((res) => setTimeout(res, delay));
                    delay *= 2; // tăng dần thời gian giữa các lần thử
                }
            }

            console.error("Unable to connect to RabbitMQ after multiple retries.");
            process.exit(1); // thoát container nếu không kết nối được
        };

        await connect(20, 2000); // thử 20 lần, bắt đầu với delay 2s
    }



    start() {
        this.server = this.app.listen(config.port, () =>
            console.log(`Server started on port ${config.port}`)
        );
    }

    async stop() {
        await mongoose.disconnect();
        this.server.close();
        console.log("Server stopped");
    }
}

module.exports = App;