import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
export default function PageNotPermission() {
  const { t } = useTranslation()
  return (
    <div className="absolute left-1/2 top-1/2 mb-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-center">
      <span className="bg-gradient-to-b from-foreground to-transparent bg-clip-text text-[10rem] font-extrabold leading-none text-transparent">
        401
      </span>
      <h2 className="font-heading my-2 text-2xl font-bold">
        {t('errors.noPermissionTitle')}
      </h2>
      <p>{t('errors.noPermissionDescription')}</p>
      <div className="mt-8 flex justify-center gap-2">
        <Button
          onClick={() => window.location.replace('/home')}
          variant="ghost"
          size="lg"
        >
          {t('common.backHome')}
        </Button>
      </div>
    </div>
  );
}
