import type { Form } from '@assetmapping/shared-types';
import { MaterialIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { ScrollView, Alert, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { z } from 'zod';

import { useTransferState } from '~/hooks/RealTimeSync/useTransferState';
import Spacer from '~/shared/components/ui/Spacer';
import { ErrorHandler } from '~/shared/utils/errorHandling';

import { useCreateForm } from '../hooks/useCreateForm';
import { useDeleteForm } from '../hooks/useDeleteForm';
import { useUpdateForm } from '../hooks/useUpdateForm';
import type { FormValues } from '../types';

import EducationSection from './EducationSection';
import FormSection from './FormSection';
import GeneralSection from './GeneralSection';
import HealthSection from './HealthSection';
import WaterSection from './WaterSection';

const formSchema = z.looseObject({
  village: z.string().trim().min(1, 'Required'),
  dataCollectionDate: z.string().trim().min(1, 'Required'),
  age: z
    .number()
    .int('Use a whole number')
    .nonnegative('Age cannot be negative')
    .nullable()
    .optional(),
});

type FormEditorProps = {
  pinId: string;
  selectedForm: Form | null;
  onClose: () => void;
  isEditing: boolean;
  onToggleEdit?: (next: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
  onCloseGuardChange?: (guard: (() => void) | null) => void;
};

type SectionOrder = 'general' | 'conflict' | 'health' | 'education' | 'water';

const formatCollectionDate = () =>
  new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export function FormEditor({
  pinId,
  selectedForm,
  onClose,
  isEditing,
  onToggleEdit,
  onBusyChange,
  onCloseGuardChange,
}: FormEditorProps) {
  const { createFormAsync } = useCreateForm();
  const { updateFormAsync } = useUpdateForm();
  const { deleteFormAsync } = useDeleteForm();
  const { busy: transferBusy } = useTransferState();
  const actionRunning = useRef(false);
  const [busy, setBusy] = useState(false);
  const [expandedSection, setExpandedSection] = useState<SectionOrder>('general');

  const isCreate = selectedForm === null;

  const defaults = useMemo((): FormValues => {
    if (!isCreate) {
      return { ...selectedForm! };
    }
    return {
      pinId,
      villageId: '',
      name: '',
      dataCollectionDate: formatCollectionDate(),
      householdNumber: '',
      gender: '',
      age: null,
      village: '',
      otherVillage: '',
      canAttendHealthScreening: null,
      conflictHealthcareAccess: '',
      conflictHealthManagement: '',
      conflictCleanWaterAccess: '',
      conflictCostOfLiving: '',
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
      medicinePurchaseLocations: [],
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
      waterHealthConsequences: '',
      waterSocioeconomicConsequences: '',
      waterFilterAwareness: '',
      otherWaterFilterAwareness: '',
      waterFilterExperience: '',
      waterFilterNonUseReasons: [],
      otherWaterFilterNonUseReasons: '',
      handwashingAfterToilet: '',
      otherHandwashingAfterToilet: '',
      handwashingBeforeMeals: '',
      handwashingBeforeMealsReason: '',
      pressingHealthNeed: '',
    };
  }, [isCreate, selectedForm, pinId]);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, touchedFields, isDirty },
  } = useForm<FormValues>({
    defaultValues: defaults,
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    mode: 'onBlur',
  });

  useEffect(() => {
    reset(defaults);
  }, [selectedForm, reset, defaults]);

  useEffect(() => {
    setExpandedSection('general');
    onToggleEdit?.(!selectedForm);
  }, [selectedForm, onToggleEdit]);

  useEffect(() => {
    onCloseGuardChange?.(() => {
      if (actionRunning.current || transferBusy) return;
      if (isEditing && isDirty)
        Alert.alert(
          'Discard unsaved changes?',
          'These changes have not been saved on this device.',
          [
            { text: 'Keep editing', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: onClose },
          ]
        );
      else onClose();
    });
    return () => onCloseGuardChange?.(null);
  }, [isDirty, isEditing, onClose, onCloseGuardChange, transferBusy]);

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
    if (!isEditing || transferBusy || actionRunning.current) return;
    setValue(field, value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  const handleChange =
    (field: keyof FormValues) =>
    (value: string | number | boolean | null): void => {
      setFieldValue(field, value as FormValues[keyof FormValues]);
    };

  const handleSubmitForm = async (vals: FormValues) => {
    try {
      const parentPinId = selectedForm ? selectedForm.pinId : pinId;
      if (typeof parentPinId !== 'string' || !parentPinId.trim())
        throw new Error(
          'Please reopen the pin before saving this form. Your answers are still here.'
        );
      const submissionValues: FormValues = {
        ...vals,
        pinId: parentPinId,
        name: vals.name?.trim() ?? '',
        dataCollectionDate: vals.dataCollectionDate?.trim() ?? vals.dataCollectionDate,
        householdNumber: vals.householdNumber?.trim() ?? vals.householdNumber,
        villageId: vals.villageId?.trim() ?? '',
      };
      if (selectedForm) {
        await updateFormAsync({
          id: selectedForm.id,
          values: submissionValues,
          baseline: selectedForm,
        });
        Alert.alert('Form Updated', 'Saved on this device · waiting to sync');
      } else {
        await createFormAsync(submissionValues);
        Alert.alert('Form Created', 'Saved on this device · waiting to sync');
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
      await deleteFormAsync({ id: selectedForm.id, baseline: selectedForm });
      Alert.alert('Form Deleted!');
      onClose();
      onToggleEdit?.(false);
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to delete form');
      ErrorHandler.showAlert(appError, 'Error');
    }
  };

  const runAction = async (action: () => Promise<void>) => {
    if (actionRunning.current || transferBusy) return;
    actionRunning.current = true;
    setBusy(true);
    onBusyChange?.(true);
    try {
      await action();
    } finally {
      actionRunning.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  const confirmDelete = () => {
    if (actionRunning.current || transferBusy) return;
    Alert.alert('Delete this form?', 'This will also delete it from the server when synced.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => runAction(handleDelete) },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled">
      {isEditing && isDirty && (
        <Text accessibilityLiveRegion="polite">Unsaved changes · tap Save</Text>
      )}
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
          disabled={!isEditing || busy || transferBusy}
        />
      </FormSection>

      <FormSection
        title="Conflict Impact"
        isOpen={expandedSection === 'conflict'}
        onPress={() => setExpandedSection('conflict')}>
        <GeneralSection
          values={values}
          setFieldValue={setFieldValue}
          handleChange={handleChange}
          errors={fieldErrors}
          touched={touched}
          disabled={!isEditing || busy || transferBusy}
          mode="conflict"
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
          disabled={!isEditing || busy || transferBusy}
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
          disabled={!isEditing || busy || transferBusy}
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
          disabled={!isEditing || busy || transferBusy}
        />
      </FormSection>

      {isEditing ? (
        <View style={styles.actionRow}>
          {busy && <Text accessibilityLiveRegion="polite">Saving on this device…</Text>}
          <TouchableOpacity
            style={[styles.iconBtn, styles.save]}
            accessibilityLabel="Save form"
            accessibilityState={{ disabled: busy, busy }}
            disabled={busy || transferBusy}
            onPress={() =>
              runAction(
                handleSubmit(handleSubmitForm, () => {
                  setExpandedSection('general');
                  Alert.alert(
                    'Please review the form',
                    'Choose a village, enter the collection date, and use a whole number for age or leave it blank.'
                  );
                })
              )
            }>
            <MaterialIcons name="save" size={24} color="#fff" />
          </TouchableOpacity>
          {!isCreate && (
            <>
              <TouchableOpacity
                accessibilityLabel="Delete form"
                disabled={busy || transferBusy}
                onPress={confirmDelete}
                style={[styles.iconBtn, styles.danger]}>
                <MaterialIcons name="delete" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                disabled={busy || transferBusy}
                onPress={() => onToggleEdit?.(false)}
                style={[styles.iconBtn, styles.muted]}>
                <MaterialIcons name="visibility" size={24} color="#111" />
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
              <MaterialIcons name="edit" size={24} color="#1d4ed8" />
            </TouchableOpacity>
          </View>
        )
      )}
      <Spacer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  save: {
    backgroundColor: '#10b981',
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
