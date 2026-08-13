import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { useNavigate } from "react-router-dom"
// import { notFound } from './assets/images'
export default function PageNotFound() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="absolute left-1/2 top-1/2 mb-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-center">
      <span className="bg-gradient-to-b from-foreground to-transparent bg-clip-text text-[10rem] font-extrabold leading-none text-transparent">
        404
      </span>
      <h2 className="font-heading my-2 text-2xl font-bold">
        {t('errors.notFoundTitle')}
      </h2>
      <p>{t('errors.notFoundDescription')}</p>
      <div className="mt-8 flex justify-center gap-2">
        <Button onClick={() => navigate(-1)} variant="default" size="lg">
          {t('common.goBack')}
        </Button>
        <Button
          onClick={() => navigate('/home')}
          variant="ghost"
          size="lg"
        >
          {t('common.backHome')}
        </Button>
      </div>
    </div>
  );
}
