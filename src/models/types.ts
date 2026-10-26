// types.ts
// Tipos y enums compartidos por el modelo de dominio.

import type { LocalDate } from '@/helpers/local-date.vo.js';

export type Id = string;
export type Decimal = number;
export type Instant = Date;

export enum GateState {
  UNKNOWN = 'UNKNOWN',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  OPENING = 'OPENING',
  CLOSING = 'CLOSING',
  FAULT = 'FAULT',
}

export enum DispensingSource {
  SCHEDULE = 'SCHEDULE',
  MANUAL = 'MANUAL',
}

export enum DispensingStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
  INTERRUPTED = 'INTERRUPTED',
}

export enum AccessStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  INTERRUPTED = 'INTERRUPTED',
}

// Resultado de evaluar el presupuesto diario de un comedero.
export interface BudgetResult {
  allowed: boolean;
  remainingGrams: Decimal | null;
  reason?: string;
}

// Consulta completa del presupuesto diario para un pet.
export interface BudgetQueryResult {
  deviceId: Id;
  petId: Id;
  day: LocalDate;
  dailyLimitGrams: Decimal | null;
  consumedGrams: Decimal;
  remainingGrams: Decimal | null;
  completeMeasurements: boolean;
}
