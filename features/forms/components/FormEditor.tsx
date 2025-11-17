import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Button } from '~/shared/components/ui/Button';
import Spacer from '~/shared/components/ui/Spacer';
import type { Form, FormDB } from '~/db/schema';
import GeneralSection from './Form/GeneralSection';
import WaterSection from './Form/WaterSection';
import HealthSection from './Form/HealthSection';
import { parseArrayFields } from '~/db/utils';

const validationSchema = Yup.object().shape({
  // Name is optional but allowed
  name: Yup.string().nullable(),
  village: Yup.string().nullable().required('Required'),
  villageId: Yup.string().nullable().required('Required'),
  pinId: Yup.string().nullable(),
  id: Yup.string().nullable(),
  // add more validations as needed
});

type FormProps = {
  onSubmit: (values: Form) => void;
  pinId: string;
  formId?: string;
  initialData: Partial<FormDB> | null;
};

export default function FormEditor({ onSubmit, pinId, initialData }: FormProps) {
  const mergedInitialValues = React.useMemo((): Form => {
    const normalizedInitialData = initialData ? parseArrayFields(initialData) : {};
    return {
      // Optional user-provided name for the form
      name: '',
      pinId: pinId,
      village: '',
      villageId: '',
      canAttend: '',
      longTermConditions: [],
      otherCondition: '',
      conditionDetails: '',
      managementMethods: [],
      otherManagement: '',
      whatDoWhenSick: [],
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
      coldAction: [],
      mskInjury: '',
      mskAction: [],
      hypertension: '',
      hypertensionAction: [],
      cholesterol: '',
      cholesterolAction: [],
      diabetes: '',
      diabetesAction: [],
      handBeforeMeal: '',
      handAfterToilet: '',
      eatCleanFood: '',
      otherLearning: '',
      waterSources: [],
      otherWaterSource: '',
      unsafeWater: [],
      knowWaterFilters: '',
      notUsingWaterFilter: [],
      otherWaterFilterReason: '',
      ...normalizedInitialData,
    } as Form;
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
