import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Polyline,
  Stop,
} from "react-native-svg";
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Home as HomeIcon,
  Info,
  Navigation,
  PlugZap,
  Star,
  WifiOff,
  Zap,
} from "lucide-react-native";
import {
  COLORS,
  ELEVATION,
  ICON_STROKE_WIDTH,
  SPACING,
  TYPOGRAPHY,
  isOwnStationDistanceHidden,
} from "../../theme/tokens";

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

// Rolling / Count-Up number animation hook (150-350ms, respects OS reduce-motion)
export function useAnimatedNumber(
  targetValue: number,
  durationMs = 260,
  decimals = 0
): number {
  const reduceMotion = useReduceMotion();
  const [displayVal, setDisplayVal] = useState<number>(targetValue);
  const prevValRef = useRef<number>(targetValue);

  useEffect(() => {
    if (reduceMotion || prevValRef.current === targetValue) {
      prevValRef.current = targetValue;
      setDisplayVal(targetValue);
      return;
    }
    const startVal = prevValRef.current;
    const delta = targetValue - startVal;
    const startTime = Date.now();
    const factor = Math.pow(10, decimals);
    let frameTimer: ReturnType<typeof setInterval> | null = null;

    frameTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Cubic ease-out: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - t, 3);
      const current =
        Math.round((startVal + delta * eased) * factor) / factor;
      setDisplayVal(current);
      if (t >= 1) {
        if (frameTimer) clearInterval(frameTimer);
        prevValRef.current = targetValue;
        setDisplayVal(targetValue);
      }
    }, 16);

    return () => {
      if (frameTimer) clearInterval(frameTimer);
      prevValRef.current = targetValue;
    };
  }, [targetValue, durationMs, decimals, reduceMotion]);

  return displayVal;
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
  const wasLoadingRef = useRef(loading);
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);

  // Morph loading -> checkmark for 650ms on async completion
  useEffect(() => {
    if (wasLoadingRef.current && !loading) {
      setShowSuccessCheck(true);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      const timer = setTimeout(() => setShowSuccessCheck(false), 650);
      wasLoadingRef.current = loading;
      return () => clearTimeout(timer);
    }
    wasLoadingRef.current = loading;
  }, [loading]);

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onPress();
  };

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
      android_ripple={{ color: "rgba(255,255,255,0.18)" }}
      disabled={disabled || loading}
      onPress={handlePress}
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
        ) : showSuccessCheck ? (
          <>
            <Check size={18} color={labelColor} strokeWidth={2.8} />
            <Text
              maxFontSizeMultiplier={1.3}
              style={[styles.buttonText, { color: labelColor }, textStyle]}
              numberOfLines={1}
            >
              {buttonLabel}
            </Text>
          </>
        ) : (
          <>
            {icon}
            <Text
              maxFontSizeMultiplier={1.3}
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
      onPress={() => {
        try {
          Haptics.selectionAsync();
        } catch {}
        onValueChange(!value);
      }}
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
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      onPress={onPress}
      style={[
        styles.chipBase,
        selected ? styles.chipSelected : styles.chipUnselected,
        style,
      ]}
    >
      {icon}
      <Text
        maxFontSizeMultiplier={1.3}
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
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            onPress={() => onChange(opt.key)}
            style={[
              styles.segmentButton,
              active && styles.segmentButtonActive,
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.3}
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
// 6. SectionHeader (with optional Info Icon -> Bottom Sheet for Text Budget Rule)
// ============================================================================
export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  infoTitle?: string;
  infoText?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  onPressAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  infoTitle,
  infoText,
  actionLabel,
  onActionPress,
  onPressAction,
  style,
}) => {
  const handleAction = onActionPress ?? onPressAction;
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <View style={[styles.sectionHeaderWrap, style]}>
      <View style={{ flex: 1, paddingRight: SPACING.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={TYPOGRAPHY.h2}>{title}</Text>
          {infoText ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`More info about ${title}`}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => setInfoOpen(true)}
            >
              <Info
                size={16}
                color={COLORS.textSecondary}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            </TouchableOpacity>
          ) : null}
        </View>
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
      {infoText ? (
        <BottomSheet
          visible={infoOpen}
          onClose={() => setInfoOpen(false)}
          title={infoTitle || title}
          subtitle={infoText}
        >
          <AppButton
            label="Got it"
            variant="primary"
            onPress={() => setInfoOpen(false)}
          />
        </BottomSheet>
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
        <Text
          maxFontSizeMultiplier={1.3}
          style={TYPOGRAPHY.captionSemibold}
          numberOfLines={1}
        >
          {label}
        </Text>
        {icon}
      </View>
      <Text
        maxFontSizeMultiplier={1.3}
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
          maxFontSizeMultiplier={1.3}
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
// 12. BottomSheet Modal with Drag Handle & Snap Points
// ============================================================================
export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  snapPoint?: "peek" | "half" | "full";
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  snapPoint,
  children,
}) => {
  const reduceMotion = useReduceMotion();
  const sheetY = useRef(new Animated.Value(220)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      sheetY.setValue(220);
      backdropOpacity.setValue(0);
      return;
    }
    if (reduceMotion) {
      sheetY.setValue(0);
      backdropOpacity.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(sheetY, {
        toValue: 0,
        damping: 22,
        stiffness: 210,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, reduceMotion]);

  const maxHeight =
    snapPoint === "peek" ? "42%" : snapPoint === "full" ? "90%" : undefined;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[styles.sheetBackdrop, { opacity: backdropOpacity }]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close sheet"
        />
        <Animated.View
          style={[
            styles.sheetCard,
            ELEVATION.level2,
            maxHeight ? { maxHeight } : undefined,
            { transform: [{ translateY: sheetY }] },
          ]}
        >
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
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ============================================================================
// 13. StatusBadge (Available / Live / Upcoming / Completed / Warning / Error / Offline)
// ============================================================================
export type StatusBadgeVariant =
  | "available"
  | "live"
  | "upcoming"
  | "completed"
  | "warning"
  | "error"
  | "offline";

export interface StatusBadgeProps {
  status: StatusBadgeVariant;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  style,
}) => {
  const palette =
    status === "live" || status === "available"
      ? {
          bg: COLORS.surface2,
          dot: COLORS.volt,
          text: COLORS.primary,
          defaultLabel: status === "live" ? "Charging" : "Available",
        }
      : status === "upcoming" || status === "completed"
      ? {
          bg: COLORS.surface2,
          dot: COLORS.emerald500,
          text: COLORS.primary,
          defaultLabel: status === "upcoming" ? "Confirmed" : "Completed",
        }
      : status === "warning"
      ? {
          bg: COLORS.warningSoft,
          dot: COLORS.warning,
          text: COLORS.warningText,
          defaultLabel: "Pending",
        }
      : status === "error"
      ? {
          bg: COLORS.errorSoft,
          dot: COLORS.error,
          text: COLORS.destructive,
          defaultLabel: "Cancelled",
        }
      : {
          bg: COLORS.surface2,
          dot: COLORS.textSecondary,
          text: COLORS.textSecondary,
          defaultLabel: "Offline",
        };

  return (
    <View
      style={[styles.statusBadgeBase, { backgroundColor: palette.bg }, style]}
      accessibilityRole="text"
      accessibilityLabel={label || palette.defaultLabel}
    >
      <View
        style={[styles.statusBadgeDot, { backgroundColor: palette.dot }]}
      />
      <Text
        style={[styles.statusBadgeText, { color: palette.text }]}
        numberOfLines={1}
      >
        {label || palette.defaultLabel}
      </Text>
    </View>
  );
};

// ============================================================================
// 14. ConnectorChip (Compact Connector Type + Power kW + ₹/kWh Tabular Chip)
// ============================================================================
export interface ConnectorChipProps {
  name: string;
  powerKw?: number;
  pricePerKwh: number;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ConnectorChip: React.FC<ConnectorChipProps> = ({
  name,
  powerKw,
  pricePerKwh,
  selected = false,
  onPress,
  style,
}) => {
  const shortName = name.toUpperCase().includes("CCS")
    ? "CCS2"
    : name.toUpperCase().includes("TYPE")
    ? "Type-2"
    : name.toUpperCase().includes("LECCS")
    ? "LECCS"
    : "15A";

  const content = (
    <View
      style={[
        styles.connectorChipBase,
        selected ? styles.connectorChipSelected : styles.connectorChipDefault,
        style,
      ]}
    >
      <PlugZap
        size={13}
        color={selected ? COLORS.textInverse : COLORS.primary}
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <Text
        style={[
          styles.connectorChipLabel,
          selected && { color: COLORS.textInverse },
        ]}
        numberOfLines={1}
      >
        {shortName}
        {powerKw ? ` ${powerKw}kW` : ""}
      </Text>
      <Text
        style={[
          styles.connectorChipPrice,
          selected && { color: COLORS.textInverse },
        ]}
        numberOfLines={1}
      >
        ₹{pricePerKwh.toFixed(1)}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.82}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${shortName} connector, ₹${pricePerKwh.toFixed(
          2
        )} per kWh`}
      >
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

// ============================================================================
// 15. StationCard (Compact + Detailed; strictly enforces TEXT BUDGET RULE:
//     at most 1 title, 1 meta line, 1 status badge, 1 primary action)
// ============================================================================
export interface StationCardData {
  id: string;
  name: string;
  address: string;
  city?: string;
  stationType: "P2P_HOME" | "PUBLIC_DC";
  pricePerKwh: number;
  maxPowerKw: number;
  distanceKm: number;
  etaMins?: number;
  rating: number;
  isAvailable?: boolean;
  isOnline?: boolean;
  isUserHosted?: boolean;
  connectorSpecs?: Array<{
    id: string;
    name: string;
    powerKw: number;
    pricePerKwh: number;
  }>;
}

export interface StationCardProps {
  station: StationCardData;
  variant?: "compact" | "detailed";
  selected?: boolean;
  onPress?: () => void;
  onBookPress: () => void;
  onDirectionsPress?: () => void;
  onSelectConnector?: (connectorId: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  variant = "compact",
  selected = false,
  onPress,
  onBookPress,
  onDirectionsPress,
  onSelectConnector,
  style,
}) => {
  const hideDist = isOwnStationDistanceHidden(
    station.isUserHosted,
    station.distanceKm
  );
  const isAvailable =
    station.isAvailable !== false && station.isOnline !== false;
  const typeLabel = station.stationType === "P2P_HOME" ? "P2P Host" : "Fast DC";
  const metaLine = hideDist
    ? `${typeLabel} • ${station.maxPowerKw} kW • ★ ${station.rating.toFixed(1)}`
    : `${station.distanceKm} km (${
        station.etaMins || Math.max(2, Math.round(station.distanceKm * 2.2))
      }m) • ${station.maxPowerKw} kW • ★ ${station.rating.toFixed(1)}`;

  return (
    <AppCard
      selected={selected}
      onPress={onPress}
      showCheckBadge={false}
      style={[
        variant === "compact"
          ? styles.stationCardCompact
          : styles.stationCardDetailed,
        style,
      ]}
    >
      {/* Top Row: Type Chip + 1 StatusBadge */}
      <View style={styles.stationCardTopRow}>
        <View style={styles.stationCardTypeChip}>
          {station.stationType === "P2P_HOME" ? (
            <HomeIcon
              size={13}
              color={COLORS.primary}
              strokeWidth={ICON_STROKE_WIDTH}
            />
          ) : (
            <Zap
              size={13}
              color={COLORS.primary}
              strokeWidth={ICON_STROKE_WIDTH}
            />
          )}
          <Text style={styles.stationCardTypeText}>{typeLabel}</Text>
        </View>
        <StatusBadge
          status={isAvailable ? "available" : "offline"}
          label={isAvailable ? `₹${station.pricePerKwh.toFixed(2)}/kWh` : "Busy"}
        />
      </View>

      {/* 1 Title */}
      <Text
        maxFontSizeMultiplier={1.3}
        style={styles.stationCardTitle}
        numberOfLines={1}
      >
        {station.name}
      </Text>

      {/* 1 Meta Line */}
      <Text
        maxFontSizeMultiplier={1.3}
        style={styles.stationCardMeta}
        numberOfLines={1}
      >
        {metaLine}
      </Text>

      {/* Connector Chips Row */}
      {station.connectorSpecs && station.connectorSpecs.length > 0 ? (
        <View style={styles.stationCardConnectorsRow}>
          {station.connectorSpecs.slice(0, 3).map((c) => (
            <ConnectorChip
              key={c.id}
              name={c.name}
              powerKw={variant === "detailed" ? c.powerKw : undefined}
              pricePerKwh={c.pricePerKwh}
              onPress={
                onSelectConnector ? () => onSelectConnector(c.id) : undefined
              }
            />
          ))}
        </View>
      ) : null}

      {/* 1 Primary Action (+ optional secondary icon button for directions) */}
      <View style={styles.stationCardActionsRow}>
        {onDirectionsPress ? (
          <TouchableOpacity
            style={styles.stationCardDirIconBtn}
            onPress={onDirectionsPress}
            accessibilityRole="button"
            accessibilityLabel={`Directions to ${station.name}`}
          >
            <Navigation
              size={18}
              color={COLORS.primary}
              strokeWidth={ICON_STROKE_WIDTH}
            />
          </TouchableOpacity>
        ) : null}
        <AppButton
          label={`Book • ₹${station.pricePerKwh.toFixed(2)}/kWh`}
          variant="primary"
          size="md"
          style={{ flex: 1 }}
          onPress={onBookPress}
        />
      </View>
    </AppCard>
  );
};

// ============================================================================
// 16. RingGauge (Animated Circular SVG Gauge for SoC % and Live Charging)
// ============================================================================
export interface RingGaugeProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  isLiveCharging?: boolean;
  onEditPress?: () => void;
}

export const RingGauge: React.FC<RingGaugeProps> = ({
  percent,
  size = 132,
  strokeWidth = 12,
  label = "SoC",
  sublabel,
  isLiveCharging = false,
}) => {
  const targetClamped = Math.max(0, Math.min(100, Math.round(percent)));
  const animatedPercent = useAnimatedNumber(targetClamped, 280, 0);
  const clamped = Math.max(0, Math.min(100, Math.round(animatedPercent)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (!isLiveCharging || reduceMotion) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isLiveCharging, reduceMotion]);

  const strokeColor = isLiveCharging
    ? COLORS.volt
    : clamped <= 20
    ? COLORS.error
    : COLORS.emerald500;

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: pulseAnim }],
        },
      ]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label} ${clamped} percent`}
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={COLORS.surface2}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.ringCenterOverlay}>
        <Text style={styles.ringPercentText}>{clamped}%</Text>
        <Text style={styles.ringLabelText}>{sublabel || label}</Text>
      </View>
    </Animated.View>
  );
};

// ============================================================================
// 17. Sparkline (SVG Line + Soft Area Chart for Spend & Host Earnings)
// ============================================================================
export interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  values,
  width = 120,
  height = 38,
  color = COLORS.emerald500,
}) => {
  const safeValues =
    values && values.length >= 2 ? values : [120, 165, 140, 210, 185, 240];
  const minVal = Math.min(...safeValues);
  const maxVal = Math.max(...safeValues, minVal + 1);
  const pad = 4;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;

  const points = safeValues.map((v, idx) => {
    const x = pad + (idx / (safeValues.length - 1)) * plotW;
    const y = pad + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const areaPath = `M ${pad},${height - pad} L ${points.join(" L ")} L ${
    width - pad
  },${height - pad} Z`;

  return (
    <View style={{ width, height }} accessibilityLabel="Trend sparkline">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.26" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#sparkGrad)" />
        <Polyline
          fill="none"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points.join(" ")}
        />
      </Svg>
    </View>
  );
};

// ============================================================================
// 18. TimelineSlotPicker (Inline Date Chips + Time Slot Chips + Duration Chips)
// ============================================================================
export interface TimelineSlotPickerProps {
  dates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  timeSlots: string[];
  selectedTime: string;
  onSelectTime: (time: string) => void;
  durationsHours?: number[];
  selectedDurationHours?: number;
  onSelectDurationHours?: (hrs: number) => void;
}

export const TimelineSlotPicker: React.FC<TimelineSlotPickerProps> = ({
  dates,
  selectedDate,
  onSelectDate,
  timeSlots,
  selectedTime,
  onSelectTime,
  durationsHours = [0.5, 1, 1.5, 2],
  selectedDurationHours,
  onSelectDurationHours,
}) => {
  return (
    <View style={styles.timelinePickerWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineRow}
      >
        {dates.map((d) => (
          <AppChip
            key={d}
            label={d}
            selected={selectedDate === d}
            icon={
              <Calendar
                size={13}
                color={
                  selectedDate === d ? COLORS.textInverse : COLORS.primary
                }
                strokeWidth={ICON_STROKE_WIDTH}
              />
            }
            onPress={() => onSelectDate(d)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineRow}
      >
        {timeSlots.map((slot) => (
          <AppChip
            key={slot}
            label={slot}
            selected={selectedTime === slot}
            icon={
              <Clock
                size={13}
                color={
                  selectedTime === slot ? COLORS.textInverse : COLORS.primary
                }
                strokeWidth={ICON_STROKE_WIDTH}
              />
            }
            onPress={() => onSelectTime(slot)}
          />
        ))}
      </ScrollView>

      {onSelectDurationHours && typeof selectedDurationHours === "number" ? (
        <View style={styles.durationChipGrid}>
          {durationsHours.map((hrs) => (
            <AppChip
              key={hrs}
              label={hrs === 0.5 ? "30m" : `${hrs}h`}
              selected={selectedDurationHours === hrs}
              style={{ flex: 1 }}
              onPress={() => onSelectDurationHours(hrs)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

// ============================================================================
// 19. AmountChips (200/500/1000/2000 Presets + Custom Input + One CTA "Add ₹X")
// ============================================================================
export interface AmountChipsProps {
  presets?: number[];
  selectedAmount: number;
  onSelectAmount: (amount: number) => void;
  onSubmit: (amount: number) => void;
  loading?: boolean;
  ctaPrefix?: string;
}

export const AmountChips: React.FC<AmountChipsProps> = ({
  presets = [200, 500, 1000, 2000],
  selectedAmount,
  onSelectAmount,
  onSubmit,
  loading = false,
  ctaPrefix = "Add",
}) => {
  const [customText, setCustomText] = useState(String(selectedAmount));

  useEffect(() => {
    setCustomText(String(selectedAmount));
  }, [selectedAmount]);

  const resolvedAmount = Math.max(10, parseInt(customText, 10) || selectedAmount);

  return (
    <View style={styles.amountChipsWrap}>
      <View style={styles.amountChipsRow}>
        {presets.map((amt) => (
          <AppChip
            key={amt}
            label={`₹${amt.toLocaleString("en-IN")}`}
            selected={resolvedAmount === amt}
            style={{ flex: 1 }}
            onPress={() => {
              setCustomText(String(amt));
              onSelectAmount(amt);
            }}
          />
        ))}
      </View>

      <View style={styles.customAmountInputBox}>
        <Text style={styles.customAmountRupee}>₹</Text>
        <TextInput
          style={styles.customAmountInput}
          value={customText}
          onChangeText={(txt) => {
            const digits = txt.replace(/[^0-9]/g, "");
            setCustomText(digits);
            const parsed = parseInt(digits, 10);
            if (parsed >= 10) onSelectAmount(parsed);
          }}
          keyboardType="number-pad"
          placeholder="500"
          placeholderTextColor={COLORS.textSecondary}
          accessibilityLabel="Custom amount in rupees"
        />
      </View>

      <AppButton
        label={`${ctaPrefix} ₹${resolvedAmount.toLocaleString("en-IN")}`}
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
        onPress={() => onSubmit(resolvedAmount)}
      />
    </View>
  );
};

// ============================================================================
// 20. OfflineBanner & ErrorStateCard
// ============================================================================
export const OfflineBanner: React.FC<{
  visible?: boolean;
  message?: string;
}> = ({
  visible = false,
  message = "Offline mode • Showing cached stations and wallet data",
}) => {
  if (!visible) return null;
  return (
    <View style={styles.offlineBanner} accessibilityRole="alert">
      <WifiOff
        size={15}
        color={COLORS.warningText}
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <Text style={styles.offlineBannerText} numberOfLines={1}>
        {message}
      </Text>
    </View>
  );
};

export const ErrorStateCard: React.FC<{
  title?: string;
  message: string;
  onRetry: () => void;
}> = ({ title = "Could not load data", message, onRetry }) => {
  const reduceMotion = useReduceMotion();
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [message, reduceMotion]);

  return (
    <Animated.View
      style={[styles.errorStateCard, { transform: [{ translateX: shakeX }] }]}
      accessibilityRole="alert"
    >
      <AlertCircle
        size={24}
        color={COLORS.destructive}
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <Text style={[TYPOGRAPHY.title, { marginTop: SPACING.xs }]}>{title}</Text>
      <Text
        style={[
          TYPOGRAPHY.body,
          {
            textAlign: "center",
            marginTop: 4,
            marginBottom: SPACING.md,
          },
        ]}
      >
        {message}
      </Text>
      <AppButton label="Retry" variant="secondary" size="md" onPress={onRetry} />
    </Animated.View>
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
  statusBadgeBase: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SPACING.chipRadius,
  },
  statusBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusBadgeText: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
  },
  connectorChipBase: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SPACING.chipRadius,
    borderWidth: 1,
  },
  connectorChipDefault: {
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.border,
  },
  connectorChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  connectorChipLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textPrimary,
  },
  connectorChipPrice: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
  },
  stationCardCompact: {
    width: 276,
    padding: SPACING.cardPadding,
  },
  stationCardDetailed: {
    width: "100%",
    padding: SPACING.cardPadding,
  },
  stationCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.xs,
  },
  stationCardTypeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SPACING.chipRadius,
  },
  stationCardTypeText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  stationCardTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
  },
  stationCardMeta: {
    ...TYPOGRAPHY.caption,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: SPACING.sm,
  },
  stationCardConnectorsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: SPACING.sm,
  },
  stationCardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  stationCardDirIconBtn: {
    width: SPACING.touchTarget,
    height: SPACING.touchTarget,
    borderRadius: SPACING.touchTarget / 2,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  ringCenterOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  ringPercentText: {
    ...TYPOGRAPHY.h1,
    ...TYPOGRAPHY.tabular,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  ringLabelText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
  },
  timelinePickerWrap: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  timelineRow: {
    gap: SPACING.xs,
  },
  durationChipGrid: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  amountChipsWrap: {
    gap: SPACING.md,
  },
  amountChipsRow: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  customAmountInputBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.surface2,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    paddingHorizontal: SPACING.md,
    gap: 6,
  },
  customAmountRupee: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
  },
  customAmountInput: {
    flex: 1,
    ...TYPOGRAPHY.h2,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
    padding: 0,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.warningSoft,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  offlineBannerText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.warningText,
    flex: 1,
  },
  errorStateCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
