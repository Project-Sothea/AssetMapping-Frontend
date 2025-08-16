import { Form, forms } from '~/db/schema';
import { db } from '~/services/drizzleDb';
import { LocalRepository } from '../LocalRepository';
import { stringifyArrayFields } from '~/utils/dataShapes';

export class DrizzleFormRepo extends LocalRepository<Form, typeof forms> {
  constructor() {
    super(db, forms, ['id', 'createdAt']);
  }

  transformOnFetch(row: Form): Form {
    return row; // no special handling needed
  }

  transformBeforeInsert(item: Form): Form {
    return stringifyArrayFields(item); // no special handling needed
  }
}
