import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import splashBg from "@/assets/splash-bg.png";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<"zoom" | "hold" | "fade">("zoom");

  useEffect(() => {
    // Phase 1: Zoom out (1.5 seconds)
    const zoomTimer = setTimeout(() => {
      setPhase("hold");
    }, 1500);

    // Phase 2: Hold (2 seconds after zoom)
    const holdTimer = setTimeout(() => {
      setPhase("fade");
    }, 3500);

    // Phase 3: Fade out and complete
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => {
      clearTimeout(zoomTimer);
      clearTimeout(holdTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "fade" ? null : (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-black"
        />
      )}
      <motion.div
        className="fixed inset-0 z-[100] overflow-hidden bg-black"
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === "fade" ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 5 }}
          animate={{ scale: 1 }}
          transition={{ 
            duration: 2, 
            ease: [0.7, 0, 0.84, 0]
          }}
        >
          <img
            src={splashBg}
            alt="YTangent"
            className="w-full h-full object-cover object-bottom"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
