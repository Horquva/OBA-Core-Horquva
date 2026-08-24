export class WebSocketClient {
  private ws: WebSocket | null = null;

  constructor(private url: string) {}

  connect() {
    console.log(`Connecting native WebSocket to ${this.url}...`);
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => console.log("WebSocket Connected");
    this.ws.onmessage = (event) => console.log("Message received:", event.data);
    this.ws.onerror = (error) => console.error("WebSocket Error:", error);
    this.ws.onclose = () => console.log("WebSocket Disconnected");
  }
}