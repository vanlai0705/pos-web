import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ToastProps {
    id: number
    isWin?: boolean
    winColor?: string
    loseColor?: string
    text?: string
    value?: number | string
    fiat?: string
}

interface ToastContextType {
    showToast: (props: Omit<ToastProps, 'id'>) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastProps[]>([])

    const showToast = useCallback((props: Omit<ToastProps, 'id'>) => {
        setToasts(prevToasts => {
            const newToast = { ...props, id: Date.now() }
            if (prevToasts.length >= 4) {
                return [...prevToasts.slice(1), newToast]
            }
            return [...prevToasts, newToast]
        })
    }, [])

    const hideToast = useCallback((id: number) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id))
    }, [])

    useEffect(() => {
        if (toasts.length > 0) {
            const timer = setTimeout(() => {
                hideToast(toasts[0].id)
            }, 3000)

            return () => clearTimeout(timer)
        }
    }, [toasts, hideToast])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-4 right-4 z-50 space-y-4">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <ToastCustom key={toast.id} {...toast} onClose={() => hideToast(toast.id)} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

function ToastCustom({
    isWin = true,
    winColor = "from-green-400 to-green-600",
    loseColor = "from-orange-400 to-orange-600",
    text = "Congratulation",
    value = "$10.00",
    onClose,
    // fiat = "$"
}: ToastProps & { onClose: () => void }) {
    return (
        <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
        >
            <div
                className={`relative rounded-2xl bg-gradient-to-r ${isWin ? winColor : loseColor
                    } p-6 text-white shadow-lg min-w-[300px]`}
            >
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-white/80 hover:text-white transition-colors"
                    aria-label="Close notification"
                >
                    <X className="h-5 w-5" />
                </button>
                <div className="text-2xl font-bold mb-2">
                    {isWin ? '' : '-'} {text} {value}
                </div>
            </div>
        </motion.div>
    )
}