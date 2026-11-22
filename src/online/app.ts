import { type FirebaseApp, initializeApp } from 'firebase/app'
import { type Database, connectDatabaseEmulator, getDatabase } from 'firebase/database'
import { firebaseConfig, useEmulator } from './config'

let app: FirebaseApp | null = null
let db: Database | null = null

export function firebaseApp(): FirebaseApp {
  app ??= initializeApp(useEmulator ? { apiKey: 'demo', projectId: 'demo-gau-truc-xanh', databaseURL: 'http://127.0.0.1:9000?ns=demo-gau-truc-xanh-default-rtdb' } : firebaseConfig)
  return app
}
export function database(): Database {
  if (!db) {
    db = getDatabase(firebaseApp())
    if (useEmulator) connectDatabaseEmulator(db, '127.0.0.1', 9000)
  }
  return db
}
