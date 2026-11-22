// src/menu.js

import {
    LayoutDashboard, Users, ShieldCheck, Wallet, FileText, SquareStack,
    FolderTree, Building2, Settings, UsersRound, Network,
    FileSignature, Handshake, Receipt, Shield, PenTool, BarChart3,
    FilePlus2, CreditCard, Briefcase, UserCheck, CircleDollarSign, RefreshCw,
} from 'lucide-vue-next'

export const menuItems = [




    // ═══════════════════════════════════════════════
    // مدیریت کاربران و دسترسی‌ها
    // ═══════════════════════════════════════════════
    {
        key: 'system',
        label: 'مدیریت سیستم',
        icon: Settings,
        children: [
            {
                key: 'users',
                label: 'کاربران',
                to: '/users',
                access: 'users.read',
                icon: Users,
            },
            {
                key: 'roles',
                label: 'نقش‌ها و دسترسی‌ها',
                to: '/roles',
                access: 'roles.read',
                icon: ShieldCheck,
            },
            {
                key: 'groups',
                label: 'گروه‌های کاربری',
                to: '/groups',
                access: 'groups.read',
                icon: UsersRound,
            },
        ],
    },
    {
        key: 'road-transport',
        label: 'حمل و نقل جاده‌ای',
        icon: Wallet,
        children: [
            { key: 'road-trip-expenses', label: 'هزینه سفر', to: '/road-transport/expenses', access: 'road_expenses.read', icon: Receipt },
            {
                key: 'road-bill-financials',
                label: 'درآمد و هزینه بارنامه',
                icon: FileText,
                children: [
                    { key: 'road-bill-dashboard', label: 'داشبورد', to: '/road-transport/bill-financials', access: 'road_expenses.read', icon: LayoutDashboard },
                    { key: 'road-bita-sync', label: 'همگام‌سازی بیتا', to: '/road-transport/bill-financials/sync', access: 'road_expenses.read', icon: RefreshCw },
                    { key: 'road-bill-income', label: 'درآمدها', to: '/road-transport/bill-financials/income', access: 'road_expenses.read', icon: CircleDollarSign },
                    { key: 'road-bill-costs', label: 'هزینه‌ها', to: '/road-transport/bill-financials/costs', access: 'road_expenses.read', icon: Wallet },
                    { key: 'road-bill-entry', label: 'ورود اطلاعات', to: '/road-transport/bill-financials/entry', access: 'road_manual_income.create', icon: FilePlus2 },
                    { key: 'road-bill-indirect-costs', label: 'هزینه‌های غیرمستقیم', to: '/road-transport/bill-financials/indirect-costs', access: 'road_indirect_cost.manage', icon: Wallet },
                ],
            },
            { key: 'road-routes', label: 'تنظیم مسیرها', to: '/road-transport/routes', access: 'road_expenses.manage_categories', icon: Network },
            { key: 'road-expense-limits', label: 'سقف هزینه‌ها', to: '/road-transport/expense-categories', access: 'road_expenses.manage_categories', icon: Wallet },
        ],
    },
]
