// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_tan_sersi.sql';
import m0001 from './0001_married_hawkeye.sql';
import m0002 from './0002_bumpy_hulk.sql';
import m0003 from './0003_little_gambit.sql';
import m0004 from './0004_local_query_indexes.sql';
import m0005 from './0005_durable_inflight.sql';
import m0006 from './0006_queue_write_origin.sql';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
    m0005,
    m0006,
  },
};
