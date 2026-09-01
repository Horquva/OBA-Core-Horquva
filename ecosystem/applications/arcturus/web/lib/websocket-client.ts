export class WebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect(onMessage?: (data: any) => void) {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => console.log(`WebSocket Connected to ${this.url}`);
    
    this.socket.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        if (onMessage) {
          onMessage(parsedData);
        } else {
          console.log('WS Message Received:', parsedData);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message', error);
      }
    };

    this.socket.onerror = (event) => {
      console.warn(`WebSocket connection warning for ${this.url}`);
    };
    this.socket.onclose = (event) => {
      console.log(`WebSocket Disconnected from ${this.url} (code: ${event.code})`);
    };
  }

  disconnect() {
    if (this.socket) {
      const sock = this.socket;
      this.socket = null;
      // Remove listeners to avoid unmount noisy logs
      sock.onclose = null;
      sock.onerror = null;
      sock.onmessage = null;
      sock.onopen = null;

      if (sock.readyState === WebSocket.OPEN) {
        sock.close(1000, "Normal Closure");
      } else if (sock.readyState === WebSocket.CONNECTING) {
        sock.onopen = () => sock.close(1000, "Normal Closure");
      }
    }
  }
}