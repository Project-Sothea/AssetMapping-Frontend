import { Pin, pins } from '~/db/schema';
import { db } from '~/services/drizzleDb';
import { LocalRepository } from '../LocalRepository';

export class DrizzlePinRepo extends LocalRepository<Pin, typeof pins> {
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
      images: Array.isArray(item.images) ? JSON.stringify(item.images) : (item.images ?? '[]'), // fallback to empty array
    };
  }
}
