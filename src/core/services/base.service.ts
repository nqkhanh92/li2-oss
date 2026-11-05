export abstract class BaseService<T> {
  protected repo: T;

  constructor(repo: T) {
    this.repo = repo;
  }
}
