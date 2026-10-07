// Ports for the E2E-only servers (playwright.config.ts starts both); kept off the dev ports
// (frontend 3001, backend 3000) so a run never touches the dev servers or their state.
export const API_PORT = 3100;
export const APP_PORT = 3002;
export const API = `http://localhost:${API_PORT}`;
export const APP = `http://localhost:${APP_PORT}`;
