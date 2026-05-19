import React from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.8, delay: 2.2, ease: "easeInOut" }}
      onAnimationComplete={onComplete}
      className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            duration: 1, 
            ease: [0.16, 1, 0.3, 1], // Custom Apple-like cubic bezier
            delay: 0.2 
          }}
          className="relative"
        >
          {/* Main Logo Container */}
          <motion.div 
            animate={{ 
              boxShadow: [
                "0 0 0 0px rgba(59, 130, 246, 0)",
                "0 0 0 20px rgba(59, 130, 246, 0.05)",
                "0 0 0 0px rgba(59, 130, 246, 0)"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-28 h-28 bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 rounded-[32px] flex items-center justify-center shadow-2xl relative overflow-hidden"
          >
            {/* Glossy Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            
            <span className="text-white text-4xl font-black tracking-tighter select-none">
              M+
            </span>
          </motion.div>

          {/* Particle Effects (Subtle) */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.2, 0],
                opacity: [0, 0.3, 0],
                x: [0, (i % 2 === 0 ? 40 : -40)],
                y: [0, (Math.floor(i / 2) === 0 ? 40 : -40)]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                delay: i * 0.5,
                ease: "easeOut" 
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-400 rounded-full blur-sm"
            />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-8 text-center"
        >
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">
            Montagem<span className="text-blue-600">+</span>
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">
            Profissionalismo & Agilidade
          </p>
        </motion.div>
      </div>

      {/* Signature */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        className="pb-12 flex flex-col items-center gap-2"
      >
        <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">
          Desenvolvido por
        </span>
        <span className="text-xs font-bold text-slate-500">
          Eduardo Marques
        </span>
      </motion.div>
    </motion.div>
  );
};
