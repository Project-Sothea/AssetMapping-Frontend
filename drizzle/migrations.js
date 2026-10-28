// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

// Consolidated PR migrations keep the old 0006 timestamp: complete test builds skip
// them; earlier test builds safely reuse existing indexes and the recovery table.
import m0000 from './0000_tan_sersi.sql';
import m0001 from './0001_married_hawkeye.sql';
import m0002 from './0002_bumpy_hulk.sql';
import m0003 from './0003_little_gambit.sql';
import m0004 from './0004_local_reliability.sql';
import journal from './meta/_journal.json';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
  },
};
