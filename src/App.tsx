import { Suspense, lazy, useSyncExternalStore } from 'react'
import Editor2D from './components/Editor2D'
import Gallery from './components/Gallery'
import Home from './components/Home'
import { PicturePicker, StatuePicker } from './components/Pickers'

const Editor3D = lazy(() => import('./components/Editor3D'))

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
const go = (path: string) => {
  window.location.hash = path
  window.scrollTo(0, 0)
}

export default function App() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  const [, section, id] = hash.replace(/^#/, '').split('/')
  if (section === 'tranh' && id) return <Editor2D key={id} id={id} onBack={() => go('/tranh')} />
  if (section === 'tranh') return <PicturePicker go={go} onBack={() => go('/')} />
  if (section === 'tuong' && id)
    return (
      <Suspense fallback={<div className="sky flex h-dvh items-center justify-center text-7xl">🐼</div>}>
        <Editor3D key={id} id={id} onBack={() => go('/tuong')} />
      </Suspense>
    )
  if (section === 'tuong') return <StatuePicker go={go} onBack={() => go('/')} />
  if (section === 'bst') return <Gallery onBack={() => go('/')} />
  return <Home go={go} />
}
