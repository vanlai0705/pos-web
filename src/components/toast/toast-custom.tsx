import { X } from 'lucide-react'
import { useEffect, useState } from "react"

interface ToastProps {
    isWin?: boolean
    duration?: number
    winColor?: string
    loseColor?: string
    text?: string
    value?: string
    onClose?: () => void
}

export default function ToastCustom({
    isWin = true,
    duration = 3000,
    winColor = "from-green-400 to-green-600",
    loseColor = "from-orange-400 to-orange-600",
    text = "Congratulation",
    value = "$10.00",
    onClose
}: ToastProps) {
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false)
            onClose?.()
        }, duration)

        return () => clearTimeout(timer)
    }, [duration, onClose])

    if (!isVisible) return null

    return (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
            <div
                className={`relative rounded-2xl bg-gradient-to-r ${isWin ? winColor : loseColor
                    } p-6 text-white shadow-lg min-w-[300px]`}
            >
                <button
                    onClick={() => {
                        setIsVisible(false)
                        onClose?.()
                    }}
                    className="absolute right-4 top-4 text-white/80 hover:text-white transition-colors"
                    aria-label="Close notification"
                >
                    <X className="h-5 w-5" />
                </button>
                <div className="text-3xl font-bold mb-2">
                    {isWin ? '' : '-'}{value}
                </div>
                <div className="text-xl">{text}</div>
            </div>
        </div>
    )
}