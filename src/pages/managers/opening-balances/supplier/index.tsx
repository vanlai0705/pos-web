import { OpeningBalanceEntityPage } from '../shared'

export default function OpeningBalancesSupplierPage() {
  return (
    <OpeningBalanceEntityPage
      title="Công nợ nhà cung cấp ban đầu"
      entityLabel="Nhà cung cấp"
      entityKey="Supplier"
      filterUrl="opening-balances/filter-supplier"
      headerUrl="opening-balances/get-excel-header-supplier"
      importUrl="opening-balances/import-excel-supplier"
      updateUrl="opening-balances/update-supplier"
      exportUrl="opening-balances/export-excel-supplier"
    />
  )
}
