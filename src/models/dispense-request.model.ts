// dispense-request.model.ts
// Solicitud de dispensado manual enviada por el usuario.

import type { Id, Instant } from '@/models/types.js';

export enum DispenseRequestStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  APPLIED = 'APPLIED',
  FAILED = 'FAILED',
}

export interface DispenseRequest {
  id: Id;
  deviceId: Id;
  targetGrams: number;
  requestedAt: Instant;
  status: DispenseRequestStatus;
}
