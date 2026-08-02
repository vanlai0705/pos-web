export const COMPANY_INFO = {
  name: "CÔNG TY TNHH KỸ THUẬT NAM DƯƠNG",
  displayName: "Công ty TNHH Kỹ thuật Nam Dương",
  address: "Số 123 Tô Ngọc Vân, Phường Linh Xuân, Tp.Hồ Chí Minh, Việt Nam",
  shortAddress: "123 Tô Ngọc Vân, P. Linh Xuân, Tp.Hồ Chí Minh",
  taxCode: "0305916887",
  phone: "028 6 2823 180",
  fax: "028 6 2820 229",
  website: "namduongtech.com.vn",
} as const

export const COMPANY_PRINT_LINES = [
  COMPANY_INFO.name,
  COMPANY_INFO.address,
  `MST: ${COMPANY_INFO.taxCode}`,
] as const

export const COMPANY_CERTIFICATE_HEADER_LINES = [
  COMPANY_INFO.name,
  COMPANY_INFO.shortAddress,
  `ĐT: ${COMPANY_INFO.phone}    Fax: ${COMPANY_INFO.fax}`,
] as const

export const COMPANY_CERTIFICATE_FOOTER_LINES = [
  `Số 123 Tô Ngọc Vân, P. Linh Xuân, Tp.Hồ Chí Minh - Website: ${COMPANY_INFO.website}`,
  `ĐT: ${COMPANY_INFO.phone}      Fax: ${COMPANY_INFO.fax}`,
] as const
