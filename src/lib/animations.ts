/**
 * Reusable animation presets for consistent, polished feel
 * Uses framer-motion variants for performance
 */

export const messageAnimations = {
  // Message fade-in with slight slide-up
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'spring', stiffness: 200, damping: 25, mass: 0.5 },

  // Staggered message animations in a list
  container: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04, // 40ms between each message
        delayChildren: 0,
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 30 },
    },
  },
};

export const inputAnimations = {
  // Chat input focus animation
  focus: {
    scale: 1.02,
    boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
    transition: { duration: 0.2 },
  },
  blur: {
    scale: 1,
    boxShadow: '0 0 0px rgba(0, 240, 255, 0)',
    transition: { duration: 0.2 },
  },

  // Send button animation
  send: {
    scale: [1, 0.95, 1.05, 1],
    transition: { duration: 0.3 },
  },
};

export const headerAnimations = {
  // Page header entrance
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring', stiffness: 300, damping: 25 },

  // Subtitle with stagger
  subtitleInitial: { opacity: 0, x: -20 },
  subtitleAnimate: { opacity: 1, x: 0 },
  subtitleTransition: { type: 'spring', stiffness: 200, damping: 20, delay: 0.1 },
};

export const avatarAnimations = {
  // Avatar hover effect
  whileHover: { scale: 1.15, rotate: 5 },
  whileTap: { scale: 0.95 },
  transition: { type: 'spring', stiffness: 400, damping: 10 },
};

export const modalAnimations = {
  // Modal entrance (from bottom on mobile, center on desktop)
  mobileInitial: { opacity: 0, y: 100 },
  desktopInitial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 100, scale: 0.9 },
  transition: { type: 'spring', stiffness: 300, damping: 30 },
};

export const reactionAnimations = {
  // Emoji reaction animation
  initial: { scale: 0, rotate: -180 },
  animate: { scale: 1, rotate: 0 },
  transition: { type: 'spring', stiffness: 500, damping: 30 },
  whileHover: { scale: 1.2 },
  whileTap: { scale: 0.9 },
};

export const loadingAnimations = {
  // Smooth pulse for loading states
  pulse: {
    opacity: [0.6, 1, 0.6],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },

  // Skeleton shimmer
  shimmer: {
    backgroundPosition: ['0% 0%', '100% 0%'],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const pageTransitionAnimations = {
  // Page fade transition
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },

  // Page slide transition
  slideInitial: { opacity: 0, x: 20 },
  slideAnimate: { opacity: 1, x: 0 },
  slideExit: { opacity: 0, x: -20 },
  slideTransition: { type: 'spring', stiffness: 300, damping: 30 },
};

export const notificationAnimations = {
  // Toast/notification entrance
  initial: { opacity: 0, scale: 0.8, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.8, y: 20 },
  transition: { type: 'spring', stiffness: 400, damping: 25 },
};

export const typingAnimations = {
  // Typing indicator dots
  dot: {
    y: [0, -8, 0],
    transition: { duration: 1.2, repeat: Infinity },
  },
  dot1: { transitionDelay: 0 },
  dot2: { transitionDelay: 0.2 },
  dot3: { transitionDelay: 0.4 },
};
