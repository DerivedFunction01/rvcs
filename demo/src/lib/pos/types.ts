export enum OrderType {
  WalkIn = "Walk-In",
  Pickup = "Pickup",
  Delivery = "Delivery",
}

export interface OrderContext {
  orderType: OrderType;
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

export enum ConfigType{
  Config = "config",
  Custom = "custom",
  Guest = "guest"
}
export enum AllocationContext {
  Item = "item",
  Group = "group",
  Header = "header",
  Global = "global",
}

export enum HistoryOpType {
  Squash = "squash",
  Reset = "reset",
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

export enum ViewMode {
  Simple = "Simple",
  Balanced = "Balanced",
  Full = "Full",
}

export enum CatalogDetailLevel {
  Name = "Name",
  Sku = "Sku",
  SkuIcons = "SkuIcons",
  Full = "Full",
}

export enum CatalogNavigationMode {
  Scroll = "Scroll",
  Page = "Page",
}

export enum CatalogCategoryMode {
  Hidden = "Hidden",
  Buttons = "Buttons",
}

export interface CatalogDetailDisplayPrefs {
  showSku: boolean;
  showIcons: boolean;
  showPrice: boolean;
}

export enum SplitQtyType {
  Amount = "amount",
  Percentage = "percentage",
}

export enum SplitQtyUnit {
  PerUnit = "per-unit",
  Collective = "collective"
}

export enum PosScreen {
  Terminal = "Terminal",
  History = "History",
}