export interface DataSource {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
}
export interface Role {
  id: string;
  title: string;
  description: string;
  icon: "executive" | "department" | "analyst";
}