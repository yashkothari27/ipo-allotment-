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

// Rises and fades in, staggered by index (capped so long lists don't wait).
export function FadeIn({ index = 0, children, style }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return v.setValue(1);
    Animated.spring(v, { toValue: 1, delay: Math.min(index, 8) * 60, stiffness: 140, damping: 18, mass: 1, useNativeDriver: true }).start();
  }, [reduce]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// Pressable that springs down slightly while held.
export function PressScale({ style, children, ...props }) {
  const v = useRef(new Animated.Value(1)).current;
  const to = (toValue) => Animated.spring(v, { toValue, stiffness: 400, damping: 22, useNativeDriver: true }).start();
  return (
    <Pressable onPressIn={() => to(0.97)} onPressOut={() => to(1)} {...props}>
      <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

// Placeholder block with a light sweep across it.
export function Shimmer({ style }) {
  const reduce = useReduceMotion();
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.timing(x, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [reduce]);
  const shine = DARK ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)';
  return (
    <View style={[{ backgroundColor: C.chip, overflow: 'hidden' }, style]} accessibilityElementsHidden>
      <Animated.View style={[StyleSheet.absoluteFill, { width: '60%', transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-250, 450] }) }] }]}>
        <LinearGradient colors={['transparent', shine, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

// Number that counts up to `value`.
export function CountUp({ value, style }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduce || typeof value !== 'number') return setShown(value);
    const id = v.addListener(({ value: n }) => setShown(Math.round(n)));
    Animated.timing(v, { toValue: value, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [value, reduce]);
  return <Animated.Text style={style} accessibilityLabel={String(value)}>{shown}</Animated.Text>;
}

// Endless horizontal ticker; children are rendered twice so the loop is seamless.
export function Marquee({ children, speed = 40, style }) {
  const reduce = useReduceMotion();
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!w || reduce) return;
    x.setValue(0);
    const loop = Animated.loop(Animated.timing(x, { toValue: -w, duration: (w / speed) * 1000, easing: Easing.linear, useNativeDriver: true }));
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
