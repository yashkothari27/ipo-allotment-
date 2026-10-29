import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, DARK } from './theme';

export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

// Subtle fade-in with minimal delay
export function FadeIn({ index = 0, children, style }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return v.setValue(1);
    Animated.spring(v, { toValue: 1, delay: Math.min(index, 6) * 40, stiffness: 120, damping: 20, mass: 1, useNativeDriver: true }).start();
  }, [reduce]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// Pressable with 3D tilt effect inspired by CodePen card galleries.
export function PressScale({ style, children, onPressIn, onPressOut, ...props }) {
  const v = useRef(new Animated.Value(0)).current; // 0 = resting, 1 = pressed
  const to = (toValue) => Animated.spring(v, { toValue, stiffness: 350, damping: 30, useNativeDriver: true }).start();
  return (
    <Pressable onPressIn={(e) => { to(1); onPressIn?.(e); }} onPressOut={(e) => { to(0); onPressOut?.(e); }} {...props}>
      <Animated.View style={[style, { transform: [
        { perspective: 800 },
        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) },
        { rotateX: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-2deg'] }) },
        { rotateY: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '2deg'] }) },
      ] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Subtle shimmer - low opacity for minimal visual noise
export function Shimmer({ style }) {
  const reduce = useReduceMotion();
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.timing(x, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [reduce]);
  const shine = DARK ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  return (
    <View style={[{ backgroundColor: C.chip, overflow: 'hidden' }, style]} accessibilityElementsHidden>
      <Animated.View style={[StyleSheet.absoluteFill, { width: '55%', transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-200, 400] }) }] }]}>
        <LinearGradient colors={['transparent', shine, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

// Number that counts up smoothly
export function CountUp({ value, style }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduce || typeof value !== 'number') return setShown(value);
    const id = v.addListener(({ value: n }) => setShown(Math.round(n)));
    Animated.timing(v, { toValue: value, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [value, reduce]);
  return <Animated.Text style={style} accessibilityLabel={String(value)}>{shown}</Animated.Text>;
}

// Minimal marquee - shorter, cleaner ticker
export function Marquee({ children, speed = 30, style }) {
  const reduce = useReduceMotion();
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!w || reduce) return;
    x.setValue(0);
    const loop = Animated.loop(Animated.timing(x, { toValue: -w, duration: (w / speed) * 800, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [w, reduce]);
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>
        <View style={{ flexDirection: 'row' }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>{children}</View>
        {!reduce && <View style={{ flexDirection: 'row' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{children}</View>}
      </Animated.View>
    </View>
  );
}