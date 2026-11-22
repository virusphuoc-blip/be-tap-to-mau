import { type ReactNode, Suspense, lazy, useEffect, useSyncExternalStore } from 'react'
import Editor2D from './components/Editor2D'
import Gallery from './components/Gallery'
import Home from './components/Home'
import { countVisit } from './online/stats'
import { PicturePicker, StatuePicker } from './components/Pickers'

const Editor3D = lazy(() => import('./components/Editor3D'))
// every game is its own chunk, loaded only when it is opened
const GAMES: Record<string, ReturnType<typeof lazy<(p: { onBack: () => void }) => ReactNode>>> = {
  'co-tuong': lazy(() => import('./games/XiangqiGame')),
  'co-vua': lazy(() => import('./games/ChessGame')),
  rubik: lazy(() => import('./games/Rubik')),
  'xep-hinh': lazy(() => import('./games/Jigsaw')),
}
const Admin = lazy(() => import('./components/Admin'))
const loading = (icon: string) => <div className="sky flex h-dvh items-center justify-center text-7xl">{icon}</div>

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
const go = (path: string) => {
  window.location.hash = path
  window.scrollTo(0, 0)
}

export default function App() {
  useEffect(countVisit, [])
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  const [, section, id] = hash.replace(/^#/, '').split('/')
  if (section === 'tranh' && id) return <Editor2D key={id} id={id} onBack={() => go('/tranh')} />
  if (section === 'tranh') return <PicturePicker go={go} onBack={() => go('/')} />
  if (section === 'tuong' && id)
    return (
      <Suspense fallback={loading('🐼')}>
        <Editor3D key={id} id={id} onBack={() => go('/tuong')} />
      </Suspense>
    )
  if (section === 'tuong') return <StatuePicker go={go} onBack={() => go('/')} />
  if (section?.startsWith('quan-tri'))
    return (
      <Suspense fallback={loading('🔒')}>
        <Admin onBack={() => go('/')} />
      </Suspense>
    )
  const Game = GAMES[section]
  if (Game)
    return (
      <Suspense fallback={loading('🎲')}>
        <Game onBack={() => go('/')} />
      </Suspense>
    )
  if (section === 'bst') return <Gallery onBack={() => go('/')} />
  return <Home go={go} />
}
