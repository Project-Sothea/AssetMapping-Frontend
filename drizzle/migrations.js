// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import m0000 from './0000_tan_sersi.sql';
import m0001 from './0001_married_hawkeye.sql';
import m0002 from './0002_bumpy_hulk.sql';
import journal from './meta/_journal.json';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
  },
};
