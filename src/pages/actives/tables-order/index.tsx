import PosOrderPage from '../order'
import { Skeleton } from '@/components/ui/skeleton'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { useGetAreasQuery, useGetTablesQuery, useMergeTablesMutation, useSplitTableMutation, useTransferTableMutation } from '@/store/slice/tables/api'
import { TPosArea, TPosTable } from '@/store/slice/users'
import { cn } from '@/utils'
import { Armchair, ArrowLeftRight, CheckCircle2, Layers, LayoutGrid, MapPin, Maximize2, Minimize2, Move, QrCode, RotateCcw, RotateCw, Scissors, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { SplitOrderModal } from './split-order-modal'
type Mode = 'NORMAL' | 'MERGE' | 'MOVE' | 'SPLIT'
type TableLayout = { x: number; y: number; rotation: number }

const TABLE_WIDTH = 132
const TABLE_HEIGHT = 112
const TABLE_LAYOUT_KEY_PREFIX = 'pos-web-v2:tables-layout:v1'

function getLayoutKey(areaId: number) {
  const path = typeof window === 'undefined' ? 'default' : window.location.pathname.split('/').slice(0, 2).join('/') || 'default'
  return `${TABLE_LAYOUT_KEY_PREFIX}:${path}:area:${areaId}`
}

function defaultTableLayout(index: number): TableLayout {
  const col = index % 6
  const row = Math.floor(index / 6)
  return { x: 24 + col * 188, y: 24 + row * 138, rotation: 0 }
}

function readTableLayout(key: string): Record<string, TableLayout> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, TableLayout>
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => (
      Number.isFinite(value?.x) && Number.isFinite(value?.y) && Number.isFinite(value?.rotation)
    )))
  } catch {
    return {}
  }
}

function saveTableLayout(key: string, layout: Record<string, TableLayout>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(layout))
}

function normalizeRotation(value: number) {
  if (!Number.isFinite(value)) return 0
  return ((value % 360) + 360) % 360
}

// ─── Elapsed time ─────────────────────────────────────────────────────────────

function elapsed(dateStr?: string) {
  if (!dateStr) return null
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 60) return `${mins}'`
  return `${Math.floor(mins / 60)}h${mins % 60 ? (mins % 60) + "'" : ''}`
}

// ─── Table card ───────────────────────────────────────────────────────────────

function TableCard({ table, onClick, onPointerDown, selected, blocked, arrangeMode }: {
  table: TPosTable
  onClick: () => void
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void
  selected: boolean
  blocked: boolean
  arrangeMode?: boolean
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
      onPointerDown={onPointerDown}
      disabled={blocked}
      className={cn(
        'group relative h-[112px] w-[132px] transition-transform duration-150',
        blocked ? 'cursor-not-allowed opacity-40 grayscale' : arrangeMode ? 'cursor-grab touch-none active:cursor-grabbing' : 'cursor-pointer active:scale-[0.97]',
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

  // Each status filter gets the same color it shows as on the table cards
  // themselves (teal = occupied, orange = QR order) so the sidebar reads as
  // a legend, not just a plain list — "Còn trống" gets emerald as the
  // universal "available" signal.
  const TONE = {
    slate: { active: 'bg-slate-700 text-white shadow-sm shadow-slate-700/20', idle: 'text-slate-600 hover:bg-slate-200/70', icon: 'text-slate-400' },
    teal: { active: 'bg-teal-600 text-white shadow-sm shadow-teal-600/20', idle: 'text-teal-700 hover:bg-teal-50', icon: 'text-teal-500' },
    emerald: { active: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20', idle: 'text-emerald-700 hover:bg-emerald-50', icon: 'text-emerald-500' },
    orange: { active: 'bg-orange-500 text-white shadow-sm shadow-orange-500/20', idle: 'text-orange-700 hover:bg-orange-50', icon: 'text-orange-500' },
  } as const

  const item = (id: number, label: string, Icon: typeof LayoutGrid, tone: keyof typeof TONE = 'slate') => {
    const active = selected === id
    const c = TONE[tone]
    return (
      <button
        key={id}
        onClick={() => onSelect(id)}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors',
          active ? c.active : `${c.idle} hover:text-current`,
        )}
      >
        <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : c.icon)} />
        <span className="truncate">{label}</span>
      </button>
    )
  }

  return (
    <aside className="hidden w-[196px] shrink-0 flex-col border-r border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/60 text-slate-700 md:flex">
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="space-y-2 py-1">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
          </div>
        ) : (
          <>
            {item(0, t('pages.actives.tablesOrder.allAreas'), LayoutGrid, 'slate')}
            {item(FILTER_IN_USE, t('pages.actives.tablesOrder.filterInUse'), Users, 'teal')}
            {item(FILTER_EMPTY, t('pages.actives.tablesOrder.filterEmpty'), CheckCircle2, 'emerald')}
            {item(FILTER_QR, t('pages.actives.tablesOrder.filterQr'), QrCode, 'orange')}

            <div className="my-3 flex items-center gap-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('pages.actives.tablesOrder.area')}
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {areas.map(area => item(area.Id, area.Name, MapPin))}
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
  const [isArrangeMode, setIsArrangeMode] = useState(false)
  const [tableLayout, setTableLayout] = useState<Record<string, TableLayout>>({})
  const [draggingTable, setDraggingTable] = useState<{ id: number; offsetX: number; offsetY: number } | null>(null)
  const [selectedLayoutTableId, setSelectedLayoutTableId] = useState<number | null>(null)
  const floorRef = useRef<HTMLDivElement>(null)

  // Drives a full-viewport overlay (see the root div below) that hides the
  // app's own sidebar/header, not just the OS-level Fullscreen API — that API
  // can silently fail in embedded/sandboxed contexts, but "hide everything
  // else" still has to work either way. requestFullscreen() is still tried
  // as a bonus for real deployments; failures are swallowed on purpose.
  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const onChange = () => { if (!document.fullscreenElement) setIsFullscreen(false) }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const toggleFullscreen = () => {
    if (isFullscreen) {
      setIsFullscreen(false)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => { })
    } else {
      setIsFullscreen(true)
      document.documentElement.requestFullscreen?.().catch(() => { })
    }
  }

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
  const layoutAreaId = selectedAreaId > 0 ? selectedAreaId : 0
  const layoutKey = useMemo(() => getLayoutKey(layoutAreaId), [layoutAreaId])
  const positionedTables = useMemo(() => allTables.map((table, index) => ({
    table,
    layout: tableLayout[String(table.Id)] ?? defaultTableLayout(index),
  })), [allTables, tableLayout])
  const floorWidth = Math.max(760, ...positionedTables.map(({ layout }) => layout.x + TABLE_WIDTH + 72))
  const floorHeight = Math.max(520, ...positionedTables.map(({ layout }) => layout.y + TABLE_HEIGHT + 72))

  useEffect(() => {
    setTableLayout(readTableLayout(layoutKey))
    setDraggingTable(null)
    setSelectedLayoutTableId(null)
  }, [layoutKey])

  const updateTableLayout = (updater: (current: Record<string, TableLayout>) => Record<string, TableLayout>) => {
    setTableLayout(current => {
      const next = updater(current)
      saveTableLayout(layoutKey, next)
      return next
    })
  }

  const resetLayout = () => {
    updateTableLayout(() => ({}))
    setSelectedLayoutTableId(null)
  }

  const startTableDrag = (table: TPosTable, layout: TableLayout) => (event: PointerEvent<HTMLButtonElement>) => {
    if (!isArrangeMode || !floorRef.current) return
    event.preventDefault()
    const rect = floorRef.current.getBoundingClientRect()
    const scrollLeft = floorRef.current.scrollLeft
    const scrollTop = floorRef.current.scrollTop
    setSelectedLayoutTableId(table.Id)
    setDraggingTable({
      id: table.Id,
      offsetX: event.clientX - rect.left + scrollLeft - layout.x,
      offsetY: event.clientY - rect.top + scrollTop - layout.y,
    })
    updateTableLayout(current => ({
      ...current,
      [table.Id]: current[String(table.Id)] ?? layout,
    }))
  }

  const moveDraggingTable = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingTable || !floorRef.current) return
    const rect = floorRef.current.getBoundingClientRect()
    const scrollLeft = floorRef.current.scrollLeft
    const scrollTop = floorRef.current.scrollTop
    const x = Math.max(0, event.clientX - rect.left + scrollLeft - draggingTable.offsetX)
    const y = Math.max(0, event.clientY - rect.top + scrollTop - draggingTable.offsetY)
    updateTableLayout(current => ({
      ...current,
      [draggingTable.id]: {
        ...(current[String(draggingTable.id)] ?? { x, y, rotation: 0 }),
        x,
        y,
      },
    }))
  }

  const rotateTable = (tableId: number, rotation: number) => {
    const current = positionedTables.find(({ table }) => table.Id === tableId)?.layout ?? { x: 0, y: 0, rotation: 0 }
    updateTableLayout(layout => ({
      ...layout,
      [tableId]: {
        ...current,
        ...(layout[String(tableId)] ?? {}),
        rotation: normalizeRotation(rotation),
      },
    }))
  }

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
    if (isArrangeMode) return
    setMode(mode === m ? 'NORMAL' : m)
    setFromTable(null)
    if (mode !== m) {
      toast.success(t(`pages.actives.tablesOrder.pickSource${m === 'MERGE' ? 'Merge' : m === 'MOVE' ? 'Move' : 'Split'}`))
    }
  }

  const runMergeOrMove = async (from: TPosTable, to: TPosTable) => {
    const verb = mode === 'MOVE' ? t('pages.actives.tablesOrder.moveVerb') : t('pages.actives.tablesOrder.mergeVerb')
    if (!await confirmAction({ description: t('pages.actives.tablesOrder.confirmActionTable', { verb, from: from.Name, to: to.Name }) })) return
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
    if (isArrangeMode) return
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

  // Each mode button keeps its tint even when idle, so the 3 actions read as
  // distinct colored controls at a glance instead of only lighting up on click.
  const modeButton = (m: Exclude<Mode, 'NORMAL'>, Icon: typeof Layers, labelKey: string, activeClass: string, idleClass: string) => (
    <button
      onClick={() => startMode(m)}
      title={t(labelKey)}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors',
        mode === m ? activeClass : idleClass,
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden md:inline">{t(labelKey)}</span>
    </button>
  )

  return (
    <div className={cn(
      'flex overflow-hidden bg-slate-100',
      isFullscreen ? 'fixed inset-0 z-[60]' : 'absolute inset-0',
    )}>
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
            {/* <button
              onClick={() => {
                setIsArrangeMode(active => {
                  const next = !active
                  if (next) resetMode()
                  if (!next) setDraggingTable(null)
                  return next
                })
              }}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors',
                isArrangeMode ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              )}
            >
              <Move className="h-4 w-4" />
              <span className="hidden md:inline">{isArrangeMode ? t('common.done', { defaultValue: 'Xong' }) : t('pages.actives.tablesOrder.arrangeModeButton', { defaultValue: 'Sắp xếp bàn' })}</span>
            </button> */}
            {isArrangeMode ? (
              <button
                onClick={resetLayout}
                className="flex h-8 items-center gap-1.5 rounded-md bg-white px-2.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden md:inline">{t('common.reset', { defaultValue: 'Reset' })}</span>
              </button>
            ) : (
              <>
                {modeButton('SPLIT', Scissors, 'pages.actives.tablesOrder.splitModeButton', 'bg-amber-500 text-white shadow-sm shadow-amber-500/20', 'bg-amber-50 text-amber-700 hover:bg-amber-100')}
                {modeButton('MOVE', ArrowLeftRight, 'pages.actives.tablesOrder.moveModeButton', 'bg-blue-500 text-white shadow-sm shadow-blue-500/20', 'bg-blue-50 text-blue-700 hover:bg-blue-100')}
                {modeButton('MERGE', Layers, 'pages.actives.tablesOrder.mergeModeButton', 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20', 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100')}
              </>
            )}
            <div className="mx-1 h-5 w-px bg-slate-200" />
            <button
              onClick={toggleFullscreen}
              title={t('common.fullscreen')}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
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
              className={`h-8 shrink-0 rounded-md px-3 text-xs font-medium ${selectedAreaId === area.id ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
            >
              {area.name}
            </button>
          ))}
        </div>

        <div
          ref={floorRef}
          onPointerMove={moveDraggingTable}
          onPointerUp={() => setDraggingTable(null)}
          onPointerCancel={() => setDraggingTable(null)}
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
            <div
              className="relative"
              style={{ minWidth: floorWidth, minHeight: floorHeight }}
            >
              {positionedTables.map(({ table, layout }) => (
                <div
                  key={table.Id}
                  className="absolute left-0 top-0"
                  style={{
                    transform: `translate(${layout.x}px, ${layout.y}px) rotate(${layout.rotation}deg)`,
                    transformOrigin: 'center',
                  }}
                >
                  {isArrangeMode && selectedLayoutTableId === table.Id ? (
                    <div
                      className="absolute -top-10 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                      style={{ transform: `translateX(-50%) rotate(${-layout.rotation}deg)` }}
                      onPointerDown={event => event.stopPropagation()}
                    >
                      <button
                        onClick={() => rotateTable(table.Id, layout.rotation - 15)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        title={t('pages.actives.tablesOrder.rotateLeft', { defaultValue: 'Xoay trái' })}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <input
                        value={Math.round(layout.rotation)}
                        onChange={event => rotateTable(table.Id, Number(event.target.value))}
                        className="h-7 w-14 rounded-md border border-slate-200 text-center text-xs font-semibold outline-none focus:border-rose-400"
                        aria-label={t('pages.actives.tablesOrder.rotationAngle', { defaultValue: 'Góc xoay' })}
                      />
                      <span className="text-xs font-semibold text-slate-400">°</span>
                      <button
                        onClick={() => rotateTable(table.Id, layout.rotation + 15)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        title={t('pages.actives.tablesOrder.rotateRight', { defaultValue: 'Xoay phải' })}
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                  <TableCard
                    table={table}
                    selected={(isArrangeMode && selectedLayoutTableId === table.Id) || fromTable?.Id === table.Id}
                    blocked={!isArrangeMode && mode !== 'NORMAL' && !table.OrderId && !fromTable}
                    arrangeMode={isArrangeMode}
                    onPointerDown={startTableDrag(table, layout)}
                    onClick={() => handleTableClick(table)}
                  />
                </div>
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
