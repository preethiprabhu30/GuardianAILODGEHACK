import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/lib/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import {
  CheckCircle2, Repeat, BookHeart, BarChart3,
  Sparkles, ArrowRight,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

type Feature = {
  icon: typeof CheckCircle2;
  title: string;
  desc: string;
  color: string;
  bg: string;
};

const FEATURES: Feature[] = [
  { icon: CheckCircle2, title: 'Tasks', desc: 'Stay on top of your day', color: COLORS.primary[600], bg: COLORS.primary[50] },
  { icon: Repeat, title: 'Habits', desc: 'Build lasting streaks', color: COLORS.success[600], bg: COLORS.success[50] },
  { icon: BookHeart, title: 'Journal', desc: 'Track your mood daily', color: COLORS.warning[600], bg: COLORS.warning[50] },
  { icon: BarChart3, title: 'Insights', desc: 'See your progress grow', color: COLORS.accent[600], bg: COLORS.accent[100] },
];

export default function OnboardingScreen() {
  const router = useRouter();

  const logoScale = useSharedValue(0);
  const logoRotate = useSharedValue(0);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withSpring(1, { damping: 12, stiffness: 90, mass: 0.8 });
    logoRotate.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.exp) });
    ringScale.value = withDelay(200, withSpring(1, { damping: 10, stiffness: 80 }));
    ringOpacity.value = withDelay(200, withTiming(0.6, { duration: 600 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const ring2Scale = useSharedValue(0);
  const ring2Opacity = useSharedValue(0);

  useEffect(() => {
    ring2Scale.value = withDelay(400, withSpring(1, { damping: 10, stiffness: 70 }));
    ring2Opacity.value = withDelay(400, withTiming(0.4, { duration: 600 }));
  }, []);

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary[700], COLORS.primary[500], COLORS.accent[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.overlay} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.logoArea}>
            <Animated.View style={[styles.ringOuter, ring2Style]} />
            <Animated.View style={[styles.ringInner, ringStyle]} />
            <Animated.View style={pulseStyle}>
              <Animated.View style={[styles.logoCircle, logoStyle]} entering={FadeIn.duration(600)}>
                <Sparkles size={48} color={COLORS.neutral[0]} strokeWidth={2} />
              </Animated.View>
            </Animated.View>
          </View>

          <Animated.Text
            style={styles.appName}
            entering={SlideInDown.delay(400).duration(600)}
          >
            Flow
          </Animated.Text>

          <Animated.Text
            style={styles.tagline}
            entering={SlideInDown.delay(550).duration(600)}
          >
            Your daily life, in perfect rhythm
          </Animated.Text>

          <View style={styles.featuresRow}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Animated.View
                  key={f.title}
                  style={styles.featurePill}
                  entering={SlideInDown.delay(700 + i * 100).duration(500)}
                >
                  <View style={[styles.featureIconWrap, { backgroundColor: f.bg }]}>
                    <Icon size={16} color={f.color} strokeWidth={2.2} />
                  </View>
                  <View>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </View>

        <Animated.View
          style={styles.bottomArea}
          entering={SlideInDown.delay(1200).duration(600)}
        >
          <Pressable
            style={({ pressed }) => [styles.startBtn, pressed && styles.startBtnPressed]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.startBtnText}>Get Started</Text>
            <ArrowRight size={20} color={COLORS.primary[700]} strokeWidth={2.4} />
          </Pressable>

          <Text style={styles.hint}>Syncs across all your devices</Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logoArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    width: 200,
    height: 200,
  },
  ringOuter: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  ringInner: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  appName: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: COLORS.neutral[0],
    letterSpacing: -1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 36,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    maxWidth: width < 500 ? width - 40 : 480,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.neutral[0],
  },
  featureDesc: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
  },
  bottomArea: {
    paddingHorizontal: 28,
    paddingBottom: 20,
    alignItems: 'center',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.neutral[0],
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 18,
    width: '100%',
    maxWidth: 380,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  startBtnPressed: {
    transform: [{ scale: 0.97 }],
  },
  startBtnText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: COLORS.primary[700],
  },
  hint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 16,
  },
});
