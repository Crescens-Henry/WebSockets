import express from "express";
import morgan from "morgan";
import { Server as SocketServer } from "socket.io";
import http from "http";
import cors from "cors";
import { PORT } from "./config.js";
import dotenv from 'dotenv';
import amqp from "amqplib";

dotenv.config()

const hostname = process.env.HOST || "localhost";
const protocol = process.env.PROTOCOL;
const user = process.env.USER;
const password = process.env.PASSWORD;
const port = process.env.PORT;

const queueOrderProductRes = process.env.QUEUE_RESPONSE_ORDERPRODUCT;
const queueStockProductRes = process.env.QUEUE_RESPONSE_STOCKPRODUCT;



const rabbitSettings = {
    protocol: protocol,
    hostname: hostname,
    port: port,
    username: user,
    password: password,
};
async function connect() {
    try {
        const connected = await amqp.connect(rabbitSettings);
        console.log("conexion exitosa");
        return connected;
    } catch (error) {
        console.error("Error =>", error);
        return null;
    }
}

async function createChannel(connection, queue) {
    const channel = await connection.createChannel();
    await channel.assertQueue(queue);
    return channel;
}

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
    cors: {
        origin: "*"
    }
});

app.use(cors());
app.use(morgan("dev"));
const listSockets = {};

const connection = await connect();
io.on("connection", async (socket) => {

    console.log("new user", socket.id);


    const channelOrderProductRes = await createChannel(connection, queueOrderProductRes);
    const channelStockProductRes = await createChannel(connection, queueStockProductRes);

    channelStockProductRes.consume(queueStockProductRes, (response) => {
        const objectRecieved = response.content.toString();
        console.log("received in stock", objectRecieved);
        channelStockProductRes.ack(response);
    });

    channelOrderProductRes.consume(queueOrderProductRes, (response) => {
        const objectRecieved = response.content.toString();
        console.log("received in Order", objectRecieved);
        channelOrderProductRes.ack(response);
    });


});

server.listen(PORT);

console.log("Server stared on port ", PORT);