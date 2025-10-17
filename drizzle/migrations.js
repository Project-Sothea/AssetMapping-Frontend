// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_elite_meggan.sql';
import m0001 from './0001_equal_smiling_tiger.sql';
import m0002 from './0002_mean_wallow.sql';
import m0003 from './0003_acoustic_alice.sql';
import m0004 from './0004_clever_kingpin.sql';
import m0005 from './0005_bright_namor.sql';
import m0006 from './0006_bright_nitro.sql';
import m0007 from './0007_chief_vulcan.sql';
import m0008 from './0008_dark_sabra.sql';
import m0009 from './0009_clammy_mole_man.sql';
import m0010 from './0010_modern_ben_parker.sql';
import m0011 from './0011_lumpy_shiver_man.sql';

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
    m0007,
    m0008,
    m0009,
    m0010,
    m0011,
  },
};
