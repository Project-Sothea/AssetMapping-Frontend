import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Alert, Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FormSection from './FormSection';
import GeneralSection from './GeneralSection';
import WaterSection from './WaterSection';
import HealthSection from './HealthSection';
import EducationSection from './EducationSection';
import { useCreateForm } from '../hooks/useCreateForm';
import { useUpdateForm } from '../hooks/useUpdateForm';
import { useDeleteForm } from '../hooks/useDeleteForm';
import type { Form, FormValues } from '../types';
import { ErrorHandler } from '~/shared/utils/errorHandling';
import Spacer from '~/shared/components/ui/Spacer';
import { MaterialIcons } from '@expo/vector-icons';

const formSchema = z.looseObject({
  name: z.string().trim().min(1, 'Required'),
  village: z.string().trim().min(1, 'Required'),
  villageId: z.string().trim().min(1, 'Required'),
});

type FormEditorProps = {
  pinId: string;
  selectedForm: Form | null;
  onClose: () => void;
  isEditing: boolean;
  onToggleEdit?: (next: boolean) => void;
};

type SectionOrder = 'general' | 'health' | 'education' | 'water';

export function FormEditor({
  pinId,
  selectedForm,
  onClose,
  isEditing,
  onToggleEdit,
}: FormEditorProps) {
  const { createFormAsync } = useCreateForm();
  const { updateFormAsync } = useUpdateForm();
  const { deleteFormAsync } = useDeleteForm();
  const [expandedSection, setExpandedSection] = useState<SectionOrder>('general');

  const isCreate = selectedForm === null;

  const defaults = useMemo((): FormValues => {
    if (!isCreate) return selectedForm!;
    return {
      pinId,
      villageId: '',
      name: '',
      gender: '',
      age: null,
      village: '',
      canAttendHealthScreening: null,
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
    };
  }, [isCreate, selectedForm, pinId]);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, touchedFields },
  } = useForm<FormValues>({
    defaultValues: defaults,
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (selectedForm) {
      reset(selectedForm);
    } else {
      reset(defaults);
    }
  }, [selectedForm, reset, defaults]);

  useEffect(() => {
    setExpandedSection('general');
    onToggleEdit?.(!selectedForm);
  }, [selectedForm, onToggleEdit]);

  const values = watch();

  const fieldErrors: Partial<Record<keyof FormValues, string>> = useMemo(() => {
    const next: Partial<Record<keyof FormValues, string>> = {};
    Object.entries(errors).forEach(([key, value]) => {
      if (value && typeof value === 'object' && 'message' in value && value.message) {
        next[key as keyof FormValues] = String(value.message);
      }
    });
    return next;
  }, [errors]);

  const touched: Partial<Record<keyof FormValues, boolean>> = useMemo(() => {
    const next: Partial<Record<keyof FormValues, boolean>> = {};
    Object.keys(touchedFields).forEach((key) => {
      next[key as keyof FormValues] = true;
    });
    return next;
  }, [touchedFields]);

  type SetFieldValue = (field: keyof FormValues, value: FormValues[keyof FormValues]) => void;

  const setFieldValue: SetFieldValue = (field, value) => {
    if (!isEditing) return;
    setValue(field, value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  const handleChange =
    (field: keyof FormValues) =>
    (value: string | number | boolean | null): void => {
      setFieldValue(field, value as FormValues[keyof FormValues]);
    };

  const handleSubmitForm = async (vals: FormValues) => {
    console.log('✅ Submitting form with values:', vals);
    try {
      if (selectedForm) {
        await updateFormAsync({ id: selectedForm.id, values: vals });
        Alert.alert('Form Updated!');
      } else {
        await createFormAsync({ ...vals, pinId });
        Alert.alert('Form Created!');
      }
      onClose();
      onToggleEdit?.(!selectedForm);
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to submit form');
      ErrorHandler.showAlert(appError, 'Error');
    }
  };

  const handleDelete = async () => {
    if (!selectedForm) return;
    try {
      await deleteFormAsync(selectedForm.id);
      Alert.alert('Form Deleted!');
      onClose();
      onToggleEdit?.(false);
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to delete form');
      ErrorHandler.showAlert(appError, 'Error');
    }
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <FormSection
        title="General"
        isOpen={expandedSection === 'general'}
        onPress={() => setExpandedSection('general')}>
        <GeneralSection
          values={values}
          setFieldValue={setFieldValue}
          handleChange={handleChange}
          errors={fieldErrors}
          touched={touched}
          disabled={!isEditing}
        />
      </FormSection>

      <FormSection
        title="Health"
        isOpen={expandedSection === 'health'}
        onPress={() => setExpandedSection('health')}>
        <HealthSection
          values={values}
          setFieldValue={setFieldValue}
          handleChange={handleChange}
          disabled={!isEditing}
        />
      </FormSection>

      <FormSection
        title="Education"
        isOpen={expandedSection === 'education'}
        onPress={() => setExpandedSection('education')}>
        <EducationSection
          values={values}
          setFieldValue={setFieldValue}
          handleChange={handleChange}
          disabled={!isEditing}
        />
      </FormSection>

      <FormSection
        title="Water"
        isOpen={expandedSection === 'water'}
        onPress={() => setExpandedSection('water')}>
        <WaterSection
          values={values}
          setFieldValue={setFieldValue}
          handleChange={handleChange}
          disabled={!isEditing}
        />
      </FormSection>

      {isEditing ? (
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.saveBtn]} onPress={handleSubmit(handleSubmitForm)}>
            <MaterialIcons name="save" size={22} color="#fff" />
            <Text style={styles.saveLabel}>Save</Text>
          </TouchableOpacity>
          {!isCreate && (
            <>
              <TouchableOpacity onPress={handleDelete} style={[styles.iconBtn, styles.danger]}>
                <MaterialIcons name="delete" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onToggleEdit?.(false)}
                style={[styles.iconBtn, styles.muted]}>
                <MaterialIcons name="visibility" size={22} color="#111" />
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        !isCreate && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.iconBtn, styles.editBtn]}
              onPress={() => onToggleEdit?.(true)}>
              <MaterialIcons name="edit" size={22} color="#1d4ed8" />
            </TouchableOpacity>
          </View>
        )
      )}
      <Spacer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  saveLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  iconBtn: {
    padding: 8,
    borderRadius: 10,
  },
  muted: {
    backgroundColor: '#e5e7eb',
  },
  danger: {
    backgroundColor: '#ef4444',
  },
  editBtn: {
    backgroundColor: '#e0ebff',
  },
});
