import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shakedhz.fitback',
  appName: 'FITback',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    // The Arbox / SMS / WhatsApp helpers run on the Mac over plain http on the LAN.
    allowsLinkPreview: false,
  },
};

export default config;
