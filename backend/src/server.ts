import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";

const port = Number(process.env.PORT ?? 4000);
const frontendOrigin = process.env.FRONTEND_URL;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

if (
  !frontendOrigin ||
  new URL(frontendOrigin).origin !== frontendOrigin
) {
  throw new Error(
    "FRONTEND_URL must be an origin such as http://localhost:3000",
  );
}

const server = createApp(frontendOrigin).listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});

let isShuttingDown = false;

function shutdown(reason: string, exitCode = 0): void {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`Shutting down: ${reason}`);

  const forceExitTimer = setTimeout(() => {
    console.error("Shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10_000);

  forceExitTimer.unref();

  server.close(async (error) => {
    let finalExitCode = exitCode;

    if (error) {
      console.error("HTTP server close failed:", error.message);
      finalExitCode = 1;
    }

    try {
      await prisma.$disconnect();
      console.log("Database connections closed.");
    } catch {
      console.error("Failed to close database connections.");
      finalExitCode = 1;
    }

    clearTimeout(forceExitTimer);
    console.log("Backend stopped.");
    process.exit(finalExitCode);
  });
}

server.on("error", (error) => {
  console.error("API could not start:", error.message);
  shutdown("HTTP server error", 1);
});

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));