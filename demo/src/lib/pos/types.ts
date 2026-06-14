export interface OrderContext {
  orderType: string; // "walk-in" | "pickup" | "delivery"
  orderTypeLabel: string; // "Walk In" | "Pickup" | "Delivery"
  serverName: string; // server / account login for the terminal
  tableConfigId?: string | null;
  floorConfigId?: string | null;
  initialGuestNames?: string[];
  customerFields: Record<string, string>;
  estimatedTimeLabel?: string | null;
  initiatedAt: string;
  jurisdictionCode?: string; // e.g. "18106" — resolved to full charge-rule chain at order time
}

export enum CustomerFieldType {
  Text = "text",
  Tel = "tel",
  Email = "email",
  Textarea = "textarea",
}

export interface CustomerFieldConfig {
  key: string;
  label: string;
  type: CustomerFieldType;
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

export enum FloorObjectKind {
  Table = "table",
  Chair = "chair",
  Wall = "wall",
  Deadspace = "deadspace",
}

export enum FloorShape {
  Circle = "circle",
  Ellipse = "ellipse",
  Rectangle = "rectangle",
  Triangle = "triangle",
  Polygon = "polygon",
}

export enum PaymentUpdateMode {
  Group = "group",
  Item = "item",
}

export enum ConfigUpdateMode {
  ChangeExisting = "change-existing",
  NewOnly = "new-only",
}

export interface FloorObjectBase {
  id: string;
  kind: FloorObjectKind;
  shape?: FloorShape;
  label?: string;
  displayName?: string;
  zIndex?: number;
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
  kind: FloorObjectKind.Table;
  guestNames: string[];
  linkedChairIds?: string[];
  chairLabels?: string[];
  seatCount?: number;
}

export interface FloorChairObject extends FloorObjectBase {
  kind: FloorObjectKind.Chair;
  tableId?: string | null;
}

export interface FloorWallObject extends FloorObjectBase {
  kind: FloorObjectKind.Wall | FloorObjectKind.Deadspace;
}

export type FloorObject = FloorTableObject | FloorChairObject | FloorWallObject;

export interface FloorConfig {
  id: string;
  name: string;
  objects: FloorObject[];
}
