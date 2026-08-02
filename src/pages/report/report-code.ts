function getPathReportCode(pathname: string, basePath: string) {
  const normalizedBase = basePath.replace(/^\/|\/$/g, '')
  const segments = pathname.split('/').filter(Boolean)
  const baseIndex = segments.indexOf(normalizedBase)
  if (baseIndex < 0) return ''

  return segments.slice(baseIndex + 1).join('/')
}

export function resolveReportCode(pathname: string, searchCode: string | null, basePath: string) {
  const pathReportCode = getPathReportCode(pathname, basePath)
  return searchCode || pathReportCode || 'TestReport'
}
