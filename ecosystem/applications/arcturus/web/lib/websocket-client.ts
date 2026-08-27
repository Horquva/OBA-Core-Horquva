export class WebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  // Ab yahan onMessage callback receive ho sakta hai component se
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

    this.socket.onerror = (error) => console.error('WebSocket Error:', error);
    this.socket.onclose = () => console.log('WebSocket Disconnected');
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}