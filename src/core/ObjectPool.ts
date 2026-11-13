export class ObjectPool<T> {
  private readonly idle: T[] = [];

  constructor(
    private readonly create: () => T,
    private readonly dispose: (item: T) => void = () => {},
    private readonly maxSize = 256,
  ) {}

  get size(): number {
    return this.idle.length;
  }

  acquire(): T {
    return this.idle.pop() ?? this.create();
  }

  release(item: T): void {
    if (this.idle.length < this.maxSize) {
      this.idle.push(item);
    } else {
      this.dispose(item);
    }
  }

  drain(): void {
    for (const item of this.idle) this.dispose(item);
    this.idle.length = 0;
  }
}
