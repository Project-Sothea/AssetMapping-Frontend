import { Pin, pins } from '~/db/schema';
import { db } from '~/services/drizzleDb';
import { DrizzleRepository } from '../../interfaces/DrizzleRepository';

export class DrizzlePinRepo extends DrizzleRepository<Pin, typeof pins> {
  constructor() {
    super(db, pins, ['id', 'createdAt']);
  }

  transformOnFetch(row: Pin): Pin {
    return {
      ...row,
      images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images,
    };
  }

  transformBeforeInsert(item: Pin): Pin {
    return {
      ...item,
      images: typeof item.images !== 'string' ? JSON.stringify(item.images) : item.images,
    };
  }
}
