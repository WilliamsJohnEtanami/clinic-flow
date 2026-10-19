import http from "http";
import { createApp } from "./app";
import { initSocketServer } from "./realtime/socket";

const server = http.createServer(createApp());

initSocketServer(server);

export = server;
