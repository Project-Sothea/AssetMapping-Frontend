import { View, StyleSheet } from 'react-native';

//default is size m space
const Spacer = () => {
  return <View style={styles.container}></View>;
};

export default Spacer;

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
});
