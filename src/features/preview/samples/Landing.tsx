import { ArrowUpRight } from 'lucide-react'
import { useLocale } from '../../../app/i18n'

// The sample demonstrates real palette roles; it is not a second application.
export default function Landing() {
  const { t } = useLocale()
  return (
    <div className="landing-sample">
      <div className="landing-nav">
        <span className="sample-brand-mark" aria-hidden="true" />
        <strong>{t('sampleBrand')}</strong>
        <span className="sample-about">{t('sampleAbout')}</span>
        <span>{t('sampleWork')}</span>
      </div>
      <div className="landing-content">
        <div className="landing-copy">
          <h3>{t('landingHeading')}</h3>
          <p>{t('landingDescription')}</p>
          <div className="sample-actions">
            <span className="sample-primary">
              <ArrowUpRight aria-hidden="true" />
              {t('sampleStart')}
            </span>
            <span>{t('sampleMore')}</span>
          </div>
        </div>
        <div className="sample-project">
          <h4>{t('sampleTitle')}</h4>
          <span className="sample-input-label">{t('projectName')}</span>
          <span className="sample-input">{t('sampleProject')}</span>
          <div className="sample-tags">
            <span>{t('sampleProgress')}</span>
            <span>{t('samplePersonal')}</span>
          </div>
          <p>{t('sampleNote')}</p>
        </div>
      </div>
    </div>
  )
}
