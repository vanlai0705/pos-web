import { OpeningBalanceEntityPage } from '../shared'

export default function OpeningBalancesCustomerPage() {
  return (
    <OpeningBalanceEntityPage
      title="Công nợ khách hàng ban đầu"
      entityLabel="Khách hàng"
      entityKey="Customer"
      filterUrl="opening-balances/filter-customer"
      headerUrl="opening-balances/get-excel-header-customer"
      importUrl="opening-balances/import-excel-customer"
      updateUrl="opening-balances/update-customer"
      exportUrl="opening-balances/export-excel-customer"
    />
  )
}
