import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Button } from '~/shared/components/ui/Button';
import Spacer from '~/shared/components/ui/Spacer';
import type { Form, FormDB } from '~/db/schema';
import GeneralSection from './GeneralSection';
import WaterSection from './WaterSection';
import HealthSection from './HealthSection';
import ModalWrapper from '~/shared/components/ui/ModalWrapper';
import { parseArrayFields } from '~/shared/utils/parsing';
import EducationSection from './EducationSection';

const validationSchema = Yup.object().shape({
  name: Yup.string().nullable().required('Required'),
  village: Yup.string().required('Required'),
  villageId: Yup.string().required('Required'),
});

type FormModalProps = {
  visible: boolean;
  pinId: string;
  selectedForm: FormDB | null;
  onClose: () => void;
  onSubmit: (values: Form) => void;
};

export const FormModal = ({ visible, pinId, onClose, onSubmit, selectedForm }: FormModalProps) => {
  const mergedInitialValues = React.useMemo((): Form => {
    const normalizedInitialData = selectedForm ? parseArrayFields(selectedForm) : {};
    return {
      // Metadata
      id: '',
      createdAt: '',
      updatedAt: '',
      version: 1,
      pinId: pinId,

      // General
      villageId: '',
      name: '',
      gender: '',
      age: null,
      village: '',
      canAttendHealthScreening: null,

      // Health
      longTermConditions: [],
      otherLongTermConditions: '',
      managementMethods: [],
      otherManagementMethods: '',
      conditionDifficultyReasons: [],
      otherConditionDifficultyReasons: '',
      selfCareActions: [],
      otherSelfCareActions: '',
      knowWhereToFindDoctor: '',
      otherKnowWhereToFindDoctor: '',
      transportToClinic: '',
      otherTransportToClinic: '',
      medicinePurchaseLocations: '',
      otherMedicinePurchaseLocations: '',
      povertyCardSchemeAwareness: '',
      otherPovertyCardSchemeAwareness: '',
      povertyCardNonUseReasons: '',
      toothBrushingFrequency: '',
      otherToothBrushingFrequency: '',
      toothbrushAndToothpasteSource: '',
      noToothbrushOrToothpasteReasons: [],
      otherNoToothbrushOrToothpasteReasons: '',

      // Education
      diarrhoeaDefinition: [],
      otherDiarrhoeaDefinition: '',
      diarrhoeaActions: [],
      otherDiarrhoeaActions: '',
      commonColdSymptoms: [],
      otherCommonColdSymptoms: '',
      commonColdActions: [],
      otherCommonColdActions: '',
      mskInjuryDefinition: [],
      otherMskInjuryDefinition: '',
      mskInjuryActions: [],
      otherMskInjuryActions: '',
      hypertensionDefinition: [],
      otherHypertensionDefinition: '',
      hypertensionActions: [],
      otherHypertensionActions: '',
      healthyFoodFrequency: '',
      otherHealthyFoodFrequency: '',
      unhealthyFoodReasons: [],
      otherUnhealthyFoodReasons: '',
      highCholesterolDefinition: [],
      otherHighCholesterolDefinition: '',
      highCholesterolActions: [],
      otherHighCholesterolActions: '',
      diabetesDefinition: [],
      otherDiabetesDefinition: '',
      diabetesActions: [],
      otherDiabetesActions: '',
      otherLearningAreas: '',

      // Water
      waterSources: [],
      otherWaterSources: '',
      unsafeWaterTypes: [],
      otherUnsafeWaterTypes: '',
      waterFilterAwareness: '',
      otherWaterFilterAwareness: '',
      waterFilterNonUseReasons: [],
      otherWaterFilterNonUseReasons: '',
      handwashingAfterToilet: '',
      otherHandwashingAfterToilet: '',

      // Local-only field (sync status)
      status: '',

      ...normalizedInitialData,
    };
  }, [selectedForm, pinId]);

  return (
    <ModalWrapper
      title={selectedForm ? 'Edit Form' : 'Create Form'}
      visible={visible}
      onClose={onClose}>
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

            <EducationSection
              values={values}
              setFieldValue={setFieldValue}
              handleChange={handleChange}
            />

            <WaterSection
              values={values}
              setFieldValue={setFieldValue}
              handleChange={handleChange}
            />

            <Button title="Submit" onPress={() => handleSubmit()} />
            <Spacer />
          </ScrollView>
        )}
      </Formik>
    </ModalWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
