import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saiph.tasksend',
  appName: 'TaskSend',
  webDir: 'out',
  server: {
    url: 'https://whatsapp-task-system.vercel.app',
    cleartext: true,
  },
};

export default config;