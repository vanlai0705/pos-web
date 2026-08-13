import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetSettingGeneralQuery, useRemoveShopDataMutation, useUpdateSettingGeneralMutation } from '@/store/slice/settings/api'
import { AlertTriangle, Building2, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader, SaveBar, SettingCard } from '../components'
export default function SettingGeneralPage() {
  const { t } = useTranslation()
  const CONFIRM_TEXT = t('pages.setting.general.confirmText')
  const { data, isLoading } = useGetSettingGeneralQuery()
  const [update, { isLoading: saving }] = useUpdateSettingGeneralMutation()
  const [removeData, { isLoading: removing }] = useRemoveShopDataMutation()

  const [form, setForm] = useState({
    CompanyName: "",
    Email: "",
    Phone: "",
    Fax: "",
    Address: "",
    ProductCategory: { Id: 0, Name: "" },
    Province: { Id: 0, Name: "" },
    Image: undefined as { Url: string } | undefined,
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteInput, setDeleteInput] = useState("")

  useEffect(() => {
    if (data) {
      setForm({
        CompanyName: data.CompanyName ?? "",
        Email: data.Email ?? "",
        Phone: data.Phone ?? "",
        Fax: data.Fax ?? "",
        Address: data.Address ?? "",
        ProductCategory: data.ProductCategory ?? { Id: 0, Name: "" },
        Province: data.Province ?? { Id: 0, Name: "" },
        Image: data.Image,
      })
    }
  }, [data])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    try {
      await update({ data: form, file: logoFile }).unwrap()
      toast.success(t('pages.setting.general.saveSuccessTitle'), { description: t('pages.setting.general.saveSuccessDescription') })
    } catch {
      toast.error(t('pages.setting.general.errorTitle'), { description: t('pages.setting.general.saveErrorDescription') })
    }
  }

  const handleRemoveData = async () => {
    if (deleteInput !== CONFIRM_TEXT) return
    try {
      await removeData().unwrap()
      toast.error(t('pages.setting.general.dataDeletedTitle'), { description: t('pages.setting.general.dataDeletedDescription') })
      setShowDeleteDialog(false)
      setDeleteInput("")
    } catch {
      toast.error(t('pages.setting.general.errorTitle'), { description: t('pages.setting.general.deleteErrorDescription') })
    }
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />

  const logoSrc = logoPreview ?? form.Image?.Url ?? null

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('pages.setting.general.pageTitle')}
        description={t('pages.setting.general.pageDescription')}
        icon={<Building2 className="h-5 w-5" />}
      />

      {/* Logo */}
      <SettingCard title={t('pages.setting.general.logoCardTitle')} icon={<Upload className="h-4 w-4 text-primary" />}>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 flex-none items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 overflow-hidden">
            {logoSrc ? (
              <img src={logoSrc} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {t('pages.setting.general.chooseImage')}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">{t('pages.setting.general.logoHint')}</p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>
        </div>
      </SettingCard>

      {/* Company info */}
      <SettingCard title={t('pages.setting.general.companyInfoCardTitle')} icon={<Building2 className="h-4 w-4 text-primary" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="CompanyName">{t('pages.setting.general.companyNameLabel')} <span className="text-red-500">*</span></Label>
            <Input
              id="CompanyName"
              value={form.CompanyName}
              onChange={e => setForm(f => ({ ...f, CompanyName: e.target.value }))}
              placeholder={t('pages.setting.general.companyNamePlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="Email">Email</Label>
            <Input
              id="Email"
              type="email"
              value={form.Email}
              onChange={e => setForm(f => ({ ...f, Email: e.target.value }))}
              placeholder={t('pages.setting.general.emailPlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="Phone">{t('pages.setting.general.phoneLabel')}</Label>
            <Input
              id="Phone"
              value={form.Phone}
              onChange={e => setForm(f => ({ ...f, Phone: e.target.value }))}
              placeholder={t('pages.setting.general.phonePlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="Fax">Fax</Label>
            <Input
              id="Fax"
              value={form.Fax}
              onChange={e => setForm(f => ({ ...f, Fax: e.target.value }))}
              placeholder={t('pages.setting.general.faxPlaceholder')}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="Address">{t('pages.setting.general.addressLabel')}</Label>
            <textarea
              id="Address"
              value={form.Address}
              onChange={e => setForm(f => ({ ...f, Address: e.target.value }))}
              placeholder={t('pages.setting.general.addressPlaceholder')}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('pages.setting.general.productCategoryLabel')}</Label>
            <Input value={form.ProductCategory?.Name ?? ""} readOnly className="bg-muted/30 cursor-not-allowed" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('pages.setting.general.provinceLabel')}</Label>
            <Input value={form.Province?.Name ?? ""} readOnly className="bg-muted/30 cursor-not-allowed" />
          </div>
        </div>
      </SettingCard>

      <SaveBar onSave={handleSave} loading={saving} />

      {/* Danger zone */}
      <SettingCard title={t('pages.setting.general.dangerZoneCardTitle')} icon={<AlertTriangle className="h-4 w-4 text-red-500" />}>
        <div className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4">
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{t('pages.setting.general.deleteAllDataTitle')}</p>
            <p className="text-xs text-red-600/80 dark:text-red-500/80 mt-0.5">
              {t('pages.setting.general.deleteAllDataWarning')}
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="flex-none"
            onClick={() => { setShowDeleteDialog(true); setDeleteInput("") }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {t('pages.setting.general.deleteDataButton')}
          </Button>
        </div>
      </SettingCard>

      {/* Delete confirmation modal */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-background border shadow-xl p-6 mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold">{t('pages.setting.general.confirmDeleteDataTitle')}</p>
                <p className="text-sm text-muted-foreground">{t('pages.setting.general.actionCannotBeUndone')}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {t('pages.setting.general.typeToConfirmPrefix')} <span className="font-bold text-foreground">"{CONFIRM_TEXT}"</span> {t('pages.setting.general.typeToConfirmSuffix')}
            </p>
            <Input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder={CONFIRM_TEXT}
              className="mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>{t('pages.setting.general.cancel')}</Button>
              <Button
                variant="destructive"
                disabled={deleteInput !== CONFIRM_TEXT || removing}
                onClick={handleRemoveData}
              >
                {removing ? t('pages.setting.general.deletingData') : t('pages.setting.general.deleteDataButton')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
