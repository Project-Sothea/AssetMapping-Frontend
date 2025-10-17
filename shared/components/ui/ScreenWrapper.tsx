import { StyleSheet, View } from 'react-native';

type ScreenContentProps = {
  children?: React.ReactNode;
};

export const ScreenWrapper = ({ children }: ScreenContentProps) => {
  return <View style={styles.container}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d1d5db',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
});
