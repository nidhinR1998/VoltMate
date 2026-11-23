import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Check, ChevronRight } from "lucide-react-native";
import { COLORS, ELEVATION, SPACING, TYPOGRAPHY } from "../../theme/tokens";

// Hook to respect OS "Reduce Motion" accessibility preference
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(Boolean(enabled));
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        if (mounted) setReduceMotion(Boolean(enabled));
      }
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduceMotion;
}

// ============================================================================
// 1. AppButton (primary / secondary / tertiary / destructive + loading morph)
// ============================================================================
export interface AppButtonProps {
  label?: string;
  title?: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "tertiary" | "destructive";
  size?: "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export const AppButton: React.FC<AppButtonProps> = ({
  label,
  title,
  onPress,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled = false,
  icon,
  rightIcon,
  accessibilityLabel,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const buttonLabel = label ?? title ?? "";
  const reduceMotion = useReduceMotion();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (reduceMotion || disabled || loading) return;
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (reduceMotion) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const bgStyle: ViewStyle =
    variant === "primary"
      ? { backgroundColor: COLORS.primary }
      : variant === "secondary"
      ? {
          backgroundColor: COLORS.bgSurface,
          borderWidth: 1.5,
          borderColor: COLORS.primary,
        }
      : variant === "destructive"
      ? {
          backgroundColor: COLORS.destructive,
        }
      : { backgroundColor: COLORS.bgSubtle };

  const labelColor =
    variant === "primary" || variant === "destructive"
      ? COLORS.textInverse
      : variant === "secondary"
      ? COLORS.primary
      : COLORS.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || buttonLabel}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.buttonBase,
        size === "lg" ? styles.buttonLg : styles.buttonMd,
        bgStyle,
        fullWidth && { width: "100%" },
        (disabled || loading) && { opacity: 0.65 },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.buttonContentRow,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={labelColor} />
        ) : (
          <>
            {icon}
            <Text
              style={[styles.buttonText, { color: labelColor }, textStyle]}
              numberOfLines={1}
            >
              {buttonLabel}
            </Text>
            {rightIcon}
          </>
        )}
      </Animated.View>
    </Pressable>
  );
};

// ============================================================================
// 2. AppToggle (~52x32 custom switch whose thumb NEVER overflows the track)
// ============================================================================
export interface AppToggleProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}

export const AppToggle: React.FC<AppToggleProps> = ({
  value,
  onValueChange,
  accessibilityLabel = "Toggle setting",
  disabled = false,
}) => {
  const reduceMotion = useReduceMotion();
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(value ? 1 : 0);
      return;
    }
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, reduceMotion]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 23],
  });

  const trackBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#CBD4CF", COLORS.primary],
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={() => onValueChange(!value)}
      style={styles.toggleHitWrap}
    >
      <Animated.View style={[styles.toggleTrack, { backgroundColor: trackBg }]}>
        <Animated.View
          style={[styles.toggleThumb, { transform: [{ translateX }] }]}
        />
      </Animated.View>
    </Pressable>
  );
};

// ============================================================================
// 3. AppChip (Unified selection pattern for all filter/option chips)
// ============================================================================
export interface AppChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export const AppChip: React.FC<AppChipProps> = ({
  label,
  selected = false,
  onPress,
  icon,
  accessibilityLabel,
  style,
}) => {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ selected }}
      activeOpacity={0.82}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.chipBase,
        selected ? styles.chipSelected : styles.chipUnselected,
        style,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.chipText,
          selected ? styles.chipTextSelected : styles.chipTextUnselected,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// ============================================================================
// 4. SegmentedControl (Shares the exact same selected style as AppChip)
// ============================================================================
export interface SegmentOption<T extends string> {
  key: T;
  label: string;
  count?: number;
}

export interface SegmentedControlProps<T extends string> {
  options: Array<SegmentOption<T>>;
  value?: T;
  selectedKey?: T;
  onChange: (next: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  selectedKey,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const activeKey = value ?? selectedKey;
  return (
    <View style={[styles.segmentedTrack, style]} accessibilityRole="tablist">
      {options.map((opt) => {
        const active = opt.key === activeKey;
        const displayLabel =
          typeof opt.count === "number"
            ? `${opt.label} (${opt.count})`
            : opt.label;
        return (
          <TouchableOpacity
            key={opt.key}
            accessibilityRole="tab"
            accessibilityLabel={displayLabel}
            accessibilityState={{ selected: active }}
            activeOpacity={0.85}
            onPress={() => onChange(opt.key)}
            style={[
              styles.segmentButton,
              active && styles.segmentButtonActive,
            ]}
          >
            <Text
              style={[
                styles.segmentLabel,
                active && styles.segmentLabelActive,
              ]}
              numberOfLines={1}
            >
              {displayLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ============================================================================
// 5. AppCard (Unified card + ONE selectable card pattern: green border + check)
// ============================================================================
export interface AppCardProps {
  children: React.ReactNode;
  selected?: boolean;
  onPress?: () => void;
  elevation?: "level1" | "level2" | "none";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  showCheckBadge?: boolean;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  selected = false,
  onPress,
  elevation = "level1",
  style,
  accessibilityLabel,
  showCheckBadge,
}) => {
  const shouldShowCheck = showCheckBadge ?? Boolean(onPress && selected);
  const cardStyles: StyleProp<ViewStyle> = [
    styles.cardBase,
    elevation === "level1"
      ? ELEVATION.level1
      : elevation === "level2"
      ? ELEVATION.level2
      : undefined,
    selected ? styles.cardSelected : styles.cardUnselected,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected }}
        activeOpacity={0.86}
        onPress={onPress}
        style={cardStyles}
      >
        {children}
        {shouldShowCheck && (
          <View
            style={[
              styles.cardCheckCircle,
              selected && styles.cardCheckCircleActive,
            ]}
          >
            {selected && (
              <Check size={14} color={COLORS.textInverse} strokeWidth={2.5} />
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

// ============================================================================
// 6. SectionHeader
// ============================================================================
export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  onPressAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  onPressAction,
  style,
}) => {
  const handleAction = onActionPress ?? onPressAction;
  return (
    <View style={[styles.sectionHeaderWrap, style]}>
      <View style={{ flex: 1, paddingRight: SPACING.sm }}>
        <Text style={TYPOGRAPHY.h2}>{title}</Text>
        {subtitle ? (
          <Text style={[TYPOGRAPHY.caption, { marginTop: 2 }]}>{subtitle}</Text>
        ) : null}
      </View>
      {actionLabel && handleAction ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={handleAction}
          style={styles.sectionActionBtn}
        >
          <Text style={styles.sectionActionText}>{actionLabel} →</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

// ============================================================================
// 7. ListRow
// ============================================================================
export interface ListRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightAccessory?: React.ReactNode;
  rightElement?: React.ReactNode;
  showDivider?: boolean;
  isLast?: boolean;
  accessibilityLabel?: string;
}

export const ListRow: React.FC<ListRowProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  rightAccessory,
  rightElement,
  showDivider,
  isLast = false,
  accessibilityLabel,
}) => {
  const accessory = rightAccessory ?? rightElement;
  const shouldDivide = showDivider ?? !isLast;
  const content = (
    <View style={[styles.listRowWrap, shouldDivide && styles.listRowDivider]}>
      <View style={styles.listRowIconBox}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={TYPOGRAPHY.bodySemibold}>{title}</Text>
        {subtitle ? (
          <Text
            style={[TYPOGRAPHY.caption, { marginTop: 2 }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {accessory ??
        (onPress ? (
          <ChevronRight size={18} color={COLORS.textMuted} />
        ) : null)}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        activeOpacity={0.8}
        onPress={onPress}
      >
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

// ============================================================================
// 8. EmptyState
// ============================================================================
export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  subtitle?: string;
  actionLabel?: string;
  ctaLabel?: string;
  onActionPress?: () => void;
  onPressCta?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  subtitle,
  actionLabel,
  ctaLabel,
  onActionPress,
  onPressCta,
  style,
}) => {
  const bodyText = subtitle ?? description ?? "";
  const btnLabel = ctaLabel ?? actionLabel;
  const btnAction = onPressCta ?? onActionPress;
  const pulse = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion]);

  return (
    <View style={[styles.emptyCard, ELEVATION.level1, style]}>
      <Animated.View
        style={[styles.emptyIconCircle, { transform: [{ scale: pulse }] }]}
      >
        {icon}
      </Animated.View>
      <Text style={[TYPOGRAPHY.title, { textAlign: "center" }]}>{title}</Text>
      <Text
        style={[
          TYPOGRAPHY.body,
          {
            textAlign: "center",
            marginTop: SPACING.xs,
            marginBottom: btnLabel ? SPACING.lg : 0,
          },
        ]}
      >
        {bodyText}
      </Text>
      {btnLabel && btnAction ? (
        <AppButton label={btnLabel} onPress={btnAction} variant="primary" />
      ) : null}
    </View>
  );
};

// ============================================================================
// 9. StatTile
// ============================================================================
export interface StatTileProps {
  label: string;
  value: string;
  sublabel?: string;
  subtext?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  accentValue?: boolean;
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  sublabel,
  subtext,
  icon,
  onPress,
  accentValue,
  accent,
  style,
}) => {
  const isAccent = accent ?? accentValue ?? false;
  const sub = subtext ?? sublabel;
  return (
    <AppCard
      onPress={onPress}
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.statTile, style]}
    >
      <View style={styles.statTopRow}>
        <Text style={TYPOGRAPHY.captionSemibold} numberOfLines={1}>
          {label}
        </Text>
        {icon}
      </View>
      <Text
        style={[
          TYPOGRAPHY.h1,
          TYPOGRAPHY.tabular,
          { marginTop: SPACING.xs },
          isAccent && { color: COLORS.primary },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      {sub ? (
        <Text
          style={[TYPOGRAPHY.caption, { marginTop: SPACING.xs }]}
          numberOfLines={1}
        >
          {sub}
        </Text>
      ) : null}
    </AppCard>
  );
};

// ============================================================================
// 10. StepProgress (Animated 3-Step Flow Header)
// ============================================================================
export interface StepProgressProps {
  steps: string[];
  currentStep: number; // 0-indexed
  onStepPress?: (idx: number) => void;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  currentStep,
  onStepPress,
}) => {
  return (
    <View style={styles.stepProgressContainer}>
      <View style={styles.stepBarsRow}>
        {steps.map((label, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <TouchableOpacity
              key={label}
              disabled={!onStepPress}
              accessibilityRole="button"
              accessibilityLabel={`Step ${idx + 1}: ${label}`}
              onPress={() => onStepPress && onStepPress(idx)}
              style={{ flex: 1 }}
            >
              <View
                style={[
                  styles.stepBarTrack,
                  (isCompleted || isCurrent) && styles.stepBarActive,
                ]}
              />
              <Text
                style={[
                  styles.stepLabelText,
                  (isCompleted || isCurrent) && styles.stepLabelActive,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// 11. Skeleton Shimmer
// ============================================================================
export const Skeleton: React.FC<{
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ width = "100%", height = 20, borderRadius = 12, style }) => {
  const opacity = useRef(new Animated.Value(0.45)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: COLORS.border,
          opacity,
        },
        style,
      ]}
    />
  );
};

// ============================================================================
// 12. BottomSheet Modal with Drag Handle
// ============================================================================
export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.sheetBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close sheet"
        />
        <View style={[styles.sheetCard, ELEVATION.level2]}>
          <View style={styles.sheetDragHandle} />
          {title ? (
            <View style={{ marginBottom: SPACING.md }}>
              <Text style={TYPOGRAPHY.h2}>{title}</Text>
              {subtitle ? (
                <Text style={[TYPOGRAPHY.body, { marginTop: 2 }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    minHeight: SPACING.touchTarget,
    borderRadius: SPACING.chipRadius,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonMd: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
  },
  buttonLg: {
    minHeight: 52,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  buttonContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  buttonText: {
    ...TYPOGRAPHY.bodySemibold,
    letterSpacing: 0.1,
  },
  toggleHitWrap: {
    minWidth: SPACING.touchTarget,
    minHeight: SPACING.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleTrack: {
    width: 52,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    overflow: "hidden",
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 3,
  },
  chipBase: {
    minHeight: 40,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.chipRadius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipUnselected: {
    backgroundColor: COLORS.bgSurface,
    borderColor: COLORS.border,
  },
  chipText: {
    ...TYPOGRAPHY.captionSemibold,
  },
  chipTextSelected: {
    color: COLORS.textInverse,
  },
  chipTextUnselected: {
    color: COLORS.textPrimary,
  },
  segmentedTrack: {
    flexDirection: "row",
    backgroundColor: COLORS.bgSubtle,
    borderRadius: SPACING.chipRadius,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: SPACING.chipRadius,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.primary,
    ...ELEVATION.level1,
  },
  segmentLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
  },
  segmentLabelActive: {
    color: COLORS.textInverse,
  },
  cardBase: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.cardPadding,
    borderWidth: 1.5,
    position: "relative",
  },
  cardUnselected: {
    borderColor: COLORS.border,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySurface,
    borderWidth: 2,
  },
  cardCheckCircle: {
    position: "absolute",
    top: SPACING.md,
    right: SPACING.md,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.bgSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCheckCircleActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  sectionHeaderWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  sectionActionBtn: {
    minHeight: 36,
    paddingHorizontal: SPACING.sm,
    justifyContent: "center",
  },
  sectionActionText: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.primary,
  },
  listRowWrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  listRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listRowIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: SPACING.cardRadiusLg,
    padding: SPACING.xxl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  statTile: {
    flex: 1,
    padding: SPACING.cardPadding,
  },
  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.xs,
  },
  stepProgressContainer: {
    marginBottom: SPACING.lg,
  },
  stepBarsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  stepBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    marginBottom: 6,
  },
  stepBarActive: {
    backgroundColor: COLORS.primary,
  },
  stepLabelText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textMuted,
  },
  stepLabelActive: {
    color: COLORS.primary,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 23, 20, 0.48)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: COLORS.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.screenMargin,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  sheetDragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.borderStrong,
    alignSelf: "center",
    marginBottom: SPACING.lg,
  },
});
