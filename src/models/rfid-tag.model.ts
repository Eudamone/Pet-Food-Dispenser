// rfid-tag.model.ts
import type { Id } from '@/models/types.js';

export class RfidTag {
  constructor(
    public readonly uid: string,
    public readonly ownerId: Id,
    public petId: Id | null = null,
    public active = true,
  ) {}

  static create(props: { uid: string; ownerId: Id; petId?: Id | null }): RfidTag {
    return new RfidTag(props.uid, props.ownerId, props.petId ?? null, true);
  }

  assignTo(petId: Id): void {
    this.petId = petId;
  }

  unassign(): void {
    this.petId = null;
  }

  activate(): void {
    this.active = true;
  }

  deactivate(): void {
    this.active = false;
  }
}
