// feeder-device.model.ts
import type { Decimal, Id, Instant } from '@/models/types.js';
import { GateState } from '@/models/types.js';

export class FeederDevice {
  constructor(
    public readonly id: Id,
    public readonly ownerId: Id,
    public name: string,
    public authorizedPetIds: Set<Id> = new Set<Id>(),
    public readonly maxBowlGrams: Decimal = 0,
    public desiredRevision = 0,
    public appliedRevision = 0,
    public lastSeenAt: Instant | null = null,
    public lastBowlGrams: Decimal | null = null,
    public gateState: GateState = GateState.UNKNOWN,
    public lastFault: string | null = null,
  ) {}

  static create(props: {
    id: Id;
    ownerId: Id;
    name: string;
    maxBowlGrams: Decimal;
    authorizedPetIds?: Iterable<Id>;
  }): FeederDevice {
    return new FeederDevice(
      props.id,
      props.ownerId,
      props.name,
      new Set<Id>(props.authorizedPetIds ?? []),
      props.maxBowlGrams,
    );
  }

  rename(name: string): void {
    this.name = name;
  }

  addAuthorizedPet(petId: Id): boolean {
    if (this.authorizedPetIds.has(petId)) {
      return false;
    }
    this.authorizedPetIds.add(petId);
    return true;
  }

  removeAuthorizedPet(petId: Id): boolean {
    return this.authorizedPetIds.delete(petId);
  }

  isPetAuthorized(petId: Id): boolean {
    return this.authorizedPetIds.has(petId);
  }

  markRequested(revision: number): void {
    this.desiredRevision = revision;
  }

  confirmApplied(revision: number): void {
    this.appliedRevision = revision;
  }

  updateObservedState(
    at: Instant,
    weight: Decimal | null,
    gate: GateState,
    fault: string | null,
  ): void {
    this.lastSeenAt = at;
    if (weight !== null) {
      this.lastBowlGrams = weight;
    }
    this.gateState = gate;
    this.lastFault = fault;
  }

  hasPendingConfiguration(): boolean {
    return this.desiredRevision > this.appliedRevision;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      ownerId: this.ownerId,
      name: this.name,
      authorizedPetIds: [...this.authorizedPetIds],
      maxBowlGrams: this.maxBowlGrams,
      desiredRevision: this.desiredRevision,
      appliedRevision: this.appliedRevision,
      lastSeenAt: this.lastSeenAt,
      lastBowlGrams: this.lastBowlGrams,
      gateState: this.gateState,
      lastFault: this.lastFault,
    };
  }
}
