import * as Dialog from '@radix-ui/react-dialog';
import { motion, Variants } from 'framer-motion';
import React, { ReactNode } from 'react';

const panelVariants: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15 } },
  exit: { opacity: 0, y: 50, transition: { duration: 0.1 } },
};

interface GlassPanelProps {
  children: ReactNode;
  onClose?: () => void;
}

export default function GlassPanel({ children, onClose }: GlassPanelProps) {
  return (
    <Dialog.Root open modal={false} onOpenChange={() => onClose?.()}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-background" />
        <Dialog.Content asChild>
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Dialog.Title className="sr-only">Post Overlay</Dialog.Title>
            <div className="max-w-3xl mx-auto px-6 py-6">{children}</div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
