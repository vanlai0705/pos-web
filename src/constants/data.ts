import { Icons } from "@/components/icons"
import { ROLE } from "."
export { STATUS } from "./status"
export interface NavItem {
  title: string
  href?: string
  disabled?: boolean
  external?: boolean
  icon?: keyof typeof Icons
  label?: string
  description?: string
  children?: TNavChildren[]
  role?: string[]
  isTitle?: boolean   // section label (không click, không có href)
}

export interface TNavChildren {
  title: string
  href?: string
  icon?: keyof typeof Icons
  role: string[]
  children?: TNavChildren[]
}

export type User = {
  id: number
  name: string
  company: string
  role: string
  verified: boolean
  status: string
}

// Fallback khi chưa load được menu từ API
export const navItems: NavItem[] = [
  {
    title: "Tổng quan",
    href: "/dashboard",
    icon: "dashboard",
    role: [ROLE.ADMIN, ROLE.STAFF],
  },
]

export const routeConfig: Record<string, string[]> = {
  "/dashboard": [ROLE.ADMIN, ROLE.STAFF],
  "/profile": [ROLE.ADMIN, ROLE.STAFF],
  "/change-password": [ROLE.ADMIN, ROLE.STAFF],
}
