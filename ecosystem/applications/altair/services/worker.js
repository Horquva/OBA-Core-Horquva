import { processNextJob } from "./engine.js";
import { config } from "./config.js";

let running = false;

export function startWorker() {
  if (running) return;
  running = true;
  const tick = async () => {
    try {
      await processNextJob();
    } catch (error) {
      console.error(JSON.stringify({ level: "error", component: "workflow-worker", message: error.message, stack: error.stack, at: new Date().toISOString() }));
    } finally {
      setTimeout(tick, config.workerIntervalMs);
    }
  };
  tick();
}

