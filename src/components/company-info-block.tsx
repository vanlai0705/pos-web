type CompanyInfoBlockProps = {
  lines: readonly string[]
  className?: string
  firstLineClassName?: string
  lineClassName?: string
}

export const CompanyInfoBlock = ({
  lines,
  className = "",
  firstLineClassName = "font-semibold",
  lineClassName = "",
}: CompanyInfoBlockProps) => {
  return (
    <div className={className}>
      {lines.map((line, index) => (
        <p key={`${line}-${index}`} className={index === 0 ? firstLineClassName : lineClassName}>
          {line}
        </p>
      ))}
    </div>
  )
}
