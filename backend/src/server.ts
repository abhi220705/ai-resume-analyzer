import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
const frontendOrigin = process.env.FRONTEND_URL;
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}
if (!frontendOrigin || new URL(frontendOrigin).origin !== frontendOrigin) {
  throw new Error("FRONTEND_URL must be an origin such as http://localhost:3000");
}

const server = createApp(frontendOrigin).listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});
server.on("error", (error) => {
  console.error("API could not start:", error.message);
  process.exit(1);
});
function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
