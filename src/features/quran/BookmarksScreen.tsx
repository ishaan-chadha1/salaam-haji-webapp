import { Bookmark, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Empty, Page, PageHeader } from '../../components/ui'
import { getBookmarks, removeBookmark } from './quranApi'

export function BookmarksScreen() {
  const navigate = useNavigate()
  const [list, setList] = useState(getBookmarks)
  return (
    <Page>
      <PageHeader title="Bookmarks" subtitle="Saved ayahs on this device" />
      {list.length === 0 ? (
        <Empty icon={<Bookmark className="size-10" />} title="No bookmarks yet">Tap the bookmark on any ayah while reading.</Empty>
      ) : (
        <div className="space-y-2">
          {list.map((b) => (
            <Card key={b.globalNumber} onClick={() => navigate(`/quran/${b.surah}#ayah-${b.ayah}`)}>
              <div className="flex items-center gap-3">
                <Bookmark className="size-5 fill-current text-gold" />
                <div className="flex-1">
                  <p className="font-semibold text-ink">{b.surahName} · {b.surah}:{b.ayah}</p>
                  <p className="text-xs text-muted">Saved {new Date(b.savedAt).toLocaleDateString()}</p>
                </div>
                <span
                  role="button"
                  aria-label="Remove bookmark"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeBookmark(b.globalNumber)
                    setList(getBookmarks())
                  }}
                  className="grid size-9 place-items-center rounded-full text-muted hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  )
}
