import { CompanyInfoBlock } from "@/components/company-info-block"
import { COMPANY_PRINT_LINES } from "@/constants"
import { formatAmount } from "@/utils/common"
import { useTranslation } from "react-i18next"
type CashVoucherLineItem = {
    id: string | number
    name: string
    quantity?: number
    price?: number
    amount?: number
}

type CashVoucherSignature = {
    title: string
    hint: string
    name?: string
}

type CashVoucherContentProps = {
    formCode: string
    formNoteLine1: string
    formNoteLine2: string
    title: string
    dateText: string
    voucherNumber: string
    bookNumberText?: string
    partyLabel: string
    partyName: string
    taxCode?: string
    address: string
    reasonLabel: string
    reason: string
    amountText: string
    writtenAmountLabel: string
    writtenAmountText: string
    attachmentsLabel: string
    attachmentsText: string
    lineItems?: CashVoucherLineItem[]
    totalAmount?: number
    signatures: CashVoucherSignature[]
    footerRightNote?: string
}

export const CashVoucherContent = ({
    formCode,
    formNoteLine1,
    formNoteLine2,
    title,
    dateText,
    voucherNumber,
    bookNumberText = ".........",
    partyLabel,
    partyName,
    taxCode,
    address,
    reasonLabel,
    reason,
    amountText,
    writtenAmountLabel,
    writtenAmountText,
    attachmentsLabel,
    attachmentsText,
    lineItems = [],
    totalAmount = 0,
    signatures,
    footerRightNote,
}: CashVoucherContentProps) => {
    const { t } = useTranslation()
    return (
        <div className="w-full max-w-4xl shadow-lg">
            <div className="border-8 p-0 font-serif">
                <div className="border-b-4 p-6">
                    <div className="grid grid-cols-3 gap-4 items-start">
                        <div className="col-span-2 border-4 p-4">
                                <CompanyInfoBlock
                                    lines={COMPANY_PRINT_LINES}
                                    className="text-sm leading-tight"
                                    firstLineClassName="font-bold"
                                    lineClassName="font-normal"
                                />
                        </div>
                        <div className="space-y-2">
                            <div className="border-2 p-2 text-center">
                                <p className="font-bold text-sm">{formCode}</p>
                                <p className="text-xs">{formNoteLine1}</p>
                                <p className="text-xs">{formNoteLine2}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-b-4 p-4 text-center relative">
                    <h2 className="text-2xl font-bold mb-2">{title}</h2>
                    <p className="text-sm font-semibold">{dateText}</p>
                    <p className="text-xs">{t("components.cashVoucherContent.voucherNumberPrefix")}: {voucherNumber}</p>
                    <div className="absolute top-4 right-4 text-left text-xs leading-relaxed">
                        <p>{t("components.cashVoucherContent.bookNumberPrefix")}: {bookNumberText}</p>
                    </div>
                </div>

                <div className="border-b-4 p-4 space-y-3 text-sm leading-relaxed">
                    <div className="flex flex-wrap items-baseline">
                        <span className="whitespace-nowrap min-w-[180px]">{partyLabel}</span>
                        <span className="font-bold flex-grow border-b border-dotted border-gray-400 pl-2">
                            {partyName}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-baseline">
                        <span className="whitespace-nowrap min-w-[180px]">{t("common.address")}:</span>
                        <span className="flex-grow border-b border-dotted border-gray-400 pl-2">
                            {address}
                        </span>
                    </div>

                    {taxCode && (
                        <div className="flex flex-wrap items-baseline">
                            <span className="whitespace-nowrap min-w-[180px]">{t("components.cashVoucherContent.taxCodeLabel")}:</span>
                            <span className="flex-grow border-b border-dotted border-gray-400 pl-2">
                                {taxCode}
                            </span>
                        </div>
                    )}

                    <div className="flex flex-wrap items-baseline">
                        <span className="whitespace-nowrap min-w-[180px]">{reasonLabel}</span>
                        <span className="flex-grow border-b border-dotted border-gray-400 pl-2">
                            {reason}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-baseline">
                        <span className="whitespace-nowrap min-w-[180px]">{t("components.cashVoucherContent.amountLabel")}:</span>
                        <span className="font-bold text-lg flex-grow border-b border-dotted border-gray-400 pl-2">
                            {amountText}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-baseline">
                        <span className="whitespace-nowrap min-w-[180px]">{writtenAmountLabel}</span>
                        <span className="italic flex-grow border-b border-dotted border-gray-400 pl-2 first-letter:capitalize text-gray-700">
                            {writtenAmountText}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-baseline">
                        <span className="whitespace-nowrap min-w-[180px]">{attachmentsLabel}</span>
                        <span className="flex-grow border-b border-dotted border-gray-400 pl-2">
                            {attachmentsText}
                        </span>
                    </div>
                </div>

                {lineItems.length > 0 && (
                    <div className="border-b-4 overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr className="border-b-2">
                                    <th className="border-r p-2 text-left font-bold w-12">{t("common.index")}</th>
                                    <th className="border-r p-2 text-left font-bold">{t("components.cashVoucherContent.itemNameColumn")}</th>
                                    <th className="border-r p-2 text-center font-bold w-24">{t("common.quantity")}</th>
                                    <th className="border-r p-2 text-right font-bold w-28">{t("common.price")}</th>
                                    <th className="p-2 text-right font-bold w-32">{t("common.amount")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineItems.map((item, idx) => (
                                    <tr key={item.id} className="border-b">
                                        <td className="border-r p-2 text-center">{idx + 1}</td>
                                        <td className="border-r p-2">{item.name}</td>
                                        <td className="border-r p-2 text-center">{item.quantity ?? ""}</td>
                                        <td className="border-r p-2 text-right">{formatAmount(item.price)}</td>
                                        <td className="p-2 text-right">{formatAmount(item.amount)}</td>
                                    </tr>
                                ))}
                                <tr className="border-t-2">
                                    <td colSpan={4} className="border-r p-2 text-right font-bold">
                                        {t("components.cashVoucherContent.totalLabel")}
                                    </td>
                                    <td className="p-2 text-right font-bold text-red-600">
                                        {formatAmount(totalAmount)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="p-6">
                    <div className={`grid gap-4 text-center text-sm ${signatures.length === 5 ? "grid-cols-5" : "grid-cols-4"}`}>
                        {signatures.map((signature) => (
                            <div key={signature.title}>
                                <p className="font-bold">{signature.title}</p>
                                <p className="italic text-xs text-gray-500 mb-16">{signature.hint}</p>
                                {signature.name ? (
                                    <p className="font-bold text-sm">{signature.name}</p>
                                ) : null}
                            </div>
                        ))}
                    </div>
                    {footerRightNote ? (
                        <div className="text-right italic text-xs mt-8 pr-4">
                            {footerRightNote}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
