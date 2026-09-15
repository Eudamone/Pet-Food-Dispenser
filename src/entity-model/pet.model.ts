export class Pet {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: { id: string; userId: string; name: string }): Pet {
    const now = new Date();
    return new Pet(props.id, props.userId, props.name, now, now);
  }

  updateName(name: string): Pet {
    return new Pet(this.id, this.userId, name, this.createdAt, new Date());
  }
}
