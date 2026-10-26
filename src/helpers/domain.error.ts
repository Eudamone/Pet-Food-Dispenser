// domain.error.ts
// Error de regla de negocio: representa una entrada inválida del usuario y debe
// traducirse a HTTP 400, a diferencia de los errores inesperados (500).

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
