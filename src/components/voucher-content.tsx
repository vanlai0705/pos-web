import { ComponentType, InbouceType, INVENTORY_ITEM_TYPES, OutboundType, WAREHOUSE_TYPES } from "@/constants/data"
import { DocumentExportActions } from "@/components/document-export-actions"
import { TComponentItem } from "@/store/slice/component"
import { TCustomerItem } from "@/store/slice/customer"
import { TInboundItem } from "@/store/slice/inbound"
import { TOutboundItem } from "@/store/slice/outbound"
import { TProductItem } from "@/store/slice/product"
import { TSupplierItem } from "@/store/slice/supplier"
import { TWarehouseItem } from "@/store/slice/warehouse"
import { TImportedGoodsItem } from "@/store/slice/imported-goods"
import { useGetImportedGoodsQuery } from "@/store/slice/imported-goods"
import { formatAmount, getItemFromResponse, numberToVietnamese } from "@/utils/common"
import dayjs from "dayjs"
import { AlignmentType, BorderStyle, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType } from "docx"
import { saveAs } from "file-saver"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { useRef } from "react"
import { useReactToPrint } from "react-to-print"
import * as XLSX from "xlsx"
import "./voucher-print.css"
import { COMPANY_PRINT_LINES } from "@/constants"
import { CompanyInfoBlock } from "./company-info-block"

type VoucherDetail = {
    item_id: number
    item_type: number
    unit?: string
    quantity: number
    price?: number
    amount?: number
    serial_numbers?: string[]
    name?: string
    code?: string
}

type VoucherData = {
    code?: string
    supplier_id?: number
    customer_id?: number
    warehouse_id: number
    type: number
    total_amount: number
    created_at?: string
    note?: string
    inbound_detail: VoucherDetail[]
}

type VoucherContentProps = {
    variant: "inbound" | "outbound"
    data: VoucherData | TInboundItem | TOutboundItem
    entityData:
    | { data?: { items?: Array<{ data?: TSupplierItem } | TSupplierItem> } }
    | TSupplierItem[]
    | { data?: { items?: Array<{ data?: TCustomerItem } | TCustomerItem> } }
    | TCustomerItem[]
    | { data?: { items?: Array<{ data?: TWarehouseItem } | TWarehouseItem> } }
    | TWarehouseItem[]
    warehousesData: TWarehouseItem[]
    componentsData:
    | { data?: { items?: Array<{ data?: TComponentItem } | TComponentItem> } }
    | TComponentItem[]
    productsData:
    | { data?: { items?: Array<{ data?: TProductItem } | TProductItem> } }
    | TProductItem[]
    importedGoodsData?:
    | { data?: { items?: Array<{ data?: TImportedGoodsItem } | TImportedGoodsItem> } }
    | TImportedGoodsItem[]
    renderButtons?: () => React.ReactNode
}

export const VoucherContent = ({
    variant,
    data,
    entityData,
    warehousesData,
    componentsData,
    productsData,
    importedGoodsData: importedGoodsDataProp,
    renderButtons,
}: VoucherContentProps) => {
    const documentRef = useRef<HTMLDivElement>(null)
    const { data: importedGoodsDataInternal } = useGetImportedGoodsQuery({ all: true })
    const importedGoodsData = importedGoodsDataProp ?? importedGoodsDataInternal

    // Extract and declare all variables first
    const { inbound_detail = [], code, warehouse_id = 0, type, total_amount = 0, created_at } = data
    const supplier_id = ("supplier_id" in data ? data.supplier_id : undefined) ?? 0
    const customer_id = ("customer_id" in data ? data.customer_id : undefined) ?? 0

    const entity = variant === "inbound"
        ? getItemFromResponse(entityData as { data?: { items?: Array<{ data?: TSupplierItem } | TSupplierItem> } } | TSupplierItem[], supplier_id || 0)
        : getItemFromResponse(entityData as { data?: { items?: Array<{ data?: TCustomerItem } | TCustomerItem> } } | TCustomerItem[], customer_id || 0)

    const warehouse = warehousesData.find((w: TWarehouseItem) => w.id === warehouse_id)
    const typeOptions = variant === "inbound" ? InbouceType : OutboundType
    const typeLabel = typeOptions.find((item) => Number(item.value) === type)?.label

    const warehouseLabel = variant === "inbound" ? "Nhập tại kho" : "Xuất tại kho"
    const secondPersonLabel = variant === "inbound" ? "Người giao hàng" : "Người nhận hàng"

    const entityName = variant === "inbound"
        ? (entity as TSupplierItem)?.name || ""
        : (entity as TCustomerItem)?.name || ""

    const entityTaxCode = variant === "inbound"
        ? (entity as TSupplierItem)?.tax_code || ""
        : (entity as TCustomerItem)?.tax_code || ""

    const entityAddress = variant === "inbound"
        ? (entity as TSupplierItem)?.address || ""
        : (entity as TCustomerItem)?.address || ""

    const contactField = variant === "inbound"
        ? (entity as TSupplierItem)?.contact_name || ""
        : (entity as TCustomerItem)?.phone || ""

    const contactLabel = variant === "inbound" ? "Họ tên người liên hệ" : "Số điện thoại"

    const reason =
        "note" in data
            ? ((data as TInboundItem | TOutboundItem).note || "")
            : ""

    const exportDate = created_at ? dayjs(created_at) : dayjs()
    const exportFileName = `Phieu-${variant}-${code || "Moi"}-${exportDate.format("DD-MM-YYYY")}`

    const getResolvedItem = (item: VoucherDetail) => {
        const itemTypeNum = Number(item.item_type)
        const product = getItemFromResponse(
            (itemTypeNum === WAREHOUSE_TYPES.COMPONENT 
                ? componentsData 
                : itemTypeNum === 3
                    ? importedGoodsData
                    : productsData) as
            | { data?: { items?: Array<{ data?: TComponentItem | TProductItem | any } | TComponentItem | TProductItem | any> } }
            | (TComponentItem | TProductItem | any)[]
            | undefined,
            item.item_id
        ) as TComponentItem | TProductItem | any

        const amount = item.amount || ((item.quantity || 0) * (item.price || 0))

        let itemTypeLabel = ""
        if (itemTypeNum === WAREHOUSE_TYPES.COMPONENT) {
            itemTypeLabel = ComponentType.find(
                (component) => Number(component.value) === WAREHOUSE_TYPES.COMPONENT
            )?.label || ""
        } else if (itemTypeNum === 3) {
            itemTypeLabel = "Hàng Hóa Nhập Khẩu"
        } else {
            const productStatus = (product as TProductItem)?.status
            itemTypeLabel = productStatus === INVENTORY_ITEM_TYPES.SEMI_FINISHED_PRODUCT ? "Bán Thành Phẩm" : "Thành Phẩm"
        }

        return {
            amount,
            itemTypeLabel,
            product,
            nameLabel: item.name || product?.name || "",
            codeLabel: item.code || product?.code || "",
            serialNumbersText: item.serial_numbers?.join(", ") || "-",
            unitLabel: item.unit || product?.unit || "",
        }
    }

    // Now define functions that use the variables
    const handlePrint = useReactToPrint({
        contentRef: documentRef,
        documentTitle: exportFileName,
    })

    const handleExportPdf = async () => {
        if (!documentRef.current) return

        const tempWrapper = document.createElement("div")
        tempWrapper.style.position = "fixed"
        tempWrapper.style.left = "-100000px"
        tempWrapper.style.top = "0"
        tempWrapper.style.width = `${documentRef.current.scrollWidth}px`
        tempWrapper.style.background = "#ffffff"
        tempWrapper.style.padding = "0"
        tempWrapper.style.margin = "0"
        tempWrapper.style.zIndex = "-1"

        const clonedNode = documentRef.current.cloneNode(true) as HTMLDivElement
        tempWrapper.appendChild(clonedNode)
        document.body.appendChild(tempWrapper)

        let canvas: HTMLCanvasElement
        try {
            const exportElements = [clonedNode, ...Array.from(clonedNode.querySelectorAll("*"))] as HTMLElement[]
            exportElements.forEach((element) => {
                element.style.fontFamily = "Arial, Helvetica, sans-serif"
                element.style.color = "#000000"
                element.style.textShadow = "none"
                element.style.lineHeight = "1.5"
                element.style.letterSpacing = "0"
                element.style.overflow = "visible"
                element.style.textRendering = "geometricPrecision"
                    ; (element.style as CSSStyleDeclaration & { webkitFontSmoothing?: string }).webkitFontSmoothing = "antialiased"
                element.style.wordBreak = "normal"
                element.style.transform = "none"

                if (
                    element.tagName === "H1" ||
                    element.tagName === "H2" ||
                    element.tagName === "H3" ||
                    element.tagName === "H4" ||
                    element.tagName === "H5" ||
                    element.tagName === "H6" ||
                    element.tagName === "P" ||
                    element.tagName === "SPAN"
                ) {
                    element.style.paddingTop = "2px"
                    element.style.paddingBottom = "2px"
                }

                if (
                    element.tagName !== "TABLE" &&
                    element.tagName !== "THEAD" &&
                    element.tagName !== "TBODY" &&
                    element.tagName !== "TR" &&
                    element.tagName !== "TD" &&
                    element.tagName !== "TH" &&
                    element.tagName !== "PRE"
                ) {
                    element.style.backgroundColor = "#ffffff"
                }
            })

            clonedNode.style.background = "#ffffff"

            canvas = await html2canvas(clonedNode, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
            })
        } finally {
            document.body.removeChild(tempWrapper)
        }

        const imgData = canvas.toDataURL("image/png")
        const pdf = new jsPDF("p", "mm", "a4")
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const imgWidth = pageWidth
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        let heightLeft = imgHeight
        let position = 0

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight

        while (heightLeft > 0) {
            position = heightLeft - imgHeight
            pdf.addPage()
            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
            heightLeft -= pageHeight
        }

        pdf.save(`${exportFileName}.pdf`)
    }

    const handleExportExcel = () => {
        const sheetData: Array<Array<string | number>> = [
            [...COMPANY_PRINT_LINES],
            [],
            [`PHIẾU ${typeLabel?.toUpperCase() || ""}`],
            [exportDate.format("[Ngày] DD [tháng] MM [năm] YYYY")],
            [`Số: ${code || "[Mới]"}`],
            [],
            ["Tên đơn vị", entityName],
            ["MST đơn vị", entityTaxCode],
            [contactLabel, contactField],
            [warehouseLabel, warehouse?.name || ""],
            ["Địa chỉ", entityAddress],
            ["Lý do", reason],
            [],
            ["STT", "Loại thành phẩm", "Tên hàng hoá", "Mã VTHH", "Số Serial", "Đơn vị tính", "Số lượng", "Đơn giá", "Thành tiền"],
        ]

        inbound_detail.forEach((item, idx) => {
            const resolvedItem = getResolvedItem(item)
            const row = [
                idx + 1,
                resolvedItem.itemTypeLabel,
                resolvedItem.nameLabel,
                resolvedItem.codeLabel,
                resolvedItem.serialNumbersText,
                resolvedItem.unitLabel,
                item.quantity,
                item.price || 0,
                resolvedItem.amount,
            ]

            sheetData.push(row)
        })

        sheetData.push([])
        sheetData.push(["", "", "", "", "", "", "Tổng cộng", "", total_amount])
        sheetData.push(["", "", "", "", "", "", "Viết bằng chữ", "", numberToVietnamese(total_amount)])

        const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
        worksheet["!cols"] = [
            { wch: 8 },
            { wch: 18 },
            { wch: 28 },
            { wch: 16 },
            { wch: 28 },
            { wch: 14 },
            { wch: 12 },
            { wch: 16 },
            { wch: 18 },
        ]

        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Phieu")
        XLSX.writeFile(workbook, `${exportFileName}.xlsx`)
    }

    const handleExportWord = async () => {
        const borders = {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        }
        const noBorders = {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        }

        // ĐỊNH NGHĨA PADDING TOÀN BẢNG (140 dxa ~ 7pt giúp bảng rất thoáng)
        const tableCellMargins = {
            top: 140,
            bottom: 140,
            left: 140,
            right: 140,
        }

        const tableRows = inbound_detail.map((item: any, idx: number) => {
            const resolvedItem = getResolvedItem(item)

            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1), size: 16 })], alignment: AlignmentType.CENTER })], borders, verticalAlign: VerticalAlign.CENTER, width: { size: 8, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(resolvedItem.itemTypeLabel || ""), size: 16 })], alignment: AlignmentType.CENTER })], borders, verticalAlign: VerticalAlign.CENTER, width: { size: 10, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(resolvedItem.nameLabel || ""), size: 16 })] })], borders, verticalAlign: VerticalAlign.CENTER, width: { size: 18, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(resolvedItem.codeLabel || ""), size: 16 })], alignment: AlignmentType.CENTER })], borders, verticalAlign: VerticalAlign.CENTER, width: { size: 10, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(resolvedItem.serialNumbersText || ""), size: 16 })], alignment: AlignmentType.CENTER })], borders, verticalAlign: VerticalAlign.CENTER, width: { size: 18, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(item.quantity || 0), size: 16 })], alignment: AlignmentType.CENTER })], borders, verticalAlign: VerticalAlign.CENTER, width: { size: 10, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(formatAmount(item.price)), size: 16 })], alignment: AlignmentType.RIGHT })], borders, verticalAlign: VerticalAlign.CENTER, width: { size: 13, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(formatAmount(resolvedItem.amount)), size: 16 })], alignment: AlignmentType.RIGHT })], borders, verticalAlign: VerticalAlign.CENTER, width: { size: 13, type: WidthType.PERCENTAGE } }),
                ],
            })
        })

        const doc = new Document({
            sections: [
                {
                    children: [
                        // Header with company info
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [
                                                ...COMPANY_PRINT_LINES.map((line, index) =>
                                                    new Paragraph({
                                                        children: [new TextRun({ text: line, bold: index === 0 })],
                                                    })
                                                ),
                                            ],
                                            borders: noBorders,
                                            width: { size: 70, type: WidthType.PERCENTAGE },
                                        }),
                                        new TableCell({
                                            children: [
                                                new Paragraph({ text: "Mẫu số: 01 - VT" }),
                                                new Paragraph({ text: "(Ban hành theo Thông tư số 133/2016/TT-BTC" }),
                                                new Paragraph({ text: "Ngày 26/08/2016 của Bộ Tài chính)" }),
                                            ],
                                            borders: noBorders,
                                            width: { size: 30, type: WidthType.PERCENTAGE },
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph(""),

                        // Title
                        new Paragraph({
                            children: [new TextRun({ text: `PHIẾU ${typeLabel?.toUpperCase()}`, bold: true, size: 36 })],
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                            text: dayjs(created_at).format("[Ngày] DD [tháng] MM [năm] YYYY"),
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                            text: `Số: ${code || "[Mới]"}`,
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph(""),

                        // Info section
                        new Paragraph(`- Tên đơn vị: ${entityName}`),
                        new Paragraph(`- MST đơn vị: ${entityTaxCode}`),
                        new Paragraph(`- ${contactLabel}: ${contactField}`),
                        new Paragraph(`- ${warehouseLabel}: ${warehouse?.name || ""}`),
                        new Paragraph(`- Địa chỉ: ${entityAddress}`),
                        new Paragraph(`- Lý do: ${reason}`),
                        new Paragraph(""),

                        // BẢNG DỮ LIỆU CHÍNH (Áp dụng margins cấp độ Table)
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            margins: tableCellMargins, // Gán padding bao phủ toàn bộ ô trong bảng
                            rows: [
                                // Hàng tiêu đề (Headers)
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "STT1", bold: true, size: 16 })], alignment: AlignmentType.CENTER })], borders, verticalAlign: VerticalAlign.CENTER, width: { size: 8, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Loại", bold: true, size: 16 })], alignment: AlignmentType.CENTER })], borders, verticalAlign: VerticalAlign.CENTER, width: { size: 10, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tên hàng hoá", bold: true, size: 16 })], alignment: AlignmentType.CENTER })], borders, verticalAlign: VerticalAlign.CENTER, width: { size: 18, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mã VTHH", bold: true, size: 16 })], alignment: AlignmentType.CENTER })], borders, verticalAlign: VerticalAlign.CENTER, width: { size: 10, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Số Serial", bold: true, size: 16 })], alignment: AlignmentType.CENTER })], borders, verticalAlign: VerticalAlign.CENTER, width: { size: 18, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Số lượng", bold: true, size: 16 })], alignment: AlignmentType.CENTER })], borders, verticalAlign: VerticalAlign.CENTER, width: { size: 10, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Đơn giá", bold: true, size: 16 })], alignment: AlignmentType.CENTER })], borders, verticalAlign: VerticalAlign.CENTER, width: { size: 13, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Thành tiền", bold: true, size: 16 })], alignment: AlignmentType.CENTER })], borders, verticalAlign: VerticalAlign.CENTER, width: { size: 13, type: WidthType.PERCENTAGE } }),
                                    ],
                                }),
                                ...tableRows,
                                // Hàng tổng cộng
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [new Paragraph({ children: [new TextRun({ text: "Tổng cộng", bold: true, size: 16 })], alignment: AlignmentType.RIGHT })],
                                            borders,
                                            verticalAlign: VerticalAlign.CENTER,
                                            width: { size: 74, type: WidthType.PERCENTAGE },
                                            columnSpan: 7
                                        }),
                                        new TableCell({
                                            children: [new Paragraph({ children: [new TextRun({ text: String(formatAmount(total_amount)), bold: true, size: 16 })], alignment: AlignmentType.RIGHT })],
                                            borders,
                                            verticalAlign: VerticalAlign.CENTER,
                                            width: { size: 13, type: WidthType.PERCENTAGE }
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph(""),

                        new Paragraph(`- Tổng số tiền (Viết bằng chữ): ${numberToVietnamese(total_amount)}`),
                        new Paragraph(""),

                        // Signature section
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [
                                                new Paragraph({ text: "Người lập phiếu", alignment: AlignmentType.CENTER }),
                                                new Paragraph({ text: "(Ký, họ và tên)", alignment: AlignmentType.CENTER }),
                                                new Paragraph(""), new Paragraph(""), new Paragraph(""),
                                            ],
                                            borders: noBorders,
                                        }),
                                        new TableCell({
                                            children: [
                                                new Paragraph({ text: secondPersonLabel, alignment: AlignmentType.CENTER }),
                                                new Paragraph({ text: "(Ký, họ và tên)", alignment: AlignmentType.CENTER }),
                                                new Paragraph(""), new Paragraph(""), new Paragraph(""),
                                            ],
                                            borders: noBorders,
                                        }),
                                        new TableCell({
                                            children: [
                                                new Paragraph({ text: "Thủ kho", alignment: AlignmentType.CENTER }),
                                                new Paragraph({ text: "(Ký, họ và tên)", alignment: AlignmentType.CENTER }),
                                                new Paragraph(""), new Paragraph(""), new Paragraph(""),
                                            ],
                                            borders: noBorders,
                                        }),
                                        new TableCell({
                                            children: [
                                                new Paragraph({ text: "Giám Đốc", alignment: AlignmentType.CENTER }),
                                                new Paragraph({ text: "(Ký, họ và tên)", alignment: AlignmentType.CENTER }),
                                                new Paragraph(""), new Paragraph(""), new Paragraph(""),
                                            ],
                                            borders: noBorders,
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph(""),
                    ],
                    properties: {
                        page: {
                            size: { width: 8390, height: 11906 },
                            margin: { top: 720, right: 720, bottom: 720, left: 720 },
                        },
                    },
                },
            ],
        })

        const blob = await Packer.toBlob(doc)
        saveAs(blob, `${exportFileName}.docx`)
    }

    return (
        <>
            <div className="border-b-4 overflow-x-auto print:overflow-visible">
                <div className="voucher-export-root border-8 p-0 print:border-0" ref={documentRef}>
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
                                    <p className="font-bold text-sm">Mẫu số: 01 - VT</p>
                                    <p className="text-xs">(Ban hành theo Thông tư số 133/2016/TT-BTC</p>
                                    <p className="text-xs">Ngày 26/08/2016 của Bộ Tài chính)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-b-4 p-4 text-center">
                        <h2 className="text-2xl font-bold">PHIẾU {typeLabel?.toUpperCase()}</h2>
                        <p className="text-sm font-semibold">
                            {created_at
                                ? dayjs(created_at).format("[Ngày] DD [tháng] MM [năm] YYYY")
                                : dayjs().format("[Ngày] DD [tháng] MM [năm] YYYY")}
                        </p>
                        <p className="text-xs">Số: {code || "[Mới]"}</p>
                    </div>

                    <div className="border-b-4 p-4">
                        <div className="space-y-2 text-sm">
                            <p>
                                <span className="font-bold">- Tên đơn vị: </span>{entityName}
                            </p>
                            <p>
                                <span className="font-bold">- MST đơn vị: </span>{entityTaxCode}
                            </p>
                            <p>
                                <span className="font-bold">- Địa chỉ: </span>{entityAddress}
                            </p>
                            <p>
                                <span className="font-bold">- {contactLabel}: </span>{contactField}
                            </p>
                            <p>
                                <span className="font-bold">- {warehouseLabel}: </span>{warehouse?.name || ""}
                            </p>

                            <p>
                                <span className="font-bold">- Lý do: </span>{reason}
                            </p>
                        </div>
                    </div>

                    <div className="border-b-4 overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr className="border-b-2">
                                    <th className="border-r p-2 text-left font-bold w-12">STT</th>
                                    <th className="border-r p-2 text-left font-bold w-32">Loại thành phẩm</th>
                                    <th className="border-r p-2 text-left font-bold">Tên hàng hoá</th>
                                    <th className="border-r p-2 text-left font-bold">Mã VTHH</th>
                                    <th className="border-r p-2 text-left font-bold">Số Serial</th>
                                    <th className="border-r p-2 text-center font-bold w-24">Đơn vị tính</th>
                                    <th className="border-r p-2 text-center font-bold w-24">Số lượng</th>
                                    <th className="border-r p-2 text-right font-bold w-28">Đơn giá</th>
                                    <th className="p-2 text-right font-bold w-32">Thành tiền</th>
                                </tr>
                                <tr className="text-center">
                                    <th className="border-r p-1 font-bold">A</th>
                                    <th className="border-r p-1 font-bold">B</th>
                                    <th className="border-r p-1 font-bold">C</th>
                                    <th className="border-r p-1 font-bold">D</th>
                                    <th className="border-r p-1 font-bold">E</th>
                                    <th className="border-r p-1 font-bold">F</th>
                                    <th className="border-r p-1 font-bold">1</th>
                                    <th className="border-r p-1 font-bold">2</th>
                                    <th className="border-r p-1 font-bold">3</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inbound_detail.map((item, idx: number) => {
                                    const resolvedItem = getResolvedItem(item)

                                    return (
                                        <tr key={idx} className="border-b">
                                            <td className="border-r p-2 text-center">{idx + 1}</td>
                                            <td className="border-r p-2">
                                                {resolvedItem.itemTypeLabel}
                                            </td>
                                            <td className="border-r p-2">{resolvedItem.nameLabel}</td>
                                            <td className="border-r p-2">
                                                {resolvedItem.codeLabel}
                                            </td>
                                            <td className="border-r p-2 text-xs">
                                                {item.serial_numbers && item.serial_numbers.length > 0
                                                    ? item.serial_numbers.join(", ")
                                                    : "-"
                                                }
                                            </td>
                                            <td className="border-r p-2 text-center">{resolvedItem.unitLabel}</td>
                                            <td className="border-r p-2 text-center">{item.quantity}</td>
                                            <td className="border-r p-2 text-center">{formatAmount(item.price)}</td>
                                            <td className="border-r p-2 text-center">{formatAmount(resolvedItem.amount)}</td>
                                        </tr>
                                    )
                                })}
                                <tr className="border-t-2">
                                    <td colSpan={8} className="border-r p-2 text-right font-bold">
                                        Tổng Cộng
                                    </td>
                                    <td className="p-2 text-right font-bold text-red-600">{formatAmount(total_amount)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 border-b-4">
                        <p className="text-sm text-red-600 font-bold mb-2">
                            - Tổng số tiền (Viết bằng chữ): {numberToVietnamese(total_amount)}
                        </p>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-4 gap-4 text-center text-sm">
                            <div>
                                <p className="font-bold">Người lập phiếu</p>
                                <p className="text-xs mb-12">(Ký, họ và tên)</p>
                            </div>
                            <div>
                                <p className="font-bold">{secondPersonLabel}</p>
                                <p className="text-xs mb-12">(Ký, họ và tên)</p>
                            </div>
                            <div>
                                <p className="font-bold">Thủ kho</p>
                                <p className="text-xs mb-12">(Ký, họ và tên)</p>
                            </div>
                            <div>
                                <p className="font-bold">Giám Đốc</p>
                                <p className="text-xs mb-12">(Ký, họ và tên)</p>
                            </div>
                        </div>
                    </div>
                </div>

                {renderButtons ? (
                    <div className="mt-6 flex justify-center gap-4">
                        {renderButtons()}
                    </div>
                ) : <DocumentExportActions
                    onExportPdf={handleExportPdf}
                    onExportWord={handleExportWord}
                    onExportExcel={handleExportExcel}
                    onPrint={() => handlePrint()}
                />}
            </div>

        </>
    )
}
