export type FieldLocation = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: string;
  statusKey: string;
  statusId: string;
  statusColor: string;
  assignedToId?: string | null;
  nextVisitAt?: string | null;
};

/** Имена как в справочнике Status (кнопки в карточке точки). */
export const FIELD_STATUS_PRESETS = [
  "Посетить",
  "Посетил",
  "Нет ЛПР",
  "Отказ",
  "Интересно",
  "Готов платить",
  "Посетить еще раз",
] as const;

export type StatusCatalogRow = {
  id: string;
  key: string;
  name: string;
  color: string;
};
