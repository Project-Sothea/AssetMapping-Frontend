import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '~/shared/components/ui/Button';
import Spacer from '~/shared/components/ui/Spacer';
import type { Form, FormDB } from '~/db/schema';
import GeneralSection from './GeneralSection';
import WaterSection from './WaterSection';
import HealthSection from './HealthSection';
import ModalWrapper from '~/shared/components/ui/ModalWrapper';
import { parseArrayFields } from '~/shared/utils/parsing';
import EducationSection from './EducationSection';

const validationSchema = z.object({
  name: z.string().trim().min(1, 'Required'),
  village: z.string().trim().min(1, 'Required'),
  villageId: z.string().trim().min(1, 'Required'),
});

type FormModalProps = {
  visible: boolean;
  pinId: string;
  selectedForm: FormDB | null;
  onClose: () => void;
  onSubmit: (values: Form) => void;
};

type SectionOrder = 'general' | 'health' | 'education' | 'water';

export const FormModal = ({ visible, pinId, onClose, onSubmit, selectedForm }: FormModalProps) => {
  const [expandedSection, setExpandedSection] = useState<SectionOrder>('general');

  const toggleSection = useCallback((section: SectionOrder) => {
    setExpandedSection((prev) => (prev === section ? prev : section));
  }, []);

  const mergedInitialValues = useMemo((): Form => {
    const normalizedInitialData = selectedForm ? parseArrayFields(selectedForm) : {};
    const base: Form = {
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
      longTermConditions: [] as string[],
      otherLongTermConditions: '',
      managementMethods: [] as string[],
      otherManagementMethods: '',
      conditionDifficultyReasons: [] as string[],
      otherConditionDifficultyReasons: '',
      selfCareActions: [] as string[],
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
      noToothbrushOrToothpasteReasons: [] as string[],
      otherNoToothbrushOrToothpasteReasons: '',

      // Education
      diarrhoeaDefinition: [] as string[],
      otherDiarrhoeaDefinition: '',
      diarrhoeaActions: [] as string[],
      otherDiarrhoeaActions: '',
      commonColdSymptoms: [] as string[],
      otherCommonColdSymptoms: '',
      commonColdActions: [] as string[],
      otherCommonColdActions: '',
      mskInjuryDefinition: [] as string[],
      otherMskInjuryDefinition: '',
      mskInjuryActions: [] as string[],
      otherMskInjuryActions: '',
      hypertensionDefinition: [] as string[],
      otherHypertensionDefinition: '',
      hypertensionActions: [] as string[],
      otherHypertensionActions: '',
      healthyFoodFrequency: '',
      otherHealthyFoodFrequency: '',
      unhealthyFoodReasons: [] as string[],
      otherUnhealthyFoodReasons: '',
      highCholesterolDefinition: [] as string[],
      otherHighCholesterolDefinition: '',
      highCholesterolActions: [] as string[],
      otherHighCholesterolActions: '',
      diabetesDefinition: [] as string[],
      otherDiabetesDefinition: '',
      diabetesActions: [] as string[],
      otherDiabetesActions: '',
      otherLearningAreas: '',

      // Water
      waterSources: [] as string[],
      otherWaterSources: '',
      unsafeWaterTypes: [] as string[],
      otherUnsafeWaterTypes: '',
      waterFilterAwareness: '',
      otherWaterFilterAwareness: '',
      waterFilterNonUseReasons: [] as string[],
      otherWaterFilterNonUseReasons: '',
      handwashingAfterToilet: '',
      otherHandwashingAfterToilet: '',

      // Local-only field (sync status)
      status: '',
    };

    const merged = { ...base, ...normalizedInitialData } as Form;

    // Ensure required text fields are strings (not null) to satisfy validation
    merged.name = (merged.name ?? '') as string;
    merged.village = (merged.village ?? '') as string;
    merged.villageId = (merged.villageId ?? '') as string;

    return merged;
  }, [selectedForm, pinId]);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, touchedFields },
  } = useForm<Form>({
    defaultValues: mergedInitialValues,
    resolver: zodResolver(validationSchema) as unknown as Resolver<Form>,
    mode: 'onBlur',
  });

  useEffect(() => {
    reset(mergedInitialValues);
  }, [mergedInitialValues, reset]);

  const values = watch();

  const fieldErrors: Partial<Record<keyof Form, string>> = useMemo(() => {
    const next: Partial<Record<keyof Form, string>> = {};
    Object.entries(errors).forEach(([key, value]) => {
      if (value && typeof value === 'object' && 'message' in value && value.message) {
        next[key as keyof Form] = String(value.message);
      }
    });
    return next;
  }, [errors]);

  const touched: Partial<Record<keyof Form, boolean>> = useMemo(() => {
    const next: Partial<Record<keyof Form, boolean>> = {};
    Object.keys(touchedFields).forEach((key) => {
      next[key as keyof Form] = true;
    });
    return next;
  }, [touchedFields]);

  type SetFieldValue = (field: keyof Form, value: Form[keyof Form]) => void;

  const setFieldValue: SetFieldValue = (field, value) => {
    setValue(field, value, { shouldValidate: true, shouldDirty: true });
  };

  const handleChange =
    (field: keyof Form) =>
    (value: string | number | boolean | null): void => {
      setFieldValue(field, value as Form[keyof Form]);
    };

  return (
    <ModalWrapper
      title={selectedForm ? 'Edit Form' : 'Create Form'}
      visible={visible}
      onClose={onClose}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Section
          title="General"
          isOpen={expandedSection === 'general'}
          onPress={() => toggleSection('general')}>
          <GeneralSection
            values={values}
            setFieldValue={setFieldValue}
            handleChange={handleChange}
            errors={fieldErrors}
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
          <WaterSection values={values} setFieldValue={setFieldValue} handleChange={handleChange} />
        </Section>

        <Button title="Submit" onPress={handleSubmit(onSubmit)} />
        <Spacer />
      </ScrollView>
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
