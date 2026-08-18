import type { TPosActiveProduct,TPosProductPriceRow,TPosProductRecipeRow,TPosProductType,TPosShop } from '@/store/slice/users/types/pos-types'
import { LookupSelect } from '@/components/pos/lookup-select'
import { ProductImageUploads, emptySlot, withTrailingEmpty, type ImageSlot } from '@/components/pos/product-image-uploads'
import { SimpleNameSelect } from '@/components/pos/simple-name-select'
import { useSaveUnitMutation } from '@/store/slice/managers/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTitle, FormDialogBody, FormDialogContent, FormDialogFooter, FormDialogHeader } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/ui/number-input'
import { PosImage } from '@/components/ui/pos-image'
import { Textarea } from '@/components/ui/textarea'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { useCreateProductRecipeMutation, useDeleteProductRecipeMutation, useFilterShopsAllQuery, useGetActiveProductDetailQuery, useGetProductPriceQuery, useGetProductRecipesQuery, useSaveActiveProductMutation, useUpdateProductPriceMutation, useUpdateShopMutation } from '@/store/slice/products/api'
import { useGetSettingProductQuery } from '@/store/slice/settings/api'
import { cn } from '@/utils'
import { printData } from '@/utils/print-service'
import { Package, Plus, Printer, Scale, Store, Tag, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { RecipePickerDialog } from './recipe-picker-dialog'

function emptyProduct(groupId?: number): TPosActiveProduct {
  return {
    Name: '',
    ProductGroup: groupId ? { Id: groupId } : undefined,
    Price: 0,
    PriceInput: 0,
    ImportPrice: 0,
    Quantity: 0,
    Images: [],
    IsRecipe: false,
    isRecipe: false,
    Shops: [],
  }
}

type RecipeRow = TPosProductRecipeRow & { _isNew?: boolean }

const TABS = [
  { key: 'product', labelKey: 'pages.actives.productDialog.tabProduct', icon: Package },
  { key: 'price', labelKey: 'pages.actives.productDialog.tabPrice', icon: Tag },
  { key: 'recipe', labelKey: 'pages.actives.productDialog.tabRecipe', icon: Scale },
  { key: 'shop', labelKey: 'pages.actives.productDialog.tabShop', icon: Store },
] as const
type TabKey = typeof TABS[number]['key']

export function ProductDialog({
  open, productId, defaultGroupId, groups, onClose, onSaved,
}: {
  open: boolean
  productId: number | null
  defaultGroupId?: number
  groups: Array<{ Id?: number; Name?: string }>
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabKey>('product')
  const [form, setForm] = useState<TPosActiveProduct>(emptyProduct(defaultGroupId))
  const [images, setImages] = useState<ImageSlot[]>([emptySlot()])
  const [priceList, setPriceList] = useState<TPosProductPriceRow[]>([])
  const [recipes, setRecipes] = useState<RecipeRow[]>([])
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(-1)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [printCount, setPrintCount] = useState(1)
  const [lastTaxValue, setLastTaxValue] = useState(0)
  const [saving, setSaving] = useState(false)

  const set = (patch: Partial<TPosActiveProduct>) => setForm(f => ({ ...f, ...patch }))

  const { data: detail } = useGetActiveProductDetailQuery(productId ?? 0, { skip: !open || !productId })
  const { data: settingProduct } = useGetSettingProductQuery()
  const { data: priceData } = useGetProductPriceQuery(form.Id ?? 0, { skip: !open || !form.Id })
  const { data: recipeData, refetch: refetchRecipes } = useGetProductRecipesQuery(form.Id ?? 0, { skip: !open || !form.Id })
  const { data: shops = [], refetch: refetchShops } = useFilterShopsAllQuery(undefined, { skip: !open || activeTab !== 'shop' })

  const [saveActiveProduct] = useSaveActiveProductMutation()
  const [updateProductPrice] = useUpdateProductPriceMutation()
  const [createProductRecipe] = useCreateProductRecipeMutation()
  const [deleteProductRecipe] = useDeleteProductRecipeMutation()
  const [updateShop] = useUpdateShopMutation()

  // Reset (create) or wait-for-detail (edit) whenever the dialog opens.
  useEffect(() => {
    if (!open) return
    setActiveTab('product')
    setSelectedRecipeIndex(-1)
    setPrintCount(1)
    if (!productId) {
      setForm(emptyProduct(defaultGroupId))
      setImages([emptySlot()])
      setPriceList([])
      setRecipes([])
    }
    // defaultGroupId intentionally excluded — only the value at the moment the
    // dialog opens should seed a new product; it must not wipe the form if the
    // page behind it changes its sidebar filter while this stays open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId])

  useEffect(() => {
    if (!open || !productId || !detail) return
    const recipeValue = !!(detail.IsRecipe ?? detail.isRecipe)
    setForm({ ...emptyProduct(), ...detail, IsRecipe: recipeValue, isRecipe: recipeValue })
    setLastTaxValue(detail.Tax ?? 0)
    setImages(withTrailingEmpty((detail.Images ?? []).map(i => ({ Id: i.Id ?? 0, Url: i.Url }))))
  }, [open, productId, detail])

  // Seed the price list once per fetch — the base product Price seeds row[0],
  // same as Angular; edits after that don't re-sync (source of truth flips to priceList).
  useEffect(() => {
    if (!priceData) return
    const rows = priceData.map(row => ({
      ...row,
      Price: row.Price ?? 0,
      PriceSmall: row.PriceSmall ?? 0,
      PriceMedium: row.PriceMedium ?? 0,
      PriceLarge: row.PriceLarge ?? 0,
    }))
    if (form.Price && rows.length > 0) {
      rows[0] = { ...rows[0], PriceSmall: form.Price, Price: form.Price }
    }
    setPriceList(rows)
    // form.Price intentionally excluded — see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceData])

  useEffect(() => {
    if (!recipeData) return
    setRecipes(recipeData.map(r => ({ ...r, _isNew: false })))
  }, [recipeData])

  const isNoTax = form.Tax === null
  const onTaxChange = (v: number) => {
    setLastTaxValue(v)
    set({ Tax: v })
  }
  const onNoTaxToggle = (checked: boolean) => {
    if (checked) {
      if (form.Tax != null) setLastTaxValue(form.Tax)
      set({ Tax: null })
    } else {
      set({ Tax: lastTaxValue || 0 })
    }
  }

  const printLabel = () => {
    if (!form.Id) { toast.error(t('pages.actives.productDialog.pleaseSaveBeforePrint')); return }
    printData(settingProduct?.PrinterUrl, 'products/print-label', settingProduct?.BarcodePrinterName, {
      PrintCount: printCount || 1,
      ProductIds: [form.Id],
    })
  }

  const updatePriceRow = (index: number, field: 'PriceSmall' | 'PriceMedium' | 'PriceLarge', value: number) => {
    setPriceList(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  const openRecipePicker = () => {
    if (!form.Id) return
    setPickerOpen(true)
  }

  const addRecipes = (products: TPosActiveProduct[]) => {
    setPickerOpen(false)
    setRecipes(prev => {
      const next = [...prev]
      products.forEach(p => {
        if (!p.Id) return
        if (next.some(r => r.ProductRecipe?.Id === p.Id)) return
        next.push({
          Id: 0,
          ProductRecipe: {
            Id: p.Id, Barcode: p.Barcode, ProductCode: p.ProductCode || p.Code, Name: p.Name,
            Price: p.Price, Images: p.Images, Unit: p.Unit ? { Id: p.Unit.Id, Name: p.Unit.Name } : undefined,
          },
          QuantitySmall: 0, QuantityMedium: 0, QuantityLarge: 0,
          _isNew: true,
        })
      })
      return next
    })
  }

  const deleteSelectedRecipe = async () => {
    if (selectedRecipeIndex < 0 || selectedRecipeIndex >= recipes.length) return
    const row = recipes[selectedRecipeIndex]
    if (row._isNew) {
      setRecipes(prev => prev.filter((_, i) => i !== selectedRecipeIndex))
      setSelectedRecipeIndex(-1)
      return
    }
    if (!await confirmAction({ description: t('pages.actives.productDialog.confirmDeleteRecipe') })) return
    if (!form.Id || !row.Id) return
    try {
      await deleteProductRecipe({ productId: form.Id, id: row.Id }).unwrap()
      setSelectedRecipeIndex(-1)
      refetchRecipes()
    } catch {
      toast.error(t('pages.actives.productDialog.deleteRecipeFailed'))
    }
  }

  const toggleShopDefault = async (shop: TPosShop) => {
    try {
      await updateShop({ ...shop, IsDefault: !shop.IsDefault }).unwrap()
      refetchShops()
    } catch {
      toast.error(t('pages.actives.productDialog.updateShopFailed'))
    }
  }

  const persistProduct = async (): Promise<number | undefined> => {
    if (!form.Name?.trim()) {
      toast.error(t('pages.actives.productDialog.pleaseEnterName'))
      return undefined
    }
    const files = images.map(i => i.File).filter((f): f is File => !!f)
    const payload: TPosActiveProduct = {
      ...form,
      Images: images.filter(i => i.Id > 0).map(i => ({ Id: i.Id, Url: i.Url })),
      IsRecipe: !!form.IsRecipe,
      isRecipe: !!form.IsRecipe,
      Shops: form.Shops || [],
      ProductType: form.ProductType || undefined,
      PriceInput: form.PriceInput ?? form.ImportPrice ?? 0,
      ImportPrice: form.PriceInput ?? form.ImportPrice ?? 0,
    }
    try {
      const res = await saveActiveProduct({ model: payload, files }).unwrap()
      const newId = form.Id || res?.Id
      if (newId && newId !== form.Id) set({ Id: newId })
      return newId
    } catch {
      toast.error(t('pages.actives.productDialog.saveProductFailed'))
      return undefined
    }
  }

  const persistPriceList = async (id: number) => {
    try {
      await updateProductPrice({ productId: id, priceList }).unwrap()
    } catch { /* best-effort, matches Angular's fire-and-forget here */ }
  }

  const persistPendingRecipes = async (id: number) => {
    const pending = recipes.filter(r => r._isNew)
    for (const r of pending) {
      try {
        await createProductRecipe({
          productId: id,
          body: {
            id: 0,
            productRecipe: {
              id: r.ProductRecipe?.Id ?? 0,
              barcode: r.ProductRecipe?.Barcode ?? '',
              productCode: r.ProductRecipe?.ProductCode ?? '',
              name: r.ProductRecipe?.Name ?? '',
              price: r.ProductRecipe?.Price ?? 0,
              images: r.ProductRecipe?.Images ?? [],
              unit: r.ProductRecipe?.Unit ?? null,
            },
            quantitySmall: r.QuantitySmall ?? 0,
            quantityMedium: r.QuantityMedium ?? 0,
            quantityLarge: r.QuantityLarge ?? 0,
          },
        }).unwrap()
      } catch { /* best-effort per row, keep going */ }
    }
    if (pending.length) refetchRecipes()
  }

  const runSave = async (after?: () => void) => {
    setSaving(true)
    try {
      const id = await persistProduct()
      if (!id) return
      await persistPriceList(id)
      await persistPendingRecipes(id)
      toast.success(form.Id
        ? t('pages.actives.productDialog.updateProductSuccess')
        : t('pages.actives.productDialog.createProductSuccess'))
      onSaved()
      after?.()
    } finally {
      setSaving(false)
    }
  }

  const resetForCreateNext = () => {
    setForm(emptyProduct(defaultGroupId))
    setImages([emptySlot()])
    setPriceList([])
    setRecipes([])
    setPrintCount(1)
    setActiveTab('product')
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <FormDialogContent className="grid-rows-[auto_auto_minmax(0,1fr)_auto] h-[90vh] w-full max-w-[95vw] sm:max-w-5xl">
        <FormDialogHeader>
          <DialogTitle>
            {form.Id ? t('pages.actives.productDialog.updateProduct') : t('pages.actives.productDialog.createNew')}
          </DialogTitle>
        </FormDialogHeader>

        <div className="flex flex-wrap gap-2 border-b bg-muted/20 px-5 py-3">
          {TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex min-w-[120px] flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-all sm:flex-none',
                activeTab === tab.key
                  ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                  : 'border-transparent bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              <tab.icon className="h-4 w-4" /> {t(tab.labelKey)}
            </button>
          ))}
        </div>

        <FormDialogBody>
          {activeTab === 'product' && (
            <ProductTab
              form={form} set={set} settingProduct={settingProduct}
              images={images} setImages={setImages}
              groups={groups}
              isNoTax={isNoTax} onTaxChange={onTaxChange} onNoTaxToggle={onNoTaxToggle}
              printCount={printCount} setPrintCount={setPrintCount} onPrint={printLabel}
            />
          )}
          {activeTab === 'price' && (
            <PriceTab priceList={priceList} onChange={updatePriceRow} />
          )}
          {activeTab === 'recipe' && (
            <RecipeTab
              productId={form.Id} recipes={recipes}
              selectedIndex={selectedRecipeIndex} onSelect={setSelectedRecipeIndex}
              onAdd={openRecipePicker} onDelete={deleteSelectedRecipe}
            />
          )}
          {activeTab === 'shop' && (
            <ShopTab shops={shops} onToggle={toggleShopDefault} />
          )}
        </FormDialogBody>

        <FormDialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => runSave()} disabled={saving}>{saving ? t('pages.actives.productDialog.saving') : t('common.save')}</Button>
          <Button variant="secondary" onClick={() => runSave(resetForCreateNext)} disabled={saving}>{t('pages.actives.productDialog.saveAndNew')}</Button>
          <Button variant="default" className="bg-foreground text-background hover:bg-foreground/90" onClick={() => runSave(onClose)} disabled={saving}>
            {t('pages.actives.productDialog.saveAndExit')}
          </Button>
        </FormDialogFooter>
      </FormDialogContent>

      <RecipePickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onConfirm={addRecipes} />
    </Dialog>
  )
}

// ─── Tab: Mặt hàng ──────────────────────────────────────────────────────────

function ProductTab({
  form, set, settingProduct, images, setImages, groups, isNoTax, onTaxChange, onNoTaxToggle, printCount, setPrintCount, onPrint,
}: {
  form: TPosActiveProduct
  set: (patch: Partial<TPosActiveProduct>) => void
  settingProduct: { IsUsingProductCode?: boolean; IsUsingBarcode?: boolean } | undefined
  images: ImageSlot[]
  setImages: (images: ImageSlot[]) => void
  groups: Array<{ Id?: number; Name?: string }>
  isNoTax: boolean
  onTaxChange: (v: number) => void
  onNoTaxToggle: (checked: boolean) => void
  printCount: number
  setPrintCount: (v: number) => void
  onPrint: () => void
}) {
  const { t } = useTranslation()
  const [saveUnit] = useSaveUnitMutation()
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-8">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {settingProduct?.IsUsingProductCode !== false && (
            <Field label={t('pages.actives.productDialog.productCodeLabel')}>
              <Input value={form.ProductCode || form.Code || ''} onChange={e => set({ ProductCode: e.target.value, Code: e.target.value })} placeholder={t('pages.actives.productDialog.productCodePlaceholder')} />
            </Field>
          )}
          {settingProduct?.IsUsingBarcode !== false && (
            <Field label={t('pages.actives.productDialog.barcodeLabel')}>
              <Input value={form.Barcode || ''} onChange={e => set({ Barcode: e.target.value })} placeholder={t('pages.actives.productDialog.barcodePlaceholder')} />
            </Field>
          )}
        </div>

        <Field label={t('common.productName')} required>
          <Input value={form.Name || ''} onChange={e => set({ Name: e.target.value })} placeholder={t('pages.actives.productDialog.productNamePlaceholder')} />
        </Field>

        <label className="flex items-center gap-2 py-1 text-foreground">
          <input type="checkbox" checked={!!form.IsRecipe} onChange={e => set({ IsRecipe: e.target.checked, isRecipe: e.target.checked })}
            className="h-4 w-4 rounded accent-primary" />
          <span className="cursor-pointer select-none text-sm font-medium">{t('pages.actives.productDialog.isRecipeLabel')}</span>
        </label>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label={t('pages.actives.productDialog.productGroupLabel')}>
            <select
              value={form.ProductGroup?.Id || ''}
              onChange={e => {
                const id = Number(e.target.value)
                const group = groups.find(g => g.Id === id)
                set({ ProductGroup: group ? { Id: group.Id, Name: group.Name } : undefined })
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t('pages.actives.productDialog.noneOption')}</option>
              {groups.map(g => <option key={g.Id} value={g.Id}>{g.Name}</option>)}
            </select>
          </Field>
          <Field label={t('pages.actives.productDialog.unitLabel')}>
            <SimpleNameSelect endpoint="units/filter-simple" placeholder={t('pages.actives.productDialog.unitPlaceholder')}
              value={form.Unit as { Id?: number; Name?: string } | null}
              onChange={v => set({ Unit: v ? { Id: v.Id, Name: v.Name ?? '' } : undefined })} listPath="/managers/units"
              addTitle="Thêm đơn vị tính" namePlaceholder="Ví dụ: Cái, Hộp, Kg..."
              save={d => saveUnit(d).unwrap()} />
          </Field>
          <Field label={t('pages.actives.productDialog.productTypeLabel')}>
            <LookupSelect<TPosProductType> endpoint="producttypes/get-list" placeholder={t('pages.actives.productDialog.productTypePlaceholder')}
              value={form.ProductType ?? null}
              onChange={v => set({ ProductType: v ? { Id: v.Id, Name: v.Name, Code: v.Code } : undefined })} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label={t('common.salePrice')}>
            <NumberInput value={form.Price ?? 0} onChange={v => set({ Price: v })} />
          </Field>
          <Field label={t('common.inputPrice')}>
            <NumberInput value={form.PriceInput ?? form.ImportPrice ?? 0} onChange={v => set({ PriceInput: v, ImportPrice: v })} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label={t('pages.actives.productDialog.taxLabel')}>
            <NumberInput value={form.Tax ?? 0} onChange={onTaxChange} disabled={isNoTax} />
          </Field>
          <Field label={t('pages.actives.productDialog.noTaxLabel')}>
            <label className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3">
              <input type="checkbox" checked={isNoTax} onChange={e => onNoTaxToggle(e.target.checked)} className="h-4 w-4 rounded accent-primary" />
              <span className="text-sm text-foreground">{t('pages.actives.productDialog.applyLabel')}</span>
            </label>
          </Field>
        </div>

        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2">
          <Field label={t('pages.actives.productDialog.printQuantityLabel')}>
            <NumberInput value={printCount} onChange={setPrintCount} />
          </Field>
          <Button type="button" onClick={onPrint} className="h-9 w-full bg-emerald-600 hover:bg-emerald-700">
            <Printer className="mr-1.5 h-4 w-4" /> {t('pages.actives.productDialog.printLabelButton')}
          </Button>
        </div>

        <Field label={t('common.note')}>
          <Textarea rows={3} value={form.Note || ''} onChange={e => set({ Note: e.target.value })} placeholder={t('pages.actives.productDialog.notePlaceholder')} />
        </Field>
      </div>

      <div className="lg:col-span-4">
        <Field label={t('pages.actives.productDialog.productImagesLabel')} className="h-full">
          <div className="h-full rounded-xl border bg-muted/20 p-3">
            <ProductImageUploads images={images} onChange={setImages} />
          </div>
        </Field>
      </div>
    </div>
  )
}

// ─── Tab: Giá ───────────────────────────────────────────────────────────────

function PriceTab({ priceList, onChange }: {
  priceList: TPosProductPriceRow[]
  onChange: (index: number, field: 'PriceSmall' | 'PriceMedium' | 'PriceLarge', value: number) => void
}) {
  const { t } = useTranslation()
  if (!priceList.length) {
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">{t('pages.actives.productDialog.noPriceLevels')}</div>
  }
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="min-w-[180px] px-3 py-2 text-left font-semibold text-muted-foreground">{t('pages.actives.productDialog.priceLevelColumn')}</th>
            <th className="min-w-[120px] px-3 py-2 text-center font-semibold text-muted-foreground">{t('pages.actives.productDialog.small')}</th>
            <th className="min-w-[120px] px-3 py-2 text-center font-semibold text-muted-foreground">{t('pages.actives.productDialog.medium')}</th>
            <th className="min-w-[120px] px-3 py-2 text-center font-semibold text-muted-foreground">{t('pages.actives.productDialog.large')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {priceList.map((row, i) => (
            <tr key={i}>
              <td className="px-3 py-1.5 font-medium text-foreground">{row.PriceLevel?.Name}</td>
              <td className="px-3 py-1.5"><NumberInput value={row.PriceSmall ?? 0} onChange={v => onChange(i, 'PriceSmall', v)} className="text-center" /></td>
              <td className="px-3 py-1.5"><NumberInput value={row.PriceMedium ?? 0} onChange={v => onChange(i, 'PriceMedium', v)} className="text-center" /></td>
              <td className="px-3 py-1.5"><NumberInput value={row.PriceLarge ?? 0} onChange={v => onChange(i, 'PriceLarge', v)} className="text-center" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Tab: Định lượng ────────────────────────────────────────────────────────

function RecipeTab({ productId, recipes, selectedIndex, onSelect, onAdd, onDelete }: {
  productId?: number
  recipes: RecipeRow[]
  selectedIndex: number
  onSelect: (index: number) => void
  onAdd: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" disabled={!productId} onClick={onAdd} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-1 h-3.5 w-3.5" /> {t('pages.actives.productDialog.add')}
        </Button>
        <Button type="button" size="sm" variant="destructive" disabled={selectedIndex < 0} onClick={onDelete}>
          <Trash2 className="mr-1 h-3.5 w-3.5" /> {t('pages.actives.productDialog.deleteButton')}
        </Button>
        {!productId && (
          <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            {t('pages.actives.productDialog.needSaveBeforeRecipe')}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="sticky top-0 bg-muted/50">
            <tr>
              <th className="w-10 px-3 py-2 text-center font-semibold text-muted-foreground">#</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t('pages.actives.productDialog.materialCodeColumn')}</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t('pages.actives.productDialog.materialNameColumn')}</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t('pages.actives.productDialog.unitColumnShort')}</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">{t('common.salePrice')}</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">S</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">M</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">L</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {recipes.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">{t('pages.actives.productDialog.noRecipes')}</td></tr>
            ) : recipes.map((item, i) => (
              <tr
                key={i}
                onClick={() => onSelect(i)}
                className={cn('cursor-pointer', i === selectedIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/40')}
              >
                <td className="px-3 py-2 text-center">{i + 1}</td>
                <td className="px-3 py-2">
                  {item.ProductRecipe?.ProductCode}
                  {item._isNew && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{t('pages.actives.productDialog.newBadge')}</span>}
                </td>
                <td className="px-3 py-2">{item.ProductRecipe?.Name || '-'}</td>
                <td className="px-3 py-2">{item.ProductRecipe?.Unit?.Name || '-'}</td>
                <td className="px-3 py-2 text-right">{(item.ProductRecipe?.Price ?? 0).toLocaleString('vi-VN')}</td>
                <td className="px-3 py-2 text-right">{item.QuantitySmall || 0}</td>
                <td className="px-3 py-2 text-right">{item.QuantityMedium || 0}</td>
                <td className="px-3 py-2 text-right">{item.QuantityLarge || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab: Cửa hàng ──────────────────────────────────────────────────────────

function ShopTab({ shops, onToggle }: { shops: TPosShop[]; onToggle: (shop: TPosShop) => void }) {
  const { t } = useTranslation()
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="w-12 px-3 py-2 text-center font-semibold text-muted-foreground">#</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t('pages.actives.productDialog.shopColumn')}</th>
            <th className="w-20 px-3 py-2 text-center font-semibold text-muted-foreground">{t('pages.actives.productDialog.selectColumn')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {shops.length === 0 ? (
            <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">{t('pages.actives.productDialog.noShops')}</td></tr>
          ) : shops.map((shop, i) => (
            <tr key={shop.Id} className={cn(shop.IsDefault && 'bg-primary/5')}>
              <td className="px-3 py-2 text-center">{i + 1}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <PosImage url={shop.Image?.Url} alt="" className="h-6 w-6 shrink-0 rounded" />
                  <span className="text-foreground">{shop.Name}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-center">
                <input type="checkbox" checked={!!shop.IsDefault} onChange={() => onToggle(shop)} className="h-4 w-4 rounded accent-primary" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Field({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label>{label}{required ? <span className="ml-0.5 text-destructive">*</span> : null}</Label>
      {children}
    </div>
  )
}
