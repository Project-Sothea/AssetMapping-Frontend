import React, { createContext, useContext, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Button } from 'react-native';

type StringLike = string | string[] | null;

type EditableFormContextType<T extends Record<string, StringLike>> = {
  form: T;
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
};

type EditableFormProps<T extends Record<string, StringLike>> = {
  initialValues: T;
  onSave: (values: T) => Promise<void>;
  onDelete: () => Promise<void>;
  children: React.ReactNode;
};

type EditableFieldProps = {
  key: string;
  label: string;
  multiline?: boolean;
  placeholder?: string;
};

const EditableFormContext = createContext<EditableFormContextType<any> | null>(null);

function useEditableFormContext<T extends Record<string, StringLike>>() {
  const ctx = useContext(EditableFormContext);
  if (!ctx) throw new Error('EditableForm.Field must be used inside EditableForm');
  return ctx as EditableFormContextType<T>;
}

// Parent
export function EditableForm<T extends Record<string, StringLike>>({
  initialValues,
  onSave,
  onDelete,
  children,
}: EditableFormProps<T>) {
  const [form, setForm] = useState(initialValues);
  const [isEditing, setIsEditing] = useState(false);

  const setField = <K extends keyof T>(key: K, value: T[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const contextValue: EditableFormContextType<T> = {
    form,
    setField,
    isEditing,
    setIsEditing,
  };

  return (
    <EditableFormContext.Provider value={contextValue as EditableFormContextType<any>}>
      <View>{children}</View>
    </EditableFormContext.Provider>
  );
}

// Child Components
EditableForm.Field = function EditableField<T extends Record<string, StringLike>>({
  key,
  label,
  multiline = false,
  placeholder = 'N/A',
}: EditableFieldProps) {
  const { form, setField, isEditing } = useEditableFormContext<T>();
  const value = form[key] || ''; //if value is null

  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}: </Text>
      {isEditing ? (
        <TextInput
          value={value}
          onChangeText={(text) => setField(key, text)}
          multiline={multiline}
          placeholder={placeholder}
          style={[styles.input, multiline && { height: 60 }]}
        />
      ) : (
        <Text>{value || placeholder}</Text>
      )}
    </View>
  );
};

EditableForm.Actions = function EditableActions({
  onSave,
}: {
  onSave: (form: Record<string, string | null>) => Promise<void>;
}) {
  const { isEditing, setIsEditing, form } = useEditableFormContext();

  const handleSave = async () => {
    try {
      await onSave(form);
      setIsEditing(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  return (
    <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
      {isEditing ? (
        <>
          <Button title="Save" onPress={handleSave} />
          <Button title="Cancel" onPress={() => setIsEditing(false)} />
        </>
      ) : (
        <Button title="Edit" onPress={() => setIsEditing(true)} />
      )}
    </View>
  );
};

EditableForm.Delete = function EditableDelete({ onDelete }: { onDelete: () => Promise<void> }) {
  const { isEditing } = useEditableFormContext();

  return (
    isEditing && (
      <Button
        title="Delete"
        onPress={async () => {
          try {
            await onDelete();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete.');
          }
        }}
      />
    )
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  imageScroll: {
    marginBottom: 12,
  },
  image: {
    width: 120,
    height: 120,
    marginRight: 10,
    borderRadius: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 6,
    borderRadius: 6,
    flex: 1,
  },
});
