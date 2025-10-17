import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Button } from '~/shared/components/ui/Button';
import Spacer from '~/shared/components/ui/Spacer';
import { Form as FormType } from '~/utils/globalTypes';
import GeneralSection from '../Form/GeneralSection';
import WaterSection from '../Form/WaterSection';
import HealthSection from '../Form/HealthSection';
import { parseArrayFields } from '~/utils/dataShapes';

const validationSchema = Yup.object().shape({
  village: Yup.string().nullable().required('Required'),
  villageId: Yup.string().nullable().required('Required'),
  pinId: Yup.string().nullable(),
  id: Yup.string().nullable(),
  // add more validations as needed
});

type FormProps = {
  onSubmit: (values: any) => void;
  pinId: string;
  formId?: string;
  initialData: Partial<FormType> | null;
};

export default function Form({ onSubmit, pinId, initialData }: FormProps) {
  const mergedInitialValues = React.useMemo(() => {
    const normalizedInitialData = initialData ? parseArrayFields(snakeToCamel(initialData)) : {};
    return {
      pinId: pinId,
      village: '',
      villageId: '',
      canAttend: '',
      longTermConditions: [] as string[],
      otherCondition: '',
      conditionDetails: '',
      managementMethods: [] as string[],
      otherManagement: '',
      whatDoWhenSick: [] as string[],
      otherSickAction: '',
      knowDoctor: '',
      ownTransport: '',
      whereBuyMedicine: '',
      otherBuyMedicine: '',
      povertyCard: '',
      brushTeeth: '',
      otherBrushTeeth: '',
      haveToothbrush: '',
      diarrhoea: '',
      diarrhoeaAction: '',
      coldLookLike: '',
      coldAction: [] as string[],
      mskInjury: '',
      mskAction: [] as string[],
      hypertension: '',
      hypertensionAction: [] as string[],
      cholesterol: '',
      cholesterolAction: [] as string[],
      diabetes: '',
      diabetesAction: [] as string[],
      handBeforeMeal: '',
      handAfterToilet: '',
      eatCleanFood: '',
      otherLearning: '',
      waterSources: [] as string[],
      otherWaterSource: '',
      unsafeWater: [] as string[],
      knowWaterFilters: '',
      notUsingWaterFilter: [] as string[],
      otherWaterFilterReason: '',
      ...normalizedInitialData,
    };
  }, [initialData, pinId]);

  return (
    <Formik
      initialValues={mergedInitialValues}
      enableReinitialize={true}
      validationSchema={validationSchema}
      onSubmit={onSubmit}>
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
          <GeneralSection
            values={values}
            setFieldValue={setFieldValue}
            handleChange={handleChange}
            handleBlur={handleBlur}
            errors={errors}
            touched={touched}
          />

          <HealthSection
            values={values}
            setFieldValue={setFieldValue}
            handleChange={handleChange}
            errors={errors}
            touched={touched}
          />

          <WaterSection values={values} setFieldValue={setFieldValue} handleChange={handleChange} />

          <Button title="Submit" onPress={() => handleSubmit()} />
          <Spacer />
        </ScrollView>
      )}
    </Formik>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});

function snakeToCamel(obj: any) {
  const newObj: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/(_\w)/g, (m) => m[1].toUpperCase());
    newObj[camelKey] = obj[key];
  }
  return newObj;
}
