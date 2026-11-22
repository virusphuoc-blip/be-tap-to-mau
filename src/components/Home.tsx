import { useState } from 'react'
import { isMuted, setMuted } from '../lib/storage'

function BigCard(props: { icon: string; title: string; sub: string; color: string; onClick: () => void }) {
  return (
    <button type="button" onClick={props.onClick} className={`flex w-full items-center gap-4 rounded-[2rem] border-b-8 p-4 text-left text-white shadow-lg ${props.color}`}>
      <span className="wiggle text-7xl leading-none drop-shadow">{props.icon}</span>
      <span>
        <span className="block text-3xl leading-tight font-black drop-shadow-sm">{props.title}</span>
        <span className="block text-base font-bold opacity-95">{props.sub}</span>
      </span>
    </button>
  )
}

export default function Home({ go }: { go: (path: string) => void }) {
  const [muted, setM] = useState(isMuted)
  return (
    <div className="sky min-h-dvh">
      <main className="mx-auto flex max-w-md flex-col gap-4 p-4">
        <div className="flex items-center gap-3 pt-2">
          <img src="/favicon.svg" alt="" className="h-16 w-16" />
          <h1 className="flex-1 text-4xl leading-none font-black text-amber-600 drop-shadow-sm">
            Bé Tập
            <br />
            <span className="text-pink-500">Tô Màu</span>
          </h1>
          <button
            type="button"
            aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            aria-pressed={!muted}
            onClick={() => {
              setMuted(!muted)
              setM(!muted)
            }}
            className="h-14 w-14 rounded-2xl border-b-4 border-slate-200 bg-white text-3xl shadow-sm"
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
        <BigCard icon="🎨" title="Tô tranh" sub="Chạm để đổ màu, vẽ bằng cọ" color="border-pink-600 bg-pink-400" onClick={() => go('/tranh')} />
        <BigCard icon="🐼" title="Tô tượng 3D" sub="Xoay tượng và tô từng phần" color="border-violet-700 bg-violet-500" onClick={() => go('/tuong')} />
        <BigCard icon="🖼️" title="Tranh của bé" sub="Xem lại tranh đã lưu" color="border-emerald-700 bg-emerald-500" onClick={() => go('/bst')} />
        <footer className="mt-2 rounded-3xl bg-white/80 p-4 text-sm leading-relaxed text-slate-700">
          <h2 className="mb-1 text-base font-black text-slate-800">👨‍👩‍👧 Dành cho ba mẹ</h2>
          <ul className="list-disc space-y-0.5 pl-5">
            <li>Miễn phí hoàn toàn, không mua thêm trong ứng dụng.</li>
            <li>Không quảng cáo, không trò chuyện, không liên kết ra ngoài.</li>
            <li>Không cần đăng nhập, không thu thập dữ liệu: tranh của bé chỉ lưu trên máy này.</li>
            <li>Dùng được khi không có mạng sau lần mở đầu tiên. Có thể “Thêm vào màn hình chính” để dùng như ứng dụng.</li>
          </ul>
        </footer>
      </main>
    </div>
  )
}
