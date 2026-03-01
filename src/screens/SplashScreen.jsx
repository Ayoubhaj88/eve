import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    Animated,
    StyleSheet,
    StatusBar,
} from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants';

export default function SplashScreen({ onFinish }) {
    const logoOpacity  = useRef(new Animated.Value(0)).current;
    const logoScale    = useRef(new Animated.Value(0.8)).current;
    const textOpacity  = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Logo fade + scale in
        Animated.parallel([
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 700,
                useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 6,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Tagline fade in
            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start(() => {
                // Wait then go to dashboard
                setTimeout(() => onFinish?.(), 1200);
            });
        });
    }, []);

    return (
        <View style={styles.screen}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

            <Animated.View style={[
                styles.logoWrap,
                { opacity: logoOpacity, transform: [{ scale: logoScale }] },
            ]}>
                <Image
                    source={require('../../assets/eve-logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>

            <Animated.View style={[styles.textWrap, { opacity: textOpacity }]}>
                <Text style={styles.tagline}>Smart Scooter Tracking</Text>
                <View style={styles.dotsRow}>
                    <View style={styles.dot} />
                    <View style={[styles.dot, styles.dotActive]} />
                    <View style={styles.dot} />
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoWrap: {
        alignItems: 'center',
        marginBottom: SPACING.xxxl,
    },
    logo: {
        width: 140,
        height: 140,
        borderRadius: 70,
    },
    textWrap: {
        alignItems: 'center',
        gap: SPACING.lg,
    },
    tagline: {
        fontSize: FONTS.size.sm,
        fontWeight: FONTS.weight.semibold,
        color: COLORS.textSecondary,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    dotsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.bgElevated,
    },
    dotActive: {
        backgroundColor: COLORS.accent,
        width: 18,
        borderRadius: 3,
    },
});
