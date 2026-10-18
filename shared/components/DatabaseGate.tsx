import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Button, Text, View } from 'react-native';

import { useRunMigrations } from '~/services/drizzleDb';

function MigrationAttempt({ children, onRetry }: { children: ReactNode; onRetry: () => void }) {
  const { success, error } = useRunMigrations();
  useEffect(() => {
    if (error) console.error('Migration error:', error);
  }, [error]);
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
        <Text accessibilityRole="header">Database setup could not finish</Text>
        <Text>
          Do not uninstall the app or clear its data. If retry keeps failing, contact the app team.
        </Text>
        <Button title="Retry Database Setup" onPress={onRetry} />
      </View>
    );
  }
  if (!success)
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator accessibilityLabel="Preparing local database" />
      </View>
    );
  return children;
}

export function DatabaseGate({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  // Drizzle runs migrations on mount. Remount only this gate to retry on the same database.
  return (
    <MigrationAttempt key={attempt} onRetry={() => setAttempt((value) => value + 1)}>
      {children}
    </MigrationAttempt>
  );
}
