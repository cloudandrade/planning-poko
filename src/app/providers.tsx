'use client';

import React from 'react';
import { Toaster } from 'sonner';
import { DialogProvider } from '../context/DialogContext';
import { RoomProvider } from '../context/RoomContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DialogProvider>
      <RoomProvider>
        {children}
      </RoomProvider>
      <Toaster position="top-center" richColors theme="dark" closeButton />
    </DialogProvider>
  );
}

