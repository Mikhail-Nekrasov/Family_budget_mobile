import { useState, type ReactNode } from 'react';
import {
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ScreenBackground } from '@/components/screen-background';
import { useLanguage } from '@/hooks/use-language';

export type IconSelectOption = {
  value: string;
  label: string;
};

type CompactIconSelectProps = {
  title: string;
  options: readonly IconSelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  renderIcon: (
    value: string,
    color: string,
    size: number,
  ) => ReactNode;
  disabled?: boolean;
  showLabels?: boolean;
  previewValues?: readonly string[];
  renderCreateForm?: (
    onCreated: (value: string) => void,
    onCancel: () => void,
  ) => ReactNode;
};

export function CompactIconSelect({
  title,
  options,
  value,
  onChange,
  renderIcon,
  disabled = false,
  showLabels = false,
  previewValues,
  renderCreateForm,
}: CompactIconSelectProps) {
  const { translations } = useLanguage();
  const dark = useColorScheme() === 'dark';
  const [expanded, setExpanded] = useState(false);
  const [pendingValue, setPendingValue] = useState<string | null>(
    value,
  );
  const [creating, setCreating] = useState(false);

  const palette = dark
    ? {
        background: '#111722',
        text: '#F0F3FA',
        border: '#333F52',
        accent: '#A0B8FF',
        selected: 'rgba(160, 184, 255, 0.12)',
        card: '#1C2432',
      }
    : {
        background: '#F5F6F9',
        text: '#192238',
        border: '#E0E5EE',
        accent: '#365BBC',
        selected: 'rgba(54, 91, 188, 0.08)',
        card: '#FFFFFF',
      };

  const previewOptions: IconSelectOption[] =
    previewValues === undefined
      ? options.slice(0, 3)
      : previewValues
          .map((id) => options.find((option) => option.value === id))
          .filter(
            (option): option is IconSelectOption =>
              option !== undefined,
          )
          .slice(0, 3);
  const selectedOption = options.find(
    (option) => option.value === value,
  );

  if (
    selectedOption &&
    !previewOptions.some((option) => option.value === value)
  ) {
    if (previewOptions.length < 3) {
      previewOptions.push(selectedOption);
    } else {
      previewOptions[2] = selectedOption;
    }
  }

  function closeOptions() {
    setCreating(false);
    setExpanded(false);
  }

  function finishCreating(createdValue: string) {
    onChange(createdValue);
    closeOptions();
  }

  function openOptions() {
    if (disabled) {
      return;
    }

    Keyboard.dismiss();

    setPendingValue(value);
    setCreating(false);
    setExpanded(true);
  }

  function confirmSelection() {
    if (disabled || pendingValue === null) {
      return;
    }

    onChange(pendingValue);
    setExpanded(false);
  }

  function renderOption(
    option: IconSelectOption,
    inModal = false,
  ) {
    const selected = option.value === (
      inModal ? pendingValue : value
    );
    const color = selected ? palette.accent : palette.text;

    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={option.label}
        accessibilityState={{
          checked: selected,
          disabled,
        }}
        disabled={disabled}
        onPress={() => {
          Keyboard.dismiss();
          
          if (inModal) {
            setPendingValue(option.value);
          } else {
            onChange(option.value);
          }
        }}
        style={({ pressed }) => [
          styles.option,
          {
            opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.iconBox,
            {
              borderColor: selected
                ? palette.accent
                : palette.border,
              backgroundColor: palette.card,
            },
          ]}
        >
          {renderIcon(option.value, color, 28)}
        </View>

        {showLabels && (
          <Text
            numberOfLines={2}
            style={[
              styles.optionLabel,
              { color },
            ]}
          >
            {option.label}
          </Text>
        )}
      </Pressable>
    );
  }

  return (
    <>
      <View style={styles.preview}>
        {[0, 1, 2].map((index) => {
          const option = previewOptions[index];

          return (
            <View
              key={option?.value ?? `empty-${index}`}
              style={styles.cell}
            >
              {option && renderOption(option)}
            </View>
          );
        })}

        <View style={styles.cell}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translations.showAllOptions}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={openOptions}
            style={({ pressed }) => [
              styles.option,
              {
                opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.iconBox,
                { borderColor: palette.border },
              ]}
            >
              <Text
                accessible={false}
                style={[
                  styles.more,
                  { color: palette.accent },
                ]}
              >
                …
              </Text>
            </View>

            {showLabels && (
              <Text
                numberOfLines={2}
                style={[
                  styles.optionLabel,
                  { color: palette.text },
                ]}
              >
                {translations.showAllOptions}
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      <Modal
        visible={expanded}
        animationType="slide"
        presentationStyle="fullScreen"
        backdropColor={palette.background}
        onRequestClose={() => {
          if (creating) {
            setCreating(false);
          } else {
            closeOptions();
          }
        }}
      >
        {expanded && (
          <SafeAreaProvider
            style={[
              styles.screen,
              { backgroundColor: palette.background },
            ]}
          >
            {creating && renderCreateForm ? (
              renderCreateForm(
                finishCreating,
                () => setCreating(false),
              )
            ) : (
              <ScreenBackground>
              <SafeAreaView style={styles.screen}>
                <Text
                  style={[
                    styles.title,
                    { color: palette.text },
                  ]}
                >
                  {title}
                </Text>

                <FlatList
                  data={options}
                  extraData={pendingValue}
                  numColumns={4}
                  keyExtractor={(option) => option.value}
                  contentContainerStyle={styles.grid}
                  renderItem={({ item }) => (
                    <View style={styles.cell}>
                      {renderOption(item, true)}
                    </View>
                  )}
                  ListFooterComponent={
                    renderCreateForm ? (
                      <View style={styles.createRow}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={translations.newCategory}
                          onPress={() => setCreating(true)}
                          style={({ pressed }) => [
                            styles.createButton,
                            {
                              backgroundColor: palette.accent,
                              opacity: pressed ? 0.75 : 1,
                            },
                          ]}
                        >
                          <Text
                            accessible={false}
                            style={[
                              styles.createSymbol,
                              { color: palette.background },
                            ]}
                          >
                            ＋
                          </Text>
                        </Pressable>
                      </View>
                    ) : undefined
                  }
                />

                <View style={styles.footer}>
                  <AppButton
                    title={translations.select}
                    nativeGlass
                    disabled={
                      disabled ||
                      pendingValue === null ||
                      !options.some(
                        (option) => option.value === pendingValue,
                      )
                    }
                    onPress={confirmSelection}
                  />

                  <AppButton
                    title={translations.cancel}
                    nativeGlass
                    onPress={() => setExpanded(false)}
                  />
                </View>
              </SafeAreaView>
              </ScreenBackground>
            )}
          </SafeAreaProvider>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  preview: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  cell: {
    width: '25%',
    padding: 4,
  },
  option: {
    alignItems: 'center',
    gap: 6,
  },
  iconBox: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 1,
  },
  optionLabel: {
    width: '100%',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
  more: {
    fontSize: 30,
    lineHeight: 34,
  },
  title: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    fontSize: 24,
    fontWeight: '600',
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  footer: {
    padding: 20,
    gap: 12,
  },
  createRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 4,
    paddingTop: 16,
    paddingBottom: 8,
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createSymbol: {
    fontSize: 30,
    lineHeight: 36,
  },
});