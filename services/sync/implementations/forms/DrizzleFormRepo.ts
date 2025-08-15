import { Form, forms } from '~/db/schema';
import { db } from '~/services/drizzleDb';
import { DrizzleRepository } from '../../interfaces/DrizzleRepository';

export class DrizzleFormRepo extends DrizzleRepository<Form, typeof forms> {
  constructor() {
    super(db, forms, ['id', 'createdAt']);
  }

  transformOnFetch(row: Form): Form {
    return row; // no special handling needed
  }

  transformBeforeInsert(item: Form): Form {
    return item; // no special handling needed
  }
}
