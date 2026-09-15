export class Feeder {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly petId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: {
    id: string;
    userId: string;
    name: string;
    petId?: string | null;
  }): Feeder {
    const now = new Date();
    return new Feeder(props.id, props.userId, props.name, props.petId ?? null, now, now);
  }

  updateName(name: string): Feeder {
    return new Feeder(
      this.id,
      this.userId,
      name,
      this.petId,
      this.createdAt,
      new Date(),
    );
  }

  assignPet(petId: string | null): Feeder {
    return new Feeder(
      this.id,
      this.userId,
      this.name,
      petId,
      this.createdAt,
      new Date(),
    );
  }
}
