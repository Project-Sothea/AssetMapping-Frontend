import React, { useState, useMemo, useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
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

const SECTION_ORDER = ['general', 'health', 'education', 'water'] as const;

export const FormModal = ({ visible, pinId, onClose, onSubmit, selectedForm }: FormModalProps) => {
  const [expandedSection, setExpandedSection] = useState<(typeof SECTION_ORDER)[number]>('general');

  const toggleSection = useCallback((section: (typeof SECTION_ORDER)[number]) => {
    setExpandedSection((prev) => (prev === section ? prev : section));
  }, []);

  const mergedInitialValues = useMemo((): Form => {
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
            <Section
              title="General"
              isOpen={expandedSection === 'general'}
              onPress={() => toggleSection('general')}>
              <GeneralSection
                values={values}
                setFieldValue={setFieldValue}
                handleChange={handleChange}
                handleBlur={handleBlur}
                errors={errors}
                touched={touched}
              />
            </Section>

            <Section
              title="Health"
              isOpen={expandedSection === 'health'}
              onPress={() => toggleSection('health')}>
              <HealthSection
                values={values}
                setFieldValue={setFieldValue}
                handleChange={handleChange}
              />
            </Section>

            <Section
              title="Education"
              isOpen={expandedSection === 'education'}
              onPress={() => toggleSection('education')}>
              <EducationSection
                values={values}
                setFieldValue={setFieldValue}
                handleChange={handleChange}
              />
            </Section>

            <Section
              title="Water"
              isOpen={expandedSection === 'water'}
              onPress={() => toggleSection('water')}>
              <WaterSection
                values={values}
                setFieldValue={setFieldValue}
                handleChange={handleChange}
              />
            </Section>

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
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f4f4f5',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: '#111827',
  },
  sectionBody: {
    marginBottom: 16,
  },
});

type SectionProps = {
  title: string;
  isOpen: boolean;
  onPress: () => void;
  children: React.ReactNode;
};

function Section({ title, isOpen, onPress, children }: SectionProps) {
  return (
    <View style={{ marginBottom: 4 }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text>{isOpen ? '−' : '+'}</Text>
      </TouchableOpacity>
      {isOpen && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}
