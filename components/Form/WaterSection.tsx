import { View, Text, StyleSheet } from 'react-native';
import CheckboxGroup from './CheckboxGroup';
import RadioGroup from './RadioGroup';

export default function WaterSection({ values, setFieldValue, handleChange }: any) {
  return (
    <View>
      <Text style={styles.heading}>Water</Text>

      <Text style={styles.question}>Where do you get your water from?</Text>
      <CheckboxGroup
        name="waterSources"
        options={['River', 'Pond', 'Well', 'Tap', 'Other']}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherWaterSource"
        otherValue={values.otherWaterSource}
        onOtherChange={handleChange('otherWaterSource')}
      />

      <Text style={styles.question}>Which water sources are unsafe? (select all that apply)</Text>
      <CheckboxGroup
        name="unsafeWater"
        options={['River', 'Pond', 'Well', 'Tap', "Don't know"]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.question}>Do you know what water filters are used for?</Text>
      <RadioGroup
        name="knowWaterFilters"
        options={[
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.question}>If you do not use water filters, why not?</Text>
      <CheckboxGroup
        name="notUsingWaterFilter"
        options={['Expensive', 'Don’t know how to use', 'Don’t have access', 'Other']}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherWaterFilterReason"
        otherValue={values.otherWaterFilterReason}
        onOtherChange={handleChange('otherWaterFilterReason')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontWeight: 'bold',
    fontSize: 20,
    marginVertical: 12,
  },
  question: {
    fontSize: 16,
    fontWeight: "500",
    marginVertical: 6,
    color: "#333"
   },

});
