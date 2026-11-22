/**
 * Online play (Chơi với bạn qua ID) uses Firebase Realtime Database.
 * The config comes only from VITE_FIREBASE_* environment variables and is never committed.
 */
const env = import.meta.env
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
}
/** Local testing against the Firebase emulator: VITE_FIREBASE_EMULATOR=1 (database on 127.0.0.1:9000). */
export const useEmulator = env.VITE_FIREBASE_EMULATOR === '1'
export const onlineReady = useEmulator || Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.projectId)
export const NOT_CONFIGURED = 'Chơi online cần cấu hình Firebase — xem hướng dẫn'
/** The only account that may open the admin page. The database rules enforce the same address. */
export const ADMIN_EMAIL = 'virusphuoc@gmail.com'
