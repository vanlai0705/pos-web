import { ArrowLeftRight, Coins, PackageSearch, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'

const items = [
  {
    title: 'Công nợ khách hàng',
    description: 'Cập nhật công nợ khách hàng ban đầu',
    href: '/managers/opening-balances/customer',
    icon: Coins,
  },
  {
    title: 'Công nợ nhà cung cấp',
    description: 'Cập nhật công nợ nhà cung cấp ban đầu',
    href: '/managers/opening-balances/supplier',
    icon: Truck,
  },
  {
    title: 'Tồn kho ban đầu',
    description: 'Cập nhật số lượng tồn và giá vốn ban đầu',
    href: '/managers/opening-balances/inventory',
    icon: PackageSearch,
  },
]

export default function OpeningBalancesPage() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="rounded-lg border bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Dữ liệu ban đầu</h1>
            <p className="text-sm text-slate-500">Chọn nhóm dữ liệu cần cập nhật</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(item => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              to={item.href}
              className="group flex items-center gap-3 rounded-lg border bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-blue-600 group-hover:text-white">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-slate-800 group-hover:text-blue-700">{item.title}</span>
                <span className="mt-0.5 block text-sm text-slate-500">{item.description}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
