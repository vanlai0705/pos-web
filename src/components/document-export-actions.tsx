type DocumentExportActionsProps = {
    onExportPdf: () => void | Promise<void>
    onExportWord: () => void | Promise<void>
    onExportExcel: () => void | Promise<void>
    onPrint: () => void | Promise<void>
    className?: string
}

export const DocumentExportActions = ({
    onExportPdf,
    onExportWord,
    onExportExcel,
    className = "mt-4 flex justify-center gap-4 print:hidden",
}: DocumentExportActionsProps) => {
    return (
        <div className={className}>
            <button
                onClick={onExportPdf}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
                Tải PDF
            </button>
            <button
                onClick={onExportWord}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
                Xuất Word
            </button>
            <button
                onClick={onExportExcel}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
            >
                Xuất Excel
            </button>
        </div>
    )
}
