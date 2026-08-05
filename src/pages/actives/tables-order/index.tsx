import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Armchair, Layers, ArrowLeftRight, Scissors } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useGetAreasQuery,
  useGetTablesQuery,
  useTransferTableMutation,
  useMergeTablesMutation,
  useSplitTableMutation,
} from '@/store/slice/users/api/api'
import type { TPosArea, TPosTable } from '@/store/slice/users/types/pos-types'
import { cn } from '@/utils'
import PosOrderPage from '../order'
import { SplitOrderModal } from './split-order-modal'

type Mode = 'NORMAL' | 'MERGE' | 'MOVE' | 'SPLIT'

// ─── Elapsed time ─────────────────────────────────────────────────────────────

function elapsed(dateStr?: string) {
  if (!dateStr) return null
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 60) return `${mins}'`
  return `${Math.floor(mins / 60)}h${mins % 60 ? (mins % 60) + "'" : ''}`
}

// ─── Table card ───────────────────────────────────────────────────────────────

function TableCard({ table, onClick, selected, blocked }: {
  table: TPosTable
  onClick: () => void
  selected: boolean
  blocked: boolean
}) {
  const { t } = useTranslation()
  const occupied = !!table.OrderId
  const isQrOrder = occupied && !!table.IsAnonymous
  const time = elapsed(table.CreationTime)
  const theme = isQrOrder ? 'qr' : occupied ? 'occupied' : 'empty'
  const label = isQrOrder
    ? t('pages.actives.tablesOrder.qrOrder')
    : occupied
      ? t('pages.actives.tablesOrder.occupiedTable')
      : t('pages.actives.tablesOrder.emptyTable')
  const chairClass = {
    empty: 'border-slate-200 bg-slate-50',
    occupied: 'border-teal-700 bg-teal-700/80',
    qr: 'border-orange-400 bg-orange-400/85',
  }[theme]
  const tableClass = {
    empty: 'border-slate-300 bg-white text-slate-500 shadow-[0_2px_0_rgba(15,23,42,0.06)] hover:border-slate-400',
    occupied: 'border-teal-800 bg-teal-700 text-white shadow-[0_8px_18px_rgba(15,118,110,0.22)] hover:bg-teal-800',
    qr: 'border-orange-600 bg-orange-500 text-white shadow-[0_8px_18px_rgba(249,115,22,0.24)] hover:bg-orange-600',
  }[theme]

  return (
    <button
      onClick={onClick}
      disabled={blocked}
      className={cn(
        'group relative h-[112px] w-[132px] transition-transform duration-150',
        blocked ? 'cursor-not-allowed opacity-40 grayscale' : 'cursor-pointer active:scale-[0.97]',
      )}
    >
      {selected && (
        <span className="absolute -left-1.5 -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow">
          ✓
        </span>
      )}
      {['left-3 top-0', 'right-3 top-0', 'left-3 bottom-0', 'right-3 bottom-0'].map(pos => (
        <span
          key={pos}
          className={`absolute ${pos} h-5 w-5 rounded-b-lg rounded-t-sm border transition-colors ${chairClass}`}
        />
      ))}
      <div
        className={cn(
          'absolute inset-x-0 top-5 h-[70px] rounded-md border-2 px-3 py-2 transition-colors',
          tableClass,
          selected && 'ring-2 ring-indigo-500 ring-offset-1',
        )}
      >
        <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm font-bold leading-none">#{table.Name}</p>
          <p className="text-xs font-medium leading-none">{label}</p>
          {occupied && time ? (
            <p className="text-[10px] font-medium leading-none opacity-80">{time}</p>
          ) : null}
          {table.IsPrinted ? (
            <p className="text-[10px] font-medium leading-none opacity-80">{t('pages.actives.tablesOrder.provisionalPrint')}</p>
          ) : null}
        </div>
      </div>
    </button>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

// Status filter sentinels — mirror Angular's area-table.component onChangeArea(id):
// 0 = all, -1 = in-use (isHasOrder), -2 = QR orders (isAnonymous). -3 (empty-only)
// has no backend param, so it's filtered client-side.
const FILTER_IN_USE = -1
const FILTER_QR = -2
const FILTER_EMPTY = -3

function FloorSidebar({ areas, selected, onSelect, loading }: {
  areas: TPosArea[]
  selected: number
  onSelect: (id: number) => void
  loading: boolean
}) {
  const { t } = useTranslation()
  const itemClass = (active: boolean) =>
    `block w-full rounded-sm px-2 py-2 text-left text-xs ${active ? 'font-bold text-teal-700' : 'text-slate-500 hover:text-slate-800'}`
  return (
    <aside className="hidden w-[184px] shrink-0 border-r border-slate-200 bg-slate-50/95 text-slate-700 md:flex md:flex-col">
      <nav className="flex-1 space-y-1 px-3 py-4">
        {loading ? (
          <div className="space-y-2 py-1">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-24 rounded-md" />)}
          </div>
        ) : (
          <>
            <button onClick={() => onSelect(0)} className={itemClass(selected === 0)}>
              {t('pages.actives.tablesOrder.allAreas')}
            </button>
            <button onClick={() => onSelect(FILTER_IN_USE)} className={itemClass(selected === FILTER_IN_USE)}>
              {t('pages.actives.tablesOrder.filterInUse')}
            </button>
            <button onClick={() => onSelect(FILTER_EMPTY)} className={itemClass(selected === FILTER_EMPTY)}>
              {t('pages.actives.tablesOrder.filterEmpty')}
            </button>
            <button onClick={() => onSelect(FILTER_QR)} className={itemClass(selected === FILTER_QR)}>
              {t('pages.actives.tablesOrder.filterQr')}
            </button>
            <div className="my-2 border-t border-slate-200" />
            {areas.map(area => (
              <button key={area.Id} onClick={() => onSelect(area.Id)} className={itemClass(selected === area.Id)}>
                {area.Name}
              </button>
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TablesOrderPage() {
  const { t } = useTranslation()
  const [selectedAreaId, setSelectedAreaId] = useState(0)
  const [activeTable, setActiveTable] = useState<TPosTable | null>(null)

  // Mode-based table actions (Gộp bàn/Chuyển bàn/Tách món) — mirrors
  // pos_web's area-table.component: pick a source table, then a destination.
  const [mode, setMode] = useState<Mode>('NORMAL')
  const [fromTable, setFromTable] = useState<TPosTable | null>(null)
  const [splitToTable, setSplitToTable] = useState<TPosTable | null>(null)
  const [splitOpen, setSplitOpen] = useState(false)

  const { data: areas = [], isLoading: areasLoading } = useGetAreasQuery()
  const { data: rawTables = [], isLoading: tablesLoading, refetch } = useGetTablesQuery(
    selectedAreaId === FILTER_IN_USE
      ? { isHasOrder: true }
      : selectedAreaId === FILTER_QR
        ? { isAnonymous: true }
        : selectedAreaId > 0
          ? { areaId: selectedAreaId }
          : {},
  )
  // "Còn trống" has no backend param — fetch the unfiltered list and filter client-side.
  const allTables = selectedAreaId === FILTER_EMPTY ? rawTables.filter(table => !table.OrderId) : rawTables
  const [transferTable] = useTransferTableMutation()
  const [mergeTables] = useMergeTablesMutation()
  const [splitTable] = useSplitTableMutation()

  // If a table is selected, show POS selling view
  if (activeTable) {
    return (
      <PosOrderPage
        tableLabel={activeTable.Name}
        bookingId={activeTable.OrderId}
        tableId={activeTable.Id}
        tableGuid={activeTable.Guid}
        // Back to the floor plan with fresh table state (a paid table frees up).
        onBack={() => { setActiveTable(null); refetch() }}
      />
    )
  }

  const resetMode = () => { setMode('NORMAL'); setFromTable(null) }

  const startMode = (m: Exclude<Mode, 'NORMAL'>) => {
    setMode(mode === m ? 'NORMAL' : m)
    setFromTable(null)
    if (mode !== m) {
      toast.success(t(`pages.actives.tablesOrder.pickSource${m === 'MERGE' ? 'Merge' : m === 'MOVE' ? 'Move' : 'Split'}`))
    }
  }

  const runMergeOrMove = async (from: TPosTable, to: TPosTable) => {
    const verb = mode === 'MOVE' ? t('pages.actives.tablesOrder.moveVerb') : t('pages.actives.tablesOrder.mergeVerb')
    if (!window.confirm(t('pages.actives.tablesOrder.confirmActionTable', { verb, from: from.Name, to: to.Name }))) return
    try {
      if (mode === 'MOVE') await transferTable({ fromTableId: from.Id, toTableId: to.Id }).unwrap()
      else await mergeTables({ fromTableId: from.Id, toTableId: to.Id }).unwrap()
      toast.success(mode === 'MOVE' ? t('pages.actives.tablesOrder.moveSuccess') : t('pages.actives.tablesOrder.mergeSuccess'))
      resetMode()
      refetch()
    } catch {
      toast.error(t('pages.actives.tablesOrder.actionFailed'))
    }
  }

  const handleTableClick = (table: TPosTable) => {
    if (mode === 'NORMAL') { setActiveTable(table); return }

    // Can't start a selection on an empty table — nothing to merge/move/split yet.
    if (!fromTable && !table.OrderId) return

    if (!fromTable) {
      setFromTable(table)
      toast.success(mode === 'MERGE'
        ? t('pages.actives.tablesOrder.pickDestinationMerge', { name: table.Name })
        : t('pages.actives.tablesOrder.pickDestinationMoveOrSplit'))
      return
    }

    if (table.Id === fromTable.Id) {
      toast.error(mode === 'MERGE' ? t('pages.actives.tablesOrder.cannotSameTableMerge') : t('pages.actives.tablesOrder.cannotSameTableMove'))
      return
    }

    if (mode === 'SPLIT') { setSplitToTable(table); setSplitOpen(true); return }
    runMergeOrMove(fromTable, table)
  }

  const handleSplitConfirm = async (itemIds: number[]) => {
    if (!fromTable || !splitToTable) return
    try {
      await splitTable({ fromTableId: fromTable.Id, toTableId: splitToTable.Id, itemIds }).unwrap()
      toast.success(t('pages.actives.tablesOrder.splitSuccess'))
      setSplitOpen(false)
      resetMode()
      refetch()
    } catch {
      toast.error(t('pages.actives.tablesOrder.splitFailed'))
    }
  }

  const selectedAreaName = selectedAreaId > 0
    ? areas.find(area => area.Id === selectedAreaId)?.Name ?? t('pages.actives.tablesOrder.area')
    : selectedAreaId === FILTER_IN_USE
      ? t('pages.actives.tablesOrder.filterInUse')
      : selectedAreaId === FILTER_QR
        ? t('pages.actives.tablesOrder.filterQr')
        : selectedAreaId === FILTER_EMPTY
          ? t('pages.actives.tablesOrder.filterEmpty')
          : t('pages.actives.tablesOrder.allAreas')

  const modeBanner = mode === 'MERGE'
    ? t('pages.actives.tablesOrder.mergeModeBanner')
    : mode === 'MOVE'
      ? t('pages.actives.tablesOrder.moveModeBanner')
      : mode === 'SPLIT'
        ? t('pages.actives.tablesOrder.splitModeBanner')
        : ''

  const modeButton = (m: Exclude<Mode, 'NORMAL'>, Icon: typeof Layers, labelKey: string, activeClass: string) => (
    <button
      onClick={() => startMode(m)}
      title={t(labelKey)}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors',
        mode === m ? activeClass : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden md:inline">{t(labelKey)}</span>
    </button>
  )

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-slate-100">
      <FloorSidebar
        areas={areas}
        selected={selectedAreaId}
        onSelect={setSelectedAreaId}
        loading={areasLoading}
      />

      <main className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{selectedAreaName}</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {modeButton('SPLIT', Scissors, 'pages.actives.tablesOrder.splitModeButton', 'bg-amber-100 text-amber-700')}
            {modeButton('MOVE', ArrowLeftRight, 'pages.actives.tablesOrder.moveModeButton', 'bg-blue-100 text-blue-700')}
            {modeButton('MERGE', Layers, 'pages.actives.tablesOrder.mergeModeButton', 'bg-emerald-100 text-emerald-700')}
          </div>
        </header>

        {mode !== 'NORMAL' && (
          <div className="mx-4 mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
            <span>{modeBanner}</span>
            <button onClick={resetMode} className="text-xs font-bold text-rose-600 hover:underline">{t('common.cancel')}</button>
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100 bg-white px-4 py-2 md:hidden">
          {[
            { id: 0, name: t('common.all') },
            { id: FILTER_IN_USE, name: t('pages.actives.tablesOrder.filterInUse') },
            { id: FILTER_EMPTY, name: t('pages.actives.tablesOrder.filterEmpty') },
            { id: FILTER_QR, name: t('pages.actives.tablesOrder.filterQr') },
            ...areas.map(area => ({ id: area.Id, name: area.Name })),
          ].map(area => (
            <button
              key={area.id}
              onClick={() => setSelectedAreaId(area.id)}
              className={`h-8 shrink-0 rounded-md px-3 text-xs font-medium ${
                selectedAreaId === area.id ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {area.name}
            </button>
          ))}
        </div>

        <div
          className="flex-1 overflow-auto p-5 md:p-8"
          style={{
            backgroundColor: '#fbfcfd',
            backgroundImage: 'radial-gradient(circle, rgba(15, 23, 42, 0.12) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        >
          {tablesLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,132px))] justify-center gap-x-14 gap-y-10 md:justify-start">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-[112px] w-[132px] rounded-md" />)}
            </div>
          ) : allTables.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-sm text-slate-400">
              <Armchair className="mb-3 h-10 w-10 text-slate-300" />
              {t('pages.actives.tablesOrder.noTablesFound')}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,132px))] justify-center gap-x-14 gap-y-10 md:justify-start lg:gap-x-20 lg:gap-y-12">
              {allTables.map(table => (
                <TableCard
                  key={table.Id}
                  table={table}
                  selected={fromTable?.Id === table.Id}
                  blocked={mode !== 'NORMAL' && !table.OrderId && !fromTable}
                  onClick={() => handleTableClick(table)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <SplitOrderModal
        open={splitOpen}
        onOpenChange={open => { setSplitOpen(open); if (!open) resetMode() }}
        fromTable={fromTable}
        toTable={splitToTable}
        onConfirm={handleSplitConfirm}
      />
    </div>
  )
}
