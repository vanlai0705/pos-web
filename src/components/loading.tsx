
function Loading() {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        <img src="/logo.png" alt="POS Mobile" className="w-16 h-16 rounded-full object-contain bg-muted" />
        <div className="absolute inset-0 rounded-xl border-4 border-transparent border-t-primary animate-spin" />
      </div>
    </div>
  )
}

export default Loading
