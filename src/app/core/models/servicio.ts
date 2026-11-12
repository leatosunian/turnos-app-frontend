export interface ServResponse {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  depositPorcentage: number;
  businessId: string;
}

export interface ServRequest {
  /** Hasta 80 caracteres. */
  name: string;
  /** Entre 1 y 480. */
  durationMinutes: number;
  price: number;
  /** Entre 0 y 100. */
  depositPorcentage: number;
}
