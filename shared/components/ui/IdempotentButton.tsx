import { useState } from 'react';
import { Button } from './Button';
import type { ViewStyle } from 'react-native';

type IdempotentButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export function IdempotentButton({
  title,
  onPress,
  disabled = false,
  style,
}: IdempotentButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePress = () => {
    if (isSubmitting || disabled) return; // Prevent re-entry

    setIsSubmitting(true);
    try {
      onPress();
    } catch (err) {
      console.error('Submit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button title={title} onPress={handlePress} disabled={disabled || isSubmitting} style={style} />
  );
}
