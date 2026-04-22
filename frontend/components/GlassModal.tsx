import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Colors, Typography } from '../constants/theme';
import AnimatedPressable from './AnimatedPressable';
import { X } from 'lucide-react-native';

const { height } = Dimensions.get('window');

interface GlassModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  options: { label: string; value: string; icon?: any; color?: string }[];
  onSelect: (value: string) => void;
}

export function GlassModal({
  visible,
  onClose,
  title,
  message,
  options,
  onSelect
}: GlassModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.overlay}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              entering={SlideInDown.springify().damping(15)}
              exiting={SlideOutDown.duration(200)}
              style={styles.container}
            >
              <BlurView intensity={80} tint="dark" style={styles.glass}>
                <View style={styles.header}>
                  <View>
                    <Text style={styles.title}>{title}</Text>
                    {message && <Text style={styles.message}>{message}</Text>}
                  </View>
                  <AnimatedPressable onPress={onClose} style={styles.closeBtn}>
                    <X size={20} color={Colors.textSecondary} />
                  </AnimatedPressable>
                </View>

                <View style={styles.optionsContainer}>
                  {options.map((opt, idx) => {
                    const Icon = opt.icon;
                    return (
                      <AnimatedPressable
                        key={opt.value}
                        style={styles.optionItem}
                        onPress={() => {
                          onSelect(opt.value);
                          onClose();
                        }}
                      >
                        <View style={[styles.iconBox, { backgroundColor: `${opt.color || Colors.emerald}15` }]}>
                          {Icon && <Icon size={20} color={opt.color || Colors.emerald} />}
                        </View>
                        <Text style={styles.optionLabel}>{opt.label}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </BlurView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
    maxHeight: height * 0.7,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  glass: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontFamily: Typography.fonts.outfitB,
    fontSize: 24,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  message: {
    fontFamily: Typography.fonts.manropeM,
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionLabel: {
    fontFamily: Typography.fonts.outfitSB,
    fontSize: 17,
    color: Colors.text,
  },
});

export default GlassModal;
