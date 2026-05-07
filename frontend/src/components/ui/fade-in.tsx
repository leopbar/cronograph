"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function FadeIn({ 
  children, 
  delay = 0,
  className 
}: { 
  children: React.ReactNode; 
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
