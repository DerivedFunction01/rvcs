export interface OrderContext {
  orderType: string;         // "walk-in" | "pickup" | "delivery"
  orderTypeLabel: string;    // "Walk In" | "Pickup" | "Delivery"
  serverName: string;       // server / account login for the terminal
  tableConfigId?: string | null;
  floorConfigId?: string | null;
  initialGuestNames?: string[];
  customerFields: Record<string, string>;
  estimatedTimeLabel?: string | null;
  initiatedAt: string;
}

export interface CustomerFieldConfig {
  key: string;
  label: string;
  type: "text" | "tel" | "email" | "textarea";
  required: boolean;
  placeholder?: string;
  validation?: { pattern?: string; minLength?: number; maxLength?: number };
}

export interface OrderTypeConfig {
  id: string;
  label: string;
  description: string;
  icon: string;
  customerFields: CustomerFieldConfig[];
  estimatedTimeLabel?: string | null;
}

export interface PosConfigResponse {
  id: string;
  key: string;
  label: string;
  defaultPaymentMethod: string;
  orderTypes: OrderTypeConfig[];
  floorConfigs?: FloorConfig[];
}

export type FloorObjectKind = "table" | "chair" | "wall" | "deadspace";
export type FloorShape = "circle" | "ellipse" | "rectangle" | "triangle" | "polygon";

export interface FloorObjectBase {
  id: string;
  kind: FloorObjectKind;
  shape?: FloorShape;
  label?: string;
  x: number;
  y: number;
  rotation?: number;
  width?: number;
  height?: number;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  points?: Array<[number, number]>;
}

export interface FloorTableObject extends FloorObjectBase {
  kind: "table";
  guestNames: string[];
  linkedChairIds?: string[];
  chairLabels?: string[];
  seatCount?: number;
}

export interface FloorChairObject extends FloorObjectBase {
  kind: "chair";
  tableId?: string | null;
}

export interface FloorWallObject extends FloorObjectBase {
  kind: "wall" | "deadspace";
}

export type FloorObject = FloorTableObject | FloorChairObject | FloorWallObject;

export interface FloorConfig {
  id: string;
  name: string;
  objects: FloorObject[];
}
