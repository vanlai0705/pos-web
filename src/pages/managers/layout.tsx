import { cn } from "@/utils"
import { Layers, Ruler, Store, Truck, Users } from "lucide-react"
import { NavLink, Outlet } from "react-router-dom"

const NAV_ITEMS = [
  { to: "/managers/product-groups", label: "Nhóm mặt hàng", icon: Layers },
  { to: "/managers/customer-groups", label: "Nhóm khách hàng", icon: Users },
  { to: "/managers/supplier-groups", label: "Nhóm nhà cung cấp", icon: Truck },
  { to: "/managers/units", label: "Đơn vị tính", icon: Ruler },
  { to: "/managers/shops", label: "Cửa hàng", icon: Store },
]

export default function ManagerLayout() {
  return (
    <div className="flex gap-4 h-full min-h-0 p-4">
      <aside className="w-52 flex-none">
        <nav className="sticky top-4 rounded-lg border bg-card overflow-hidden">
          <div className="px-3 py-2.5 border-b">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quản trị danh mục</p>
          </div>
          <div className="p-1.5 space-y-0.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold border-r-2 border-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4 flex-none" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </aside>

      {/* min-h-0 lets this pane size to the row's bounded height instead of
          growing with content; overflow-y-auto is its own fallback scrollbar
          for pages that don't manage an internal scroll region themselves —
          pages that do (e.g. DataTable-based lists using h-full/min-h-0)
          fit exactly, so this scrollbar stays inactive for them. */}
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
