import { useState } from 'react'
import {
  Armchair,
  BarChart3,
  CalendarDays,
  LayoutGrid,
  Maximize2,
  RefreshCw,
  Search,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetAreasQuery, useGetTablesQuery } from '@/store/slice/users/api/api'
import type { TPosArea, TPosTable } from '@/store/slice/users/types/pos-types'
import PosOrderPage from '../order'

// ─── Elapsed time ─────────────────────────────────────────────────────────────

function elapsed(dateStr?: string) {
  if (!dateStr) return null
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 60) return `${mins}'`
  return `${Math.floor(mins / 60)}h${mins % 60 ? (mins % 60) + "'" : ''}`
}

// ─── Table card ───────────────────────────────────────────────────────────────

function TableCard({ table, onClick }: { table: TPosTable; onClick: () => void }) {
  const occupied = !!table.OrderId
  const isQrOrder = occupied && !!table.IsAnonymous
  const time = elapsed(table.CreationTime)
  const theme = isQrOrder ? 'qr' : occupied ? 'occupied' : 'empty'
  const label = isQrOrder ? 'Đặt qua QR' : occupied ? 'Đã gọi món' : 'Bàn trống'
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
      className="group relative h-[112px] w-[132px] cursor-pointer transition-transform duration-150 active:scale-[0.97]"
    >
      {['left-3 top-0', 'right-3 top-0', 'left-3 bottom-0', 'right-3 bottom-0'].map(pos => (
        <span
          key={pos}
          className={`absolute ${pos} h-5 w-5 rounded-b-lg rounded-t-sm border transition-colors ${chairClass}`}
        />
      ))}
      <div
        className={`absolute inset-x-0 top-5 h-[70px] rounded-md border-2 px-3 py-2 transition-colors ${tableClass}`}
      >
        <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm font-bold leading-none">#{table.Name}</p>
          <p className="text-xs font-medium leading-none">{label}</p>
          {occupied && time ? (
            <p className="text-[10px] font-medium leading-none opacity-80">{time}</p>
          ) : null}
          {table.IsPrinted ? (
            <p className="text-[10px] font-medium leading-none opacity-80">In tạm tính</p>
          ) : null}
        </div>
      </div>
    </button>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function FloorSidebar({ areas, selected, onSelect, loading }: {
  areas: TPosArea[]
  selected: number
  onSelect: (id: number) => void
  loading: boolean
}) {
  return (
    <aside className="hidden w-[184px] shrink-0 border-r border-slate-200 bg-slate-50/95 text-slate-700 md:flex md:flex-col">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-[11px] font-medium text-slate-500">Restaurant POS</p>
        <p className="mt-1 text-xs font-semibold text-slate-800">Downtown Bistro</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        <button
          onClick={() => onSelect(0)}
          className={`flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-medium transition-colors ${
            selected === 0 ? 'bg-teal-50 text-teal-800' : 'hover:bg-white'
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          Sơ đồ bàn
        </button>
        <div className="ml-[29px] border-l border-slate-300 py-1 pl-3">
          {loading ? (
            <div className="space-y-2 py-1">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-24 rounded-md" />)}
            </div>
          ) : (
            <>
              <button
                onClick={() => onSelect(0)}
                className={`block w-full rounded-sm px-2 py-2 text-left text-xs ${
                  selected === 0 ? 'font-bold text-teal-700' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tất cả khu vực
              </button>
              <button
                onClick={() => onSelect(-1)}
                className={`block w-full rounded-sm px-2 py-2 text-left text-xs ${
                  selected === -1 ? 'font-bold text-teal-700' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Đang dùng
              </button>
              {areas.map(area => (
                <button
                  key={area.Id}
                  onClick={() => onSelect(area.Id)}
                  className={`block w-full rounded-sm px-2 py-2 text-left text-xs ${
                    selected === area.Id ? 'font-bold text-teal-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {area.Name}
                </button>
              ))}
            </>
          )}
        </div>
        <button className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-medium text-slate-600 hover:bg-white">
          <CalendarDays className="h-4 w-4" />
          Đặt bàn
        </button>
        <button className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-medium text-slate-600 hover:bg-white">
          <BarChart3 className="h-4 w-4" />
          Báo cáo
        </button>
        <button className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-medium text-slate-600 hover:bg-white">
          <Users className="h-4 w-4" />
          Nhân viên
        </button>
      </nav>
    </aside>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TablesOrderPage() {
  const [selectedAreaId, setSelectedAreaId] = useState(0)
  const [activeTable, setActiveTable] = useState<TPosTable | null>(null)

  const { data: areas = [], isLoading: areasLoading } = useGetAreasQuery()
  const { data: allTables = [], isLoading: tablesLoading, refetch } = useGetTablesQuery(
    selectedAreaId === -1
      ? { isHasOrder: true }
      : selectedAreaId > 0
        ? { areaId: selectedAreaId }
        : {},
  )

  // If a table is selected, show POS selling view
  if (activeTable) {
    return (
      <PosOrderPage
        tableLabel={activeTable.Name}
        bookingId={activeTable.OrderId}
        tableId={activeTable.Id}
        // Back to the floor plan with fresh table state (a paid table frees up).
        onBack={() => { setActiveTable(null); refetch() }}
      />
    )
  }

  const occupied = allTables.filter(t => !!t.OrderId).length
  const empty = allTables.filter(t => !t.OrderId).length
  const qrOrders = allTables.filter(t => !!t.OrderId && !!t.IsAnonymous).length
  const servedOrders = occupied - qrOrders
  const selectedAreaName = selectedAreaId === -1
    ? 'Bàn đang dùng'
    : selectedAreaId > 0
      ? areas.find(area => area.Id === selectedAreaId)?.Name ?? 'Khu vực'
      : 'Tất cả khu vực'

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
            <p className="text-[11px] text-slate-400 md:hidden">Sơ đồ bàn nhà hàng</p>
          </div>
          <div className="ml-auto hidden items-center gap-5 md:flex">
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              Bàn trống ({empty})
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-2 w-2 rounded-full bg-teal-700" />
              Đã gọi món ({servedOrders})
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              Đặt qua QR ({qrOrders})
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <button
              onClick={() => refetch()}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              title="Tải lại"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button className="hidden h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 md:flex" title="Tìm kiếm">
              <Search className="h-4 w-4" />
            </button>
            <button className="hidden h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 md:flex" title="Phóng to">
              <ZoomIn className="h-4 w-4" />
            </button>
            <button className="hidden h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 md:flex" title="Thu nhỏ">
              <ZoomOut className="h-4 w-4" />
            </button>
            <button className="hidden h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 md:flex" title="Toàn màn hình">
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100 bg-white px-4 py-2 md:hidden">
          {[{ id: 0, name: 'Tất cả' }, { id: -1, name: 'Đang dùng' }, ...areas.map(area => ({ id: area.Id, name: area.Name }))].map(area => (
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
              Không tìm thấy bàn
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,132px))] justify-center gap-x-14 gap-y-10 md:justify-start lg:gap-x-20 lg:gap-y-12">
              {allTables.map(table => (
                <TableCard
                  key={table.Id}
                  table={table}
                  onClick={() => setActiveTable(table)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
