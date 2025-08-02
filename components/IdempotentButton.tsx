import { useState } from 'react';
import { Button } from './Button';

type IdempotentButtonProps = {
  title: string;
  onPress: () => void;
};

export function IdempotentButton({ title, onPress }: IdempotentButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePress = () => {
    if (isSubmitting) return; // Prevent re-entry

    setIsSubmitting(true);
    try {
      onPress();
    } catch (err) {
      console.error('Submit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return <Button title={title} onPress={handlePress} disabled={isSubmitting} />;
}
