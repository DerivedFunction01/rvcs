import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, MessageSquare, Phone, User } from "lucide-react";
import React from "react";

const FIELD_ICONS: Record<string, React.ElementType> = {
  name: User,
  phone: Phone,
  address: MapPin,
  notes: MessageSquare,
};

export interface CustomerField {
  key: string;
  label: string;
  type: "text" | "tel" | "email" | "textarea";
  required: boolean;
  placeholder?: string;
}

interface CustomerFieldInputProps {
  field: CustomerField;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onKeyDown?: (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
}

export function CustomerFieldInput({
  field,
  value,
  error,
  onChange,
  onKeyDown,
}: CustomerFieldInputProps) {
  const FieldIcon = FIELD_ICONS[field.key] ?? User;
  const hasError = !!error;

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={`field-${field.key}`}
        className="text-sm font-medium flex items-center gap-1.5"
      >
        <FieldIcon className="w-3.5 h-3.5 text-muted-foreground" />
        {field.label}
        {field.required && <span className="text-destructive text-xs">*</span>}
      </Label>

      {field.type === "textarea" ? (
        <Textarea
          id={`field-${field.key}`}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className={`min-h-[80px] ${hasError ? "border-destructive focus-visible:ring-destructive" : ""}`}
        />
      ) : (
        <Input
          id={`field-${field.key}`}
          type={
            field.type === "tel"
              ? "tel"
              : field.type === "email"
                ? "email"
                : "text"
          }
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className={`h-9 text-xs focus-visible:ring-1 focus-visible:ring-primary ${hasError ? "border-destructive focus-visible:ring-destructive" : ""}`}
        />
      )}
      {hasError && (
        <p className="text-xs text-destructive font-medium">{error}</p>
      )}
    </div>
  );
}
