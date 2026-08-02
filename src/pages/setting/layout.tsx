import { NavLink, Outlet } from "react-router-dom"
import { cn } from "@/utils"
import {
  Building2, ShoppingCart, Package, Warehouse,
  Bell, FileText, Printer,
} from "lucide-react"

const NAV_ITEMS = [
  { to: "/setting/general",       label: "Thông tin chung",      icon: Building2  },
  { to: "/setting/order",         label: "Cài đặt đơn hàng",     icon: ShoppingCart },
  { to: "/setting/product",       label: "Cài đặt mặt hàng",     icon: Package    },
  { to: "/setting/stock",         label: "Cài đặt kho hàng",     icon: Warehouse  },
  { to: "/setting/notification",  label: "Thông báo",            icon: Bell       },
  { to: "/setting/invoice",       label: "Hoá đơn điện tử",      icon: FileText   },
  { to: "/setting/printer",       label: "Cài đặt máy in",       icon: Printer    },
]

export default function SettingLayout() {
  return (
    <div className="flex gap-5 min-h-[calc(100vh-4rem)]">
      {/* Side nav */}
      <aside className="w-52 flex-none">
        <nav className="sticky top-4 rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cài đặt</p>
          </div>
          <ul className="py-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold border-r-2 border-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )
                  }
                >
                  <Icon className="h-4 w-4 flex-none" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Page content */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
