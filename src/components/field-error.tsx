import {
    StyleSheet,
    Text,
    useColorScheme,
} from 'react-native';

type FieldErrorProps = {
  message?: string;
};

export function FieldError({
  message,
}: FieldErrorProps) {
  const dark = useColorScheme() === 'dark';

  if (!message) {
    return null;
  }

  return (
    <Text
      accessibilityRole="alert"
      style={[
        styles.message,
        { color: dark ? '#FF8A80' : '#C62828' },
      ]}
    >
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
});